import type { Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import { terminalStatuses } from '../../../../packages/contracts/src/live.js';
import { getProviderStatus, readCandidateDiff } from '../adapters/index.js';
import type { RunStore } from '../db/client.js';
import type { MonitoringStore } from '../db/monitoring.js';
import { readRepositoryCandidateDiff } from '../adapters/repository.js';

export function runHandlers(store: RunStore, monitor?: MonitoringStore) {
  const missing = (c: Context) => c.json({ error: { code: 'NOT_FOUND', message: 'Run not found.' } }, 404);
  return {
    status: async (c: Context) => {
      const state = await getProviderStatus();
      return c.json({ ...state, target: 'Harsh5840/arigato-php-demo', runner: 'github-actions', activeRunId: store.active()?.id, service: 'ProofPatch', ready: state.groqConfigured && state.githubConfigured });
    },
    list: (c: Context) => c.json({ runs: store.list() }),
    clear: (c: Context) => {
      const result = store.clearHistory();
      if (result.blocked) return c.json({error: {code: 'RUN_ACTIVE', message: 'Wait for the active run to finish or cancel it before deleting saved run history.'}}, 409);
      const deletedFindings = monitor?.deleteFindingsForRuns(result.deletedIds) ?? 0;
      return c.json({deleted: result.deletedIds.length, deletedFindings});
    },
    create: async (c: Context) => {
      const body: unknown = await c.req.json().catch(() => null);
      if (!body || typeof body !== 'object' || Object.keys(body).length !== 1 || !('sourceMode' in body) || !['live', 'cached'].includes(String(body.sourceMode))) return c.json({ error: { code: 'INVALID_INPUT', message: 'Provide only sourceMode: live or cached. The repository and write scope are fixed by the server.' } }, 400);
      return c.json(store.create(body.sourceMode as 'live' | 'cached'), 202);
    },
    get: (c: Context) => { const run = store.get(c.req.param('id')!); return run ? c.json({ run }) : missing(c); },
    evidence: (c: Context) => { const run = store.get(c.req.param('id')!); return run ? c.json({ run, events: store.events(run.id) }) : missing(c); },
    diff: async (c: Context) => {
      const run = store.get(c.req.param('id')!); if (!run) return missing(c);
      if (!run.repo.baseSha || !run.repo.candidateSha) return c.json({ error: { code: 'CANDIDATE_PENDING', message: 'The selected run has not published a candidate commit yet.' } }, 409);
      return c.json(await (run.target ? readRepositoryCandidateDiff(run.repo, run.repo.baseSha, run.repo.candidateSha, c.req.raw.signal) : readCandidateDiff(run.repo.baseSha, run.repo.candidateSha, c.req.raw.signal)));
    },
    cancel: (c: Context) => {
      const run = store.get(c.req.param('id')!); if (!run) return missing(c);
      if (terminalStatuses.has(run.status)) return c.json({ run });
      const updated = store.update(run.id, { cancelRequested: true, ...(run.status === 'queued' ? { status: 'cancelled' as const } : {}) });
      store.event(run.id, 'controller', 'cancel-requested', 'Cancellation requested. In-flight external work may finish; no later promotion is allowed.');
      return c.json({ run: updated });
    },
    events: (c: Context) => {
      const run = store.get(c.req.param('id')!); if (!run) return missing(c);
      c.header('X-Accel-Buffering', 'no'); c.header('Cache-Control', 'no-cache, no-transform');
      return streamSSE(c, async (stream) => {
        let last = 0; let heartbeatAt = Date.now();
        const initialEvents = store.events(run.id); last = initialEvents.at(-1)?.id || 0;
        await stream.writeSSE({ event: 'snapshot', data: JSON.stringify({ run, events: initialEvents }), id: String(last) });
        while (!stream.aborted) {
          const next = store.get(run.id)!; const events = store.events(run.id, last);
          for (const event of events) { await stream.writeSSE({ event: 'run', data: JSON.stringify({ run: next, event }), id: String(event.id) }); last = event.id; }
          // Stage records may change before the next event; snapshot keeps model state live.
          if (Date.now() - heartbeatAt > 2000) { await stream.writeSSE({ event: 'snapshot', data: JSON.stringify({ run: next, events: store.events(run.id) }), id: String(last) }); heartbeatAt = Date.now(); }
          if (terminalStatuses.has(next.status)) break;
          await stream.sleep(400);
        }
      });
    },
  };
}
