import test from 'node:test';
import assert from 'node:assert/strict';
import type {MonitoredRepository, SupplyFinding} from '../../../packages/contracts/src/monitoring.ts';
import {canPrepareRepair, repairUnavailableReason, groupRepairFindings} from '../src/components/features/operations/repair-capability.ts';
import {collectCreatedPullRequests} from '../src/components/features/operations/pull-request-records.ts';

const repository: MonitoredRepository = {
  id: 'unrelated-repository', owner: 'customer', name: 'shipping-service', url: 'https://github.com/customer/shipping-service', defaultBranch: 'main',
  enabled: true, autoRemediate: false, profile: 'generic', createdAt: '2026-10-25T00:00:00Z', updatedAt: '2026-10-25T00:00:00Z',
  inventory: [], inventorySha: 'abc123', canPush: true,
  repairCapability: {supported: true, reason: 'Detected container verification.', ecosystems: ['Docker'], stack: ['Docker Compose'], testCommands: ['docker compose config --quiet'], testsDetected: true, runner: 'central-actions', targets: [{ecosystem: 'Docker', packageName: 'nginx', manifestPath: 'compose.yaml'}]},
};
const finding: SupplyFinding = {id: 'image-risk', repositoryId: repository.id, advisoryId: 'CVE-EXAMPLE', aliases: [], ecosystem: 'Docker', packageName: 'nginx', installedVersion: '1.20.0', fixedVersion: '1.29.0', manifestPath: 'compose.yaml', summary: 'Affected image version.', references: [], detectedAt: repository.createdAt, status: 'detected'};

test('a newly named customer repository can prepare a supported container repair', () => {
  assert.equal(canPrepareRepair(repository, finding), true);
});

test('a legacy demo name grants no repair permission without detected capability', () => {
  assert.equal(canPrepareRepair({...repository, name: 'arigato-python-demo', profile: 'python-requests-demo', repairCapability: undefined}, finding), false);
  assert.equal(canPrepareRepair({...repository, inventorySha: undefined}, finding), false);
});

test('read-only access, unsupported ecosystems and missing safe targets stay disabled', () => {
  assert.equal(canPrepareRepair({...repository, canPush: false}, finding), false);
  assert.equal(canPrepareRepair(repository, {...finding, ecosystem: 'PyPI'}), false);
  assert.equal(canPrepareRepair(repository, {...finding, fixedVersion: ''}), false);
  assert.equal(canPrepareRepair(repository, {...finding, manifestPath: 'other/compose.yaml'}), false);
  assert.match(repairUnavailableReason({...repository, canPush: false}), /Branch-write permission/);
});

test('many advisories for the same exact update share a row without losing their evidence', () => {
  const values = Array.from({length: 28}, (_, index) => ({...finding, id: `advisory-${index}`, advisoryId: `CVE-${index}`, ...(index === 10 ? {runId: 'actual-shared-run', status: 'queued' as const} : {})}));
  const groups = groupRepairFindings(values);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].advisories.length, 28);
  assert.equal(groups[0].finding.runId, 'actual-shared-run');
  assert.equal(new Set(groups[0].advisories.map(item => item.advisoryId)).size, 28);
});

test('different manifests, versions or image digests never collapse into the same repair row', () => {
  assert.equal(groupRepairFindings([finding, {...finding, id: 'other-file', manifestPath: 'services/web/compose.yaml'}, {...finding, id: 'other-target', fixedVersion: '1.30.0'}, {...finding, id: 'other-digest', fixedDigest: 'a'.repeat(64)}]).length, 4);
});

test('the PR list shows one real repository PR for many advisory matches', () => {
  const pullRequest = {url: 'https://github.com/customer/shipping-service/pull/9', number: 9, draft: true};
  const advisories = Array.from({length: 28}, (_, index) => ({...finding, id: `advisory-${index}`, advisoryId: `CVE-${index}`, status: 'draft-created' as const, pullRequest}));
  const records = collectCreatedPullRequests([repository], advisories);
  assert.equal(records.length, 1);
  assert.equal(records[0].advisoryCount, 28);
  assert.equal(records[0].targets.length, 1);
  assert.equal(records[0].number, 9);
  assert.equal(collectCreatedPullRequests([], advisories).length, 0);
  assert.equal(collectCreatedPullRequests([repository], [{...advisories[0], pullRequest: {...pullRequest, url: 'https://evil.example/pr/9'}}]).length, 0);
});
