import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import * as adapters from '../src/adapters/index.js';
import { allowedPaths, fixedImage, type Advisory, type Baseline, type Evidence, type Repair } from '../src/adapters/types.js';
import { RunStore } from '../src/db/client.js';
import { executeRun } from '../src/services/orchestrator.js';
import { terminalStatuses } from '../../../packages/contracts/src/live.js';

const baseSha = 'a'.repeat(40);
const candidateSha = 'b'.repeat(40);
const verifierSha256 = 'c'.repeat(64);
const branch = 'proofpatch/fencing-test';
const base: Baseline = {
  sha: baseSha,
  treeSha: 'd'.repeat(40),
  verifierSha256,
  files: {
    Dockerfile: 'FROM php:8.3.35-cli-bookworm\nWORKDIR /app\nCOPY config/security.ini /usr/local/etc/php/conf.d/zz-sakurashop.ini\nUSER 10001:10001\n',
    'composer.json': '{"require":{"php":">=8.3.35 <8.4"}}\n',
    'config/security.ini': 'session.upload_progress.enabled = 1\nsession.serialize_handler = php\n',
  },
};
const candidate = {
  ...base.files,
  Dockerfile: base.files.Dockerfile.replace('php:8.3.35-cli-bookworm', fixedImage),
  'composer.json': base.files['composer.json'].replace('>=8.3.35 <8.4', '>=8.3.36 <8.4'),
  'config/security.ini': base.files['config/security.ini'].replace('session.upload_progress.enabled = 1', 'session.upload_progress.enabled = 0'),
};
const summary = {
  model: 'openai/gpt-oss-120b',
  usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
  summaryEn: 'Fixture review result.',
  summaryJa: '検証用のレビュー結果。',
};
const advisory: Advisory = {
  id: 'JPCERT-AT-2026-0033', titleEn: 'PHP advisory', titleJa: 'PHP の注意喚起',
  sourceMode: 'cached', sources: [], summary: 'Fixed fixture advisory.', body: 'Fixed fixture advisory.',
  fixedVersion: '8.3.36', image: fixedImage, cves: ['CVE-2026-109618', 'CVE-2026-109619'], ownerTasks: [],
};
const repair: Repair = {
  ...summary,
  files: allowedPaths.map((path) => ({ path, content: candidate[path] })),
  rollbackNotes: [], ownerTasks: [],
};
const requiredChecks = [
  'evidence_identity', 'workflow_provenance', 'candidate_policy',
  'policy_reviewed_runtime_release', 'policy_reviewed_image_digest', 'policy_composer_floor',
  'policy_upload_progress_startup_setting', 'policy_startup_config_is_copied', 'policy_unprivileged_fixture_user',
  'runtime_runtime_matches_reviewed_release', 'runtime_upload_progress_disabled_at_startup', 'runtime_expected_serializer',
  ...Array.from({ length: 15 }, (_, index) => `business_${index + 1}`),
  'business_suite', 'built_image', 'trusted_workflow',
];
const evidence: Evidence = {
  baseSha, candidateSha, verifierSha256,
  ci: { id: 123, url: 'https://github.com/Harsh5840/arigato-php-demo/actions/runs/123', status: 'completed', conclusion: 'success' },
  checks: requiredChecks.map((id) => ({ id, label: id, status: 'passed', detail: 'Mocked frozen evidence.' })),
  policy: { assessment: { security_policy: 'PASS' } },
  rawFiles: {},
};
const pullRequest = { url: 'https://github.com/Harsh5840/arigato-php-demo/pull/123', number: 123, draft: true, reused: false };

function fixture(t: TestContext) {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Fencing tests must not access the network.'); });
  const store = new RunStore(':memory:');
  t.after(() => store.close());
  const { run } = store.create('cached');
  assert.equal(store.claim()?.id, run.id);
  const writes = { candidate: 0, dispatch: 0, pullRequest: 0 };
  let baselineReads = 0;
  let beforePublication: (() => void) | undefined;
  let duringPublication: (() => void) | undefined;
  const deps: typeof adapters = {
    ...adapters,
    getProviderStatus: async () => ({ groqConfigured: true, githubConfigured: true, models: { supply: summary.model, fixer: summary.model, reviewer: summary.model } }),
    fetchAdvisory: async () => advisory,
    readBaseline: async () => { if (++baselineReads === 2) beforePublication?.(); return base; },
    analyzeAdvisory: async () => ({ ...summary, affected: true, confidence: 'high' }),
    proposeRepair: async () => repair,
    ensureCandidateBranch: async () => { writes.candidate++; return { branch, sha: candidateSha }; },
    dispatchVerification: async () => { writes.dispatch++; return { startedAt: new Date().toISOString() }; },
    waitForVerification: async () => evidence,
    reviewRepair: async () => ({ ...summary, decision: 'approve', concerns: [], ownerTasks: [] }),
    ensureDraftPullRequest: async (input) => {
      assert.equal(input.expectedHeadSha, candidateSha);
      writes.pullRequest++;
      duringPublication?.();
      return pullRequest;
    },
  };
  return {
    store, run, writes, deps,
    beforePublication: (action: () => void) => { beforePublication = action; },
    duringPublication: (action: () => void) => { duringPublication = action; },
    baselineReads: () => baselineReads,
  };
}

test('persisted cancellation during the final baseline read prevents publication before the heartbeat tick', async (t) => {
  const f = fixture(t);
  f.beforePublication(() => f.store.update(f.run.id, { cancelRequested: true }));
  await executeRun(f.store, f.run.id, f.deps);
  const result = f.store.get(f.run.id)!;
  assert.equal(f.baselineReads(), 2, 'The complete candidate and review must reach the final publication boundary.');
  assert.deepEqual(f.writes, { candidate: 1, dispatch: 1, pullRequest: 0 });
  assert.equal(result.status, 'cancelled');
  assert.equal(result.draftPRAllowed, false);
  assert.equal(result.failure?.code, 'CANCELLED');
  assert.equal(result.pullRequest, undefined);
});

test('a worker recovered as terminal during the final read cannot resume publication', async (t) => {
  const f = fixture(t);
  f.beforePublication(() => {
    const expiredTime = Date.now() + 60_000;
    const clock = t.mock.method(Date, 'now', () => expiredTime);
    try { f.store.recoverExpired(); } finally { clock.mock.restore(); }
    assert.equal(f.store.get(f.run.id)?.status, 'failed');
    assert.equal(f.store.get(f.run.id)?.failure?.code, 'WORKER_LOST');
  });
  await executeRun(f.store, f.run.id, f.deps);
  const result = f.store.get(f.run.id)!;
  assert.equal(f.baselineReads(), 2);
  assert.deepEqual(f.writes, { candidate: 1, dispatch: 1, pullRequest: 0 });
  assert.ok(terminalStatuses.has(result.status));
  assert.notEqual(result.status, 'completed');
  assert.equal(result.draftPRAllowed, false);
  assert.equal(result.pullRequest, undefined);
  assert.equal(f.store.events(f.run.id).some((event) => event.kind === 'publishing' || event.kind === 'completed'), false);
});

test('cancellation while a PR response is in flight preserves the external result without successful promotion', async (t) => {
  const f = fixture(t);
  f.duringPublication(() => f.store.update(f.run.id, { cancelRequested: true }));
  await executeRun(f.store, f.run.id, f.deps);
  const result = f.store.get(f.run.id)!;
  assert.equal(f.writes.pullRequest, 1);
  assert.deepEqual(result.pullRequest, pullRequest);
  assert.equal(result.status, 'cancelled');
  assert.equal(result.draftPRAllowed, false);
  assert.equal(f.store.events(f.run.id).some((event) => event.kind === 'completed'), false);
});

test('expired publishing leases clear draft approval and retain failure after a stale heartbeat', (t) => {
  const f = fixture(t);
  f.store.update(f.run.id, { status: 'publishing', draftPRAllowed: true });
  const expiredTime = Date.now() + 60_000;
  const clock = t.mock.method(Date, 'now', () => expiredTime);
  try { f.store.recoverExpired(); } finally { clock.mock.restore(); }
  assert.equal(f.store.get(f.run.id)?.status, 'failed');
  assert.equal(f.store.get(f.run.id)?.draftPRAllowed, false);
  assert.equal(f.store.get(f.run.id)?.failure?.code, 'WORKER_LOST');
  f.store.heartbeat(f.run.id);
  f.store.recoverExpired();
  assert.equal(f.store.get(f.run.id)?.status, 'failed');
  assert.equal(f.store.events(f.run.id).filter((event) => event.kind === 'failed').length, 1);
});
