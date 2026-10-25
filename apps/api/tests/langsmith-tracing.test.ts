import assert from 'node:assert/strict';
import { test } from 'node:test';
import { langSmithStatus, langSmithTrace } from '../src/services/langsmith-tracing.js';

const configured = { LANGSMITH_API_KEY: 'test-key', LANGSMITH_TRACING: 'true', LANGSMITH_PROJECT: 'proofpatch-demo' };
const runId = 'd3b84a8c-9eea-4258-9397-34ce7f7607e5';

test('tracing requires explicit opt-in and a server key', () => {
  assert.deepEqual(langSmithStatus({}), { enabled: false, project: 'proofpatch' });
  assert.equal(langSmithStatus({ LANGSMITH_API_KEY: 'test-key' }).enabled, false);
  assert.equal(langSmithStatus({ LANGSMITH_TRACING: 'true' }).enabled, false);
  assert.deepEqual(langSmithStatus(configured), { enabled: true, project: 'proofpatch-demo' });
});

test('a disabled installation never queries LangSmith', async () => {
  let called = false;
  const trace = await langSmithTrace(runId, {}, async () => { called = true; return 'https://smith.langchain.com/trace'; });
  assert.deepEqual(trace, { state: 'not-connected' });
  assert.equal(called, false);
});

test('only a confirmed HTTPS trace URL is exposed', async () => {
  assert.deepEqual(await langSmithTrace(runId, configured, async id => `https://smith.langchain.com/r/${id}`), { state: 'available', url: `https://smith.langchain.com/r/${runId}` });
  assert.deepEqual(await langSmithTrace(runId, configured, async () => 'javascript:alert(1)'), { state: 'unavailable' });
  assert.deepEqual(await langSmithTrace(runId, configured, async () => 'http://smith.langchain.com/r/test'), { state: 'unavailable' });
});

test('missing and failed trace lookups are never shown as recorded', async () => {
  assert.deepEqual(await langSmithTrace(runId, configured, async () => { throw Object.assign(new Error('not found'), { status: 404 }); }), { state: 'not-found' });
  assert.deepEqual(await langSmithTrace(runId, configured, async () => { throw new Error('network down'); }), { state: 'unavailable' });
});
