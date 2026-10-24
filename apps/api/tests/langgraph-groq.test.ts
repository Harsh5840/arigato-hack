import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { analyzePackage, proposePackageRepair, reviewPackageRepair, triageForumLeads } from '../src/adapters/package-groq.js';
import { clearGroqModelCacheForTests } from '../src/adapters/groq.js';
import type { AdvisoryLead } from '../../../packages/contracts/src/monitoring.js';

const originalFetch = globalThis.fetch;
const keys = ['GROQ_API_KEY', 'SUPPLY_MODEL', 'FIXER_MODEL', 'REVIEWER_MODEL'] as const;
const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
const catalog = { data: [{ id: 'openai/gpt-oss-20b' }, { id: 'openai/gpt-oss-120b' }] };
const finding = { ecosystem: 'PyPI', packageName: 'requests', installedVersion: '2.31.0', fixedVersion: '2.32.5', source: 'Test-only OSV-shaped fixture' };
const base = { 'requirements.txt': 'requests==2.31.0\n' };
const summary = { summaryEn: 'Pinned Requests release requires an update.', summaryJa: 'Requests の更新が必要です。' };
function json(value: unknown) { return new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } }); }
function mockedCompletion(data: unknown, model = 'openai/gpt-oss-20b', finishReason = 'stop') {
  return { model, choices: [{ finish_reason: finishReason, message: { role: 'assistant', content: JSON.stringify(data) } }], usage: { prompt_tokens: 73, completion_tokens: 22, total_tokens: 95 } };
}
beforeEach(() => { clearGroqModelCacheForTests(); for (const key of keys) delete process.env[key]; process.env.GROQ_API_KEY = 'test-key-do-not-send'; });
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of keys) if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
  clearGroqModelCacheForTests();
});

test('ecosystem-neutral analyst invokes actual ChatGroq strict JSON with no tools and records provider usage', async () => {
  const bodies: Record<string, unknown>[] = [];
  globalThis.fetch = async (input, init) => {
    if (String(input).endsWith('/models')) return json(catalog);
    const body = JSON.parse(String(init?.body)); bodies.push(body);
    assert.equal(body.model, 'openai/gpt-oss-20b');
    assert.equal(body.response_format.type, 'json_schema');
    assert.equal(body.response_format.json_schema.strict, true);
    assert.equal(body.tools, undefined);
    assert.equal(body.stream, false);
    assert.match(body.messages[0].content, /untrusted DATA/);
    const context = JSON.parse(body.messages[1].content);
    assert.equal(context.selectedSafeUpgradeVersion, finding.fixedVersion);
    assert.equal(context.advisoryMatch.fixedVersion, undefined);
    return json(mockedCompletion({ ...summary, affected: true, confidence: 'high' }));
  };
  const analysis = await analyzePackage(finding, [{ name: 'requests', ecosystem: 'PyPI', version: '2.31.0' }]);
  assert.equal(bodies.length, 1);
  assert.equal(analysis.affected, true);
  assert.deepEqual(analysis.usage, { promptTokens: 73, completionTokens: 22, totalTokens: 95 });
});

test('generic repair rejects workflow edits and duplicate candidate paths before any controller writes', async () => {
  globalThis.fetch = async (input) => String(input).endsWith('/models') ? json(catalog) : json(mockedCompletion({
    ...summary, files: [{ path: '.github/workflows/test.yml', content: 'skip tests' }], ownerTasks: [], rollbackNotes: [],
  }, 'openai/gpt-oss-120b'));
  await assert.rejects(proposePackageRepair(finding, base, ['requirements.txt']), /outside the repository allowlist/);
  await assert.rejects(proposePackageRepair(finding, base, ['../requirements.txt']), /unsafe/);
});

test('generic senior reviewer cannot approve with blocking concerns', async () => {
  globalThis.fetch = async (input) => String(input).endsWith('/models') ? json(catalog) : json(mockedCompletion({
    ...summary, decision: 'approve', concerns: ['The required integration suite did not run.'], ownerTasks: [],
  }, 'openai/gpt-oss-120b'));
  await assert.rejects(reviewPackageRepair(finding, base, { 'requirements.txt': 'requests==2.32.5\n' }, { checks: [] }), /approval with blocking concerns/);
});

test('mismatched provider model and truncated completions fail closed', async () => {
  globalThis.fetch = async (input) => String(input).endsWith('/models') ? json(catalog) : json(mockedCompletion({ ...summary, affected: true, confidence: 'high' }, 'unselected-model'));
  await assert.rejects(analyzePackage(finding, []), /different model/);
  globalThis.fetch = async (input) => String(input).endsWith('/models') ? json(catalog) : json(mockedCompletion({ ...summary, affected: true, confidence: 'high' }, 'openai/gpt-oss-20b', 'length'));
  await assert.rejects(analyzePackage(finding, []), /truncated or refused/);
});

test('read-only forum scout cannot invent lead IDs or promote unconfirmed trust', async () => {
  const lead: AdvisoryLead = { id: 'forum-1', title: 'Requests vulnerability discussion', url: 'https://example.invalid/post', source: 'Mock forum', retrievedAt: new Date().toISOString(), trust: 'unconfirmed', aliases: [], summary: 'A report needs official corroboration.' };
  let selected = ['invented-id'];
  globalThis.fetch = async (input) => String(input).endsWith('/models') ? json(catalog) : json(mockedCompletion({ securityLeadIds: selected, summary: 'Unconfirmed package-security lead; verify against official advisories.' }));
  await assert.rejects(triageForumLeads([lead], []), /unknown or duplicated/);
  selected = ['forum-1'];
  const result = await triageForumLeads([lead], []);
  assert.deepEqual(result.securityLeadIds, ['forum-1']);
  assert.equal(lead.trust, 'unconfirmed');
  assert.equal(result.usage.totalTokens, 95);
});
