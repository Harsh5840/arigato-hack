import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { discoverRepairPolicy, frozenRepairDigest, imageMatches, imageReferences, replacementImage, requiredRepairChecks, runnerImages, safeRepairPath, validateGenericRepair, validateRequirements } from './repair-policy.mjs';
import { corroborateVendorRepair, evaluateImageAdvisoryEvidence } from './vendor-evidence.mjs';

// Only this centrally owned code runs on the host. Repository code runs in a
// secret-free, non-root, read-only container without network or a Docker socket.
const working = resolve(process.cwd(), '.proofpatch-verification');
const artifacts = resolve(process.cwd(), 'artifacts');
mkdirSync(working, { recursive: true }); mkdirSync(artifacts, { recursive: true });
const log = [];
const cleanEnvironment = () => ({ PATH: process.env.PATH, HOME: resolve(working, 'home'), LANG: 'C.UTF-8', GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', DOCKER_CONFIG: resolve(working, 'docker-home') });
const hostOwner = `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`;
mkdirSync(cleanEnvironment().HOME, { recursive: true }); mkdirSync(cleanEnvironment().DOCKER_CONFIG, { recursive: true });
function command(program, args, { cwd = working, timeout = 180_000, allowFailure = false } = {}) {
  const child = spawnSync(program, args, { cwd, env: cleanEnvironment(), encoding: 'utf8', shell: false, timeout, maxBuffer: 8_000_000 });
  const output = (child.stdout || '') + (child.stderr || '');
  log.push(`$ ${program} ${args.map(arg => arg.length < 300 ? arg : '[bounded input]').join(' ')}\n${output}`);
  if (!allowFailure && (child.error || child.status !== 0)) throw new Error(`${program} failed: ${output.slice(-2500) || child.error?.message || child.status}`);
  return { ...child, output };
}
const git = (folder, args) => command('git', ['-C', folder, ...args], { timeout: 120_000 }).stdout.trim();
const hash = value => createHash('sha256').update(value).digest('hex');
const envString = (key, pattern) => { const value = process.env[key] || ''; assert.match(value, pattern, `Invalid ${key}.`); return value; };
const runId = envString('PROOFPATCH_RUN_ID', /^[A-Za-z0-9_-]{4,100}$/);
const owner = envString('TARGET_OWNER', /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/);
const repository = envString('TARGET_REPO', /^[A-Za-z0-9_.-]{1,100}$/);
assert.ok(repository !== '.' && repository !== '..');
const baseSha = envString('BASE_SHA', /^[a-f0-9]{40}$/);
const headSha = envString('HEAD_SHA', /^[a-f0-9]{40}$/);
const workflowSha = envString('WORKFLOW_SHA', /^[a-f0-9]{40}$/);
const githubRunId = envString('GITHUB_RUN_ID', /^\d+$/);
assert.equal(process.env.WORKFLOW_REF, 'refs/heads/main', 'The trusted runner must be dispatched from its default branch.');
assert.ok((process.env.PLAN_JSON || '').length < 8000, 'Plan is too large.');
const input = JSON.parse(process.env.PLAN_JSON || '{}');
assert.ok(input && typeof input === 'object' && !Array.isArray(input));
const target = { ecosystem: input.ecosystem, packageName: input.package_name, installedVersion: input.installed_version, fixedVersion: input.fixed_version, manifestPath: input.manifest_path, fixedImageRef: input.fixed_image_ref, imageRef: input.image_ref };
const mode = input.mode;
assert.ok(mode === 'prepare' || mode === 'verify', 'Plan mode must be prepare or verify.');
const report = { target_repository: `${owner}/${repository}`, run_id: runId, base_sha: baseSha, candidate_sha: headSha, workflow_sha: workflowSha, github_run_id: githubRunId, mode, checks: [], verifier_sha256: '', policy: {} };
const evidenceFile = resolve(artifacts, 'verification.json');
const save = () => { writeFileSync(evidenceFile, JSON.stringify(report, null, 2) + '\n'); writeFileSync(resolve(artifacts, 'runner.log'), log.join('\n').slice(-500_000)); };
const check = (id, label, pass, detail) => {
  const entry = { id, label, pass: Boolean(pass), detail: String(detail).slice(0, 2800) };
  const old = report.checks.findIndex(check => check.id === id); if (old < 0) report.checks.push(entry); else report.checks[old] = entry;
  save(); return entry.pass;
};
async function remoteJson(url, options = {}) {
  const response = await fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(30_000), headers: { accept: 'application/json', 'user-agent': 'ProofPatch-Trusted-Runner', ...options.headers } });
  assert.ok(response.ok, `Authoritative source returned HTTP ${response.status}.`);
  const length = Number(response.headers.get('content-length')); assert.ok(!length || length < 8_000_000);
  const text = await response.text(); assert.ok(text.length < 8_000_000, 'Registry response exceeded its bound.'); return JSON.parse(text);
}
function trackedFiles(folder) {
  const entries = git(folder, ['ls-tree', '-r', '--long', 'HEAD']).split('\n').filter(Boolean);
  assert.ok(entries.length > 0 && entries.length <= 5000, 'Repository exceeds the bounded generic runner policy.');
  const files = {}; let total = 0;
  for (const line of entries) {
    const match = /^(\d+)\s+blob\s+[a-f0-9]{40}\s+(\d+)\t(.+)$/.exec(line); assert.ok(match, 'Submodules and irregular Git tree objects require a maintainer policy.');
    const [, permission, sizeText, path] = match; const size = Number(sizeText);
    assert.ok(permission === '100644' || permission === '100755', 'Symlinks are not supported by the secret-free runner.');
    if (!safeRepairPath(path) || path.startsWith('.github/') || /(?:^|\/)(?:package-lock|composer\.lock)\.bak$/.test(path)) continue;
    total += size; assert.ok(size < 1_000_000 && total < 20_000_000, 'Source tree exceeds the generic runner byte bound.');
    files[path] = readFileSync(resolve(folder, path));
  }
  return files;
}
function utf8Files(files) {
  const decoded = {}; for (const [path, bytes] of Object.entries(files)) { try { decoded[path] = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { /* Binary assets are copied, never interpreted as policy. */ } }
  return decoded;
}
function copyFiles(files, destination) {
  for (const [path, content] of Object.entries(files)) { assert.ok(safeRepairPath(path)); const full = resolve(destination, path); mkdirSync(dirname(full), { recursive: true }); writeFileSync(full, content); }
}
function docker(image, arguments_, { folder, network = 'none', writable = false, timeout = 180_000, extra = [], allowFailure = false } = {}) {
  const args = ['run', '--rm', '--network', network, '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--cpus', '2', '--memory', '1g', '--pids-limit', '256', '--user', writable ? hostOwner : '10001:10001'];
  if (!writable) args.push('--read-only', '--tmpfs', '/tmp:rw,noexec,nosuid,size=128m');
  if (folder) args.push('--mount', `type=bind,source=${folder},target=/app${writable ? '' : ',readonly'}`, '--workdir', '/app');
  args.push('--env', 'HOME=/tmp', '--env', 'PIP_DISABLE_PIP_VERSION_CHECK=1', '--env', 'PYTHONDONTWRITEBYTECODE=1', ...extra, '--entrypoint', arguments_[0], image, ...arguments_.slice(1));
  return command('docker', args, { timeout, allowFailure });
}
function lockSources(policy, files) {
  if (policy.kind === 'npm') {
    const manifest = JSON.parse(files[policy.allowedPaths[0]]), lock = JSON.parse(files[policy.allowedPaths[1]]);
    assert.ok(!manifest.workspaces, 'Workspace dependency resolution needs a maintainer policy.');
    for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) for (const constraint of Object.values(manifest[section] || {})) assert.ok(typeof constraint === 'string' && !/^(?:file|git|https?|ssh|link|workspace):|github:|^\//i.test(constraint), 'Only public npm registry dependency constraints are permitted.');
    for (const [path, entry] of Object.entries(lock.packages || {})) {
      assert.ok((path === '' || path.startsWith('node_modules/') && safeRepairPath(path.replaceAll('node_modules/', 'modules/'))) && !entry.link, 'Workspace, linked or escaping npm lock entries require a maintainer policy.');
      if (entry.resolved) assert.match(entry.resolved, /^https:\/\/registry\.npmjs\.org\//, 'Npm lockfile includes a non-registry source.');
    }
  }
  if (policy.kind === 'composer') {
    const manifest = JSON.parse(files[policy.allowedPaths[0]]), lock = JSON.parse(files[policy.allowedPaths[1]]);
    assert.ok(!manifest.repositories, 'Custom Composer repositories require a maintainer policy.');
    for (const item of [...(lock.packages || []), ...(lock['packages-dev'] || [])]) {
      assert.ok(item.type !== 'composer-plugin', 'Composer plugin dependencies are unsupported.');
      assert.match(item.dist?.url || '', /^https:\/\/(?:api\.github\.com\/repos\/|github\.com\/|codeload\.github\.com\/|[a-z0-9.-]+\.packagist\.org\/)/, 'Composer archives must come from approved public hosts.');
    }
  }
}
function packageRoot(policy, destination) { return resolve(destination, policy.root || '.'); }
function prepareDependencies(policy, baselineFiles, candidateFiles, destination, prepareOnly) {
  const root = packageRoot(policy, destination); mkdirSync(root, { recursive: true });
  copyFiles(Object.fromEntries(policy.allowedPaths.map(path => [path, candidateFiles[path]])), destination);
  lockSources(policy, candidateFiles);
  command('docker', ['pull', policy.runnerImage], { timeout: 180_000 });
  if (policy.kind === 'python') {
    assert.ok(!prepareOnly, 'Python exact pins do not need a lock preparation pass.');
    validateRequirements(candidateFiles[policy.manifestPath]);
    const requirementPaths = Object.keys(candidateFiles).filter(path => dirname(path).replaceAll('\\', '/') === (policy.root || '.') && /^requirements(?:-[a-zA-Z0-9_-]+)?\.txt$/.test(path.split('/').at(-1)));
    assert.ok(requirementPaths.length > 0 && requirementPaths.length <= 5, 'Python verification supports up to five exact requirements files per service root.');
    const requirements = [];
    for (const path of requirementPaths) { validateRequirements(candidateFiles[path]); copyFiles({ [path]: candidateFiles[path] }, destination); requirements.push('--requirement', relative(policy.root || '.', path).replaceAll('\\', '/')); }
    docker(policy.runnerImage, ['python', '-m', 'pip', '--isolated', 'download', '--index-url', 'https://pypi.org/simple', '--only-binary=:all:', '--no-cache-dir', '--dest', '/app/.proofpatch-wheels', ...requirements], { folder: root, network: 'bridge', writable: true });
    docker(policy.runnerImage, ['python', '-m', 'pip', '--isolated', 'install', '--no-index', '--find-links', '/app/.proofpatch-wheels', '--target', '/app/.proofpatch-deps', ...requirements], { folder: root, writable: true });
  } else if (policy.kind === 'npm') {
    if (prepareOnly) {
      docker(policy.runnerImage, ['npm', 'install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund', '--registry', 'https://registry.npmjs.org'], { folder: root, network: 'bridge', writable: true });
    } else docker(policy.runnerImage, ['npm', 'ci', '--ignore-scripts', '--no-audit', '--no-fund', '--registry', 'https://registry.npmjs.org'], { folder: root, network: 'bridge', writable: true });
  } else if (policy.kind === 'composer') {
    const args = prepareOnly ? ['composer', '--no-plugins', 'update', target.packageName, '--with-dependencies', '--no-install', '--no-scripts', '--no-interaction', '--prefer-dist'] : ['composer', '--no-plugins', 'install', '--no-scripts', '--no-interaction', '--prefer-dist'];
    docker(policy.runnerImage, args, { folder: root, network: 'bridge', writable: true, extra: ['--env', 'COMPOSER_HOME=/tmp/composer', '--env', 'COMPOSER_ALLOW_SUPERUSER=0'] });
  }
  if (!prepareOnly) for (const path of policy.allowedPaths) assert.equal(readFileSync(resolve(destination, path), 'utf8'), candidateFiles[path], 'Dependency installation changed the committed manifest or lock; commit a resolved lock and rerun exact-SHA verification.');
}
function observedTests(output, kind) {
  const patterns = [/# tests (\d+)/g, /\b(\d+) passed\b/g, /Ran (\d+) tests?/g, /\bTests:\s*(\d+)/g, /\b(\d+) passing\b/g, /^PASS[: ]/gm];
  let count = 0;
  for (const pattern of patterns) { const matches = [...output.matchAll(pattern)]; if (matches.length) count = Math.max(count, matches[0][1] ? Number(matches[0][1]) : matches.length); }
  if (kind === 'python') {
    for (const line of output.split('\n')) try { const value = JSON.parse(line); if (Array.isArray(value.checks)) count = Math.max(count, value.checks.length); } catch { /* Conventional text test reporters are handled above. */ }
  }
  return count;
}
async function cleanPackage() {
  const result = await remoteJson('https://api.osv.dev/v1/query', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ package: { ecosystem: target.ecosystem, name: target.packageName }, version: target.fixedVersion }) });
  return !result.next_page_token && (!result.vulns || Array.isArray(result.vulns) && result.vulns.length === 0);
}
async function packagePublished() {
  if (target.ecosystem === 'PyPI') {
    const metadata = await remoteJson(`https://pypi.org/pypi/${encodeURIComponent(target.packageName)}/${encodeURIComponent(target.fixedVersion)}/json`);
    return metadata.info?.version === target.fixedVersion && metadata.urls?.some(file => !file.yanked && file.packagetype === 'bdist_wheel');
  }
  if (target.ecosystem === 'npm') { const metadata = await remoteJson(`https://registry.npmjs.org/${encodeURIComponent(target.packageName)}/${encodeURIComponent(target.fixedVersion)}`); return metadata.version === target.fixedVersion && !metadata.deprecated; }
  const metadata = await remoteJson(`https://repo.packagist.org/p2/${target.packageName}.json`);
  return metadata.packages?.[target.packageName]?.some(entry => entry.version.replace(/^v/, '') === target.fixedVersion.replace(/^v/, ''));
}
function actualVersion(policy, root) {
  let script;
  if (policy.kind === 'python') return docker(policy.runnerImage, ['python', '-c', 'import importlib.metadata,sys;print(importlib.metadata.version(sys.argv[1]))', target.packageName], { folder: root, extra: ['--env', 'PYTHONPATH=/app/.proofpatch-deps:/app'] }).stdout.trim();
  if (policy.kind === 'npm') { script = 'const fs=require("node:fs");const p=JSON.parse(fs.readFileSync("node_modules/"+process.argv[1]+"/package.json","utf8"));console.log(p.version)'; return docker(policy.runnerImage, ['node', '-e', script, target.packageName], { folder: root }).stdout.trim(); }
  script = '$a=json_decode(file_get_contents("vendor/composer/installed.json"),true);foreach(($a["packages"]??$a)as$p){if($p["name"]===$argv[1]){echo ltrim($p["version"],"v");exit(0);}}exit(1);';
  return docker(policy.runnerImage, ['php', '-r', script, target.packageName], { folder: root }).stdout.trim();
}
function imageVulnerabilities(report) { return (report.Results || []).flatMap(result => result.Vulnerabilities || []); }
function scanImage(image, name) {
  const output = resolve(artifacts, name + '.json');
  const cache = resolve(working, 'trivy-cache'); mkdirSync(cache, { recursive: true });
  command('docker', ['run', '--rm', '--user', hostOwner, '--env', 'HOME=/tmp', '--env', 'XDG_CACHE_HOME=/tmp', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--cpus', '2', '--memory', '2g', '--pids-limit', '256', '--mount', `type=bind,source=${artifacts},target=/evidence`, '--mount', `type=bind,source=${cache},target=/cache`, runnerImages.trivy, 'image', '--cache-dir', '/cache', '--image-src', 'remote', '--scanners', 'vuln', '--list-all-pkgs', '--ignorefile', '/dev/null', '--skip-check-update', '--timeout', '4m', '--format', 'json', '--output', `/evidence/${name}.json`, image], { timeout: 300_000 });
  const report = JSON.parse(readFileSync(output, 'utf8'));
  assert.ok(report.SchemaVersion === 2 && report.ArtifactType === 'container_image' && Array.isArray(report.Results) && report.Results.length > 0 && report.Metadata, 'Independent image scan returned incomplete or unsupported evidence.');
  return report;
}
async function verifyContainer(policy, baselineFiles, candidateFiles, baselineFolder) {
  const oldImage = imageReferences(baselineFiles[policy.manifestPath]).find(image => imageMatches(image, target));
  assert.ok(oldImage); const fixedImage = replacementImage(oldImage, target);
  const baseline = scanImage(oldImage, 'baseline-image-scan');
  const fixed = scanImage(fixedImage, 'candidate-image-scan');
  const before = imageVulnerabilities(baseline), after = imageVulnerabilities(fixed);
  report.runtime = { baselineImage: oldImage, fixedImage, baselineScannerFindings: before.length, candidateScannerFindings: after.length, baselineExecuted: false };
  // Vendor application advisories and distro scanner coverage differ. Keep both
  // real sources and describe a scanner coverage gap without inventing detection.
  const advisoryIds = Array.isArray(input.advisory_ids) ? input.advisory_ids.filter(id => /^CVE-\d{4}-\d+$/.test(id)) : [];
  const scanner = evaluateImageAdvisoryEvidence(advisoryIds, before, after);
  const vendor = await corroborateVendorRepair(target, advisoryIds);
  report.runtime.vendorEvidence = vendor;
  report.runtime.scannerSelectedBaselineFindings = scanner.baselineSelectedCount;
  report.runtime.scannerSelectedCandidateFindings = scanner.candidateSelectedCount;
  report.runtime.scannerCoverageGap = scanner.coverageGap;
  report.runtime.remainingImageFindings = after.slice(0, 100).map(value => ({ id: value.VulnerabilityID, package: value.PkgName, severity: value.Severity, fixedVersion: value.FixedVersion || null }));
  report.runtime.remainingImageFindingsTruncated = after.length > 100;
  report.scan_artifact = { name: `proofpatch-scans-${runId}`, workflow_sha: workflowSha, github_run_id: githubRunId, baseline_sha256: hash(readFileSync(resolve(artifacts, 'baseline-image-scan.json'))), candidate_sha256: hash(readFileSync(resolve(artifacts, 'candidate-image-scan.json'))) };
  check('no_known_advisories', 'Selected vendor advisories no longer affect the updated image version', scanner.pass, `${vendor.vendor} independently confirms ${advisoryIds.join(', ')} affect ${target.installedVersion} and do not affect ${target.fixedVersion}. Actual Trivy selected coverage: ${scanner.baselineSelectedCount} baseline / ${scanner.candidateSelectedCount} candidate; ${after.length} total candidate findings retained for human review. Vendor coverage gaps are recorded, not reported as scanner detection. Baseline never executed.`);
  assert.ok(scanner.pass, 'Independent scanner still reports a selected CVE in the replacement image. Contradictory evidence requires human investigation.');
  if (/\.ya?ml$/.test(policy.manifestPath)) {
    const staticFolder = resolve(working, 'compose-static'); mkdirSync(staticFolder, { recursive: true });
    copyFiles({ [policy.manifestPath]: candidateFiles[policy.manifestPath] }, staticFolder);
    command('docker', ['compose', '-f', resolve(staticFolder, policy.manifestPath), 'config', '--no-env-resolution', '--no-interpolate', '--no-path-resolution', '--quiet']);
  }
  command('docker', ['pull', fixedImage]);
  const imageName = target.packageName.replace(/^docker\.io\//, '').replace(/^library\//, '');
  const oracle = packageRoot(policy, baselineFolder);
  let result, version;
  if (imageName === 'nginx') {
    version = command('docker', ['run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--user', '101:101', '--entrypoint', 'nginx', fixedImage, '-v']).output;
    assert.ok(version.includes('nginx/' + target.fixedVersion.match(/^\d+\.\d+\.\d+/)?.[0]));
    const name = 'proofpatch-' + runId.slice(0, 40).toLowerCase();
    command('docker', ['run', '--detach', '--name', name, '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--user', '101:101', '--cpus', '1', '--memory', '128m', '--pids-limit', '64', '--tmpfs', '/tmp:rw,noexec,nosuid,size=32m', '--mount', `type=bind,source=${resolve(oracle, 'public')},target=/usr/share/nginx/html,readonly`, '--mount', `type=bind,source=${resolve(oracle, 'config/nginx.conf')},target=/etc/nginx/nginx.conf,readonly`, '--mount', `type=bind,source=${resolve(oracle, 'tests')},target=/oracle/tests,readonly`, '--entrypoint', 'nginx', fixedImage, '-g', 'daemon off;']);
    try { result = command('docker', ['exec', name, 'sh', '-c', 'i=0; until curl --fail --silent http://127.0.0.1:8080/health.txt >/dev/null; do i=$((i+1)); [ "$i" -lt 20 ] || exit 1; sleep 1; done; exec sh /oracle/tests/runtime-check.sh'], { timeout: 90_000 }); }
    finally { command('docker', ['rm', '--force', name], { allowFailure: true }); }
  } else {
    version = docker(fixedImage, ['php', '-r', 'echo PHP_VERSION;']).stdout;
    assert.ok(version.trim() === target.fixedVersion.match(/^\d+\.\d+\.\d+/)?.[0]);
    result = docker(fixedImage, policy.testCommand, { extra: ['--mount', `type=bind,source=${oracle},target=/app,readonly`, '--workdir', '/app', '--mount', `type=bind,source=${oracle},target=/oracle,readonly`, '--env', `EXPECTED_VERSION=${target.fixedVersion}`] });
  }
  const count = observedTests(result.output, 'container');
  report.businessLog = result.output.slice(-100_000);
  report.runtime = { ...report.runtime, version: version.trim(), observedAssertions: count };
  check('package_version', 'Actual fixed container reports the selected runtime version', true, version.trim());
  check('business_suite', 'Frozen application smoke tests pass in the fixed container', count > 0, `${count} observed assertions. Runtime had no external network, host ports, credentials or Docker socket.`);
  assert.ok(count > 0, 'Container suite produced no verifiable test assertions.');
}
async function run() {
  // Anonymous public Git fetches. No installation token enters these processes.
  const repoMetadata = await remoteJson(`https://api.github.com/repos/${owner}/${repository}`);
  assert.equal(repoMetadata.private, false, 'The generic runner currently supports public GitHub repositories only.');
  const source = resolve(working, 'source'); mkdirSync(source, { recursive: true });
  command('git', ['init', source]); git(source, ['remote', 'add', 'origin', `https://github.com/${owner}/${repository}.git`]);
  git(source, ['-c', 'core.hooksPath=/dev/null', 'fetch', '--depth=2', '--no-tags', 'origin', baseSha, headSha]);
  git(source, ['-c', 'core.hooksPath=/dev/null', 'checkout', '--detach', baseSha]);
  const baseline = trackedFiles(source), baselineFiles = utf8Files(baseline);
  const baselineFolder = resolve(working, 'oracle'); copyFiles(baseline, baselineFolder);
  git(source, ['-c', 'core.hooksPath=/dev/null', 'checkout', '--detach', headSha]);
  assert.equal(git(source, ['rev-list', '--parents', '-n', '1', 'HEAD']), `${headSha} ${baseSha}`, 'Candidate must have exactly the frozen base as its only parent.');
  const changed = git(source, ['diff', '--name-status', baseSha, headSha]).split('\n').filter(Boolean);
  assert.ok(changed.length > 0 && changed.every(line => line.startsWith('M\t')), 'Only modifications of existing regular files are supported.');
  const candidate = trackedFiles(source), candidateFiles = utf8Files(candidate);
  const policy = discoverRepairPolicy(baselineFiles, target, Object.keys(baseline));
  report.policy = policy; report.verifier_sha256 = frozenRepairDigest(policy, baselineFiles);
  validateGenericRepair(policy, target, baselineFiles, changed.map(line => { const path = line.slice(2); return { path, content: candidateFiles[path] }; }), { allowUnresolvedLock: mode === 'prepare' });
  check('scope', 'Only the discovered dependency manifest and resolved lockfile may change', true, changed.map(line => line.slice(2)).join(', '));
  check('verifier', 'Baseline test files are frozen before dependency installation', frozenRepairDigest(policy, candidateFiles) === report.verifier_sha256, report.verifier_sha256);
  assert.ok(report.checks.every(check => check.pass), 'Frozen tests changed.');
  if (mode === 'prepare') {
    assert.ok(policy.kind === 'npm' || policy.kind === 'composer', 'Only npm/Composer lockfiles require preparation.');
    const destination = resolve(working, 'lock-resolution'); prepareDependencies(policy, baselineFiles, candidateFiles, destination, true);
    const lockPath = policy.allowedPaths[1], content = readFileSync(resolve(destination, lockPath), 'utf8');
    assert.ok(content.length < 1_000_000);
    validateGenericRepair(policy, target, baselineFiles, [{ path: policy.allowedPaths[0], content: candidateFiles[policy.allowedPaths[0]] }, { path: lockPath, content }]);
    lockSources(policy, { ...candidateFiles, [lockPath]: content });
    const generated = { target_repository: `${owner}/${repository}`, run_id: runId, base_sha: baseSha, candidate_sha: headSha, workflow_sha: workflowSha, github_run_id: githubRunId, verifier_sha256: report.verifier_sha256, files: [{ path: lockPath, content }] };
    writeFileSync(resolve(artifacts, 'generated-files.json'), JSON.stringify(generated, null, 2) + '\n');
    check('package_version', 'Deterministic lockfile pins the exact selected fixed version', true, `${target.packageName}@${target.fixedVersion}; tests not yet run.`);
    report.prepared = true; save(); console.log('Deterministically resolved lockfile produced. No tests or PR approval were claimed. Commit this lockfile, then dispatch verify for the final immutable SHA.'); return;
  }
  if (policy.kind === 'container') await verifyContainer(policy, baselineFiles, candidateFiles, baselineFolder);
  else {
    const published = await packagePublished(); assert.ok(published, 'Selected repair must exist as an authoritative published release.');
    const clean = await cleanPackage(); check('no_known_advisories', 'Exact repaired package has no current OSV advisory match', clean, `${target.ecosystem}:${target.packageName}@${target.fixedVersion}; other findings stay visible in monitoring.`); assert.ok(clean, 'Selected version still has an OSV advisory.');
    const destination = resolve(working, 'runtime'); prepareDependencies(policy, baselineFiles, candidateFiles, destination, false);
    // The application is copied only after installation. Its scripts cannot run
    // during the network-enabled package download phase.
    copyFiles(candidate, destination);
    const root = packageRoot(policy, destination), version = actualVersion(policy, root);
    check('package_version', 'Installed runtime package equals the selected published version', version === target.fixedVersion.replace(/^v/, ''), version); assert.equal(version, target.fixedVersion.replace(/^v/, ''));
    const result = docker(policy.runnerImage, policy.testCommand, { folder: root, extra: ['--env', 'PYTHONPATH=/app/.proofpatch-deps:/app', '--env', `EXPECTED_VERSION=${target.fixedVersion}`], allowFailure: true });
    const count = observedTests(result.output, policy.kind); report.runtime = { kind: policy.kind, package: target.packageName, version, observedAssertions: count }; report.businessLog = result.output.slice(-100_000);
    check('business_suite', 'Frozen baseline application suite passes against candidate dependencies', result.status === 0 && count > 0, `${count} observed tests; exit ${result.status}. No test suite is reported as a pass when it is missing or empty.`);
    assert.ok(result.status === 0 && count > 0, 'Application tests failed or no positive assertion count was observed.');
  }
  for (const id of requiredRepairChecks) assert.ok(report.checks.some(check => check.id === id && check.pass), `Required gate ${id} is missing.`);
  save(); console.log('All five exact-candidate verification gates passed. A human still owns review, merge and deployment.');
}
try { await run(); }
catch (error) { report.failure = error instanceof Error ? error.message : 'Trusted verification failed.'; check('runner_completion', 'Trusted runner completed successfully', false, report.failure); console.error(report.failure); process.exitCode = 1; }
finally { save(); }
