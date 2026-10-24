import { spawn } from 'node:child_process';
import { strFromU8, unzipSync } from 'fflate';
import { abortableDelay, boundedBytes, boundedJson, combinedSignal, object, sha256, string } from './http.js';
import { allowedPaths, targetRepository, verifierPaths, type Baseline, type Evidence, type EvidenceCheck, type Repair, type VerificationProgress } from './types.js';

const apiRoot = 'https://api.github.com';
const repoPath = `/repos/${targetRepository}`;
const maxArtifactBytes = 5_000_000;
let credentialPromise: Promise<string | undefined> | undefined;

export class GitHubAdapterError extends Error {
  constructor(message: string, public readonly status: number) { super(message); this.name = 'GitHubAdapterError'; }
}

async function managerCredential(): Promise<string | undefined> {
  if (process.env.ALLOW_GIT_CREDENTIAL_MANAGER === 'false') return undefined;
  return new Promise((resolve) => {
    const child = spawn('git', ['-c', 'credential.interactive=never', 'credential', 'fill'], {
      windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' },
    });
    let output = '';
    let settled = false;
    const finish = (token?: string) => { if (settled) return; settled = true; clearTimeout(timer); resolve(token); };
    const timer = setTimeout(() => { child.kill(); finish(); }, 8_000);
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString('utf8');
      if (output.length > 30_000) { child.kill(); finish(); }
    });
    // Credential-manager diagnostics may contain sensitive information. Do not log.
    child.stderr.resume();
    child.on('error', () => finish());
    child.on('close', (code) => {
      if (code !== 0) return finish();
      const password = output.split(/\r?\n/).find((line) => line.startsWith('password='))?.slice('password='.length);
      finish(password || undefined);
    });
    child.stdin.on('error', () => finish());
    child.stdin.end('protocol=https\nhost=github.com\n\n');
  });
}

export async function getGitHubCredential(): Promise<string | undefined> {
  const configured = process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim();
  if (configured) return configured;
  credentialPromise ??= managerCredential();
  return credentialPromise;
}

async function api(path: string, options: { method?: 'GET' | 'POST'; body?: unknown; signal?: AbortSignal; raw?: boolean; beforeWrite?: () => void } = {}): Promise<Response> {
  if (!path.startsWith(`${repoPath}/`) && path !== repoPath) throw new Error('GitHub request is outside the fixed owned demonstration repository.');
  const token = await getGitHubCredential();
  if (!token) throw new Error('GitHub authentication is missing. Set GITHUB_TOKEN with Contents/Actions/Pull requests access to Harsh5840/arigato-php-demo, or sign in through Git Credential Manager locally.');
  // Re-read controller cancellation immediately before crossing the write boundary,
  // after all awaited authentication work. The callback never enters JSON or logs.
  if (options.method === 'POST') options.beforeWrite?.();
  const response = await fetch(`${apiRoot}${path}`, {
    method: options.method ?? 'GET', redirect: 'manual', signal: combinedSignal(options.signal, 30_000),
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'ProofPatch-Hackathon', ...(options.body === undefined ? {} : { 'content-type': 'application/json' }) },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  if (!response.ok && !(options.raw && response.status === 302)) {
    await response.body?.cancel();
    throw new GitHubAdapterError(`GitHub returned HTTP ${response.status} for the owned fixture operation. Check repository permissions, workflow configuration and account rate limits.`, response.status);
  }
  return response;
}

async function json(path: string, options: Parameters<typeof api>[1] = {}): Promise<unknown> {
  const response = await api(path, options);
  if (response.status === 204) { await response.body?.cancel(); return undefined; }
  return boundedJson(response, 2_500_000);
}

function commitSha(value: unknown, label = 'Commit SHA'): string {
  const result = string(value, label, 40);
  if (!/^[a-f0-9]{40}$/.test(result)) throw new Error(`${label} is not a complete Git commit identity.`);
  return result;
}

function branchName(branch: string): string {
  if (!/^proofpatch\/[a-z0-9][a-z0-9._-]{1,110}$/.test(branch) || branch.includes('..') || branch.endsWith('.lock')) throw new Error('Candidate branch must be a bounded proofpatch/<safe-id> branch.');
  return branch;
}

async function contentsAt(sha: string, paths: readonly string[], signal?: AbortSignal): Promise<Record<string, string>> {
  commitSha(sha);
  const entries = await Promise.all(paths.map(async (path) => {
    const value = object(await json(`${repoPath}/contents/${path}?ref=${sha}`, { signal }), 'GitHub file');
    if (value.type !== 'file' || value.encoding !== 'base64' || typeof value.size !== 'number' || value.size > 100_000) throw new Error(`Baseline file ${path} is not a bounded regular UTF-8 file.`);
    const bytes = Buffer.from(string(value.content, `GitHub content ${path}`, 150_000).replace(/\s/g, ''), 'base64');
    if (bytes.length > 100_000) throw new Error(`Baseline file ${path} exceeded its size limit.`);
    const content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return [path, content] as const;
  }));
  return Object.fromEntries(entries);
}

export function computeVerifierDigest(files: Record<string, string>): string {
  const entries = verifierPaths.map((path) => {
    if (typeof files[path] !== 'string') throw new Error(`Frozen verifier file missing: ${path}.`);
    return [path, sha256(files[path])];
  });
  return sha256(JSON.stringify(entries));
}

export async function readBaseline(signal?: AbortSignal): Promise<Baseline> {
  const value = object(await json(`${repoPath}/commits/main`, { signal }), 'Baseline commit');
  const sha = commitSha(value.sha);
  const commit = object(value.commit, 'Baseline Git commit');
  const treeSha = commitSha(object(commit.tree, 'Baseline tree').sha, 'Tree SHA');
  const files = await contentsAt(sha, [...allowedPaths, ...verifierPaths], signal);
  return { sha, treeSha, files, verifierSha256: computeVerifierDigest(files) };
}

async function existingBranch(base: Baseline, candidate: Repair['files'], branch: string, signal?: AbortSignal): Promise<{ sha: string; branch: string } | null> {
  let value: Record<string, unknown>;
  try { value = object(await json(`${repoPath}/git/ref/heads/${branch}`, { signal }), 'Candidate branch'); }
  catch (error) { if (error instanceof GitHubAdapterError && error.status === 404) return null; throw error; }
  const sha = commitSha(object(value.object, 'Branch object').sha);
  const commit = object(await json(`${repoPath}/git/commits/${sha}`, { signal }), 'Candidate commit');
  if (!Array.isArray(commit.parents) || commit.parents.length !== 1 || object(commit.parents[0], 'Candidate parent').sha !== base.sha) throw new Error('Existing candidate branch has a different parent; refusing to overwrite it.');
  const contents = await contentsAt(sha, allowedPaths, signal);
  if (candidate.some((file) => contents[file.path] !== file.content)) throw new Error('Existing candidate branch differs from this repair; refusing to force-push or overwrite it.');
  return { sha, branch };
}

export async function ensureCandidateBranch(base: Baseline, repair: Pick<Repair, 'files'>, branch: string, signal?: AbortSignal, beforeWrite?: () => void): Promise<{ sha: string; branch: string }> {
  branchName(branch); commitSha(base.sha); commitSha(base.treeSha, 'Base tree SHA');
  if (repair.files.length !== allowedPaths.length || new Set(repair.files.map((file) => file.path)).size !== allowedPaths.length || repair.files.some((file) => !(allowedPaths as readonly string[]).includes(file.path) || typeof file.content !== 'string' || !file.content.length || file.content.length > 30_000)) throw new Error('Candidate Git write exceeded the three-file allowlist.');
  const existing = await existingBranch(base, repair.files, branch, signal);
  if (existing) return existing;
  const blobs = await Promise.all(repair.files.map(async (file) => {
    const blob = object(await json(`${repoPath}/git/blobs`, { method: 'POST', body: { content: file.content, encoding: 'utf-8' }, signal, beforeWrite }), 'Created blob');
    return { path: file.path, mode: '100644', type: 'blob', sha: commitSha(blob.sha, 'Blob SHA') };
  }));
  const tree = object(await json(`${repoPath}/git/trees`, { method: 'POST', body: { base_tree: base.treeSha, tree: blobs }, signal, beforeWrite }), 'Created tree');
  const commit = object(await json(`${repoPath}/git/commits`, { method: 'POST', body: { message: 'fix: review PHP 8.3.36 runtime and startup mitigation\n\nGenerated by ProofPatch; human review and deployment remain required.', tree: commitSha(tree.sha, 'Tree SHA'), parents: [base.sha] }, signal, beforeWrite }), 'Created commit');
  const sha = commitSha(commit.sha);
  try { await json(`${repoPath}/git/refs`, { method: 'POST', body: { ref: `refs/heads/${branch}`, sha }, signal, beforeWrite }); }
  catch (error) {
    // Reconcile a race or a completed write whose response was lost. Never force.
    if (error instanceof GitHubAdapterError && error.status === 422) {
      const reconciled = await existingBranch(base, repair.files, branch, signal);
      if (reconciled) return reconciled;
    }
    throw error;
  }
  return { sha, branch };
}

export async function dispatchVerification(input: { baseSha: string; headSha: string; runId: string; beforeWrite?: () => void }, signal?: AbortSignal): Promise<{ startedAt: string }> {
  commitSha(input.baseSha); commitSha(input.headSha);
  if (!/^[a-zA-Z0-9_-]{4,100}$/.test(input.runId)) throw new Error('Run identity is invalid for the fixed workflow.');
  const startedAt = new Date().toISOString();
  await json(`${repoPath}/actions/workflows/fixture-evidence.yml/dispatches`, { method: 'POST', body: { ref: 'main', inputs: { base_sha: input.baseSha, head_sha: input.headSha, run_id: input.runId } }, signal, beforeWrite: input.beforeWrite });
  return { startedAt };
}

interface ActionRun { id: number; html_url: string; status: string; conclusion: string | null; display_title: string; created_at: string; event: string }
function actionRun(value: unknown): ActionRun {
  const data = object(value, 'Actions run');
  if (!Number.isInteger(data.id) || (data.id as number) <= 0) throw new Error('Actions run ID is invalid.');
  const url = string(data.html_url, 'Actions URL');
  if (!url.startsWith(`https://github.com/${targetRepository}/actions/runs/`)) throw new Error('Actions URL is outside the target repository.');
  return { id: data.id as number, html_url: url, status: string(data.status, 'Actions status'), conclusion: data.conclusion === null ? null : string(data.conclusion, 'Actions conclusion'), display_title: string(data.display_title, 'Actions display title'), created_at: string(data.created_at, 'Actions creation time'), event: string(data.event, 'Actions event') };
}

async function downloadArtifact(id: number, signal?: AbortSignal): Promise<{ files: Record<string, string>; digest: string }> {
  const response = await api(`${repoPath}/actions/artifacts/${id}/zip`, { raw: true, signal });
  let bytes: Uint8Array;
  if (response.status === 302) {
    const location = response.headers.get('location');
    await response.body?.cancel();
    if (!location) throw new Error('GitHub artifact redirect was missing its location.');
    const destination = new URL(location);
    const approved = destination.hostname.endsWith('.actions.githubusercontent.com') || destination.hostname.endsWith('.blob.core.windows.net') || destination.hostname === 'pipelines.actions.githubusercontent.com';
    if (destination.protocol !== 'https:' || !approved || destination.username || destination.password || destination.port) throw new Error('GitHub artifact redirect is outside the approved artifact hosts.');
    // Signed storage URL only; GitHub authorization is NEVER forwarded.
    const archive = await fetch(destination, { redirect: 'error', signal: combinedSignal(signal, 30_000), headers: { accept: 'application/zip' } });
    if (!archive.ok) { await archive.body?.cancel(); throw new Error(`GitHub artifact storage returned HTTP ${archive.status}.`); }
    bytes = await boundedBytes(archive, maxArtifactBytes);
  } else bytes = await boundedBytes(response, maxArtifactBytes);
  const allowed = new Set(['candidate-policy.json', 'runtime-probe.json', 'business-checks.txt', 'built-image-id.txt', 'run-provenance.json']);
  let total = 0;
  const archive = unzipSync(bytes, { filter: (file) => {
    total += file.originalSize;
    if (total > 8_000_000 || file.originalSize > 2_000_000) throw new Error('Evidence ZIP exceeds the uncompressed size limit.');
    return allowed.has(file.name);
  } });
  const files = Object.fromEntries(Object.entries(archive).map(([name, content]) => [name, strFromU8(content)]));
  return { files, digest: sha256(bytes) };
}

export function parseEvidenceFiles(rawFiles: Record<string, string>, run: { id: number; html_url: string; status: string; conclusion: string | null }, expected: { runId?: string; baseSha?: string; headSha: string; verifierSha256?: string }, artifactSha256?: string): Evidence {
  const checks: EvidenceCheck[] = [];
  const add = (id: string, label: string, status: EvidenceCheck['status'], detail: string) => checks.push({ id, label, status, detail });
  const parse = (name: string): Record<string, unknown> | undefined => {
    if (!rawFiles[name]) return undefined;
    try { return object(JSON.parse(rawFiles[name]), name); }
    catch { add(`${name}_format`, `${name} is valid JSON`, 'failed', 'The artifact was malformed.'); return undefined; }
  };
  const policy = parse('candidate-policy.json');
  const runtime = parse('runtime-probe.json');
  const provenance = parse('run-provenance.json');
  const baseSha = typeof policy?.base_sha === 'string' ? policy.base_sha : '';
  const candidateSha = typeof policy?.candidate_sha === 'string' ? policy.candidate_sha : '';
  const verifierSha256 = typeof policy?.verifier_sha256 === 'string' ? policy.verifier_sha256 : '';
  const identityValid = candidateSha === expected.headSha && /^[a-f0-9]{40}$/.test(baseSha) && (!expected.baseSha || baseSha === expected.baseSha) && /^[a-f0-9]{64}$/.test(verifierSha256) && (!expected.verifierSha256 || verifierSha256 === expected.verifierSha256);
  add('evidence_identity', 'Evidence commit and frozen verifier identity', !policy ? 'not-run' : identityValid ? 'passed' : 'failed', policy ? `Base ${baseSha || 'missing'}; candidate ${candidateSha || 'missing'}; verifier ${verifierSha256 || 'missing'}.` : 'Candidate policy artifact was not produced.');
  const provenanceValid = provenance && provenance.github_run_id === String(run.id) && (!expected.runId || provenance.proofpatch_run_id === expected.runId) && provenance.base_sha === baseSha && provenance.candidate_sha === expected.headSha && provenance.verifier_sha256 === verifierSha256 && provenance.workflow_sha === baseSha && provenance.model_execution === 'NOT_ATTESTED_BY_CI' && provenance.merge_ready === false && provenance.finding_closed === false;
  add('workflow_provenance', 'Run-bound trusted workflow provenance', !provenance ? 'not-run' : provenanceValid ? 'passed' : 'failed', provenanceValid ? `ProofPatch run ${String(provenance?.proofpatch_run_id)}; GitHub run ${run.id}; trusted workflow ${baseSha}. CI does not attest model invocation.` : 'Missing or mismatched controller, Actions, workflow, candidate or verifier identity.');
  const assessment = policy?.assessment && typeof policy.assessment === 'object' ? object(policy.assessment, 'Policy assessment') : undefined;
  const requiredPolicy = ['docker_parser_directives_absent', 'reviewed_runtime_release', 'reviewed_image_digest', 'composer_floor', 'upload_progress_startup_setting', 'startup_config_is_copied', 'unprivileged_fixture_user'];
  const policyChecks = Array.isArray(assessment?.checks) ? assessment.checks.map((value) => object(value, 'Policy check')) : [];
  for (const id of requiredPolicy) {
    const matching = policyChecks.filter((check) => check.id === id);
    const check = matching.length === 1 ? matching[0] : undefined;
    add(`policy_${id}`, id.replaceAll('_', ' '), !assessment ? 'not-run' : check?.pass === true ? 'passed' : 'failed', typeof check?.detail === 'string' ? check.detail.slice(0, 1_000) : 'Required policy assertion missing or duplicated.');
  }
  const changedPaths = Array.isArray(policy?.changed_paths) ? policy.changed_paths : [];
  const scopeValid = JSON.stringify([...changedPaths].sort()) === JSON.stringify([...allowedPaths].sort());
  add('candidate_policy', 'Candidate scope and static policy', !policy ? 'not-run' : scopeValid && assessment?.security_policy === 'PASS' && policyChecks.length === requiredPolicy.length && requiredPolicy.every((id) => policyChecks.filter((check) => check.id === id && check.pass === true).length === 1) ? 'passed' : 'failed', `Three allowed changed paths: ${scopeValid}; static policy ${String(assessment?.security_policy ?? 'missing')}.`);
  if (runtime && runtime.checks && typeof runtime.checks === 'object') {
    const values = object(runtime.checks, 'Runtime checks');
    const observed: Record<string, boolean> = { runtime_matches_reviewed_release: runtime.php_version === '8.3.36', upload_progress_disabled_at_startup: runtime.upload_progress_enabled === '' || runtime.upload_progress_enabled === '0', expected_serializer: runtime.serialize_handler === 'php' };
    for (const key of ['runtime_matches_reviewed_release', 'upload_progress_disabled_at_startup', 'expected_serializer']) add(`runtime_${key}`, key.replaceAll('_', ' '), values[key] === true && observed[key] ? 'passed' : 'failed', `Observed PHP ${typeof runtime.php_version === 'string' ? runtime.php_version : 'unknown'}; upload progress ${String(runtime.upload_progress_enabled)}; serializer ${String(runtime.serialize_handler)}.`);
  } else add('runtime_execution', 'Actual PHP runtime checks', 'not-run', 'No runtime-probe artifact was produced.');
  const businessLog = rawFiles['business-checks.txt'];
  if (businessLog) {
    const passed = businessLog.split(/\r?\n/).filter((line) => line.startsWith('PASS: '));
    for (const [index, line] of passed.entries()) add(`business_${index + 1}`, line.slice(6, 200), 'passed', 'Observed frozen PHP business assertion.');
    add('business_suite', 'All 15 business regressions', passed.length === 15 && businessLog.includes('15 business checks passed.') && !/(?:^|\n)FAIL:/.test(businessLog) ? 'passed' : 'failed', `${passed.length} passing business assertions recorded; expected exactly 15.`);
  } else add('business_suite', 'All 15 business regressions', 'not-run', 'No business-check artifact was produced.');
  const builtImageId = rawFiles['built-image-id.txt']?.trim();
  add('built_image', 'Candidate container image built', !builtImageId ? 'not-run' : /^sha256:[a-f0-9]{64}$/.test(builtImageId) ? 'passed' : 'failed', builtImageId || 'No built-image identity was produced.');
  add('trusted_workflow', 'Trusted hosted workflow completed', run.conclusion === 'success' ? 'passed' : 'failed', `Actions ${run.status}; conclusion ${run.conclusion ?? 'pending'}.`);
  return { ci: { id: run.id, url: run.html_url, status: run.status, conclusion: run.conclusion }, checks, ...(runtime ? { runtime } : {}), ...(businessLog ? { businessLog } : {}), ...(policy ? { policy } : {}), ...(builtImageId ? { builtImageId } : {}), ...(artifactSha256 ? { artifactSha256 } : {}), baseSha, candidateSha, verifierSha256, rawFiles };
}

export async function waitForVerification(input: { runId: string; headSha: string; startedAt: string; baseSha?: string; verifierSha256?: string }, onProgress: (progress: VerificationProgress) => void | Promise<void>, signal?: AbortSignal): Promise<Evidence> {
  commitSha(input.headSha);
  if (!/^[a-zA-Z0-9_-]{4,100}$/.test(input.runId) || !Number.isFinite(Date.parse(input.startedAt))) throw new Error('Verification run identity or start time is invalid.');
  const deadline = Date.now() + 8 * 60_000;
  let current: ActionRun | undefined;
  let lastProgress = '';
  while (Date.now() < deadline) {
    signal?.throwIfAborted();
    if (!current) {
      const data = object(await json(`${repoPath}/actions/workflows/fixture-evidence.yml/runs?event=workflow_dispatch&per_page=30`, { signal }), 'Workflow runs');
      if (!Array.isArray(data.workflow_runs)) throw new Error('GitHub workflow run listing was invalid.');
      const matching = data.workflow_runs.map(actionRun).filter((run) => run.event === 'workflow_dispatch' && run.display_title === `ProofPatch ${input.runId}` && Date.parse(run.created_at) >= Date.parse(input.startedAt) - 60_000);
      matching.sort((left, right) => right.id - left.id);
      current = matching[0];
    } else current = actionRun(await json(`${repoPath}/actions/runs/${current.id}`, { signal }));
    if (current) {
      const data = object(await json(`${repoPath}/actions/runs/${current.id}/jobs?per_page=20`, { signal }), 'Workflow jobs');
      const jobs = Array.isArray(data.jobs) ? data.jobs.map((job) => object(job, 'Workflow job')) : [];
      const steps = jobs.flatMap((job) => Array.isArray(job.steps) ? job.steps.map((item) => {
        const step = object(item, 'Workflow step');
        return { name: string(step.name, 'Step name'), status: string(step.status, 'Step status'), conclusion: typeof step.conclusion === 'string' ? step.conclusion : null };
      }) : []);
      const signature = JSON.stringify([current.status, current.conclusion, steps]);
      if (signature !== lastProgress) {
        await onProgress({ status: current.status, message: `GitHub Actions: ${current.status}${current.conclusion ? ` (${current.conclusion})` : ''}`, ciUrl: current.html_url, steps });
        lastProgress = signature;
      }
      if (current.status === 'completed') {
        const data = object(await json(`${repoPath}/actions/runs/${current.id}/artifacts?per_page=30`, { signal }), 'Workflow artifacts');
        if (!Array.isArray(data.artifacts)) throw new Error('GitHub artifact listing was invalid.');
        const artifact = data.artifacts.map((value) => object(value, 'Workflow artifact')).find((value) => value.name === `candidate-evidence-${input.headSha}` && value.expired === false);
        let rawFiles: Record<string, string> = {};
        let artifactSha256: string | undefined;
        if (artifact) {
          if (!Number.isInteger(artifact.id) || typeof artifact.size_in_bytes !== 'number' || artifact.size_in_bytes > maxArtifactBytes) throw new Error('Workflow evidence archive exceeded its size or identity limit.');
          const archive = await downloadArtifact(artifact.id as number, signal);
          if (typeof artifact.digest === 'string' && /^sha256:[a-f0-9]{64}$/.test(artifact.digest) && artifact.digest !== `sha256:${archive.digest}`) throw new Error('Downloaded evidence archive does not match the GitHub artifact digest.');
          rawFiles = archive.files; artifactSha256 = archive.digest;
        }
        return parseEvidenceFiles(rawFiles, current, input, artifactSha256);
      }
    } else if (!lastProgress) {
      await onProgress({ status: 'queued', message: 'Waiting for GitHub to schedule the trusted dispatch workflow.' });
      lastProgress = 'waiting';
    }
    await abortableDelay(6_000, signal);
  }
  throw new Error('Hosted PHP verification exceeded the eight-minute runner deadline. Inspect GitHub Actions before retrying; no draft PR was approved.');
}

export async function ensureDraftPullRequest(input: { branch: string; title: string; body: string; expectedHeadSha: string; beforeWrite?: () => void }, signal?: AbortSignal): Promise<{ url: string; number: number; draft: boolean; reused: boolean }> {
  branchName(input.branch); string(input.title, 'Draft PR title', 250); string(input.body, 'Draft PR body', 60_000);
  commitSha(input.expectedHeadSha, 'Verified candidate SHA');
  const assertCurrentHead = async () => {
    const ref = object(await json(`${repoPath}/git/ref/heads/${input.branch}`, { signal }), 'Publication branch');
    const actual = commitSha(object(ref.object, 'Publication branch object').sha);
    if (actual !== input.expectedHeadSha) throw new Error('Candidate branch moved after verification. Refusing to publish or reuse a PR with stale evidence.');
  };
  await assertCurrentHead();
  const list = await json(`${repoPath}/pulls?state=all&head=${encodeURIComponent(`Harsh5840:${input.branch}`)}&base=main&per_page=20`, { signal });
  if (!Array.isArray(list)) throw new Error('GitHub pull-request listing was invalid.');
  const existing = list.map((value) => object(value, 'Existing PR')).find((value) => object(value.head, 'PR head').ref === input.branch);
  const parse = (value: Record<string, unknown>, reused: boolean) => {
    const url = string(value.html_url, 'Draft PR URL');
    if (!url.startsWith(`https://github.com/${targetRepository}/pull/`) || !Number.isInteger(value.number) || typeof value.draft !== 'boolean') throw new Error('GitHub draft PR response was invalid.');
    const head = object(value.head, 'Draft PR head');
    if (head.ref !== input.branch || head.sha !== input.expectedHeadSha) throw new Error('Draft PR head does not match the verified candidate. No merge or deployment action was taken.');
    if (value.state !== 'open' || value.draft !== true || value.merged_at !== null) throw new Error('PR is closed, merged or no longer a draft. Refusing to republish or change its human-owned review state.');
    return { url, number: value.number as number, draft: value.draft, reused };
  };
  if (existing) {
    const result = parse(existing, true);
    return result;
  }
  await assertCurrentHead();
  const created = object(await json(`${repoPath}/pulls`, { method: 'POST', body: { title: input.title, body: input.body, head: input.branch, base: 'main', draft: true, maintainer_can_modify: false }, signal, beforeWrite: input.beforeWrite }), 'Created draft PR');
  const result = parse(created, false);
  if (!result.draft) throw new Error('GitHub did not create a draft PR as required. No merge or deployment action was taken.');
  return result;
}

export function clearGitHubCredentialCacheForTests(): void { credentialPromise = undefined; }
