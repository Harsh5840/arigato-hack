import assert from 'node:assert/strict';
import test from 'node:test';
import { assertGenericEvidence, parseGeneratedLockfiles } from '../src/services/package-orchestrator.js';
import type { Evidence } from '../src/adapters/types.js';
import type { RepairPolicy } from '../src/services/repair-policy.js';

const policy: RepairPolicy = { version: 'generic-repair-v1', kind: 'npm', root: 'services/api', manifestPath: 'services/api/package-lock.json', allowedPaths: ['services/api/package.json', 'services/api/package-lock.json'], testPaths: ['services/api/tests/catalog.test.mjs'], testCommand: ['npm', 'run', 'test', '--ignore-scripts'], runnerImage: 'node:22@sha256:' + 'a'.repeat(64) };
const expected = { targetRepository: 'independent-team/payment-service', runId: 'run-123-a1-prepare', baseSha: 'a'.repeat(40), candidateSha: 'b'.repeat(40), workflowSha: 'c'.repeat(40), githubRunId: 123, verifierSha256: 'd'.repeat(64) };
const artifact = () => ({ target_repository: expected.targetRepository, run_id: expected.runId, base_sha: expected.baseSha, candidate_sha: expected.candidateSha, workflow_sha: expected.workflowSha, github_run_id: expected.githubRunId, verifier_sha256: expected.verifierSha256, files: [{ path: 'services/api/package-lock.json', content: '{"lockfileVersion":3}' }] });

test('generic orchestration accepts only the resolver lockfile belonging to the exact preparation run', () => {
  assert.deepEqual(parseGeneratedLockfiles(JSON.stringify(artifact()), policy, expected), [{ path: 'services/api/package-lock.json', content: '{"lockfileVersion":3}' }]);
});

test('runner environment string IDs normalize only when they represent the exact numeric Actions run', () => {
  const stringIdentity: Record<string, unknown> = artifact(); stringIdentity.github_run_id = '123';
  assert.equal(parseGeneratedLockfiles(JSON.stringify(stringIdentity), policy, expected).length, 1);
  for (const invalid of ['00123', '123x', '124', '', null, true]) {
    stringIdentity.github_run_id = invalid;
    assert.throws(() => parseGeneratedLockfiles(JSON.stringify(stringIdentity), policy, expected), /does not match/);
  }
});

test('generated lockfile identity cannot be transplanted from another repository, candidate, runner or action', () => {
  for (const key of ['target_repository', 'run_id', 'base_sha', 'candidate_sha', 'workflow_sha', 'github_run_id', 'verifier_sha256'] as const) {
    const modified: Record<string, unknown> = artifact(); modified[key] = key === 'github_run_id' ? 999 : 'wrong-identity';
    assert.throws(() => parseGeneratedLockfiles(JSON.stringify(modified), policy, expected), /does not match/);
  }
});

test('trusted resolver output cannot edit application source, tests, manifests or duplicate locks', () => {
  for (const path of ['services/api/package.json', 'services/api/tests/catalog.test.mjs', '../../package-lock.json', 'package-lock.json']) {
    const modified = artifact(); modified.files[0].path = path;
    assert.throws(() => parseGeneratedLockfiles(JSON.stringify(modified), policy, expected), /protected path/);
  }
  const repeated = artifact(); repeated.files.push(repeated.files[0]);
  assert.throws(() => parseGeneratedLockfiles(JSON.stringify(repeated), policy, expected), /exactly once/);
  assert.throws(() => parseGeneratedLockfiles(undefined, policy, expected), /missing/);
});

function evidence(): Evidence { return { ci: { id: 123, url: 'https://github.com/example/runner/actions/runs/123', status: 'completed', conclusion: 'success' }, baseSha: expected.baseSha, candidateSha: expected.candidateSha, verifierSha256: expected.verifierSha256, rawFiles: {}, checks: ['scope', 'verifier', 'package_version', 'business_suite', 'no_known_advisories'].map(id => ({ id: 'runner_' + id, label: id, status: 'passed', detail: 'Synthetic unit-test evidence, not an executed CI run.' })) }; }
const gate = { baseSha: expected.baseSha, candidateSha: expected.candidateSha, verifier: expected.verifierSha256, required: ['scope', 'verifier', 'package_version', 'business_suite', 'no_known_advisories'] };
test('publication requires every mandatory observed runner check, not just a green CI badge', () => {
  assert.doesNotThrow(() => assertGenericEvidence(evidence(), gate));
  const missing = evidence(); missing.checks = missing.checks.filter(item => item.id !== 'runner_business_suite');
  assert.throws(() => assertGenericEvidence(missing, gate), /verification failed/);
  const unrun = evidence(); unrun.checks[3].status = 'not-run';
  assert.throws(() => assertGenericEvidence(unrun, gate), /verification failed/);
});

test('publication rejects stale candidate and baseline test evidence even if all reported tests pass', () => {
  for (const field of ['baseSha', 'candidateSha', 'verifierSha256'] as const) {
    const stale = evidence(); stale[field] = 'e'.repeat(64);
    assert.throws(() => assertGenericEvidence(stale, gate), /verification failed/);
  }
  const failed = evidence(); failed.ci.conclusion = 'failure';
  assert.throws(() => assertGenericEvidence(failed, gate), /verification failed/);
});
