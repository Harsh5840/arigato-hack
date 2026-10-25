import type { Context } from 'hono';
import type { MonitoringStore } from '../db/monitoring.js';
import type { RunStore } from '../db/client.js';
import { queueRemediation, registerRepository } from '../services/monitoring.js';
import { closeRepositoryDraftPullRequest, parseRepository } from '../adapters/repository.js';

export function monitoringHandlers(monitor: MonitoringStore, runs: RunStore) {
  const error = (c: Context, message: string, status: 400 | 404 | 409 = 400) => c.json({ error: { code: 'MONITORING_INPUT', message } }, status);
  return {
    repositories: (c: Context) => c.json({ repositories: monitor.repositories() }),
    add: async (c: Context) => { const body = await c.req.json().catch(() => null); if (!body || typeof body.url !== 'string' || Object.keys(body).some(key => key !== 'url')) return error(c, 'Provide only a GitHub HTTPS repository URL.'); try { parseRepository(body.url); } catch (cause) { return error(c, cause instanceof Error ? cause.message : 'Invalid GitHub repository URL.'); } return c.json({ repository: await registerRepository(monitor, body.url, c.req.raw.signal) }, 201); },
    remove: (c: Context) => {
      const repo = monitor.repository(c.req.param('id')!);
      if (!repo) return error(c, 'Repository not found.', 404);
      if (runs.hasActiveForRepositories([repo])) return error(c, 'Wait for this service repair to finish or cancel it before disconnecting.', 409);
      try { return c.json(monitor.disconnectRepository(repo.id)); }
      catch (cause) { return error(c, cause instanceof Error ? cause.message : 'Service could not be disconnected.', 409); }
    },
    patch: async (c: Context) => {
      const repo = monitor.repository(c.req.param('id')!); if (!repo) return error(c, 'Repository not found.', 404);
      const body = await c.req.json().catch(() => null);
      if (!body || Object.keys(body).some(key => !['enabled','autoRemediate'].includes(key)) || Object.values(body).some(value => typeof value !== 'boolean')) return error(c, 'Only enabled and autoRemediate boolean settings are accepted.');
      if (body.autoRemediate && (!repo.canPush || !repo.repairCapability?.supported)) return error(c, repo.repairCapability?.reason || 'Automatic repair requires push access and a supported detected test plan. Monitoring remains available.', 409);
      return c.json({ repository: monitor.patchRepository(repo.id, body) });
    },
    scan: (c: Context) => { const repo = monitor.repository(c.req.param('id')!); if (!repo) return error(c, 'Repository not found.', 404); return c.json({ repository: monitor.requestScan(repo.id), findings: monitor.findings(repo.id) }, 202); },
    state: (c: Context) => c.json(monitor.snapshot()),
    poll: (c: Context) => { monitor.setState('pollRequested', true); return c.json(monitor.snapshot(), 202); },
    settings: async (c: Context) => { const body = await c.req.json().catch(() => null); if (!body || Object.keys(body).some(key => !['enabled','intervalSeconds'].includes(key)) || (body.enabled !== undefined && typeof body.enabled !== 'boolean') || (body.intervalSeconds !== undefined && (!Number.isInteger(body.intervalSeconds) || body.intervalSeconds < 60 || body.intervalSeconds > 86400))) return error(c, 'Use enabled:boolean and intervalSeconds between 60 and 86400.'); return c.json(monitor.configure(body)); },
    findings: (c: Context) => c.json({ findings: monitor.findings() }),
    clearFindings: async (c: Context) => {
      const body = await c.req.json().catch(() => null);
      const ids = body?.repositoryIds;
      if (!body || Object.keys(body).sort().join(',') !== 'expectedFindingCount,expectedPullRequestCount,repositoryIds' || !Array.isArray(ids) || !ids.length || ids.length > 20 ||
        !Number.isSafeInteger(body.expectedFindingCount) || body.expectedFindingCount < 0 || !Number.isSafeInteger(body.expectedPullRequestCount) || body.expectedPullRequestCount < 0 ||
        ids.some(id => typeof id !== 'string' || !id || id.length > 100) || new Set(ids).size !== ids.length) return error(c, 'Choose 1–20 unique connected repositories.');
      const repositories = ids.map(id => monitor.repository(id));
      if (repositories.some(repo => !repo)) return error(c, 'A selected repository is no longer connected.', 404);
      const selected = repositories as NonNullable<typeof repositories[number]>[];
      if (runs.hasActiveForRepositories(selected)) return error(c, 'Wait for selected repository repairs to finish or cancel them first.', 409);
      const findings = monitor.findingsForRepositories(ids);
      if (findings.length !== body.expectedFindingCount) return error(c, 'The findings changed since the dashboard loaded. Refresh before closing PRs.', 409);
      if (findings.some(finding => finding.status === 'draft-created' && !finding.pullRequest)) return error(c, 'A draft PR link is missing. Review its run evidence before clearing these records.', 409);
      const requests = new Map<string, {repo: typeof selected[number]; number: number; url: string}>();
      for (const finding of findings) {
        const pr = finding.pullRequest;
        if (!pr) continue;
        const repo = selected.find(item => item.id === finding.repositoryId)!;
        if (!Number.isSafeInteger(pr.number) || pr.number < 1 || pr.url !== `https://github.com/${repo.owner}/${repo.name}/pull/${pr.number}`) return error(c, 'A recorded PR does not match its connected repository.', 409);
        requests.set(`${repo.id}:${pr.number}`, {repo, number: pr.number, url: pr.url});
      }
      if (requests.size !== body.expectedPullRequestCount) return error(c, 'The recorded PR list changed since the dashboard loaded. Refresh before closing PRs.', 409);
      let closedPullRequests = 0;
      let alreadyClosedPullRequests = 0;
      try {
        for (const request of requests.values()) {
          if (runs.hasActiveForRepositories(selected)) return error(c, 'A repair started while PRs were closing. Dashboard records remain; retry after it finishes.', 409);
          const outcome = await closeRepositoryDraftPullRequest(request.repo, request, c.req.raw.signal);
          if (outcome === 'closed') closedPullRequests++;
          else alreadyClosedPullRequests++;
        }
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'GitHub could not close a recorded PR.';
        return c.json({error: {code: 'GITHUB_CLOSE_FAILED', message: `${message} ${closedPullRequests} PR(s) closed in this attempt; dashboard findings remain. Retry after checking GitHub.`}}, 502);
      }
      if (runs.hasActiveForRepositories(selected)) return error(c, 'A repair started while PRs were closing. Dashboard records remain; retry after it finishes.', 409);
      runs.markPullRequestsClosed([...requests.values()]);
      return c.json({deletedFindings: monitor.deleteFindingsForRepositories(ids), closedPullRequests, alreadyClosedPullRequests});
    },
    remediate: (c: Context) => { try { return c.json(queueRemediation(monitor, runs, c.req.param('id')!), 202); } catch (cause) { return error(c, cause instanceof Error ? cause.message : 'Unable to queue repair.', 409); } },
  };
}
