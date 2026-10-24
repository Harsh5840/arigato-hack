import test from 'node:test';
import assert from 'node:assert/strict';
import type { AgentCall, Run, RunEvent } from '../../../packages/contracts/src/live.ts';
import { checkGroups, stageDurations, summarizeRuns, tokenBreakdown } from '../src/lib/dashboard-analytics.ts';

const at = (seconds: number) => new Date(Date.UTC(2026, 9, 25, 0, 0, seconds)).toISOString();
function run(patch: Partial<Run> = {}): Run {
  return { id: 'run-1', status: 'completed', createdAt: at(0), updatedAt: at(60), sourceMode: 'live', mode: 'live-groq', repo: { owner: 'demo', name: 'php' }, agentCalls: [], checks: [], mergeReady: false, findingClosed: false, ...patch };
}
function event(id: number, kind: string, seconds: number, runId = 'run-1'): RunEvent {
  return { id, kind, at: at(seconds), runId, node: 'controller', message: kind };
}
function call(role: AgentCall['role'], tokens?: number, status: AgentCall['status'] = 'completed'): AgentCall {
  return { role, model: role === 'supply' ? 'openai/gpt-oss-20b' : 'openai/gpt-oss-120b', status, startedAt: at(5), ...(tokens === undefined ? {} : { usage: { promptTokens: 1, completionTokens: 1, totalTokens: tokens } }) };
}

test('empty history has no invented median, usage or outcomes', () => {
  const result = summarizeRuns([]);
  assert.equal(result.sampleSize, 0);
  assert.equal(result.completedDurationMedianMs, null);
  assert.equal(result.completedDurationSamples, 0);
  assert.equal(result.totalTokens, 0);
  assert.equal(result.meteredCalls, 0);
  assert.equal(result.outcomes.reduce((sum, value) => sum + value.count, 0), 0);
});

test('loaded sample deduplicates runs and draft URLs while retaining all outcomes', () => {
  const first = run({ pullRequest: { url: 'https://example.test/pr/1', number: 1, draft: true }, agentCalls: [call('supply', 20)] });
  const result = summarizeRuns([first, first, run({ id: 'run-2', updatedAt: at(120), pullRequest: first.pullRequest }), run({ id: 'run-3', status: 'blocked' }), run({ id: 'run-4', status: 'verifying' })]);
  assert.equal(result.sampleSize, 4);
  assert.equal(result.draftPRs, 1);
  assert.equal(result.completed, 2);
  assert.equal(result.blocked, 1);
  assert.equal(result.active, 1);
  assert.equal(result.completedDurationMedianMs, 90_000);
  assert.equal(result.totalTokens, 20);
  assert.equal(result.meteredCalls, 1);
});

test('invalid or reversed timestamps are absent from duration samples and recent history', () => {
  const result = summarizeRuns([run({ id: 'bad-start', createdAt: 'bad-date' }), run({ id: 'negative', updatedAt: at(-1) }), run({ id: 'a', updatedAt: at(10) }), run({ id: 'b', updatedAt: at(30) }), run({ id: 'c', updatedAt: at(20) }), run({ id: 'active', status: 'patching' })]);
  assert.equal(result.completedDurationMedianMs, 20_000);
  assert.equal(result.completedDurationSamples, 3);
  assert.deepEqual(result.durationHistory.map((value) => value.id), ['a', 'b', 'c']);
});

test('recent duration history is chronologically ordered and bounded to six terminal runs', () => {
  const result = summarizeRuns(Array.from({ length: 8 }, (_, index) => run({ id: `r${index}`, status: index === 7 ? 'failed' : 'completed', createdAt: at(index), updatedAt: at(index + 10) })).reverse());
  assert.deepEqual(result.durationHistory.map((value) => value.id), ['r2', 'r3', 'r4', 'r5', 'r6', 'r7']);
});

test('stage intervals use matching run events, terminal completion and aggregate repair retries', () => {
  const values = stageDurations(run({ updatedAt: at(100) }), [event(1, 'queued', 0), event(2, 'patching', 10), event(3, 'verifying', 20), event(4, 'patching', 40), event(5, 'reviewing', 50), event(6, 'completed', 60), event(6, 'completed', 60), event(7, 'patching', 65), event(1, 'verifying', 3, 'different-run'), { ...event(8, 'matching', 6), at: 'invalid' }], Date.parse(at(200)));
  assert.deepEqual(values.map(({ stage, durationMs, visits }) => ({ stage, durationMs, visits })), [{ stage: 'queued', durationMs: 10_000, visits: 1 }, { stage: 'patching', durationMs: 20_000, visits: 2 }, { stage: 'verifying', durationMs: 20_000, visits: 1 }, { stage: 'reviewing', durationMs: 10_000, visits: 1 }]);
  assert.ok(values.every((value) => !value.active));
});

test('active stage timing is anchored to recorded transitions and never fabricates missing stages', () => {
  const active = run({ status: 'verifying', updatedAt: at(40) });
  assert.deepEqual(stageDurations(active, []), []);
  const values = stageDurations(active, [event(1, 'patching', 10), event(2, 'verifying', 30), event(3, 'ci-progress', 35)], Date.parse(at(50)));
  assert.equal(values[0].durationMs, 20_000);
  assert.equal(values[1].durationMs, 20_000);
  assert.equal(values[1].active, true);
  assert.deepEqual(stageDurations(run({ status: 'queued' }), [], Date.parse(at(5)))[0], { stage: 'queued', label: 'Queued', durationMs: 5_000, active: true, visits: 1 });
  assert.deepEqual(stageDurations(run({ createdAt: 'invalid' }), []), []);
});

test('token usage aggregates reported calls by actual role and model without invented failed-call usage', () => {
  const value = run({ agentCalls: [call('fixer', 100), call('supply', 20), call('fixer', 30, 'failed'), call('reviewer', undefined, 'failed'), call('reviewer', -1), call('reviewer', Number.NaN)] });
  assert.deepEqual(tokenBreakdown(value), [{ role: 'supply', model: 'openai/gpt-oss-20b', totalTokens: 20, calls: 1 }, { role: 'fixer', model: 'openai/gpt-oss-120b', totalTokens: 130, calls: 2 }]);
  assert.equal(summarizeRuns([value]).totalTokens, 150);
  assert.equal(summarizeRuns([value]).meteredCalls, 3);
});

test('check groups separate business assertions from suite gate and never count pending as passed', () => {
  const groups = checkGroups([{ id: 'business_1', label: 'JPY', status: 'passed' }, { id: 'business_2', label: 'UTF8', status: 'failed' }, { id: 'business_suite', label: 'Suite', status: 'failed' }, { id: 'runtime_execution', label: 'PHP', status: 'not-run' }, { id: 'ci_step_1', label: 'Build', status: 'pending' }, { id: 'source_evidence', label: 'Sources', status: 'passed' }]);
  assert.deepEqual(groups.map((group) => group.id), ['source', 'policy', 'runtime', 'business', 'workflow']);
  assert.equal(groups.find((group) => group.id === 'business')?.checks.length, 2);
  assert.equal(groups.find((group) => group.id === 'policy')?.failed, 1);
  assert.equal(groups.find((group) => group.id === 'runtime')?.notRun, 1);
  assert.equal(groups.find((group) => group.id === 'workflow')?.passed, 0);
  assert.equal(groups.find((group) => group.id === 'workflow')?.pending, 1);
});

test('generic runner evidence separates observed runtime, business suite and provenance without inventing assertion rows', () => {
  const groups = checkGroups([{ id:'runner_package_version',label:'Python and Requests observed',status:'passed' },{id:'runner_business_suite',label:'12 business assertions passed',status:'passed'},{id:'evidence_identity',label:'Exact candidate',status:'passed'},{id:'runner_no_known_advisories',label:'Installed dependencies',status:'passed'}]);
  assert.equal(groups.find(group=>group.id==='business')?.checks.length,1);
  assert.equal(groups.find(group=>group.id==='runtime')?.checks[0].id,'runner_package_version');
  assert.equal(groups.find(group=>group.id==='workflow')?.checks[0].id,'evidence_identity');
  assert.equal(groups.find(group=>group.id==='policy')?.checks[0].id,'runner_no_known_advisories');
});
