import type { Context } from 'hono';
import type { MonitoringStore } from '../db/monitoring.js';
import type { RunStore } from '../db/client.js';
import { queueRemediation, registerRepository } from '../services/monitoring.js';
import { parseRepository } from '../adapters/repository.js';

export function monitoringHandlers(monitor: MonitoringStore, runs: RunStore) {
  const error = (c: Context, message: string, status: 400 | 404 | 409 = 400) => c.json({ error: { code: 'MONITORING_INPUT', message } }, status);
  return {
    repositories: (c: Context) => c.json({ repositories: monitor.repositories() }),
    add: async (c: Context) => { const body = await c.req.json().catch(() => null); if (!body || typeof body.url !== 'string' || Object.keys(body).some(key => key !== 'url')) return error(c, 'Provide only a GitHub HTTPS repository URL.'); try { parseRepository(body.url); } catch (cause) { return error(c, cause instanceof Error ? cause.message : 'Invalid GitHub repository URL.'); } return c.json({ repository: await registerRepository(monitor, body.url, c.req.raw.signal) }, 201); },
    patch: async (c: Context) => {
      const repo = monitor.repository(c.req.param('id')!); if (!repo) return error(c, 'Repository not found.', 404);
      const body = await c.req.json().catch(() => null);
      if (!body || Object.keys(body).some(key => !['enabled','autoRemediate'].includes(key)) || Object.values(body).some(value => typeof value !== 'boolean')) return error(c, 'Only enabled and autoRemediate boolean settings are accepted.');
      if (body.autoRemediate && (!repo.canPush || repo.profile !== 'python-requests-demo')) return error(c, 'Automatic repair needs push access and the reviewed Python verification policy. Other repositories can be monitored.', 409);
      return c.json({ repository: monitor.patchRepository(repo.id, body) });
    },
    scan: (c: Context) => { const repo = monitor.repository(c.req.param('id')!); if (!repo) return error(c, 'Repository not found.', 404); return c.json({ repository: monitor.requestScan(repo.id), findings: monitor.findings(repo.id) }, 202); },
    state: (c: Context) => c.json(monitor.snapshot()),
    poll: (c: Context) => { monitor.setState('pollRequested', true); return c.json(monitor.snapshot(), 202); },
    settings: async (c: Context) => { const body = await c.req.json().catch(() => null); if (!body || Object.keys(body).some(key => !['enabled','intervalSeconds'].includes(key)) || (body.enabled !== undefined && typeof body.enabled !== 'boolean') || (body.intervalSeconds !== undefined && (!Number.isInteger(body.intervalSeconds) || body.intervalSeconds < 60 || body.intervalSeconds > 86400))) return error(c, 'Use enabled:boolean and intervalSeconds between 60 and 86400.'); return c.json(monitor.configure(body)); },
    findings: (c: Context) => c.json({ findings: monitor.findings() }),
    remediate: (c: Context) => { try { return c.json(queueRemediation(monitor, runs, c.req.param('id')!), 202); } catch (cause) { return error(c, cause instanceof Error ? cause.message : 'Unable to queue repair.', 409); } },
  };
}
