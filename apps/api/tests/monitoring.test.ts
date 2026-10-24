import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createApp } from '../src/app.js';
import { RunStore } from '../src/db/client.js';
import { MonitoringStore } from '../src/db/monitoring.js';
import { queueRemediation, registerRepository } from '../src/services/monitoring.js';
import {recoverDraftLinks} from '../src/services/draft-link-recovery.js';
import { frozenPackageDigest, validatePackageRepair } from '../src/services/package-orchestrator.js';
import { clearGitHubCredentialCacheForTests } from '../src/adapters/github.js';
import type { MonitoredRepository, SupplyFinding } from '../../../packages/contracts/src/monitoring.js';

const originalFetch = globalThis.fetch;
const originalToken = process.env.GITHUB_TOKEN;
const originalManager = process.env.ALLOW_GIT_CREDENTIAL_MANAGER;
const stores: {close(): void}[] = [];
const temporaryDirectories: string[] = [];
beforeEach(() => {
  process.env.GITHUB_TOKEN = 'unit-test-placeholder';
  process.env.ALLOW_GIT_CREDENTIAL_MANAGER = 'false';
  clearGitHubCredentialCacheForTests();
  globalThis.fetch = async () => {throw new Error('Unexpected network access in monitoring unit tests.');};
});
afterEach(() => {
  for (const store of stores.splice(0)) store.close();
  for (const directory of temporaryDirectories.splice(0)) {
    assert.ok(directory.startsWith(resolve(tmpdir(), 'proofpatch-monitoring-')));
    rmSync(directory, {recursive: true, force: true});
  }
  globalThis.fetch = originalFetch;
  if (originalToken === undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN = originalToken;
  if (originalManager === undefined) delete process.env.ALLOW_GIT_CREDENTIAL_MANAGER; else process.env.ALLOW_GIT_CREDENTIAL_MANAGER = originalManager;
  clearGitHubCredentialCacheForTests();
});
function memory() {
  const monitor = new MonitoringStore(':memory:');
  const runs = new RunStore(':memory:');
  stores.push(monitor, runs);
  return {monitor, runs};
}
function repository(overrides: Partial<MonitoredRepository> = {}): MonitoredRepository {
  return {id: 'repo-unit', owner: 'unit-owner', name: 'python-service', url: 'https://github.com/unit-owner/python-service', defaultBranch: 'main', enabled: true, autoRemediate: false, profile: 'generic', repairCapability: {supported: true, reason: 'Detected frozen baseline Python tests.', ecosystems: ['PyPI'], targets: [{ecosystem: 'PyPI', packageName: 'requests', manifestPath: 'requirements.txt'}], testCommands: ['python -m unittest discover -s tests -p test*.py -v'], stack: ['Python'], runner: 'central-actions', testsDetected: true}, createdAt: '2026-10-25T00:00:00Z', updatedAt: '2026-10-25T00:00:00Z', inventory: [{ecosystem: 'PyPI', name: 'requests', version: '2.31.0', manifestPath: 'requirements.txt', direct: true}], inventorySha: 'a'.repeat(40), canPush: true, scanStatus: 'idle', ...overrides};
}
function finding(overrides: Partial<SupplyFinding> = {}): SupplyFinding {
  return {id: 'finding-unit', repositoryId: 'repo-unit', advisoryId: 'GHSA-unit-unit-unit', aliases: ['CVE-2024-35195'], ecosystem: 'PyPI', packageName: 'requests', installedVersion: '2.31.0', fixedVersion: '2.32.5', manifestPath: 'requirements.txt', summary: 'Synthetic test advisory, not execution evidence.', references: [{title: 'Unit test advisory', url: 'https://osv.dev/vulnerability/GHSA-unit-unit-unit'}], detectedAt: '2026-10-25T00:00:00Z', status: 'detected', ...overrides};
}
const headers = {'content-type': 'application/json'};
function json(value: unknown) {return new Response(JSON.stringify(value), {headers});}

test('repository onboarding rejects non-GitHub input as a user error before any network access', async () => {
  const {monitor,runs}=memory();
  const response=await createApp(runs,undefined,monitor).request('http://localhost/api/repositories',{method:'POST',headers,body:JSON.stringify({url:'https://127.0.0.1/private'})});
  assert.equal(response.status,400);
  assert.match((await response.json()).error.message,/github.com/);
  assert.equal(monitor.repositories().length,1);
});

test('registry, settings, findings and worker heartbeat survive a SQLite restart', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'proofpatch-monitoring-'));
  temporaryDirectories.push(directory);
  const path = resolve(directory, 'state.sqlite');
  const first = new MonitoringStore(path);
  first.saveRepository(repository({enabled: false, autoRemediate: true}));
  first.saveFinding(finding());
  first.patchFinding('finding-unit', {status: 'queued', runId: 'persisted-run'});
  first.configure({enabled: false, intervalSeconds: 600, nextCycleAt: '2026-10-25T00:10:00Z'});
  first.setState('workerLastSeenAt', '2026-10-25T00:00:01Z');
  first.close();
  const second = new MonitoringStore(path); stores.push(second);
  assert.equal(second.repository('repo-unit')?.inventory[0].version, '2.31.0');
  assert.equal(second.repository('repo-unit')?.enabled, false);
  assert.equal(second.repository('repo-unit')?.autoRemediate, true);
  assert.equal(second.finding('finding-unit')?.runId, 'persisted-run');
  assert.equal(second.snapshot().enabled, false);
  assert.equal(second.snapshot().intervalSeconds, 600);
  assert.equal(second.snapshot().workerLastSeenAt, '2026-10-25T00:00:01Z');
});

test('saved-run deletion refuses active work, then clears history without reopening draft findings', async () => {
  const {monitor, runs} = memory();
  const repo = repository(); monitor.saveRepository(repo);
  const {run} = runs.createForFinding(repo, finding());
  monitor.saveFinding(finding());
  monitor.patchFinding('finding-unit', {status: 'draft-created', runId: run.id});
  monitor.saveFinding(finding({id: 'queued-alias'}));
  monitor.patchFinding('queued-alias', {status: 'queued', runId: run.id});
  const app = createApp(runs, undefined, monitor);
  const remove = () => app.request('http://localhost/api/runs', {method: 'DELETE', headers, body: '{}'});
  assert.equal((await remove()).status, 409);
  assert.ok(runs.get(run.id)); assert.ok(runs.events(run.id).length);
  assert.equal(monitor.finding('finding-unit')?.runId, run.id);

  runs.update(run.id, {status: 'completed'});
  const response = await remove();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).deleted, 1);
  assert.equal(runs.get(run.id), undefined);
  assert.deepEqual(runs.events(run.id), []);
  assert.equal(monitor.finding('finding-unit')?.status, 'draft-created');
  assert.equal(monitor.finding('finding-unit')?.runId, undefined);
  assert.equal(monitor.finding('queued-alias')?.status, 'detected');
  assert.equal(monitor.finding('queued-alias')?.runId, undefined);
  assert.equal((await (await remove()).json()).deleted, 0);
});

test('an archived real draft PR stays linked to the exact finding after run history is cleared', () => {
  const {monitor, runs} = memory();
  const repo = repository(); monitor.saveRepository(repo);
  monitor.saveFinding(finding({status: 'draft-created'}));
  const {run} = runs.createForFinding(repo, finding());
  const pr = {url: 'https://github.com/unit-owner/python-service/pull/7', number: 7, draft: true};
  const directory = mkdtempSync(resolve(tmpdir(), 'proofpatch-monitoring-')); temporaryDirectories.push(directory);
  const exportDirectory = resolve(directory, 'output/live-runs', run.id);
  mkdirSync(exportDirectory, {recursive: true});
  writeFileSync(resolve(exportDirectory, 'run.json'), JSON.stringify({run: {...run, status: 'completed', pullRequest: pr}}));
  assert.equal(recoverDraftLinks(monitor, directory), 1);
  assert.deepEqual(monitor.finding('finding-unit')?.pullRequest, pr);
  monitor.saveFinding(finding());
  assert.equal(monitor.finding('finding-unit')?.status, 'draft-created');
  assert.deepEqual(monitor.finding('finding-unit')?.pullRequest, pr);
  monitor.patchFinding('finding-unit', {runId: run.id});
  monitor.clearRunLinks([run.id]);
  assert.equal(monitor.finding('finding-unit')?.runId, undefined);
  assert.deepEqual(monitor.finding('finding-unit')?.pullRequest, pr);
  assert.throws(() => queueRemediation(monitor, runs, 'finding-unit'), /draft PR already exists/);
});

test('repository onboarding inventories a frozen commit and leaves repositories without tests monitor-only', async () => {
  const {monitor} = memory(); const calls: string[] = [];
  globalThis.fetch = async (input, init) => {
    assert.equal(init?.method ?? 'GET', 'GET');
    const url = String(input); calls.push(url);
    assert.equal(new URL(url).hostname, 'api.github.com');
    if (url.endsWith('/unit-owner/python-service')) return json({default_branch: 'main', permissions: {push: true}});
    if (url.endsWith('/commits/main')) return json({sha: 'a'.repeat(40), commit: {tree: {sha: 'b'.repeat(40)}}});
    if (url.includes('/git/trees/')) return json({truncated: false, tree: [{path: 'requirements.txt', type: 'blob', mode: '100644', size: 17}]});
    assert.ok(url.endsWith(`/contents/requirements.txt?ref=${'a'.repeat(40)}`));
    return json({type: 'file', encoding: 'base64', size: 17, content: Buffer.from('requests==2.31.0\n').toString('base64')});
  };
  const connected = await registerRepository(monitor, 'https://github.com/unit-owner/python-service.git');
  assert.equal(connected.profile, 'monitor-only'); assert.equal(connected.autoRemediate, false);
  assert.equal(connected.repairCapability?.supported, false); assert.equal(connected.repairCapability?.testsDetected, false);
  assert.equal(connected.canPush, true); assert.equal(connected.inventorySha, 'a'.repeat(40));
  assert.equal(connected.inventory[0].name, 'requests'); assert.equal(connected.scanStatus, 'queued');
  monitor.patchRepository(connected.id, {enabled: false});
  const again = await registerRepository(monitor, 'https://github.com/unit-owner/python-service');
  assert.equal(again.id, connected.id); assert.equal(again.createdAt, connected.createdAt); assert.equal(again.enabled, false);
  assert.equal(monitor.repositories().filter(repo => repo.id === connected.id).length, 1);
  assert.equal(calls.length, 8);
});

test('repository HTTP settings cannot forge detected capability or bypass push permission', async () => {
  const {monitor, runs} = memory(); monitor.saveRepository(repository({profile: 'monitor-only', repairCapability: undefined}));
  const app = createApp(runs, undefined, monitor);
  const patch = (body: unknown) => app.request('http://127.0.0.1/api/repositories/repo-unit', {method: 'PATCH', headers, body: JSON.stringify(body)});
  assert.equal((await patch({profile: 'python-requests-demo', autoRemediate: true})).status, 400);
  assert.equal((await patch({repairCapability: repository().repairCapability, autoRemediate: true})).status, 400);
  assert.equal((await patch({autoRemediate: true})).status, 409);
  monitor.patchRepository('repo-unit', {profile: 'generic', repairCapability: repository().repairCapability, canPush: false});
  assert.equal((await patch({autoRemediate: true})).status, 409);
  assert.equal(monitor.repository('repo-unit')?.autoRemediate, false);
  monitor.patchRepository('repo-unit', {canPush: true});
  assert.equal((await patch({autoRemediate: true})).status, 200);
  assert.equal(monitor.repository('repo-unit')?.autoRemediate, true);
});

test('manual scan and source polling persist requests without doing network or model work in the handler', async () => {
  const {monitor, runs} = memory(); monitor.saveRepository(repository({enabled: false})); monitor.configure({enabled: false});
  const app = createApp(runs, undefined, monitor);
  const scanned = await app.request('http://127.0.0.1/api/repositories/repo-unit/scan', {method: 'POST', headers, body: '{}'});
  assert.equal(scanned.status, 202); assert.equal(monitor.repository('repo-unit')?.scanStatus, 'queued');
  assert.ok(monitor.repository('repo-unit')?.scanRequestedAt);
  assert.equal((await app.request('http://127.0.0.1/api/monitoring/poll', {method: 'POST', headers, body: '{}'})).status, 202);
  assert.equal(monitor.state('pollRequested'), true); assert.equal(runs.list().length, 0);
});

test('monitoring schedule HTTP validation rejects unsafe intervals and hidden state fields', async () => {
  const {monitor, runs} = memory(); const app = createApp(runs, undefined, monitor);
  const patch = (body: unknown) => app.request('http://127.0.0.1/api/monitoring', {method: 'PATCH', headers, body: JSON.stringify(body)});
  for (const intervalSeconds of [0, 59, 86401, 60.5, '60']) assert.equal((await patch({intervalSeconds})).status, 400);
  assert.equal((await patch({workerLastSeenAt: 'forged'})).status, 400);
  assert.equal((await patch({enabled: false, intervalSeconds: 60})).status, 200);
  assert.equal(monitor.snapshot().enabled, false); assert.equal(monitor.snapshot().intervalSeconds, 60);
});

test('queueing requires detected exact-target capability, push permission and a published safe target', () => {
  const {monitor, runs} = memory(); monitor.saveRepository(repository()); monitor.saveFinding(finding());
  for (const override of [{repairCapability: undefined}, {repairCapability: {...repository().repairCapability!, supported: false}}, {canPush: false}]) {
    monitor.saveRepository(repository(override)); assert.throws(() => queueRemediation(monitor, runs, 'finding-unit'), Error);
  }
  monitor.saveRepository(repository());
  for (const override of [{ecosystem: 'npm' as const}, {manifestPath: 'no-detected-tests/requirements.txt'}, {fixedVersion: ''}]) {
    monitor.saveFinding(finding({id: 'unsupported-unit', ...override}));
    assert.throws(() => queueRemediation(monitor, runs, 'unsupported-unit'), Error);
  }
  assert.equal(runs.list().length, 0);
  assert.throws(() => queueRemediation(monitor, runs, 'missing'), /not found/);
});

test('a new customer repository gains repair capability from detected tests and starts in guided mode', async () => {
  const {monitor, runs} = memory();
  const files = {'services/orders/requirements.txt': 'urllib3==1.26.5\n', 'services/orders/tests/test_orders.py': 'import unittest\nclass OrderTest(unittest.TestCase):\n def test_yen(self): self.assertEqual(100 + 10, 110)\n'};
  const urls: string[] = [];
  globalThis.fetch = async (input, init) => {
    assert.equal(init?.method ?? 'GET', 'GET');
    const url = String(input); urls.push(url);
    assert.equal(new URL(url).hostname, 'api.github.com');
    if (url.endsWith('/customer-one/order-service')) return json({default_branch: 'main', private: false, permissions: {push: true}});
    if (url.endsWith('/commits/main')) return json({sha: 'a'.repeat(40), commit: {tree: {sha: 'b'.repeat(40)}}});
    if (url.includes('/git/trees/')) return json({truncated: false, tree: Object.entries(files).map(([path, content]) => ({path, type: 'blob', mode: '100644', size: Buffer.byteLength(content)}))});
    const path = decodeURIComponent(new URL(url).pathname.split('/contents/')[1]);
    assert.ok(path in files); assert.equal(new URL(url).searchParams.get('ref'), 'a'.repeat(40));
    const content = files[path as keyof typeof files];
    return json({type: 'file', encoding: 'base64', size: Buffer.byteLength(content), content: Buffer.from(content).toString('base64')});
  };
  const connected = await registerRepository(monitor, 'https://github.com/customer-one/order-service');
  assert.equal(connected.profile, 'generic'); assert.equal(connected.autoRemediate, false);
  assert.deepEqual(connected.repairCapability?.targets, [{ecosystem: 'PyPI', packageName: 'urllib3', manifestPath: 'services/orders/requirements.txt'}]);
  assert.match(connected.repairCapability!.testCommands[0], /^services\/orders: python -m unittest/);
  assert.ok(urls.some(url => url.includes('/contents/services/orders/tests/test_orders.py')));
  const detected = finding({id: 'customer-finding', repositoryId: connected.id, packageName: 'urllib3', installedVersion: '1.26.5', fixedVersion: '1.26.6', manifestPath: 'services/orders/requirements.txt'});
  monitor.saveFinding(detected);
  const queued = queueRemediation(monitor, runs, detected.id);
  assert.equal(queued.run.repo.name, 'order-service'); assert.equal(queued.run.target?.packageName, 'urllib3');
  assert.equal(queued.run.target?.manifestPath, 'services/orders/requirements.txt');
  assert.deepEqual(queued.run.agentCalls, []); assert.deepEqual(queued.run.checks, []);
});

test('one package repair coalesces matching advisory aliases and records no fabricated execution', () => {
  const {monitor, runs} = memory(); const repo = repository(); monitor.saveRepository(repo);
  monitor.saveFinding(finding()); monitor.saveFinding(finding({id: 'finding-mirror', advisoryId: 'PYSEC-unit', aliases: ['CVE-2024-35195']}));
  const first = queueRemediation(monitor, runs, 'finding-unit');
  const second = queueRemediation(monitor, runs, 'finding-mirror');
  assert.equal(second.reused, true); assert.equal(second.run.id, first.run.id); assert.equal(runs.list().length, 1);
  assert.equal(first.run.status, 'queued'); assert.equal(first.run.orchestrationEngine, 'langgraph');
  assert.deepEqual(first.run.agentCalls, []); assert.deepEqual(first.run.checks, []);
  assert.equal(first.run.pullRequest, undefined); assert.equal(first.run.mergeReady, false); assert.equal(first.run.findingClosed, false);
  assert.equal(monitor.finding('finding-unit')?.runId, first.run.id); assert.equal(monitor.finding('finding-mirror')?.runId, first.run.id);
  assert.equal(first.run.target?.fixedVersion, '2.32.5');
  runs.update(first.run.id, {status: 'completed', pullRequest: {url: 'https://github.com/unit-owner/python-service/pull/1', number: 1, draft: true}});
  const completed = queueRemediation(monitor, runs, 'finding-mirror');
  assert.equal(completed.reused, true); assert.equal(monitor.finding('finding-unit')?.status, 'draft-created');
});

test('coalescing never merges different repositories, package versions, safe versions or manifest paths', () => {
  const {runs} = memory(); const repo = repository(); const first = runs.createForFinding(repo, finding());
  const variants = [finding({id: 'changed-installed', installedVersion: '2.30.0'}), finding({id: 'changed-safe', fixedVersion: '2.32.6'}), finding({id: 'changed-manifest', manifestPath: 'nested/requirements.txt'}), finding({id: 'changed-package', packageName: 'urllib3'}), finding({id: 'changed-ecosystem', ecosystem: 'npm'})];
  for (const item of variants) assert.notEqual(runs.createForFinding(repo, item).run.id, first.run.id);
  assert.notEqual(runs.createForFinding(repository({id: 'other-repository', name: 'other-service'}), finding({repositoryId: 'other-repository'})).run.id, first.run.id);
  assert.equal(runs.list().length, variants.length + 2);
});

test('blocked, failed and cancelled repairs can retry without reusing terminal failure evidence', () => {
  const {runs} = memory(); const repo = repository(); const item = finding();
  let previous = runs.createForFinding(repo, item).run;
  for (const status of ['blocked', 'failed', 'cancelled'] as const) {
    runs.update(previous.id, {status, draftPRAllowed: false});
    const next = runs.createForFinding(repo, item);
    assert.equal(next.reused, false); assert.notEqual(next.run.id, previous.id);
    assert.equal(next.run.status, 'queued'); assert.deepEqual(next.run.checks, []); previous = next.run;
  }
});

test('same-target rescans preserve review lifecycle while changed safe targets invalidate stale run links', () => {
  const {monitor} = memory(); monitor.saveRepository(repository()); monitor.saveFinding(finding());
  monitor.patchFinding('finding-unit', {status: 'draft-created', runId: 'old-reviewed-run'});
  monitor.saveFinding(finding({summary: 'New authoritative wording', detectedAt: '2026-10-26T00:00:00Z'}));
  assert.equal(monitor.finding('finding-unit')?.status, 'draft-created'); assert.equal(monitor.finding('finding-unit')?.runId, 'old-reviewed-run');
  monitor.saveFinding(finding({fixedVersion: '2.32.6'}));
  assert.equal(monitor.finding('finding-unit')?.status, 'detected'); assert.equal(monitor.finding('finding-unit')?.runId, undefined);
  monitor.patchFinding('finding-unit', {status: 'queued', runId: 'another-old-run'});
  monitor.saveFinding(finding({fixedVersion: '', status: 'needs-owner'}));
  assert.equal(monitor.finding('finding-unit')?.status, 'needs-owner'); assert.equal(monitor.finding('finding-unit')?.runId, undefined);
});

const baseline = {'requirements.txt': 'requests==2.31.0\n', 'service/client.py': 'import requests\n\ndef status(url):\n    return requests.get(url, timeout=5).status_code\n', 'verification/verify.mjs': 'export const frozen = true;\n', 'verification/business.py': 'assert 1 + 1 == 2\n'};
const pin = () => [{path: 'requirements.txt', content: 'requests==2.32.5\n'}];
test('a valid package pin update retains application source and frozen verifier identity', () => {
  const candidate = validatePackageRepair(finding(), baseline, pin());
  assert.equal(candidate['requirements.txt'], 'requests==2.32.5\n'); assert.equal(candidate['service/client.py'], baseline['service/client.py']);
  assert.equal(frozenPackageDigest({...baseline, ...candidate}), frozenPackageDigest(baseline));
});

test('package repair rejects dependency/index/URL injection and authoritative-version substitution', () => {
  for (const content of ['requests==2.32.6\n', 'requests==2.32.5\ncertifi==2026.1.1\n', 'requests==2.32.5\n--extra-index-url https://unit.invalid\n', 'requests @ https://unit.invalid/requests.whl\n', baseline['requirements.txt']]) assert.throws(() => validatePackageRepair(finding(), baseline, [{path: 'requirements.txt', content}]), /published|update/i);
});

test('all application-source changes are held for a separately approved compatibility policy', () => {
  for (const content of [baseline['service/client.py'] + '# Harmless but unreviewed change\n', 'from pathlib import Path\nVALUE = Path("/tmp/unit-fixture").read_text()\n', 'import http.client\nCLIENT = http.client.HTTPSConnection("unit.invalid")\n']) assert.throws(() => validatePackageRepair(finding(), baseline, [...pin(), {path: 'service/client.py', content}]), /source|compatibility|policy/i);
});

test('package repair cannot mutate workflow/verifiers, duplicate paths, oversized files or NUL content', () => {
  for (const path of ['verification/business.py', '.github/workflows/proofpatch-verify.yml', '../requirements.txt', '/requirements.txt']) assert.throws(() => validatePackageRepair(finding(), baseline, [...pin(), {path, content: 'changed'}]), /scope/i);
  assert.throws(() => validatePackageRepair(finding(), baseline, [...pin(), ...pin()]), /scope/i);
  assert.throws(() => validatePackageRepair(finding(), baseline, [{path: 'requirements.txt', content: 'x'.repeat(30001)}]), /scope/i);
  assert.throws(() => validatePackageRepair(finding(), baseline, [{path: 'requirements.txt', content: 'requests==2.32.5\0'}]), /scope/i);
  assert.throws(() => validatePackageRepair(finding(), baseline, []), /scope/i);
});

test('frozen verifier identity changes for either oracle and rejects missing or empty evidence files', () => {
  const original = frozenPackageDigest(baseline); assert.match(original, /^[a-f0-9]{64}$/);
  assert.notEqual(frozenPackageDigest({...baseline, 'verification/verify.mjs': 'changed'}), original);
  assert.notEqual(frozenPackageDigest({...baseline, 'verification/business.py': 'changed'}), original);
  assert.throws(() => frozenPackageDigest({'verification/verify.mjs': baseline['verification/verify.mjs']}), /Missing frozen/);
  assert.throws(() => frozenPackageDigest({...baseline, 'verification/business.py': ''}), /Missing frozen/);
});
