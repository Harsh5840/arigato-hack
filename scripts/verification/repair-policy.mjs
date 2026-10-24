import { createHash } from 'node:crypto';
import { posix } from 'node:path';

// The API and the trusted runner import this same policy. No repository-name allowlist.
export const repairPolicyVersion = 'generic-repair-v1';
export const requiredRepairChecks = ['scope', 'verifier', 'package_version', 'business_suite', 'no_known_advisories'];
export const runnerImages = {
  python: 'python:3.12-slim-bookworm@sha256:6a0e06f5ba0b373d051aabd3fffb9b873f27f9a2a3a14bcbe37dee6f0e3bbc70',
  npm: 'node:22-bookworm-slim@sha256:de170b39439eb0e5a3444ad7d60b015614a381e10fecae2e30ec9e735122f38d',
  composer: 'composer:2@sha256:b6dcd72ca98fa19d0e5b8476de179859704891fad06dd9e0b96833d4c430a5fc',
  trivy: 'aquasec/trivy:0.69.3@sha256:bcc376de8d77cfe086a917230e818dc9f8528e3c852f7b1aff648949b6258d1c',
};
const hash = value => createHash('sha256').update(value).digest('hex');
const canonical = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const normalizePy = name => name.toLowerCase().replace(/[-_.]+/g, '-');
const fail = message => { throw new Error(message); };
export function safeRepairPath(path) {
  return typeof path === 'string' && path.length > 0 && path.length <= 240 && !path.startsWith('/') && !path.includes('\\') && path.split('/').every(segment => /^[a-zA-Z0-9_.@+-]+$/.test(segment) && segment !== '..' && segment !== '.') && !/(^|\/)(?:\.git|node_modules|vendor|\.venv|venv|\.proofpatch[^/]*|\.env(?:\..*)?)(\/|$)/.test(path);
}
function json(content, path) { try { const parsed = JSON.parse(content); if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') fail('Expected object'); return parsed; } catch { return fail(`Invalid JSON in ${path}.`); } }
export function isRepairTestPath(path) {
  return safeRepairPath(path) && !path.startsWith('.github/') && (/\/(?:tests?|__tests__|verification)\//.test('/' + path) && /\.(?:py|js|mjs|cjs|ts|tsx|jsx|php|json|xml|ini|toml|yaml|yml|sh)$/.test(path) || /(?:^|\/)(?:test_[^/]+\.py|[^/]+(?:\.test|\.spec)\.(?:[cm]?js|tsx?|jsx)|conftest\.py|phpunit\.xml(?:\.dist)?|pytest\.ini|vitest\.config\.[^/]+|jest\.config\.[^/]+|tsconfig\.json|pyproject\.toml|config\/nginx\.conf)$/.test(path) || /(?:^|\/)public\/[^/]+\.(?:html|json|css|txt)$/.test(path));
}
export function discoverRepairPolicy(files, target, paths = Object.keys(files)) {
  if (!target || !safeRepairPath(target.manifestPath) || !files[target.manifestPath]) fail('The affected manifest is missing or unsafe.');
  if (typeof target.packageName !== 'string' || target.packageName.length > 180 || !/^[A-Za-z0-9@_.+/-]+$/.test(target.packageName)) fail('Invalid package identity.');
  if (typeof target.fixedVersion !== 'string' || target.fixedVersion === target.installedVersion || !/^[A-Za-z0-9_.+@:-]{1,180}$/.test(target.fixedVersion)) fail('An exact, different published repair version is required.');
  const directory = posix.dirname(target.manifestPath); const root = directory === '.' ? '' : directory;
  const prefix = root ? root + '/' : ''; const at = path => prefix + path;
  const testPaths = [...new Set(paths.filter(path => isRepairTestPath(path) && path.startsWith(prefix)))].sort();
  if (testPaths.length > 100) fail('More than 100 verification files require a maintainer policy.');
  let kind, allowedPaths, testCommand, runnerImage;
  if (target.ecosystem === 'PyPI' && /^requirements(?:-[a-zA-Z0-9_-]+)?\.txt$/.test(posix.basename(target.manifestPath))) {
    kind = 'python'; allowedPaths = [target.manifestPath]; runnerImage = runnerImages.python;
    const pytests = testPaths.filter(path => /(?:^|\/)(?:test_[^/]+|[^/]+_test)\.py$/.test(path));
    const pytest = pytests.some(path => /(?:^|\n)\s*(?:import pytest|from pytest\b)/.test(files[path] || '')) || Object.entries(files).some(([path, content]) => path.startsWith(prefix) && /^requirements(?:-[a-zA-Z0-9_-]+)?\.txt$/.test(posix.basename(path)) && /\bpytest(?:==|[\s[<>=])/.test(content));
    if (!pytests.length && files[at('verification/business.py')]) testCommand = ['python', 'verification/business.py'];
    else if (!pytests.length) fail('No conventional baseline Python tests found. Add tests/test_*.py or a maintainer test policy; an empty suite cannot pass.');
    else if (pytest) testCommand = ['python', '-m', 'pytest', '-q', '--override-ini', 'cache_dir=/tmp/pytest-cache'];
    else {
      if (!pytests.some(path => path.startsWith(at('tests/')))) fail('Python unittest discovery requires baseline tests/test_*.py.');
      testCommand = ['python', '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test*.py', '-v'];
    }
    validateRequirements(files[target.manifestPath]);
    for (const path of Object.keys(files).filter(path => path.startsWith(prefix) && posix.dirname(path) === (root || '.') && /^requirements(?:-[a-zA-Z0-9_-]+)?\.txt$/.test(posix.basename(path)))) {
      validateRequirements(files[path]); if (path !== target.manifestPath && !testPaths.includes(path)) testPaths.push(path);
    }
    testPaths.sort();
    if (!requirements(files[target.manifestPath]).some(dep => normalizePy(dep.name) === normalizePy(target.packageName) && dep.version === target.installedVersion)) fail('The exact affected Python pin is missing.');
  } else if (target.ecosystem === 'npm') {
    kind = 'npm'; allowedPaths = [at('package.json'), at('package-lock.json')]; runnerImage = runnerImages.npm;
    const manifest = json(files[at('package.json')], at('package.json'));
    if (!files[at('package-lock.json')]) fail('A committed npm package-lock.json is required for reproducible repair.');
    const field = ['dependencies', 'devDependencies', 'optionalDependencies'].find(field => manifest[field]?.[target.packageName]);
    if (!field) fail('Transitive-only npm repairs require an explicit parent-dependency policy.');
    if (!manifest.scripts?.test || typeof manifest.scripts.test !== 'string' || /no test specified|exit 0|echo\s+["']?no tests/i.test(manifest.scripts.test)) fail('A meaningful baseline npm test script is required.');
    if (!testPaths.some(path => /(?:\.(?:test|spec)\.[cm]?[jt]sx?$|\/tests?\/|\/__tests__\/)/.test(path))) fail('No baseline npm test files found; an empty suite cannot pass.');
    testCommand = ['npm', 'run', 'test', '--ignore-scripts'];
  } else if (target.ecosystem === 'Packagist') {
    kind = 'composer'; allowedPaths = [at('composer.json'), at('composer.lock')]; runnerImage = runnerImages.composer;
    const manifest = json(files[at('composer.json')], at('composer.json'));
    if (!files[at('composer.lock')]) fail('A committed Composer lockfile is required.');
    if (!manifest.require?.[target.packageName] && !manifest['require-dev']?.[target.packageName]) fail('Transitive-only Composer repairs require an explicit parent-dependency policy.');
    if (!testPaths.some(path => /(?:Test\.php$|\/tests?\/.*\.php$)/.test(path))) fail('No baseline PHP test suite found.');
    if (manifest.scripts?.test) testCommand = ['composer', '--no-plugins', 'run-script', 'test', '--no-interaction'];
    else if (files[at('phpunit.xml')] || files[at('phpunit.xml.dist')]) testCommand = ['php', 'vendor/bin/phpunit'];
    else fail('PHP needs a baseline Composer test script or phpunit.xml test configuration.');
  } else if (['Docker', 'Container', 'OCI'].includes(target.ecosystem)) {
    kind = 'container'; allowedPaths = [target.manifestPath]; runnerImage = '';
    if (!/(?:^|\/)(?:Dockerfile(?:\.[\w-]+)?|(?:docker-)?compose(?:[.\w-]*)?\.ya?ml)$/.test(target.manifestPath)) fail('Container repair currently supports Dockerfile FROM and Compose YAML image references.');
    if (typeof target.fixedImageRef !== 'string' || !/@sha256:[a-f0-9]{64}$/.test(target.fixedImageRef)) fail('A container repair must pin the published replacement by SHA-256 digest.');
    const images = imageReferences(files[target.manifestPath]);
    if (!images.some(image => imageMatches(image, target))) fail('The exact affected container tag is not present.');
    if (imageRepo(target.packageName) === 'nginx') {
      if (!files[at('config/nginx.conf')] || !files[at('tests/runtime-check.sh')]) fail('nginx needs baseline config/nginx.conf and tests/runtime-check.sh to verify application behavior in isolation.');
      for (const path of paths.filter(path => path.startsWith(at('public/')) && safeRepairPath(path))) if (!testPaths.includes(path)) testPaths.push(path);
      if (!testPaths.includes(at('config/nginx.conf'))) testPaths.push(at('config/nginx.conf'));
      if (!testPaths.includes(at('tests/runtime-check.sh'))) testPaths.push(at('tests/runtime-check.sh'));
      testCommand = ['sh', '/oracle/tests/runtime-check.sh'];
    } else if (imageRepo(target.packageName) === 'php' && files[at('verification/business.php')]) {
      testCommand = ['php', '/oracle/verification/business.php'];
      if (!testPaths.includes(at('verification/business.php'))) testPaths.push(at('verification/business.php'));
    } else fail('This image needs a maintainer runtime-smoke policy. Generic image detection is available, but an empty application suite cannot pass.');
    testPaths.sort();
  } else return fail('This manifest has no generic repair adapter. Monitoring remains available.');
  return { version: repairPolicyVersion, kind, root, manifestPath: target.manifestPath, allowedPaths, testPaths, testCommand, runnerImage };
}
export function requirements(content) {
  return content.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#')).map(line => {
    const match = /^([A-Za-z0-9][A-Za-z0-9_.-]*(?:\[[A-Za-z0-9_,.-]+\])?)==([A-Za-z0-9][A-Za-z0-9_.+!-]*)(?:\s+#.*)?$/.exec(line);
    if (!match) fail('Python automated repair requires exact public-registry pins without URLs, includes, indexes or editable installs.');
    return { name: match[1].replace(/\[.*$/, ''), version: match[2] };
  });
}
export function validateRequirements(content) { const entries = requirements(content); if (!entries.length || entries.length > 100 || new Set(entries.map(dep => normalizePy(dep.name))).size !== entries.length) fail('Python requirements must contain 1–100 unique exact package pins.'); return entries; }
export function imageReferences(content) {
  return content.split(/\r?\n/).flatMap(line => {
    const match = /^(?:\s*image:\s*["']?|\s*FROM\s+(?:--platform=[^\s]+\s+)?)([a-z0-9][a-z0-9./_-]*(?::[A-Za-z0-9_.-]+)?(?:@sha256:[a-f0-9]{64})?)(?:["']?\s*(?:#.*)?|\s+AS\s+[\w-]+)$/i.exec(line);
    return match ? [match[1]] : [];
  });
}
const imageRepo = image => image.split('@')[0].replace(/:[^/:]+$/, '').replace(/^(?:docker\.io\/)?(?:library\/)?/, '');
const imageTag = image => /:([^/:@]+)(?:@|$)/.exec(image)?.[1] || 'latest';
export function imageMatches(image, target) { return imageRepo(image) === imageRepo(target.packageName) && (imageTag(image) === target.installedVersion || image === target.installedVersion); }
export function replacementImage(image, target) {
  const repo = image.split('@')[0].replace(/:[^/:]+$/, '');
  if (!/^(?:(?:docker\.io\/)?library\/)?[a-z0-9][a-z0-9_-]*$/.test(repo)) fail('Automated image execution is restricted to official Docker Hub images; add a maintainer policy for other registries.');
  if (!target.fixedImageRef || imageRepo(target.fixedImageRef) !== imageRepo(image) || imageTag(target.fixedImageRef) !== target.fixedVersion || !/@sha256:[a-f0-9]{64}$/.test(target.fixedImageRef)) fail('Published replacement image identity does not match the selected repository, tag and digest.');
  return repo + ':' + target.fixedVersion + '@' + target.fixedImageRef.split('@')[1];
}
export function validateGenericRepair(policy, target, baseFiles, edits, options = {}) {
  if (!Array.isArray(edits) || !edits.length || edits.length > policy.allowedPaths.length || new Set(edits.map(file => file.path)).size !== edits.length || edits.some(file => !policy.allowedPaths.includes(file.path) || typeof file.content !== 'string' || file.content.length > 1_000_000 || file.content.includes('\0'))) fail('Candidate changed a protected path or exceeded the dependency manifest scope.');
  const candidate = { ...baseFiles, ...Object.fromEntries(edits.map(file => [file.path, file.content])) };
  if (policy.kind === 'python') {
    const pattern = /(^|\n)([ \t]*)([A-Za-z0-9][A-Za-z0-9_.-]*(?:\[[A-Za-z0-9_,.-]+\])?)==([^\r\n #]+)([^\r\n]*)(\r?)(?=\n|$)/g;
    let matched = 0;
    const expected = baseFiles[policy.manifestPath].replace(pattern, (whole, start, space, name, version, tail, cr) => {
      if (normalizePy(name.replace(/\[.*$/, '')) !== normalizePy(target.packageName)) return whole;
      if (version !== target.installedVersion) fail('Affected Python baseline version changed.'); matched++; return `${start}${space}${name}==${target.fixedVersion}${tail}${cr}`;
    });
    if (matched !== 1 || candidate[policy.manifestPath] !== expected) fail('Python repair must change only the selected package pin and preserve every other requirement.');
    validateRequirements(candidate[policy.manifestPath]);
  } else if (policy.kind === 'npm' || policy.kind === 'composer') {
    const manifestPath = policy.allowedPaths[0], lockPath = policy.allowedPaths[1];
    if (options.allowUnresolvedLock && candidate[lockPath] !== baseFiles[lockPath]) fail('Lockfiles are generated by the trusted package manager, not proposed by the model. Prepare may edit the selected manifest only.');
    const before = json(baseFiles[manifestPath], manifestPath), after = json(candidate[manifestPath], manifestPath), expected = structuredClone(before);
    const fields = policy.kind === 'npm' ? ['dependencies', 'devDependencies', 'optionalDependencies'] : ['require', 'require-dev'];
    let matched = 0;
    for (const field of fields) if (expected[field]?.[target.packageName]) { expected[field][target.packageName] = target.fixedVersion; matched++; }
    if (!matched || canonical(after) !== canonical(expected)) fail('Only the selected direct dependency constraint may change; scripts, registry configuration and other fields are frozen.');
    const lock = json(candidate[lockPath], lockPath);
    const pinned = policy.kind === 'npm' ? Object.entries(lock.packages || {}).some(([path, value]) => path === `node_modules/${target.packageName}` && value.version === target.fixedVersion) : [...(lock.packages || []), ...(lock['packages-dev'] || [])].some(value => value.name === target.packageName && value.version.replace(/^v/, '') === target.fixedVersion.replace(/^v/, ''));
    if (!pinned && !options.allowUnresolvedLock) fail('Candidate lockfile must pin the selected exact fixed version. The trusted runner will independently check lock consistency.');
  } else if (policy.kind === 'container') {
    let expected = baseFiles[policy.manifestPath], matches = 0;
    for (const image of [...new Set(imageReferences(expected))]) if (imageMatches(image, target)) {
      const replacement = replacementImage(image, target);
      // A full-token replacement preserves commands, services, mounts and all YAML bytes.
      expected = expected.split(/(?<=\n)/).map(line => {
        if (imageReferences(line).includes(image)) { matches++; return line.replace(image, replacement); } return line;
      }).join('');
    }
    if (!matches || candidate[policy.manifestPath] !== expected) fail('Container repair must change only the selected image reference and preserve every other byte.');
  }
  if (!edits.some(file => baseFiles[file.path] !== file.content)) fail('Candidate has no dependency change.');
  return candidate;
}
export function frozenRepairDigest(policy, baselineFiles) {
  for (const path of policy.testPaths) if (typeof baselineFiles[path] !== 'string') fail(`Frozen test file ${path} is missing.`);
  return hash(JSON.stringify([repairPolicyVersion, policy.kind, policy.root, policy.testCommand, policy.testPaths.map(path => [path, hash(baselineFiles[path])])]));
}
