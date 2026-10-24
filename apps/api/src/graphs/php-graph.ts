import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as adapters from '../adapters/index.js';
import type { Advisory, Baseline, Evidence, Repair, Review } from '../adapters/types.js';
import type { AgentCall, Check, RunEvent, RunStatus } from '../../../../packages/contracts/src/live.js';
import type { RunStore } from '../db/client.js';
import { inventory, validateCandidate } from '../services/candidate-policy.js';
import { evidenceAllowsDraft, prBody } from '../services/orchestrator.js';
import { buildSecurityGraph, type SecurityGraphState } from './security-graph.js';
import { SqliteGraphSaver } from './sqlite-checkpointer.js';

type Dependencies = typeof adapters;
const required = <T>(state: SecurityGraphState, key: string): T => {
  if (state.data[key] === undefined) throw new Error(`LangGraph state is missing ${key}.`);
  return state.data[key] as T;
};

/** The PHP fixture is one strategy on the ecosystem-neutral StateGraph. */
export async function executeRun(store: RunStore, id: string, deps: Dependencies = adapters, outputDirectory?: string): Promise<void> {
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(new Error('Run exceeded the 16-minute aggregate deadline.')), 16 * 60_000);
  const heartbeat = setInterval(() => {
    store.heartbeat(id);
    if (store.get(id)?.cancelRequested) controller.abort(new Error('Run cancelled by user. External candidate/CI evidence may remain.'));
  }, 1_000);
  const signal = controller.signal;
  const current = () => store.get(id)!;
  const assertActive = () => {
    if (current().cancelRequested) controller.abort(new Error('Run cancelled by user. In-flight external work may remain recorded.'));
    signal.throwIfAborted();
    if (['completed', 'blocked', 'failed', 'cancelled'].includes(current().status)) throw new Error('Run is already terminal; further promotion is rejected.');
  };
  const transition = (status: RunStatus, node: RunEvent['node'], message: string) => { assertActive(); store.transition(id, status, node, message); };
  const check = (value: Check) => store.update(id, { checks: [...current().checks.filter((old) => old.id !== value.id), value] });
  async function call<T extends { model: string; usage: AgentCall['usage']; summaryEn: string; summaryJa: string }>(role: AgentCall['role'], model: string, fn: () => Promise<T>): Promise<T> {
    assertActive();
    const index = current().agentCalls.length;
    if (index >= 5) throw new Error('Aggregate five-call agent budget exhausted.');
    const item: AgentCall = { role, model, status: 'running', startedAt: new Date().toISOString() };
    store.update(id, { agentCalls: [...current().agentCalls, item] });
    try {
      const result = await fn();
      const calls = [...current().agentCalls];
      calls[index] = { ...item, status: 'completed', summary: result.summaryEn, summaryJa: result.summaryJa, model: result.model, usage: result.usage, completedAt: new Date().toISOString() };
      store.update(id, { agentCalls: calls });
      store.event(id, role === 'supply' ? 'supply-chain' : role === 'fixer' ? 'remediation' : 'devsec', 'agent-completed', `${role}: ${result.model}; ${result.usage?.totalTokens ?? 0} actual tokens. ${result.summaryEn}`);
      return result;
    } catch (error) {
      const calls = [...current().agentCalls]; calls[index] = { ...item, status: 'failed', completedAt: new Date().toISOString() };
      store.update(id, { agentCalls: calls }); throw error;
    }
  }
  let saver: SqliteGraphSaver | undefined;
  try {
    saver = new SqliteGraphSaver(outputDirectory ? resolve(outputDirectory, '../../.data/graph-checkpoints.sqlite') : ':memory:');
    store.update(id, { orchestrationEngine: 'langgraph', graph: { threadId: id, currentNode: 'source', completedNodes: [] } });
    const graph = buildSecurityGraph({
      source: async (state) => {
        const status = await deps.getProviderStatus(signal);
        if (!status.groqConfigured || !status.githubConfigured) throw new Error('Provider authentication is unavailable. Configure GROQ_API_KEY and GitHub credentials locally; no simulated output is substituted.');
        transition('source-fetching', 'supply-chain', 'Fetching the official Japanese PHP advisory and upstream corroboration.');
        const advisory = await deps.fetchAdvisory(current().sourceMode, signal);
        const { body: _untrustedBody, image: _image, sourceMode: _sourceMode, ...publicAdvisory } = advisory;
        store.update(id, { advisory: publicAdvisory });
        check({ id: 'source_evidence', label: 'Official Japanese + upstream source evidence', status: 'passed', detail: `${advisory.sources.length} bounded source snapshots; ${current().sourceMode} intake.` });
        store.event(id, 'supply-chain', 'sources', `${advisory.titleEn}; ${advisory.cves.join(', ')}. Source bodies hashed at intake.`);
        return { data: { ...state.data, advisory, models: status.models } };
      },
      inventory: async (state) => {
        const base = await deps.readBaseline(signal);
        store.update(id, { repo: { ...current().repo, baseSha: base.sha } });
        return { data: { ...state.data, base, observed: inventory(base.files) } };
      },
      triage: async (state) => {
        const advisory = required<Advisory>(state, 'advisory');
        const observed = required<ReturnType<typeof inventory>>(state, 'observed');
        const models = required<{ supply: string }>(state, 'models');
        transition('triaging', 'supply-chain', `Groq ${models.supply} is correlating the advisory with the repository inventory.`);
        const analysis = await call('supply', models.supply, () => deps.analyzeAdvisory(advisory, observed, signal));
        transition('matching', 'controller', 'Checking the model triage against deterministic runtime inventory matching.');
        if (!observed.affected || !analysis.affected || analysis.confidence === 'low') return { decision: 'block', feedback: 'Affected inventory match is missing or disputed. This bounded demo requires the declared PHP 8.3.35 baseline; human triage is required.' };
        check({ id: 'affected_inventory', label: 'Affected PHP declaration matched', status: 'passed', detail: 'PHP 8.3.35 declared; no affected image executed and no exploit reproduced.' });
        return { data: { ...state.data, analysis } };
      },
      baseline: (state) => {
        const base = required<Baseline>(state, 'base');
        transition('baseline', 'devsec', 'Freezing the trusted verifier before the remediation model receives editable files.');
        store.update(id, { evidence: { verifierSha256: base.verifierSha256 } });
        check({ id: 'frozen_baseline', label: 'Verifier frozen before repair', status: 'passed', detail: `${base.sha}; verifier SHA256 ${base.verifierSha256}.` });
        return {};
      },
      repair: async (state) => {
        const advisory = required<Advisory>(state, 'advisory');
        const base = required<Baseline>(state, 'base');
        const models = required<{ fixer: string }>(state, 'models');
        transition('patching', 'remediation', `Groq ${models.fixer} is generating candidate ${state.attempt}/2 within the three-file scope.`);
        const repair = await call('fixer', models.fixer, () => deps.proposeRepair(advisory, base.files, state.feedback, signal));
        let candidate: Record<string, string>;
        try { candidate = validateCandidate(base.files, repair.files); }
        catch (error) {
          const feedback = error instanceof Error ? error.message : 'Candidate policy rejected.';
          check({ id: 'local_candidate_scope', label: 'Candidate write scope', status: 'failed', detail: feedback });
          store.event(id, 'gate', 'rejected', feedback);
          return { decision: 'retry', feedback };
        }
        check({ id: 'local_candidate_scope', label: 'Candidate write scope', status: 'passed', detail: 'Exactly three reviewed substitutions. No model-generated command or verifier edit is executed.' });
        assertActive();
        const branch = `proofpatch/live-php-${base.sha.slice(0, 8)}-${id.slice(0, 8)}-a${state.attempt}`;
        const head = await deps.ensureCandidateBranch(base, { files: repair.files }, branch, signal, assertActive);
        store.update(id, { repo: { ...current().repo, branch: head.branch, candidateSha: head.sha } });
        store.event(id, 'remediation', 'candidate-pushed', `Candidate ${head.sha} pushed to ${head.branch}.`);
        return { decision: 'continue', data: { ...state.data, repair, candidate, head } };
      },
      verify: async (state) => {
        const base = required<Baseline>(state, 'base');
        const head = required<{ branch: string; sha: string }>(state, 'head');
        transition('verifying', 'devsec', 'Dispatching the frozen verifier on GitHub Actions. Only the fixed candidate image is built and executed.');
        const verificationId = `${id}-a${state.attempt}`;
        assertActive();
        const dispatch = await deps.dispatchVerification({ baseSha: base.sha, headSha: head.sha, runId: verificationId, beforeWrite: assertActive }, signal);
        const evidence = await deps.waitForVerification({ runId: verificationId, headSha: head.sha, startedAt: dispatch.startedAt, baseSha: base.sha, verifierSha256: base.verifierSha256 }, (progress) => {
          if (progress.ciUrl) store.update(id, { ci: { id: Number(progress.ciUrl.split('/').at(-1)), url: progress.ciUrl, status: progress.status, conclusion: null } });
          const stepChecks: Check[] = (progress.steps || []).map((step, index) => ({ id: `ci_step_${index}`, label: step.name, status: step.conclusion === 'success' || step.conclusion === 'skipped' ? 'passed' : step.conclusion && step.conclusion !== 'success' ? 'failed' : 'pending', detail: step.conclusion || step.status }));
          store.update(id, { checks: [...current().checks.filter((value) => !value.id.startsWith('ci_step_')), ...stepChecks] });
          store.event(id, 'devsec', 'ci-progress', `${progress.message}${progress.steps ? ` — ${progress.steps.filter((step) => step.status === 'completed').length}/${progress.steps.length} steps finished` : ''}`);
        }, signal);
        store.update(id, { ci: evidence.ci, checks: [...current().checks.filter((value) => !value.id.startsWith('ci_step_') && !evidence.checks.some((fresh) => fresh.id === value.id)), ...evidence.checks], evidence: { runtime: evidence.runtime, businessLog: evidence.businessLog, policy: evidence.policy, builtImageId: evidence.builtImageId, artifactSha256: evidence.artifactSha256, verifierSha256: evidence.verifierSha256, rawFiles: evidence.rawFiles } });
        if (!evidenceAllowsDraft(evidence, base.sha, head.sha, base.verifierSha256)) throw new Error('Frozen verification failed or evidence is missing/stale. No draft PR was approved. Inspect actual CI steps and artifact checks.');
        return { data: { ...state.data, evidence } };
      },
      review: async (state) => {
        const advisory = required<Advisory>(state, 'advisory');
        const base = required<Baseline>(state, 'base');
        const candidate = required<Record<string, string>>(state, 'candidate');
        const evidence = required<Evidence>(state, 'evidence');
        const models = required<{ reviewer: string }>(state, 'models');
        transition('reviewing', 'devsec', `Groq ${models.reviewer} is reviewing the actual diff and frozen test evidence in a separate context.`);
        const review = await call('reviewer', models.reviewer, () => deps.reviewRepair(advisory, base.files, candidate, { ...evidence, rawFiles: undefined }, signal));
        store.update(id, { review });
        return { data: { ...state.data, review } };
      },
      gate: async (state) => {
        const review = required<Review>(state, 'review');
        if (review.decision !== 'approve') {
          const feedback = review.concerns.join('\n') || review.summaryEn;
          store.event(id, 'gate', 'review-rejected', feedback);
          return { decision: 'retry', feedback };
        }
        const base = required<Baseline>(state, 'base');
        const head = required<{ sha: string }>(state, 'head');
        const evidence = required<Evidence>(state, 'evidence');
        if (!evidenceAllowsDraft(evidence, base.sha, head.sha, base.verifierSha256)) throw new Error('Mandatory evidence cannot be overridden by senior review.');
        const latest = await deps.readBaseline(signal);
        if (latest.sha !== base.sha || latest.verifierSha256 !== base.verifierSha256) throw new Error('Baseline changed during verification. Start a new run against current main; stale evidence cannot create an approved draft.');
        assertActive();
        return { decision: 'publish' };
      },
      publish: async (state) => {
        const advisory = required<Advisory>(state, 'advisory');
        const repair = required<Repair>(state, 'repair');
        const review = required<Review>(state, 'review');
        const evidence = required<Evidence>(state, 'evidence');
        const head = required<{ branch: string; sha: string }>(state, 'head');
        transition('publishing', 'gate', 'All required frozen checks and scoped senior review passed. Creating the bilingual draft PR for human review.');
        store.update(id, { draftPRAllowed: true });
        assertActive();
        const pullRequest = await deps.ensureDraftPullRequest({ branch: head.branch, expectedHeadSha: head.sha, beforeWrite: assertActive, title: 'fix: PHP 8.3.36 advisory mitigation / PHP脆弱性対応', body: prBody(current(), advisory, repair, review, evidence) }, signal);
        // A late cancel still records the actual external result before blocking promotion.
        store.update(id, { pullRequest });
        assertActive();
        if (!pullRequest.draft) throw new Error('Existing PR is no longer a draft. Human-owned review state requires attention.');
        store.update(id, { pullRequest, status: 'completed' });
        store.event(id, 'review', 'completed', `Draft PR #${pullRequest.number} ${pullRequest.reused ? 'reused' : 'created'}: ${pullRequest.url}. Human review is required; merge ready and finding closed remain false.`);
        return {};
      },
      blocked: (state) => { throw new Error(state.feedback || 'The bounded repair/review graph blocked publication.'); },
    }, {
      checkpointer: saver,
      beforeNode: (name, state) => {
        assertActive();
        store.update(id, { graph: { threadId: id, currentNode: name, completedNodes: current().graph?.completedNodes ?? [] } });
        store.event(id, 'controller', 'graph-node-started', `LangGraph node ${name}; candidate ${state.attempt}/2.`);
      },
      afterNode: (name) => {
        store.update(id, { graph: { threadId: id, currentNode: name, completedNodes: [...new Set([...(current().graph?.completedNodes ?? []), name])] } });
        store.event(id, 'controller', 'graph-node-completed', `LangGraph node ${name} completed.`);
      },
    });
    const result = await graph.invoke({ runId: id }, { configurable: { thread_id: id }, signal, recursionLimit: 30 });
    if (outputDirectory) {
      const directory = resolve(outputDirectory, id); mkdirSync(directory, { recursive: true });
      writeFileSync(resolve(directory, 'run.json'), JSON.stringify({ run: current(), events: store.events(id), orchestration: 'langgraph', graphState: { attempt: result.attempt, decision: result.decision } }, null, 2));
      const evidence = result.data.evidence as Evidence | undefined;
      for (const [name, content] of Object.entries(evidence?.rawFiles ?? {})) if (/^[a-zA-Z0-9._-]+$/.test(name)) writeFileSync(resolve(directory, name), content);
    }
  } catch (error) {
    const stopped = current();
    const cancelled = stopped.cancelRequested;
    const message = (error instanceof Error ? error.message : 'Run failed.').replace(/gsk_[A-Za-z0-9]+/g, '[REDACTED]').slice(0, 1500);
    store.update(id, { status: cancelled ? 'cancelled' : stopped.status === 'failed' ? 'failed' : 'blocked', draftPRAllowed: false, failure: stopped.status === 'failed' && stopped.failure ? stopped.failure : { code: cancelled ? 'CANCELLED' : 'RUN_BLOCKED', message } });
    store.event(id, 'gate', cancelled ? 'cancelled' : 'blocked', message);
  } finally { clearInterval(heartbeat); clearTimeout(deadline); saver?.close(); }
}
