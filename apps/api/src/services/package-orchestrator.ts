import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Run, AgentCall, Check } from '../../../../packages/contracts/src/live.js';
import type { SupplyFinding } from '../../../../packages/contracts/src/monitoring.js';
import type { RunStore } from '../db/client.js';
import type { MonitoringStore } from '../db/monitoring.js';
import { buildSecurityGraph, type SecurityNodes } from '../graphs/security-graph.js';
import { SqliteGraphSaver } from '../graphs/sqlite-checkpointer.js';
import * as repository from '../adapters/repository.js';
import { scanDependencies } from '../adapters/supply-sources.js';
import { scanContainerDependencies } from '../adapters/container-supply.js';
import { analyzePackage, projectSeniorReviewEvidence, proposePackageRepair, reviewPackageRepair } from '../adapters/package-groq.js';
import { configuredModels } from '../adapters/groq.js';
import { getRepositoryRepairCapability, loadRepairContext } from './stack-discovery.js';
import { discoverRepairPolicy, frozenRepairDigest, requiredRepairChecks, validateGenericRepair, type RepairPolicy } from './repair-policy.js';
import { imageReferences, imageMatches, replacementImage, type RepairTarget } from '../../../../scripts/verification/repair-policy.mjs';
import type { Evidence, Repair, Review } from '../adapters/types.js';

// Historical fixture-test compatibility only. Runtime uses discovered policies.
export const pythonAllowedPaths = ['requirements.txt', 'service/client.py'] as const;
export const pythonVerifierPaths = ['verification/verify.mjs', 'verification/business.py'] as const;
export const packageRequiredChecks = ['scope', 'verifier', 'package_version', 'business_suite', 'no_known_advisories'];
export function frozenPackageDigest(files: Record<string, string>) {
  return createHash('sha256').update(JSON.stringify(pythonVerifierPaths.map(path => { if (!files[path]) throw new Error(`Missing frozen verifier ${path}.`); return [path, createHash('sha256').update(files[path]).digest('hex')]; }))).digest('hex');
}
export function validatePackageRepair(finding: SupplyFinding, baseFiles: Record<string, string>, files: Repair['files']) {
  if (finding.ecosystem !== 'PyPI' || finding.packageName.toLowerCase() !== 'requests' || finding.manifestPath !== 'requirements.txt') throw new Error('This repair policy supports the reviewed Python requests fixture. Other ecosystems remain monitored until a verification policy is installed.');
  if (!files.length || files.length > 2 || new Set(files.map(file => file.path)).size !== files.length || files.some(file => !(pythonAllowedPaths as readonly string[]).includes(file.path) || file.content.length > 30_000 || file.content.includes('\0'))) throw new Error('Repair exceeded the maintainer-approved Python file scope.');
  const candidate = { ...Object.fromEntries(pythonAllowedPaths.map(path => [path, baseFiles[path]])), ...Object.fromEntries(files.map(file => [file.path, file.content])) };
  if (![`requests==${finding.fixedVersion}`, `requests==${finding.fixedVersion}\n`].includes(candidate['requirements.txt'])) throw new Error('The package pin differs from the authoritative published safe version. Extra dependencies, whitespace, flags and URLs are not allowed.');
  if (candidate['requirements.txt'] === baseFiles['requirements.txt']) throw new Error('The candidate did not update the affected package.');
  if (candidate['service/client.py'] !== baseFiles['service/client.py']) throw new Error('This reviewed Requests upgrade preserves application source. Compatibility code edits require a separate maintainer-approved repair policy.');
  return candidate;
}

interface GeneratedFileIdentity { targetRepository: string; runId: string; baseSha: string; candidateSha: string; workflowSha: string; githubRunId: number; verifierSha256: string }
/** A dependency edit is mechanical. The model explains the remediation; this
 * tool substitutes only the controller-corroborated image token in baseline bytes. */
export function renderContainerImageRepair(content: string, target: RepairTarget): string {
  let count = 0;
  const rendered = content.split(/(?<=\n)/).map(line => {
    const selected = imageReferences(line).filter(image => imageMatches(image, target));
    if (selected.length > 1) throw new Error('A container line has ambiguous selected image references.');
    if (!selected.length) return line;
    count++;
    return line.replace(selected[0], replacementImage(selected[0], target));
  }).join('');
  if (!count || rendered === content) throw new Error('The selected affected image token is missing or has no approved replacement.');
  return rendered;
}
/** Resolver-produced integrity metadata is bound to the exact preparation run. */
export function parseGeneratedLockfiles(raw: string | undefined, policy: RepairPolicy, expected: GeneratedFileIdentity): Repair['files'] {
  if (!raw || Buffer.byteLength(raw) > 2_000_000) throw new Error('The trusted preparation artifact is missing or oversized.');
  let value: Record<string, unknown>;
  try { value = JSON.parse(raw); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); }
  catch { throw new Error('The trusted preparation artifact is not a JSON object.'); }
  const actionId = value.github_run_id;
  const actionMatches = (typeof actionId === 'number' && Number.isSafeInteger(actionId) || typeof actionId === 'string' && /^[1-9]\d*$/.test(actionId)) && String(actionId) === String(expected.githubRunId);
  if (value.target_repository !== expected.targetRepository || value.run_id !== expected.runId || value.base_sha !== expected.baseSha || value.candidate_sha !== expected.candidateSha || value.workflow_sha !== expected.workflowSha || !actionMatches || value.verifier_sha256 !== expected.verifierSha256) throw new Error('Generated lockfile identity does not match the exact trusted preparation run.');
  const allowed = policy.allowedPaths.filter(path => /(?:^|\/)(?:package-lock\.json|composer\.lock)$/.test(path));
  if (!Array.isArray(value.files) || value.files.length !== allowed.length || !allowed.length) throw new Error('The trusted preparation artifact must contain every allowed lockfile exactly once.');
  const result = value.files.map(rawFile => {
    if (!rawFile || typeof rawFile !== 'object' || Array.isArray(rawFile)) throw new Error('Generated lockfile entry is invalid.');
    const file = rawFile as Record<string, unknown>;
    if (Object.keys(file).sort().join(',') !== 'content,path' || typeof file.path !== 'string' || !allowed.includes(file.path) || typeof file.content !== 'string' || !file.content.length || file.content.length > 1_000_000 || file.content.includes('\0')) throw new Error('The resolver attempted a protected path or returned invalid lockfile bytes.');
    return { path: file.path, content: file.content };
  });
  if (new Set(result.map(file => file.path)).size !== result.length) throw new Error('The trusted preparation artifact repeats a lockfile.');
  return result;
}
export function assertGenericEvidence(evidence: Evidence, expected: { baseSha: string; candidateSha: string; verifier: string; required: readonly string[] }) {
  if (evidence.ci.conclusion !== 'success' || evidence.baseSha !== expected.baseSha || evidence.candidateSha !== expected.candidateSha || evidence.verifierSha256 !== expected.verifier || evidence.checks.some(item => item.status !== 'passed') || expected.required.some(key => !evidence.checks.some(item => item.id === `runner_${key}` && item.status === 'passed'))) throw new Error('Trusted verification failed, is missing, or does not match this exact candidate and frozen test suite.');
}

export async function executePackageRun(store: RunStore, monitor: MonitoringStore, id: string, projectRoot: string) {
  const control = new AbortController(), signal = control.signal;
  const deadline = setTimeout(() => control.abort(new Error('Package workflow exceeded its 16-minute limit.')), 16 * 60_000);
  const current = () => { const run = store.get(id); if (!run) throw new Error('Run no longer exists.'); return run; };
  const assertActive = () => { if (current().cancelRequested) control.abort(new Error('Cancelled by operator.')); signal.throwIfAborted(); if (['completed', 'blocked', 'failed', 'cancelled'].includes(current().status)) throw new Error('A terminal run cannot perform more graph work.'); };
  const heartbeat = setInterval(() => { store.heartbeat(id); if (current().cancelRequested) control.abort(new Error('Cancelled by operator.')); }, 1000);
  const target = current().target;
  const repo = target ? monitor.repository(target.repositoryId) : undefined;
  const finding = target ? monitor.finding(target.findingId) : undefined;
  const updateRelatedFindings = (status: SupplyFinding['status']) => { if (target) for (const related of monitor.findings(target.repositoryId).filter(item => item.runId === id)) monitor.patchFinding(related.id, { status, runId: id, ...(status === 'draft-created' && current().pullRequest ? {pullRequest: current().pullRequest} : {}) }); };
  const saver = new SqliteGraphSaver(resolve(projectRoot, '.data/graph-checkpoints.sqlite'));
  const check = (value: Check) => store.update(id, { checks: [...current().checks.filter(item => item.id !== value.id), value] });
  const stage = (status: Run['status'], node: 'controller' | 'supply-chain' | 'remediation' | 'devsec' | 'gate' | 'review', message: string) => { assertActive(); store.transition(id, status, node, message); };
  async function call<T extends { model: string; usage: AgentCall['usage']; summaryEn: string; summaryJa: string }>(role: AgentCall['role'], fn: () => Promise<T>) {
    assertActive(); const calls = [...current().agentCalls]; if (calls.length >= 5) throw new Error('The five-call aggregate model budget is exhausted.');
    const index = calls.length, item: AgentCall = { role, model: configuredModels()[role], status: 'running', startedAt: new Date().toISOString() };
    calls.push(item); store.update(id, { agentCalls: calls });
    try {
      const output = await fn(), updated = [...current().agentCalls];
      updated[index] = { ...item, model: output.model, status: 'completed', summary: output.summaryEn, summaryJa: output.summaryJa, usage: output.usage, completedAt: new Date().toISOString() };
      store.update(id, { agentCalls: updated }); store.event(id, role === 'supply' ? 'supply-chain' : role === 'fixer' ? 'remediation' : 'devsec', 'agent-completed', `${role}: ${output.model}; ${output.usage?.totalTokens ?? 0} reported tokens. ${output.summaryEn}`); return output;
    } catch (error) { const updated = [...current().agentCalls]; updated[index] = { ...item, status: 'failed', completedAt: new Date().toISOString() }; store.update(id, { agentCalls: updated }); throw error; }
  }
  let base: Awaited<ReturnType<typeof repository.readRepository>>, runner: Awaited<ReturnType<typeof repository.getCentralRunner>>;
  let policy: RepairPolicy, baselineFiles: Record<string, string> = {}, candidateFiles: Record<string, string> = {};
  let repair: Repair, review: Review, evidence: Evidence, verifier = '';
  try {
    if (!target || !repo || !finding || !repo.canPush || finding.repositoryId !== repo.id) throw new Error('Repository finding is unavailable or lacks branch-write permission.');
    if (['ecosystem', 'packageName', 'installedVersion', 'fixedVersion', 'manifestPath', 'fixedDigest', 'fixedImageRef'].some(key => target[key as keyof typeof target] !== finding[key as keyof SupplyFinding])) throw new Error('The queued finding changed its authoritative repair target. Rescan before remediation.');
    const relatedFindings = () => monitor.findings(repo.id).filter(item => item.ecosystem === finding.ecosystem && item.packageName === finding.packageName && item.manifestPath === finding.manifestPath && item.installedVersion === finding.installedVersion && item.fixedVersion === finding.fixedVersion);
    const advisoryIds = () => [...new Set([finding, ...relatedFindings()].flatMap(item => [item.advisoryId, ...item.aliases]))].slice(0, 100);
    const plan = (mode: 'prepare' | 'verify') => ({ mode, ecosystem: finding.ecosystem, package_name: finding.packageName, installed_version: finding.installedVersion, fixed_version: finding.fixedVersion, manifest_path: finding.manifestPath, ...(finding.fixedImageRef ? { fixed_image_ref: finding.fixedImageRef } : {}), advisory_ids: advisoryIds() });
    async function runVerification(mode: 'prepare' | 'verify', head: string, verificationId: string, required: string[]) {
      assertActive();
      const dispatch = await repository.dispatchCentralVerification(runner, { target: repo!, baseSha: base.sha, headSha: head, runId: verificationId, plan: plan(mode), beforeWrite: assertActive }, signal);
      const result = await repository.waitRepositoryVerification(runner.repo, { workflow: runner.workflow, workflowSha: runner.sha, targetRepository: `${repo!.owner}/${repo!.name}`, runId: verificationId, baseSha: base.sha, headSha: head, startedAt: dispatch.startedAt, verifierSha256: verifier, requiredCheckIds: required }, progress => {
        if (progress.ciUrl) store.update(id, { ci: { id: Number(progress.ciUrl.split('/').at(-1)), url: progress.ciUrl, status: progress.status, conclusion: null } });
        store.event(id, 'devsec', mode === 'prepare' ? 'lock-preparation-progress' : 'ci-progress', progress.message);
      }, signal);
      // Failed tests are useful observed evidence too. Persist them before the
      // promotion gate blocks publication so the dashboard can explain why.
      store.update(id, { ci: result.ci, checks: [...current().checks.filter(old => !result.checks.some(item => item.id === old.id)), ...result.checks], evidence: { runtime: result.runtime, businessLog: result.businessLog, policy: result.policy, builtImageId: result.builtImageId, verifierSha256: result.verifierSha256, artifactSha256: result.artifactSha256, rawFiles: result.rawFiles } });
      assertActive(); assertGenericEvidence(result, { baseSha: base.sha, candidateSha: head, verifier, required }); return result;
    }
    const nodes: SecurityNodes = {
      source: async () => {
        stage('source-fetching', 'supply-chain', `Read the verified ${finding.ecosystem} advisory ${finding.advisoryId}. Forum text alone cannot authorize repair.`);
        store.update(id, { advisory: { id: finding.advisoryId, titleEn: `${finding.packageName} ${finding.installedVersion}: ${finding.advisoryId}`, titleJa: `${finding.packageName} の依存関係の脆弱性`, summary: finding.summary, sources: finding.references.map(ref => ({ ...ref, language: /https:\/\/(?:www\.)?(?:jpcert\.or\.jp|jvn\.jp)\//.test(ref.url) ? 'ja' as const : 'en' as const, retrievedAt: finding.detectedAt })), cves: advisoryIds().filter(alias => alias.startsWith('CVE-')), fixedVersion: finding.fixedVersion, ownerTasks: ['Review and merge the draft in GitHub.', 'Deploy the reviewed build and verify the running service.', ...(finding.ecosystem === 'Docker' ? ['Review remaining scanner findings, module/configuration exposure and incident guidance.'] : []), ...(finding.ecosystem === 'Docker' && /(?:^|\/)php$/.test(finding.packageName) ? ['Review the separate PHP upload-progress follow-up: apply session.upload_progress.enabled=0 at startup when required, confirm serializer behavior in the real web configuration, restart workers and inspect incident logs. An image-only update does not close this deployment/configuration task.'] : [])] } }); return {};
      },
      inventory: async () => {
        stage('matching', 'controller', `Detect the stack in ${repo.owner}/${repo.name} at an immutable commit and match the exact installed dependency.`);
        base = await repository.readRepository(repo, signal);
        if (!base.canPush || base.private) throw new Error('The central verifier requires a public repository with branch-write permission. Private repositories need an explicitly configured isolated checkout credential.');
        const dependency = base.inventory.find(dep => dep.ecosystem === finding.ecosystem && dep.name.toLowerCase() === finding.packageName.toLowerCase() && dep.manifestPath === finding.manifestPath && dep.version === finding.installedVersion);
        if (!dependency) throw new Error('Inventory changed; the selected affected package or image version is no longer present.');
        const fresh = finding.ecosystem === 'Docker' ? await scanContainerDependencies(repo.id, [dependency], signal) : await scanDependencies(repo.id, [dependency], signal);
        if (!fresh.some(item => [item.advisoryId, ...item.aliases].some(alias => [finding.advisoryId, ...finding.aliases].includes(alias)) && item.fixedVersion === finding.fixedVersion && item.fixedImageRef === finding.fixedImageRef && item.fixedDigest === finding.fixedDigest)) throw new Error('The advisory, published safe version or image digest changed. Rescan before remediation.');
        const capability = await getRepositoryRepairCapability(base, signal);
        if (!capability.supported || !capability.ecosystems.includes(finding.ecosystem)) throw new Error(capability.reason);
        monitor.patchRepository(repo.id, { repairCapability: capability, profile: 'generic', canPush: base.canPush, defaultBranch: base.defaultBranch });
        store.update(id, { repo: { ...current().repo, baseSha: base.sha } });
        check({ id: 'affected_inventory', label: 'Exact dependency and supported test stack confirmed', status: 'passed', detail: `${finding.ecosystem}:${finding.packageName}@${finding.installedVersion}; ${capability.testCommands.join('; ')}` }); return {};
      },
      triage: async () => {
        stage('triaging', 'supply-chain', 'The Supply Chain Agent explains the corroborated match before a deterministic repair policy is selected.');
        const analysis = await call('supply', () => analyzePackage(finding, base.inventory, signal));
        return !analysis.affected || analysis.confidence === 'low' ? { decision: 'block', feedback: 'Model triage disputes the confirmed inventory match. Human review is required.' } : { decision: 'continue' };
      },
      baseline: async () => {
        stage('baseline', 'devsec', 'Discover the relevant tests and freeze their baseline bytes before the fixer can edit a dependency manifest.');
        const context = await loadRepairContext(base, signal); baselineFiles = context.files;
        policy = discoverRepairPolicy(baselineFiles, finding, context.paths); verifier = frozenRepairDigest(policy, baselineFiles); runner = await repository.getCentralRunner(signal);
        store.update(id, { evidence: { verifierSha256: verifier } });
        check({ id: 'frozen_baseline', label: 'Baseline tests and central runner frozen before repair', status: 'passed', detail: `${policy.testPaths.length} files; ${policy.testCommand.join(' ')}; verifier ${verifier}; runner ${runner.sha}` }); return {};
      },
      repair: async state => {
        stage('patching', 'remediation', `The Fix Agent prepares candidate ${state.attempt}/2 for ${finding.packageName} ${finding.fixedVersion}.`);
        const needsLock = policy.kind === 'npm' || policy.kind === 'composer';
        const modelPaths = policy.allowedPaths.filter(path => !/(?:^|\/)(?:package-lock\.json|composer\.lock)$/.test(path));
        repair = await call('fixer', () => proposePackageRepair({ ...finding, repairPolicy: { kind: policy.kind, allowedPaths: modelPaths, testCommand: policy.testCommand, lockfileGeneration: needsLock ? 'trusted central package manager; do not invent lockfile bytes' : 'not required' } }, baselineFiles, modelPaths, state.feedback, signal));
        if (policy.kind === 'container') {
          // The structured role already rejects paths outside modelPaths. Ignore
          // its proposed file bytes and use the deterministic image-edit tool.
          const content = renderContainerImageRepair(baselineFiles[policy.manifestPath], finding);
          repair = { ...repair, files: [{ path: policy.manifestPath, content }],
            summaryEn: `Updated only the selected image reference in ${policy.manifestPath}: ${finding.installedVersion} → ${finding.fixedVersion}, pinned to the controller-verified registry digest. The Fix Agent supplied the remediation explanation; a deterministic tool preserved all other baseline bytes.`,
            summaryJa: `${policy.manifestPath} の対象イメージ参照のみを ${finding.installedVersion} から ${finding.fixedVersion} に更新し、検証済みのダイジェストに固定しました。修正エージェントの説明に基づき、決定論的ツールが他の内容を保持して置換しました。` };
          store.event(id, 'remediation', 'mechanical-image-patch', 'The Fix Agent planned the update. The image-edit tool applied the verified tag/digest while preserving comments, quotes, whitespace, commands and mounts.');
        }
        try { candidateFiles = validateGenericRepair(policy, finding, baselineFiles, repair.files, needsLock ? { allowUnresolvedLock: true } : undefined); }
        catch (error) { return { decision: 'retry', feedback: error instanceof Error ? error.message : 'Candidate policy rejected.' }; }
        let finalEdits = repair.files.filter(file => file.content !== baselineFiles[file.path]);
        if (needsLock) {
          stage('patching', 'devsec', 'Generate the lockfile with the real package manager on the trusted central runner; installation hooks and plugins are disabled.');
          const preparation = await repository.ensureRepositoryCandidate(repo, base, { files: finalEdits }, `proofpatch/package-${id.slice(0, 8)}-a${state.attempt}-prepare`, signal, assertActive);
          store.update(id, { repo: { ...current().repo, candidateSha: preparation.sha, branch: preparation.branch } });
          const preparationId = `${id}-a${state.attempt}-prepare`, prepared = await runVerification('prepare', preparation.sha, preparationId, ['scope', 'verifier', 'package_version']);
          const generated = parseGeneratedLockfiles(prepared.rawFiles['generated-files.json'], policy, { targetRepository: `${repo.owner}/${repo.name}`, runId: preparationId, baseSha: base.sha, candidateSha: preparation.sha, workflowSha: runner.sha, githubRunId: prepared.ci.id, verifierSha256: verifier });
          finalEdits = [...repair.files, ...generated].filter(file => file.content !== baselineFiles[file.path]);
          candidateFiles = validateGenericRepair(policy, finding, baselineFiles, finalEdits);
          check({ id: 'lock_preparation', label: 'Lockfile generated by the trusted package manager', status: 'passed', detail: `Integrity metadata generated on ${prepared.ci.url}; final verification still required.` });
        }
        check({ id: 'candidate_scope', label: 'Dependency change matches the discovered repair policy', status: 'passed', detail: `${policy.kind}: ${policy.allowedPaths.join(', ')}. Baseline tests, workflows and unrelated application code are protected.` });
        assertActive(); const head = await repository.ensureRepositoryCandidate(repo, base, { files: finalEdits }, `proofpatch/package-${id.slice(0, 8)}-a${state.attempt}`, signal, assertActive);
        store.update(id, { repo: { ...current().repo, candidateSha: head.sha, branch: head.branch } });
        store.event(id, 'remediation', 'candidate-pushed', `Prepared baseline-child commit ${head.sha} on ${head.branch}.`); return { decision: 'continue' };
      },
      verify: async state => {
        stage('verifying', 'devsec', `Run ${policy.testCommand.join(' ')} against the exact candidate in the isolated central verifier.`);
        evidence = await runVerification('verify', current().repo.candidateSha!, `${id}-a${state.attempt}`, [...requiredRepairChecks]);
        return {};
      },
      review: async () => {
        stage('reviewing', 'devsec', 'The Senior Review Agent inspects the actual dependency diff, frozen test evidence and remaining owner tasks in a separate model context.');
        const allowedBaseline = Object.fromEntries(policy.allowedPaths.map(path => [path, baselineFiles[path]])), allowedCandidate = Object.fromEntries(policy.allowedPaths.map(path => [path, candidateFiles[path]]));
        const seniorEvidence = projectSeniorReviewEvidence(evidence);
        store.event(id, 'devsec', 'review-context-prepared', `Prepared ${JSON.stringify(seniorEvidence).length} characters of senior-review evidence: every mandatory check and provenance record retained; full logs and scans remain attached to ${evidence.ci.url}.`);
        review = await call('reviewer', () => reviewPackageRepair(finding, allowedBaseline, allowedCandidate, seniorEvidence, signal)); store.update(id, { review });
        return review.decision === 'approve' ? { decision: 'publish' } : { decision: 'retry', feedback: review.concerns.join('\n') || review.summaryEn };
      },
      gate: async state => {
        assertActive(); if (state.decision !== 'publish') return { decision: state.decision, feedback: state.feedback };
        const latest = await repository.readRepository(repo, signal);
        if (latest.sha !== base.sha || latest.defaultBranch !== base.defaultBranch || !latest.canPush) throw new Error('The target default branch or permission changed after tests; stale evidence cannot publish.'); return { decision: 'publish' };
      },
      publish: async () => {
        stage('publishing', 'gate', 'Tests and senior review passed. Raise a real draft PR for human review and merge.'); store.update(id, { draftPRAllowed: true });
        const ownerTasks = [...new Set([...repair.ownerTasks, ...review.ownerTasks, ...(current().advisory?.ownerTasks ?? []), 'Review and merge this draft manually.', 'Deploy and verify the running service.'])];
        const body = `## ${finding.packageName}: ${finding.installedVersion} → ${finding.fixedVersion}\n\n${repair.summaryEn}\n\n${repair.summaryJa}\n\nGenerated by LangGraph run ${id}, with actual Groq supply, fixer and senior-review calls.\n\n### Evidence\n\n- Advisory identities: ${advisoryIds().join(', ')}\n${finding.references.map(ref => `- [${ref.title}](${ref.url})`).join('\n')}\n- Target repository: ${repo.owner}/${repo.name}\n- Base: ${base.sha}\n- Candidate: ${current().repo.candidateSha}\n- Central verifier: ${runner.repo.owner}/${runner.repo.name}@${runner.sha}\n- Frozen test digest: ${verifier}\n- Executed test command: \`${policy.testCommand.join(' ')}\`\n- [Actual verification](${evidence.ci.url})\n\n### Senior review\n\n${review.summaryEn}\n\n${review.summaryJa}\n\n### Human follow-up\n\n${ownerTasks.map(task => `- [ ] ${task}`).join('\n')}\n\n### Rollback notes\n\n${repair.rollbackNotes.map(note => `- ${note}`).join('\n')}\n\nFixer and reviewer use separate contexts; this is not independent-model assurance. No automatic merge or deployment. Passing tests and selected-advisory checks do not establish absence of every vulnerability.`;
        const pullRequest = await repository.ensureRepositoryDraftPullRequest({ ...repo, defaultBranch: base.defaultBranch }, { branch: current().repo.branch!, expectedHeadSha: current().repo.candidateSha!, title: `fix: ${finding.packageName} ${finding.fixedVersion} security update`, body, beforeWrite: assertActive }, signal);
        // Save the actual external result before observing a racing cancellation.
        store.update(id, { pullRequest }); assertActive(); store.update(id, { status: 'completed' }); updateRelatedFindings('draft-created');
        store.event(id, 'review', 'completed', `Draft PR #${pullRequest.number} created: ${pullRequest.url}. A human owns merge and deployment.`); return {};
      },
      blocked: async state => { throw new Error(state.feedback || 'Evidence or senior review blocked this candidate.'); },
    };
    const graph = buildSecurityGraph(nodes, { checkpointer: saver,
      beforeNode: name => { assertActive(); const prior = current().graph; store.update(id, { orchestrationEngine: 'langgraph', graph: { threadId: id, currentNode: name, completedNodes: prior?.completedNodes ?? [] } }); store.event(id, 'controller', 'graph-node-started', `LangGraph entered ${name}.`); },
      afterNode: name => { const prior = current().graph!; store.update(id, { graph: { ...prior, currentNode: name, completedNodes: [...new Set([...prior.completedNodes, name])] } }); store.event(id, 'controller', 'graph-node-completed', `LangGraph completed ${name}.`); },
    });
    await graph.invoke({ runId: id }, { configurable: { thread_id: id }, runId: id, runName: 'ProofPatch security repair', tags: ['proofpatch', 'supply-chain-repair'], metadata: { proofpatchRunId: id }, signal, recursionLimit: 30 });
  } catch (error) {
    const old = current(), cancelled = old.cancelRequested, message = (error instanceof Error ? error.message : 'Package run failed.').replace(/gsk_[A-Za-z0-9]+/g, '[REDACTED]').slice(0, 1500);
    store.update(id, { status: cancelled ? 'cancelled' : old.status === 'failed' ? 'failed' : 'blocked', draftPRAllowed: false, failure: old.status === 'failed' && old.failure ? old.failure : { code: cancelled ? 'CANCELLED' : 'PACKAGE_RUN_BLOCKED', message } });
    store.event(id, 'gate', cancelled ? 'cancelled' : 'blocked', message); if (finding && monitor.finding(finding.id)) updateRelatedFindings(old.pullRequest ? 'draft-created' : 'needs-owner');
  } finally {
    clearInterval(heartbeat); clearTimeout(deadline); saver.close(); const directory = resolve(projectRoot, 'output/live-runs', id); mkdirSync(directory, { recursive: true });
    writeFileSync(resolve(directory, 'run.json'), JSON.stringify({ run: current(), events: store.events(id) }, null, 2));
  }
}
