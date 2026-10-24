/** Server-only bridge: credentials never enter client components or browser headers. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ path: string[] }> };
const roots = new Set(['status', 'runs', 'repositories', 'monitoring', 'findings']);
const fail = (code: string, message: string, status: number) => Response.json({ error: { code, message } }, { status });

async function proxy(request: Request, context: Context): Promise<Response> {
  const { path } = await context.params;
  if (!path.length || path.length > 5 || !roots.has(path[0]) || path.some((part) => !/^[A-Za-z0-9._-]{1,180}$/.test(part) || part === '.' || part === '..')) return fail('PATH_REJECTED', 'Unsupported orchestration API path.', 400);
  const incoming = new URL(request.url);
  if (incoming.search.length > 2048) return fail('QUERY_REJECTED', 'API query exceeds its bound.', 400);
  const configuredWebOrigin = process.env.PROOFPATCH_WEB_ORIGIN || process.env.WEB_ORIGIN || 'http://127.0.0.1:3000';
  const allowedOrigins = new Set([configuredWebOrigin, ...(['http://127.0.0.1:3000', 'http://localhost:3000'].includes(configuredWebOrigin) ? ['http://127.0.0.1:3000', 'http://localhost:3000'] : [])]);
  if (!allowedOrigins.has(incoming.origin)) return fail('HOST_REJECTED', 'Dashboard host is outside the configured web origin.', 403);
  const origin = request.headers.get('origin');
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin && !allowedOrigins.has(origin))) return fail('ORIGIN_REJECTED', 'Request origin is outside this dashboard.', 403);
  let upstream: URL;
  try {
    upstream = new URL(process.env.PROOFPATCH_API_ORIGIN || 'http://127.0.0.1:8787');
    if (!['http:', 'https:'].includes(upstream.protocol) || upstream.username || upstream.password || upstream.pathname !== '/' || upstream.search || upstream.hash) throw new Error('Invalid API origin.');
  } catch { return fail('API_CONFIGURATION', 'The server API origin is misconfigured.', 503); }
  // Path and destination are independently bounded; clients cannot supply an upstream URL.
  upstream.pathname = `/api/${path.map(encodeURIComponent).join('/')}`;
  upstream.search = incoming.search;
  const headers = new Headers({ accept: request.headers.get('accept') || 'application/json' });
  const token = process.env.API_TOKEN;
  if (token) headers.set('authorization', `Bearer ${token}`);
  if (origin) headers.set('origin', origin);
  const lastEventId = request.headers.get('last-event-id');
  if (lastEventId && /^\d{1,20}$/.test(lastEventId)) headers.set('last-event-id', lastEventId);
  const mutation = !['GET', 'HEAD'].includes(request.method);
  let body: string | undefined;
  if (mutation) {
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return fail('JSON_REQUIRED', 'Mutations require application/json.', 415);
    headers.set('content-type', 'application/json');
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    if (reader) for (;;) {
      const part = await reader.read(); if (part.done) break;
      length += part.value.byteLength;
      if (length > 1024) { await reader.cancel(); return fail('BODY_TOO_LARGE', 'API request exceeds 1024 bytes.', 413); }
      chunks.push(part.value);
    }
    body = new TextDecoder().decode(Buffer.concat(chunks));
  }
  try {
    const response = await fetch(upstream, { method: request.method, headers, ...(body !== undefined ? { body } : {}), cache: 'no-store', redirect: 'error', signal: AbortSignal.any([request.signal, AbortSignal.timeout(path.at(-1) === 'events' ? 20 * 60_000 : 45_000)]) });
    const outputHeaders = new Headers({ 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    const contentType = response.headers.get('content-type');
    if (contentType) outputHeaders.set('content-type', contentType);
    if (contentType?.includes('text/event-stream')) outputHeaders.set('x-accel-buffering', 'no');
    return new Response(response.body, { status: response.status, headers: outputHeaders });
  } catch { return fail('SERVICE_OFFLINE', 'The orchestration server is unreachable or timed out. Check the API process and server connection settings.', 503); }
}

export { proxy as GET, proxy as HEAD, proxy as POST, proxy as PATCH, proxy as PUT, proxy as DELETE };
