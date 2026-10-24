import assert from 'node:assert/strict';
import test from 'node:test';
import { projectSeniorReviewEvidence } from '../src/adapters/package-groq.js';
import type { Evidence } from '../src/adapters/types.js';

function fixture(): Evidence {
  const selected = Array.from({ length: 28 }, (_, index) => `CVE-2026-${10000 + index}`);
  const runtime = { baselineImage: 'nginx:1.26.0', fixedImage: 'nginx:1.30.6@sha256:' + 'a'.repeat(64), baselineScannerFindings: 831, candidateScannerFindings: 391, baselineExecuted: false, observedAssertions: 7,
    vendorEvidence: { vendor: 'nginx', baselineAffectedIds: selected, candidateAffectedIds: [], selectedIds: selected, sources: [{ url: 'https://nginx.org/en/security_advisories.html', sha256: 'b'.repeat(64) }] },
    scannerCoverageGap: selected,
    remainingImageFindings: Array.from({ length: 80 }, (_, index) => ({ id: `CVE-2026-${20000 + index}`, package: 'package-' + index, severity: index % 2 ? 'HIGH' : 'LOW', fixedVersion: null })), remainingImageFindingsTruncated: true,
  };
  const checks: Evidence['checks'] = ['scope', 'verifier', 'package_version', 'business_suite', 'no_known_advisories'].map(id => ({ id: `runner_${id}`, label: id, status: 'passed', detail: 'Synthetic test evidence, not actual CI execution.' }));
  const policy = { target_repository: 'independent-team/storefront', run_id: 'run-123-a1', base_sha: 'c'.repeat(40), candidate_sha: 'd'.repeat(40), workflow_sha: 'e'.repeat(40), github_run_id: '123', mode: 'verify', verifier_sha256: 'f'.repeat(64), checks, runtime,
    policy: { kind: 'container', allowedPaths: ['compose.yaml'], testCommand: ['sh', '/oracle/tests/runtime-check.sh'] },
    scan_artifact: { name: 'proofpatch-scans-run-123-a1', baseline_sha256: '1'.repeat(64), candidate_sha256: '2'.repeat(64), workflow_sha: 'e'.repeat(40), github_run_id: '123' }, businessLog: 'PASS: business check\n'.repeat(5_000),
  };
  return { ci: { id: 123, url: 'https://github.com/example/runner/actions/runs/123', status: 'completed', conclusion: 'success' }, baseSha: 'c'.repeat(40), candidateSha: 'd'.repeat(40), verifierSha256: 'f'.repeat(64), artifactSha256: '3'.repeat(64), runtime, checks, policy, businessLog: policy.businessLog, rawFiles: { 'verification.json': JSON.stringify(policy) } };
}

test('senior projection removes duplicate/raw evidence and bounds residual rows and long test logs', () => {
  const original = fixture(), before = JSON.stringify(original), projected = projectSeniorReviewEvidence(original);
  assert.ok(JSON.stringify(projected).length < 12_000);
  assert.equal(projected.rawFiles, undefined);
  assert.equal(projected.policy, undefined);
  const residuals = projected.remainingImageFindings as Record<string, unknown>;
  assert.equal(residuals.totalCandidateScannerFindings, 391);
  assert.equal(residuals.sourceSampleRows, 80);
  assert.deepEqual(residuals.severityCountsInSourceSampleOnly, { LOW: 40, HIGH: 40 });
  assert.equal((residuals.sample as unknown[]).length, 6);
  assert.equal(residuals.rowsOmittedFromSourceSample, 311);
  assert.equal((projected.businessTests as Record<string, unknown>).excerpted, true);
  assert.equal(JSON.stringify(original), before, 'Full persisted evidence must not be mutated by a model projection.');
});

test('all selected vendor advisories, scanner coverage gaps and provenance remain visible', () => {
  const original = fixture(), projected = projectSeniorReviewEvidence(original);
  assert.deepEqual(projected.vendorEvidence, original.runtime!.vendorEvidence);
  assert.deepEqual(projected.scannerCoverageGap, original.runtime!.scannerCoverageGap);
  assert.equal((projected.provenance as Record<string, unknown>).workflow_sha, 'e'.repeat(40));
  assert.equal((projected.runtime as Record<string, unknown>).baselineExecuted, false);
  const full = projected.fullEvidence as Record<string, unknown>;
  assert.equal(full.evidenceArtifactSha256, '3'.repeat(64));
  assert.equal(full.artifactListingUrl, original.ci.url + '#artifacts');
  assert.equal((full.scannerArtifact as Record<string, unknown>).candidate_sha256, '2'.repeat(64));
});

test('failed and unrun checks survive projection verbatim and never become a clean badge', () => {
  const original = fixture(); original.checks[2].status = 'failed'; original.checks[2].detail = 'Observed runtime version is stale.'; original.checks[3].status = 'not-run';
  const projected = projectSeniorReviewEvidence(original);
  assert.deepEqual(projected.checks, original.checks);
  assert.match(JSON.stringify(projected), /Observed runtime version is stale/);
  assert.match(JSON.stringify(projected), /not-run/);
});

test('oversized mandatory assertions fail closed instead of dropping evidence from senior review', () => {
  const original = fixture(); original.checks[0].detail = 'x'.repeat(5_000);
  assert.throws(() => projectSeniorReviewEvidence(original), /assertion exceeds/);
});
