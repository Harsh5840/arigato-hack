import { strFromU8, unzipSync } from 'fflate';
import type { Dependency } from '../../../../packages/contracts/src/monitoring.js';
import type { CandidateDiff } from '../../../../packages/contracts/src/live.js';
import type { Evidence, EvidenceCheck, VerificationProgress } from './types.js';
import { getGitHubCredential, GitHubAdapterError } from './github.js';
import { abortableDelay, boundedBytes, boundedJson, combinedSignal, object, sha256, string } from './http.js';
import { isInventoryPath, parseInventoryFiles, repositoryBytesLimit, safeRepositoryPath } from './inventory.js';

export interface RepositoryRef { owner: string; name: string; defaultBranch?: string }
export interface RepositorySnapshot extends RepositoryRef {
  url: string; defaultBranch: string; canPush: boolean; sha: string; treeSha: string;
  inventory: Dependency[]; files: Record<string, string>; warnings: string[];
  paths: string[]; private: boolean;
}
export function parseRepository(input: string | RepositoryRef): RepositoryRef {
  let owner: string, name: string;
  if (typeof input === 'string') {
    let url: URL;
    try { url = new URL(input); } catch { throw new Error('Use an HTTPS github.com owner/repository URL.'); }
    if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.username || url.password || url.search || url.hash) throw new Error('Only clean HTTPS github.com repository URLs are supported.');
    const parts = url.pathname.replace(/\/$/, '').split('/').filter(Boolean);
    if (parts.length !== 2) throw new Error('Select a repository root, not a file, pull request or organization URL.');
    [owner, name] = parts; name = name.replace(/\.git$/, '');
  } else { owner = input.owner; name = input.name; }
  if (typeof owner !== 'string' || typeof name !== 'string' || !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(owner) || !/^[A-Za-z0-9_.-]{1,100}$/.test(name) || name === '.' || name === '..' || name.endsWith('.git')) throw new Error('GitHub repository owner or name is invalid.');
  return { owner, name, ...(typeof input !== 'string' && input.defaultBranch ? { defaultBranch: input.defaultBranch } : {}) };
}
function identity(value: unknown, label = 'Git object identity'): string {
  const result = string(value, label, 40);
  if (!/^[a-f0-9]{40}$/.test(result)) throw new Error(`${label} must be a complete commit or tree SHA.`);
  return result;
}
function safeBranch(branch: string): string {
  if (!/^proofpatch\/[a-z0-9][a-z0-9._-]{1,110}$/.test(branch) || branch.includes('..') || branch.endsWith('.lock')) throw new Error('Candidate branch must be a bounded proofpatch/<safe-id> branch.');
  return branch;
}
function safeWorkflow(workflow: string): string {
  if (!/^[a-zA-Z0-9_-]{1,100}\.ya?ml$/.test(workflow)) throw new Error('Verification workflow filename is invalid.');
  return workflow;
}
function runIdentity(runId: string): void { if (!/^[a-zA-Z0-9_-]{4,100}$/.test(runId)) throw new Error('Verification run identity is invalid.'); }
async function api(repo: RepositoryRef, suffix: string, options: { method?: 'GET' | 'POST'; body?: unknown; signal?: AbortSignal; raw?: boolean; beforeWrite?: () => void } = {}): Promise<Response> {
  const { owner, name } = parseRepository(repo);
  if (suffix && (!suffix.startsWith('/') || /[\r\n#]/.test(suffix))) throw new Error('Repository API path is invalid.');
  const token = await getGitHubCredential();
  if (!token) throw new Error('GitHub authentication is missing; configure a repository-scoped installation token or local Git Credential Manager.');
  if (options.method === 'POST') options.beforeWrite?.();
  const response = await fetch(`https://api.github.com/repos/${owner}/${name}${suffix}`, {
    method: options.method ?? 'GET', redirect: 'manual', signal: combinedSignal(options.signal, 30_000),
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'ProofPatch-Monitor', ...(options.body === undefined ? {} : { 'content-type': 'application/json' }) },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  if (!response.ok && !(options.raw && response.status === 302)) { await response.body?.cancel(); throw new GitHubAdapterError(`GitHub returned HTTP ${response.status} for ${owner}/${name}. Check repository installation permissions or rate limits.`, response.status); }
  return response;
}
async function json(repo: RepositoryRef, path: string, options: Parameters<typeof api>[2] = {}): Promise<unknown> {
  const response = await api(repo, path, options);
  if (response.status === 204) { await response.body?.cancel(); return undefined; }
  return boundedJson(response, 2_000_000);
}
export async function getCentralRunner(signal?: AbortSignal): Promise<{repo:RepositoryRef;sha:string;workflow:string}> {
  const repo=parseRepository(process.env.PROOFPATCH_RUNNER_REPOSITORY_URL||'https://github.com/Harsh5840/arigato-hack');
  const metadata=object(await json(repo,'',{signal}),'Runner repository');
  const defaultBranch=string(metadata.default_branch,'Runner default branch',250);
  const commit=object(await json(repo,`/commits/${encodeURIComponent(defaultBranch)}`,{signal}),'Runner commit');
  return {repo:{...repo,defaultBranch},sha:identity(commit.sha),workflow:'repository-repair.yml'};
}
export async function dispatchCentralVerification(runner:{repo:RepositoryRef;sha:string;workflow:string},input:{target:RepositoryRef;baseSha:string;headSha:string;runId:string;plan:Record<string,unknown>;beforeWrite?:()=>void},signal?:AbortSignal):Promise<{startedAt:string}> {
  parseRepository(input.target); identity(input.baseSha); identity(input.headSha); identity(runner.sha);runIdentity(input.runId);safeWorkflow(runner.workflow);
  const plan=JSON.stringify(input.plan); if(plan.length>12000)throw new Error('The verification plan exceeds its bound.');
  const startedAt=new Date().toISOString();
  await json(runner.repo,`/actions/workflows/${runner.workflow}/dispatches`,{method:'POST',signal,beforeWrite:input.beforeWrite,body:{ref:runner.repo.defaultBranch??'main',inputs:{target_owner:input.target.owner,target_repo:input.target.name,base_sha:input.baseSha,head_sha:input.headSha,run_id:input.runId,plan}}});
  return {startedAt};
}
export async function readRepositorySnapshot(repo: RepositoryRef, sha: string, paths: readonly string[], signal?: AbortSignal): Promise<Record<string, string>> {
  identity(sha);
  if (paths.length > 100 || new Set(paths).size !== paths.length || paths.some((path) => !safeRepositoryPath(path))) throw new Error('Repository snapshot paths exceed the safe path or count limit.');
  const files: Record<string, string> = {};
  let total = 0;
  for (const path of paths) {
    const value = object(await json(repo, `/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${sha}`, { signal }), 'Repository file');
    if (value.type !== 'file' || value.encoding !== 'base64' || typeof value.size !== 'number' || value.size > repositoryBytesLimit) throw new Error(`Repository file ${path} is not a bounded regular UTF-8 file.`);
    const bytes = Buffer.from(string(value.content, 'Repository base64 file', 1_400_000).replace(/\s/g, ''), 'base64');
    total += bytes.length;
    if (total > repositoryBytesLimit) throw new Error('Repository snapshot exceeds one megabyte.');
    files[path] = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  }
  return files;
}
export async function readRepository(input: string | RepositoryRef, signal?: AbortSignal): Promise<RepositorySnapshot> {
  const repo = parseRepository(input);
  const metadata = object(await json(repo, '', { signal }), 'Repository metadata');
  const defaultBranch = string(metadata.default_branch, 'Default branch', 250);
  const commit = object(await json(repo, `/commits/${encodeURIComponent(defaultBranch)}`, { signal }), 'Default branch commit');
  const sha = identity(commit.sha), treeSha = identity(object(object(commit.commit, 'Commit').tree, 'Tree').sha);
  const tree = object(await json(repo, `/git/trees/${treeSha}?recursive=1`, { signal }), 'Repository tree');
  if (tree.truncated === true || !Array.isArray(tree.tree)) throw new Error('Repository tree is truncated; ProofPatch cannot claim complete dependency inventory.');
  let total = 0;
  const paths: string[] = [];
  const treePaths: string[] = [];
  for (const raw of tree.tree) {
    const entry = object(raw, 'Tree entry');
    if (typeof entry.path === 'string' && entry.type === 'blob' && ['100644','100755'].includes(String(entry.mode)) && safeRepositoryPath(entry.path) && !/(?:^|\/)(?:node_modules|vendor|\.git|\.venv)(?:\/|$)/.test(entry.path)) treePaths.push(entry.path);
    if (typeof entry.path !== 'string' || !isInventoryPath(entry.path)) continue;
    if (entry.type !== 'blob' || entry.mode !== '100644' && entry.mode !== '100755' || !safeRepositoryPath(entry.path) || !Number.isInteger(entry.size) || (entry.size as number) < 0) throw new Error('Dependency manifest is not a safe regular file.');
    total += entry.size as number;
    paths.push(entry.path);
  }
  if (paths.length > 100 || total > repositoryBytesLimit) throw new Error('Dependency manifest inventory exceeds 100 files or one megabyte.');
  const files = await readRepositorySnapshot(repo, sha, paths, signal);
  const parsed = parseInventoryFiles(files);
  const permissions = metadata.permissions && typeof metadata.permissions === 'object' ? object(metadata.permissions, 'Repository permissions') : {};
  return { ...repo, defaultBranch, url: `https://github.com/${repo.owner}/${repo.name}`, sha, treeSha, canPush: permissions.push === true, files, paths: treePaths, private: metadata.private === true, ...parsed };
}
export async function readRepositoryCandidateDiff(repo: RepositoryRef, baseSha: string, headSha: string, signal?: AbortSignal): Promise<CandidateDiff> {
  identity(baseSha); identity(headSha);
  const data = object(await json(repo, `/compare/${baseSha}...${headSha}`, { signal }), 'Candidate comparison');
  if (object(data.base_commit, 'Comparison base').sha !== baseSha || object(data.merge_base_commit, 'Comparison merge base').sha !== baseSha || data.total_commits !== 1 || !Array.isArray(data.commits) || data.commits.length !== 1 || object(data.commits[0], 'Compared commit').sha !== headSha || !Array.isArray(data.files) || data.files.length < 1 || data.files.length > 20) throw new Error('Candidate comparison does not match a bounded direct-parent repair.');
  let truncated = false;
  const files = data.files.map((raw) => {
    const file = object(raw, 'Changed file');
    const path = string(file.filename, 'Changed path', 240);
    if (!safeRepositoryPath(path) || file.status !== 'modified' || !Number.isInteger(file.additions) || !Number.isInteger(file.deletions) || (file.additions as number) < 0 || (file.deletions as number) < 0) throw new Error('Candidate comparison contains an unsupported path, creation, deletion or rename.');
    if (typeof file.patch !== 'string') truncated = true;
    return { path, status: 'modified' as const, additions: file.additions as number, deletions: file.deletions as number, patch: typeof file.patch === 'string' ? string(file.patch, 'Candidate patch', 90_000) : '' };
  });
  if (new Set(files.map((file) => file.path)).size !== files.length) throw new Error('Candidate comparison contains duplicate paths.');
  return { baseSha, candidateSha: headSha, compareUrl: `https://github.com/${repo.owner}/${repo.name}/compare/${baseSha}...${headSha}`, files, truncated };
}
type CandidateFile = { path: string; content: string };
export async function ensureRepositoryCandidate(repo: RepositoryRef, base: { sha: string; treeSha: string }, repair: { files: CandidateFile[] }, branch: string, signal?: AbortSignal, beforeWrite?: () => void): Promise<{ sha: string; branch: string }> {
  safeBranch(branch); identity(base.sha); identity(base.treeSha);
  if (!repair.files.length || repair.files.length > 20 || new Set(repair.files.map((file) => file.path)).size !== repair.files.length || repair.files.some((file) => !safeRepositoryPath(file.path) || /(?:^|\/)(?:\.github|verification|\.git)(?:\/|$)/.test(file.path) || !file.content || Buffer.byteLength(file.content) > 100_000) || Buffer.byteLength(JSON.stringify(repair.files)) > repositoryBytesLimit) throw new Error('Candidate files exceed the allowed source/manifest repair scope. Trusted verifiers and workflows cannot be changed.');
  const existing = async (): Promise<{ sha: string; branch: string } | null> => {
    let ref: Record<string, unknown>;
    try { ref = object(await json(repo, `/git/ref/heads/${branch}`, { signal }), 'Candidate reference'); }
    catch (error) { if (error instanceof GitHubAdapterError && error.status === 404) return null; throw error; }
    const sha = identity(object(ref.object, 'Reference target').sha);
    const commit = object(await json(repo, `/git/commits/${sha}`, { signal }), 'Existing candidate commit');
    if (!Array.isArray(commit.parents) || commit.parents.length !== 1 || object(commit.parents[0], 'Candidate parent').sha !== base.sha) throw new Error('Existing candidate has a different base; refusing to overwrite it.');
    const diff = await readRepositoryCandidateDiff(repo, base.sha, sha, signal);
    if (JSON.stringify(diff.files.map((file) => file.path).sort()) !== JSON.stringify(repair.files.map((file) => file.path).sort())) throw new Error('Existing candidate contains a different changed-file scope; refusing to reuse it.');
    const contents = await readRepositorySnapshot(repo, sha, repair.files.map((file) => file.path), signal);
    if (repair.files.some((file) => contents[file.path] !== file.content)) throw new Error('Existing candidate content differs; refusing to force-push.');
    return { sha, branch };
  };
  const previous = await existing(); if (previous) return previous;
  const blobs = [];
  for (const file of repair.files) {
    const blob = object(await json(repo, '/git/blobs', { method: 'POST', body: { content: file.content, encoding: 'utf-8' }, signal, beforeWrite }), 'Created blob');
    blobs.push({ path: file.path, mode: '100644', type: 'blob', sha: identity(blob.sha) });
  }
  const tree = object(await json(repo, '/git/trees', { method: 'POST', body: { base_tree: base.treeSha, tree: blobs }, signal, beforeWrite }), 'Candidate tree');
  const commit = object(await json(repo, '/git/commits', { method: 'POST', body: { message: 'fix: remediate corroborated dependency advisory\n\nGenerated by ProofPatch; human review remains required.', tree: identity(tree.sha), parents: [base.sha] }, signal, beforeWrite }), 'Candidate commit');
  const sha = identity(commit.sha);
  try { await json(repo, '/git/refs', { method: 'POST', body: { ref: `refs/heads/${branch}`, sha }, signal, beforeWrite }); }
  catch (error) { if (error instanceof GitHubAdapterError && error.status === 422) { const reconciled = await existing(); if (reconciled) return reconciled; } throw error; }
  return { sha, branch };
}
export async function dispatchRepositoryVerification(repo: RepositoryRef, input: { baseSha: string; headSha: string; runId: string; workflow: string; beforeWrite?: () => void }, signal?: AbortSignal): Promise<{ startedAt: string }> {
  identity(input.baseSha); identity(input.headSha); runIdentity(input.runId); safeWorkflow(input.workflow);
  const startedAt = new Date().toISOString();
  await json(repo, `/actions/workflows/${input.workflow}/dispatches`, { method: 'POST', body: { ref: repo.defaultBranch ?? 'main', inputs: { base_sha: input.baseSha, head_sha: input.headSha, run_id: input.runId } }, signal, beforeWrite: input.beforeWrite });
  return { startedAt };
}

export interface RepositoryVerificationInput { workflow: string; runId: string; baseSha: string; headSha: string; startedAt: string; verifierSha256: string; requiredCheckIds?: string[]; workflowSha?: string; targetRepository?: string }
interface ActionRun { id: number; html_url: string; status: string; conclusion: string | null; display_title: string; created_at: string; event: string; head_sha: string }
function parseActionRun(repo: RepositoryRef, raw: unknown): ActionRun {
  const data = object(raw, 'Actions run');
  const prefix = `https://github.com/${repo.owner}/${repo.name}/actions/runs/`;
  if (!Number.isInteger(data.id) || (data.id as number) <= 0 || data.html_url !== `${prefix}${data.id}`) throw new Error('Actions run URL or identity does not match this repository.');
  return { id: data.id as number, html_url: data.html_url as string, status: string(data.status, 'Run status'), conclusion: data.conclusion === null ? null : string(data.conclusion, 'Run conclusion'), display_title: string(data.display_title, 'Run title'), created_at: string(data.created_at, 'Run creation time'), event: string(data.event, 'Run event'), head_sha: identity(data.head_sha) };
}
export function parseRepositoryEvidence(rawFiles: Record<string, string>, run: { id: number; html_url: string; status: string; conclusion: string | null; head_sha: string }, expected: RepositoryVerificationInput, artifactSha256?: string): Evidence {
  let value: Record<string, unknown> = {};
  try { if (rawFiles['verification.json']) value = object(JSON.parse(rawFiles['verification.json']), 'Verification evidence'); } catch { /* A failed identity check below blocks publication. */ }
  const checks: EvidenceCheck[] = [];
  const add = (id: string, label: string, pass: boolean, detail: string) => checks.push({ id, label, status: pass ? 'passed' : 'failed', detail });
  const workflowSha=expected.workflowSha??expected.baseSha;
  const validIdentity = value.base_sha === expected.baseSha && value.candidate_sha === expected.headSha && value.run_id === expected.runId && value.verifier_sha256 === expected.verifierSha256 && value.workflow_sha === workflowSha && value.github_run_id === String(run.id) && run.head_sha === workflowSha && (!expected.targetRepository || value.target_repository === expected.targetRepository);
  add('evidence_identity', 'Verified candidate, frozen oracle and workflow run match', validIdentity, `Expected candidate ${expected.headSha}; base ${expected.baseSha}; Actions ${run.id}.`);
  const evidenceChecks = Array.isArray(value.checks) && value.checks.length <= 100 ? value.checks.map((entry) => object(entry, 'Verification check')) : [];
  const validChecks = evidenceChecks.length > 0 && new Set(evidenceChecks.map((entry) => entry.id)).size === evidenceChecks.length && evidenceChecks.every((entry) => typeof entry.id === 'string' && /^[a-z0-9_-]{1,100}$/.test(entry.id) && typeof entry.label === 'string' && entry.label.length <= 300 && typeof entry.pass === 'boolean' && typeof entry.detail === 'string' && entry.detail.length <= 3000) && (expected.requiredCheckIds ?? []).every((id) => evidenceChecks.some((entry) => entry.id === id));
  add('evidence_schema', 'Complete required verification assertions', validChecks, validChecks ? `${evidenceChecks.length} distinct frozen assertions recorded.` : 'Missing, duplicated, malformed or incomplete check assertions.');
  if (validChecks) for (const entry of evidenceChecks) add(`runner_${entry.id}`, entry.label as string, entry.pass === true && validIdentity, entry.detail as string);
  add('trusted_workflow', 'Trusted hosted workflow completed', run.status === 'completed' && run.conclusion === 'success', `Actions ${run.status}; conclusion ${run.conclusion ?? 'pending'}.`);
  const runtime = value.runtime && typeof value.runtime === 'object' && !Array.isArray(value.runtime) ? value.runtime as Record<string, unknown> : undefined;
  return { ci: { id: run.id, url: run.html_url, status: run.status, conclusion: run.conclusion }, checks, ...(runtime ? { runtime } : {}), ...(typeof value.businessLog === 'string' ? { businessLog: value.businessLog.slice(0, 100_000) } : {}), policy: value, baseSha: typeof value.base_sha === 'string' ? value.base_sha : '', candidateSha: typeof value.candidate_sha === 'string' ? value.candidate_sha : '', verifierSha256: typeof value.verifier_sha256 === 'string' ? value.verifier_sha256 : '', ...(artifactSha256 ? { artifactSha256 } : {}), rawFiles };
}
async function downloadRepositoryArtifact(repo: RepositoryRef, artifact: Record<string, unknown>, signal?: AbortSignal): Promise<{ files: Record<string, string>; digest: string }> {
  if (!Number.isInteger(artifact.id) || (artifact.id as number) <= 0 || typeof artifact.size_in_bytes !== 'number' || artifact.size_in_bytes > 5_000_000) throw new Error('Verification artifact size or identity is invalid.');
  const response = await api(repo, `/actions/artifacts/${artifact.id}/zip`, { raw: true, signal });
  let bytes: Uint8Array;
  if (response.status === 302) {
    const location = response.headers.get('location'); await response.body?.cancel();
    if (!location) throw new Error('Artifact redirect has no location.');
    const url = new URL(location);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !(url.hostname.endsWith('.actions.githubusercontent.com') || url.hostname.endsWith('.blob.core.windows.net'))) throw new Error('Artifact redirect is outside approved GitHub storage.');
    const archive = await fetch(url, { redirect: 'error', signal: combinedSignal(signal, 30_000), headers: { accept: 'application/zip' } });
    if (!archive.ok) { await archive.body?.cancel(); throw new Error(`Artifact storage returned HTTP ${archive.status}.`); }
    bytes = await boundedBytes(archive, 5_000_000);
  } else bytes = await boundedBytes(response, 5_000_000);
  const digest = sha256(bytes);
  if (typeof artifact.digest === 'string' && artifact.digest !== `sha256:${digest}`) throw new Error('Evidence archive does not match the GitHub artifact digest.');
  let size = 0;
  const archive = unzipSync(bytes, { filter(file) { size += file.originalSize; if (size > 6_000_000 || file.originalSize > 2_000_000) throw new Error('Evidence archive is too large after decompression.'); return ['verification.json','generated-files.json'].includes(file.name); } });
  return { files: Object.fromEntries(Object.entries(archive).map(([name, content]) => [name, strFromU8(content)])), digest };
}
export async function waitRepositoryVerification(repo: RepositoryRef, input: RepositoryVerificationInput, onProgress: (progress: VerificationProgress) => void | Promise<void>, signal?: AbortSignal): Promise<Evidence> {
  safeWorkflow(input.workflow); runIdentity(input.runId); identity(input.baseSha); identity(input.headSha);
  if (!/^[a-f0-9]{64}$/.test(input.verifierSha256) || !Number.isFinite(Date.parse(input.startedAt))) throw new Error('Verification oracle digest or start time is invalid.');
  const deadline = Date.now() + 12 * 60_000;
  let current: ActionRun | undefined, previous = '';
  while (Date.now() < deadline) {
    signal?.throwIfAborted();
    if (!current) {
      const data = object(await json(repo, `/actions/workflows/${input.workflow}/runs?event=workflow_dispatch&per_page=30`, { signal }), 'Workflow runs');
      if (!Array.isArray(data.workflow_runs)) throw new Error('Workflow run list is invalid.');
      current = data.workflow_runs.map((raw) => parseActionRun(repo, raw)).filter((run) => run.event === 'workflow_dispatch' && run.display_title === `ProofPatch ${input.runId}` && Date.parse(run.created_at) >= Date.parse(input.startedAt) - 60_000).sort((a, b) => b.id - a.id)[0];
    } else current = parseActionRun(repo, await json(repo, `/actions/runs/${current.id}`, { signal }));
    if (current) {
      if (current.head_sha !== (input.workflowSha??input.baseSha)) throw new Error('Runner workflow changed before execution. Evidence cannot be bound to the frozen workflow.');
      const data = object(await json(repo, `/actions/runs/${current.id}/jobs?per_page=20`, { signal }), 'Workflow jobs');
      const jobs = Array.isArray(data.jobs) ? data.jobs.map((raw) => object(raw, 'Workflow job')) : [];
      const steps = jobs.flatMap((job) => Array.isArray(job.steps) ? job.steps.map((raw) => { const step = object(raw, 'Workflow step'); return { name: string(step.name, 'Step name', 300), status: string(step.status, 'Step status'), conclusion: typeof step.conclusion === 'string' ? step.conclusion : null }; }) : []);
      const signature = JSON.stringify([current.status, current.conclusion, steps]);
      if (previous !== signature) { previous = signature; await onProgress({ status: current.status, message: `Hosted verification: ${current.status}${current.conclusion ? ` (${current.conclusion})` : ''}`, ciUrl: current.html_url, steps }); }
      if (current.status === 'completed') {
        const listing = object(await json(repo, `/actions/runs/${current.id}/artifacts?per_page=30`, { signal }), 'Workflow artifacts');
        if (!Array.isArray(listing.artifacts)) throw new Error('Workflow artifact listing is invalid.');
        const artifacts = listing.artifacts.map((raw) => object(raw, 'Workflow artifact')).filter((artifact) => artifact.name === `proofpatch-${input.runId}` && artifact.expired === false);
        if (artifacts.length > 1) throw new Error('Workflow produced ambiguous duplicate evidence artifacts.');
        const downloaded = artifacts[0] ? await downloadRepositoryArtifact(repo, artifacts[0], signal) : undefined;
        return parseRepositoryEvidence(downloaded?.files ?? {}, current, input, downloaded?.digest);
      }
    } else if (!previous) { previous = 'queued'; await onProgress({ status: 'queued', message: 'Waiting for the trusted repository verification workflow.' }); }
    await abortableDelay(6_000, signal);
  }
  throw new Error('Hosted verification exceeded eight minutes. Inspect GitHub Actions before retrying; no PR was approved.');
}
export async function ensureRepositoryDraftPullRequest(repo: RepositoryRef, input: { branch: string; title: string; body: string; expectedHeadSha: string; beforeWrite?: () => void }, signal?: AbortSignal): Promise<{ url: string; number: number; draft: boolean; reused: boolean }> {
  parseRepository(repo); safeBranch(input.branch); identity(input.expectedHeadSha); string(input.title, 'Draft PR title', 250); string(input.body, 'Draft PR body', 60_000);
  const assertHead = async () => { const ref = object(await json(repo, `/git/ref/heads/${input.branch}`, { signal }), 'Candidate branch'); if (object(ref.object, 'Candidate branch target').sha !== input.expectedHeadSha) throw new Error('Candidate branch moved after verification; stale evidence cannot publish a PR.'); };
  const parse = (raw: unknown, reused: boolean) => {
    const value = object(raw, 'Draft PR'), head = object(value.head, 'PR head');
    if (!Number.isInteger(value.number) || value.html_url !== `https://github.com/${repo.owner}/${repo.name}/pull/${value.number}` || head.ref !== input.branch || head.sha !== input.expectedHeadSha || value.draft !== true || value.state !== 'open' || value.merged_at !== null) throw new Error('PR is not an open draft at the verified candidate SHA. Its human-owned state was not changed.');
    return { url: value.html_url as string, number: value.number as number, draft: true, reused };
  };
  await assertHead();
  const list = await json(repo, `/pulls?state=all&head=${encodeURIComponent(`${repo.owner}:${input.branch}`)}&base=${encodeURIComponent(repo.defaultBranch ?? 'main')}&per_page=30`, { signal });
  if (!Array.isArray(list)) throw new Error('Pull request listing was invalid.');
  const existing = list.find((raw) => object(object(raw, 'PR').head, 'PR head').ref === input.branch);
  if (existing) return parse(existing, true);
  await assertHead();
  return parse(await json(repo, '/pulls', { method: 'POST', body: { title: input.title, body: input.body, head: input.branch, base: repo.defaultBranch ?? 'main', draft: true, maintainer_can_modify: false }, signal, beforeWrite: input.beforeWrite }), false);
}
