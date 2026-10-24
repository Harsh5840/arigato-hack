import type { AgentCall, Check, Run, RunEvent, RunStatus } from '../../../../packages/contracts/src/live.ts';

const terminal = new Set<RunStatus>(['completed', 'blocked', 'failed', 'cancelled']);
const stageLabels = {
  queued: 'Queued',
  'source-fetching': 'Source intake',
  triaging: 'Agent triage',
  matching: 'Inventory match',
  baseline: 'Freeze verifier',
  patching: 'Generate repair',
  verifying: 'CI verification',
  reviewing: 'Senior review',
  publishing: 'Draft PR',
} as const;

export type ActiveStage = keyof typeof stageLabels;
export type StageDuration = { stage: ActiveStage; label: string; durationMs: number; active: boolean; visits: number };
export type TokenBucket = { role: AgentCall['role']; model: string; totalTokens: number; calls: number };
export type CheckGroup = { id: 'source' | 'policy' | 'runtime' | 'business' | 'workflow'; label: string; checks: Check[]; passed: number; failed: number; pending: number; notRun: number };

function timestamp(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function duration(run: Run): number | null {
  const start = timestamp(run.createdAt);
  const end = timestamp(run.updatedAt);
  return start !== null && end !== null && end >= start ? end - start : null;
}

function measuredTokens(call: AgentCall): number | null {
  const value = call.usage?.totalTokens;
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

/** These are observations from the loaded history, not population-wide service metrics. */
export function summarizeRuns(runs: readonly Run[]) {
  // A reconnect or merged response must not inflate the sample or token totals.
  const unique = [...new Map(runs.map((run) => [run.id, run])).values()];
  const completed = unique.filter((run) => run.status === 'completed');
  const completedDurations = completed.map(duration).filter((value): value is number => value !== null).sort((a, b) => a - b);
  const middle = Math.floor(completedDurations.length / 2);
  const completedDurationMedianMs = completedDurations.length === 0 ? null : completedDurations.length % 2 === 1 ? completedDurations[middle] : (completedDurations[middle - 1] + completedDurations[middle]) / 2;
  const calls = unique.flatMap((run) => run.agentCalls);
  const measured = calls.map(measuredTokens).filter((value): value is number => value !== null);
  const blocked = unique.filter((run) => run.status === 'blocked').length;
  const failed = unique.filter((run) => run.status === 'failed').length;
  const cancelled = unique.filter((run) => run.status === 'cancelled').length;
  const active = unique.filter((run) => !terminal.has(run.status)).length;
  return {
    sampleSize: unique.length,
    completed: completed.length,
    blocked,
    failed,
    cancelled,
    active,
    draftPRs: new Set(unique.filter((run) => run.pullRequest?.draft === true).map((run) => run.pullRequest!.url)).size,
    completedDurationMedianMs,
    completedDurationSamples: completedDurations.length,
    totalTokens: measured.reduce((sum, value) => sum + value, 0),
    meteredCalls: measured.length,
    outcomes: [
      { status: 'completed', label: 'Completed', count: completed.length },
      { status: 'blocked', label: 'Blocked', count: blocked },
      { status: 'failed', label: 'Failed', count: failed },
      { status: 'cancelled', label: 'Cancelled', count: cancelled },
      { status: 'active', label: 'Active', count: active },
    ],
    durationHistory: unique.filter((run) => terminal.has(run.status) && duration(run) !== null)
      .sort((a, b) => (timestamp(a.createdAt) ?? 0) - (timestamp(b.createdAt) ?? 0))
      .slice(-6)
      .map((run) => ({ id: run.id, status: run.status, durationMs: duration(run)!, createdAt: run.createdAt })),
  };
}

/** Sum observed stage intervals, including repeat repair/review attempts. Unobserved phases are absent. */
export function stageDurations(run: Run, events: readonly RunEvent[], now = Date.now()): StageDuration[] {
  const created = timestamp(run.createdAt);
  if (created === null) return [];
  const isTerminal = terminal.has(run.status);
  const transitions = [...new Map(events.filter((event) => event.runId === run.id).map((event) => [event.id, event])).values()]
    .map((event) => ({ event, at: timestamp(event.at) }))
    .filter((value): value is { event: RunEvent; at: number } => value.at !== null && value.at >= created && (Object.hasOwn(stageLabels, value.event.kind) || terminal.has(value.event.kind as RunStatus)))
    .sort((a, b) => a.at - b.at || a.event.id - b.event.id);
  const terminalAt = transitions.find(({ event }) => terminal.has(event.kind as RunStatus))?.at;
  const updated = timestamp(run.updatedAt);
  const end = isTerminal ? terminalAt ?? (updated !== null && updated >= created ? updated : null) : Number.isFinite(now) && now >= created ? now : null;
  if (end === null) return [];
  const observed = transitions.filter(({ at }) => at <= end);
  // createdAt is a known queue start only when this run is still queued. For later
  // statuses the event log is authoritative; missing logs do not imply queue time.
  if (observed.length === 0 && run.status === 'queued') return [{ stage: 'queued', label: stageLabels.queued, durationMs: end - created, active: true, visits: 1 }];
  const buckets = new Map<ActiveStage, StageDuration>();
  for (let index = 0; index < observed.length; index++) {
    const current = observed[index];
    if (terminal.has(current.event.kind as RunStatus)) break;
    const stage = current.event.kind as ActiveStage;
    const next = observed[index + 1];
    const intervalEnd = next?.at ?? end;
    const previous = observed[index - 1]?.event.kind;
    const bucket = buckets.get(stage) ?? { stage, label: stageLabels[stage], durationMs: 0, active: false, visits: 0 };
    bucket.durationMs += Math.max(0, intervalEnd - current.at);
    if (previous !== stage) bucket.visits++;
    bucket.active ||= !isTerminal && !next && run.status === stage;
    buckets.set(stage, bucket);
  }
  return [...buckets.values()];
}

/** Include only actual reported usage, even when a call failed after reporting usage. */
export function tokenBreakdown(run: Run): TokenBucket[] {
  const buckets = new Map<string, TokenBucket>();
  for (const call of run.agentCalls) {
    const totalTokens = measuredTokens(call);
    if (totalTokens === null) continue;
    const key = `${call.role}\u0000${call.model}`;
    const bucket = buckets.get(key) ?? { role: call.role, model: call.model, totalTokens: 0, calls: 0 };
    bucket.totalTokens += totalTokens;
    bucket.calls++;
    buckets.set(key, bucket);
  }
  const order: AgentCall['role'][] = ['supply', 'fixer', 'reviewer'];
  return [...buckets.values()].sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role) || a.model.localeCompare(b.model));
}

/** Business assertion counts stay separate from their aggregate suite gate. */
export function checkGroups(checks: readonly Check[]): CheckGroup[] {
  const labels: Record<CheckGroup['id'], string> = { source: 'Source + inventory', policy: 'Policy gates', runtime: 'PHP runtime', business: 'Business assertions', workflow: 'CI provenance' };
  const groups = new Map<CheckGroup['id'], CheckGroup>();
  for (const check of checks) {
    const id: CheckGroup['id'] = /^business_\d+$/.test(check.id) ? 'business' : check.id.startsWith('runtime_') || check.id === 'built_image' ? 'runtime' : check.id.startsWith('ci_') || check.id.startsWith('workflow_') || check.id === 'trusted_workflow' ? 'workflow' : ['source_evidence', 'affected_inventory'].includes(check.id) ? 'source' : 'policy';
    const group = groups.get(id) ?? { id, label: labels[id], checks: [], passed: 0, failed: 0, pending: 0, notRun: 0 };
    group.checks.push(check);
    if (check.status === 'not-run') group.notRun++;
    else group[check.status]++;
    groups.set(id, group);
  }
  const order: CheckGroup['id'][] = ['source', 'policy', 'runtime', 'business', 'workflow'];
  return order.flatMap((id) => groups.has(id) ? [groups.get(id)!] : []);
}
