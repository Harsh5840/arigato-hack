import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { secureHeaders } from 'hono/secure-headers';
import type { RunStore } from './db/client.js';
import { routes } from './routes/index.js';
import type { MonitoringStore } from './db/monitoring.js';
import { createHash, timingSafeEqual } from 'node:crypto';

export interface ApiSecurityOptions { host?: string; token?: string; trustedHosts?: string[] }
const loopbackHosts = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
const hash = (value: string) => createHash('sha256').update(value).digest();
export function createApp(store: RunStore, webOrigin = 'http://127.0.0.1:3000', monitor?: MonitoringStore, security: ApiSecurityOptions = {}) {
  const listenHost = (security.host || '127.0.0.1').toLowerCase();
  const token = security.token;
  if ((token || !loopbackHosts.has(listenHost)) && (!token || !/^[A-Za-z0-9_-]{32,256}$/.test(token))) throw new Error('A non-loopback API requires API_TOKEN with 32–256 URL-safe random characters. Generate a random token and keep it on the server.');
  const tokenHash = token ? hash(token) : undefined;
  const trustedHosts = new Set((security.trustedHosts ?? [...loopbackHosts, ...(!['0.0.0.0', '::'].includes(listenHost) ? [listenHost] : [])]).map((host) => host.toLowerCase()));
  if (!trustedHosts.size || [...trustedHosts].some((host) => !/^[A-Za-z0-9.:[\]-]{1,253}$/.test(host) || host === '*')) throw new Error('API_TRUSTED_HOSTS must contain explicit hostnames or IP addresses.');
  const originUrl = new URL(webOrigin);
  if (!['http:', 'https:'].includes(originUrl.protocol) || originUrl.origin !== webOrigin) throw new Error('WEB_ORIGIN must be one exact HTTP(S) origin without a path.');
  const allowedOrigins = new Set([webOrigin, ...(loopbackHosts.has(originUrl.hostname) && originUrl.port === '3000' ? ['http://127.0.0.1:3000', 'http://localhost:3000'] : [])]);
  const app = new Hono();
  app.use('*', secureHeaders());
  app.use('*', bodyLimit({ maxSize: 1024 }));
  app.use('*', async (c, next) => {
    const hostHeader = c.req.header('host') || new URL(c.req.url).host;
    let host: string;
    try {
      const parsed = new URL(`http://${hostHeader}`);
      if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error('Invalid host.');
      host = parsed.hostname;
    } catch { return c.json({ error: { code: 'HOST_REJECTED', message: 'Invalid API host.' } }, 403); }
    if (!trustedHosts.has(host)) return c.json({ error: { code: 'HOST_REJECTED', message: 'API host is outside the configured trusted hosts.' } }, 403);
    if (tokenHash) {
      const authorization = c.req.header('authorization') || '';
      const presented = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
      if (!timingSafeEqual(hash(presented), tokenHash)) return c.json({ error: { code: 'UNAUTHORIZED', message: 'Server API authentication is required.' } }, 401);
    }
    const origin = c.req.header('origin');
    if (origin && !allowedOrigins.has(origin)) return c.json({ error: { code: 'ORIGIN_REJECTED', message: 'Origin is outside the configured dashboard.' } }, 403);
    if (!['GET', 'HEAD'].includes(c.req.method) && c.req.header('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return c.json({ error: { code: 'JSON_REQUIRED', message: 'Mutations require application/json.' } }, 415);
    await next();
  });
  app.route('/api', routes(store, monitor));
  app.onError((error, c) => c.json({ error: { code: 'SERVICE_ERROR', message: error.message.replace(/gsk_[A-Za-z0-9]+/g, '[REDACTED]').slice(0, 700) } }, 503));
  return app;
}
