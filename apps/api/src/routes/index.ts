import { Hono } from 'hono';
import type { RunStore } from '../db/client.js';
import { runHandlers } from '../handlers/runs.handler.js';

export function routes(store: RunStore) {
  const router = new Hono(); const handlers = runHandlers(store);
  router.get('/status', handlers.status);
  router.get('/runs', handlers.list); router.post('/runs', handlers.create);
  router.get('/runs/:id', handlers.get); router.get('/runs/:id/events', handlers.events);
  router.get('/runs/:id/evidence', handlers.evidence); router.post('/runs/:id/cancel', handlers.cancel);
  router.get('/runs/:id/diff', handlers.diff);
  return router;
}
