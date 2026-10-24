import { Hono } from 'hono';
import type { RunStore } from '../db/client.js';
import { runHandlers } from '../handlers/runs.handler.js';
import type { MonitoringStore } from '../db/monitoring.js';
import { monitoringHandlers } from '../handlers/monitoring.handler.js';

export function routes(store: RunStore, monitor?: MonitoringStore) {
  const router = new Hono(); const handlers = runHandlers(store);
  router.get('/status', handlers.status);
  router.get('/runs', handlers.list); router.post('/runs', handlers.create);
  router.get('/runs/:id', handlers.get); router.get('/runs/:id/events', handlers.events);
  router.get('/runs/:id/evidence', handlers.evidence); router.post('/runs/:id/cancel', handlers.cancel);
  router.get('/runs/:id/diff', handlers.diff);
  if (monitor) {
    const monitoring = monitoringHandlers(monitor, store);
    router.get('/repositories', monitoring.repositories); router.post('/repositories', monitoring.add);
    router.patch('/repositories/:id', monitoring.patch); router.post('/repositories/:id/scan', monitoring.scan);
    router.get('/monitoring', monitoring.state); router.post('/monitoring/poll', monitoring.poll); router.patch('/monitoring', monitoring.settings);
    router.get('/findings', monitoring.findings); router.post('/findings/:id/remediate', monitoring.remediate);
  }
  return router;
}
