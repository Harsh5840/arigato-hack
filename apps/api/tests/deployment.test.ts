import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RunStore } from '../src/db/client.js';
import { createApp } from '../src/app.js';
import { GET, POST } from '../../web/src/app/api/proofpatch/[...path]/route.js';

const token = 'test_only_random_32_byte_server_token_0123456789';
test('non-loopback API binding fails closed without a strong server token', () => {
  const store = new RunStore(':memory:');
  try {
    assert.throws(() => createApp(store, undefined, undefined, { host: '0.0.0.0' }), /requires API_TOKEN/);
    assert.throws(() => createApp(store, undefined, undefined, { host: '0.0.0.0', token: 'short' }), /requires API_TOKEN/);
    assert.throws(() => createApp(store, undefined, undefined, { host: '0.0.0.0', token, trustedHosts: ['*'] }), /explicit hostnames/);
  } finally { store.close(); }
});

test('remote API requires bearer authentication, configured host and exact dashboard origin', async () => {
  const store = new RunStore(':memory:');
  try {
    const app = createApp(store, 'https://security.example', undefined, { host: '0.0.0.0', token, trustedHosts: ['api'] });
    assert.equal((await app.request('http://api/api/runs')).status, 401);
    assert.equal((await app.request('http://api/api/runs', { headers: { authorization: 'Bearer wrong' } })).status, 401);
    assert.equal((await app.request('http://evil.example/api/runs', { headers: { authorization: `Bearer ${token}` } })).status, 403);
    assert.equal((await app.request('http://api/api/runs', { headers: { authorization: `Bearer ${token}`, origin: 'https://evil.example' } })).status, 403);
    const allowed = await app.request('http://api/api/runs', { headers: { authorization: `Bearer ${token}`, origin: 'https://security.example' } });
    assert.equal(allowed.status, 200);
    assert.deepEqual(await allowed.json(), { runs: [] });
    const wrongType = await app.request('http://api/api/runs', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json-malicious' }, body: '{}' });
    assert.equal(wrongType.status, 415);
  } finally { store.close(); }
});

test('server-only proxy keeps its destination fixed, injects server credentials and streams SSE', async (t) => {
  const previous = { API_TOKEN: process.env.API_TOKEN, PROOFPATCH_API_ORIGIN: process.env.PROOFPATCH_API_ORIGIN, PROOFPATCH_WEB_ORIGIN: process.env.PROOFPATCH_WEB_ORIGIN };
  Object.assign(process.env, { API_TOKEN: token, PROOFPATCH_API_ORIGIN: 'http://api.internal:8787', PROOFPATCH_WEB_ORIGIN: 'http://127.0.0.1:3000' });
  t.after(() => { for (const [key, value] of Object.entries(previous)) if (value === undefined) delete process.env[key]; else process.env[key] = value; });
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    calls++;
    assert.equal(String(input), 'http://api.internal:8787/api/runs/run-1/events?after=12');
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('authorization'), `Bearer ${token}`);
    assert.equal(headers.get('last-event-id'), '12');
    assert.equal(headers.get('cookie'), null);
    assert.equal(init?.redirect, 'error');
    return new Response('event: snapshot\ndata: {"run":null}\n\n', { headers: { 'content-type': 'text/event-stream' } });
  });
  const response = await GET(new Request('http://127.0.0.1:3000/api/proofpatch/runs/run-1/events?after=12', { headers: { authorization: 'Bearer client-supplied', cookie: 'session=private', 'last-event-id': '12' } }), { params: Promise.resolve({ path: ['runs', 'run-1', 'events'] }) });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-accel-buffering'), 'no');
  assert.equal(response.headers.get('authorization'), null);
  assert.match(await response.text(), /event: snapshot/);
  assert.equal(calls, 1);
});

test('proxy rejects URL/path escape, cross-origin mutations and oversized JSON before upstream access', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Rejected requests must not reach upstream.'); });
  const originalOrigin = process.env.PROOFPATCH_WEB_ORIGIN;
  process.env.PROOFPATCH_WEB_ORIGIN = 'http://127.0.0.1:3000';
  t.after(() => { if (originalOrigin === undefined) delete process.env.PROOFPATCH_WEB_ORIGIN; else process.env.PROOFPATCH_WEB_ORIGIN = originalOrigin; });
  assert.equal((await GET(new Request('http://127.0.0.1:3000/api/proofpatch/status'), { params: Promise.resolve({ path: ['https:', 'evil.example'] }) })).status, 400);
  assert.equal((await GET(new Request('http://127.0.0.1:3000/api/proofpatch/status'), { params: Promise.resolve({ path: ['runs', '..', 'status'] }) })).status, 400);
  assert.equal((await POST(new Request('http://127.0.0.1:3000/api/proofpatch/runs', { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{}' }), { params: Promise.resolve({ path: ['runs'] }) })).status, 403);
  assert.equal((await POST(new Request('http://127.0.0.1:3000/api/proofpatch/runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ x: 'a'.repeat(1100) }) }), { params: Promise.resolve({ path: ['runs'] }) })).status, 413);
});
