import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { secureHeaders } from 'hono/secure-headers';
import type { RunStore } from './db/client.js';
import { routes } from './routes/index.js';

export function createApp(store: RunStore, webOrigin = 'http://127.0.0.1:3000') {
  const app = new Hono();
  app.use('*', secureHeaders());
  app.use('*', bodyLimit({ maxSize: 1024 }));
  app.use('*', async (c, next) => {
    const host = (c.req.header('host') || new URL(c.req.url).host).split(':')[0];
    if (!['127.0.0.1', 'localhost'].includes(host)) return c.json({ error: { code: 'LOCAL_ONLY', message: 'This hackathon service accepts loopback hosts only.' } }, 403);
    const origin = c.req.header('origin');
    if (origin && ![webOrigin, 'http://localhost:3000'].includes(origin)) return c.json({ error: { code: 'ORIGIN_REJECTED', message: 'Origin is outside this local workspace.' } }, 403);
    if (!['GET', 'HEAD'].includes(c.req.method) && !c.req.header('content-type')?.startsWith('application/json')) return c.json({ error: { code: 'JSON_REQUIRED', message: 'Mutations require application/json.' } }, 415);
    await next();
  });
  app.route('/api', routes(store));
  app.onError((error, c) => c.json({ error: { code: 'SERVICE_ERROR', message: error.message.replace(/gsk_[A-Za-z0-9]+/g, '[REDACTED]').slice(0, 700) } }, 503));
  return app;
}
