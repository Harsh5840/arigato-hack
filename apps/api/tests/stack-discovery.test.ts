import assert from 'node:assert/strict';
import {afterEach, beforeEach, test} from 'node:test';
import {clearGitHubCredentialCacheForTests} from '../src/adapters/github.js';
import type {RepositorySnapshot} from '../src/adapters/repository.js';
import {getRepositoryRepairCapability, loadRepairContext} from '../src/services/stack-discovery.js';

const originalFetch = globalThis.fetch;
const originalToken = process.env.GITHUB_TOKEN, originalManager = process.env.ALLOW_GIT_CREDENTIAL_MANAGER;
beforeEach(() => {process.env.GITHUB_TOKEN = 'unit-test-placeholder'; process.env.ALLOW_GIT_CREDENTIAL_MANAGER = 'false'; clearGitHubCredentialCacheForTests();});
afterEach(() => {globalThis.fetch = originalFetch; if (originalToken === undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN = originalToken; if (originalManager === undefined) delete process.env.ALLOW_GIT_CREDENTIAL_MANAGER; else process.env.ALLOW_GIT_CREDENTIAL_MANAGER = originalManager; clearGitHubCredentialCacheForTests();});

function snapshot(files: Record<string, string>, patch: Partial<RepositorySnapshot> = {}): RepositorySnapshot {
  return {owner: 'customer', name: 'real-service', defaultBranch: 'main', url: 'https://github.com/customer/real-service', canPush: true, private: false,
    sha: 'a'.repeat(40), treeSha: 'b'.repeat(40), inventory: [{ecosystem: 'PyPI', name: 'requests', version: '2.31.0', manifestPath: 'requirements.txt', direct: true}], files, paths: Object.keys(files), warnings: [], ...patch};
}
const pythonFiles = {'requirements.txt': 'requests==2.31.0\n', 'tests/test_client.py': 'import unittest\nclass ClientTest(unittest.TestCase):\n def test_name(self): self.assertEqual("東京", "東京")\n'};

test('capability comes from manifests and real baseline tests, independent of repository name', async () => {
  const capability = await getRepositoryRepairCapability(snapshot(pythonFiles));
  assert.equal(capability.supported, true);
  assert.deepEqual(capability.ecosystems, ['PyPI']);
  assert.deepEqual(capability.targets, [{ecosystem: 'PyPI', packageName: 'requests', manifestPath: 'requirements.txt'}]);
  assert.deepEqual(capability.stack, ['Python']);
  assert.equal(capability.testsDetected, true);
  assert.match(capability.testCommands[0], /python -m unittest discover/);
});

test('an affected pin without a runnable suite stays monitor-only', async () => {
  const capability = await getRepositoryRepairCapability(snapshot({'requirements.txt': 'requests==2.31.0\n'}));
  assert.equal(capability.supported, false);
  assert.equal(capability.testsDetected, false);
  assert.match(capability.reason, /No conventional baseline Python tests/);
});

test('private and read-only repositories do not claim central draft capability', async () => {
  let fetches = 0; globalThis.fetch = async () => {fetches++; throw new Error('No network expected');};
  const privateResult = await getRepositoryRepairCapability(snapshot(pythonFiles, {private: true}));
  const readonlyResult = await getRepositoryRepairCapability(snapshot(pythonFiles, {canPush: false}));
  assert.equal(privateResult.supported, false); assert.match(privateResult.reason, /private repositories need/);
  assert.equal(readonlyResult.supported, false); assert.match(readonlyResult.reason, /Branch-write permission/);
  assert.equal(fetches, 0);
});

test('nested Python test plans preserve the service root', async () => {
  const files = {'services/pay/requirements.txt': pythonFiles['requirements.txt'], 'services/pay/tests/test_client.py': pythonFiles['tests/test_client.py']};
  const capability = await getRepositoryRepairCapability(snapshot(files, {inventory: [{ecosystem: 'PyPI', name: 'requests', version: '2.31.0', manifestPath: 'services/pay/requirements.txt', direct: true}]}));
  assert.equal(capability.supported, true);
  assert.match(capability.testCommands[0], /^services\/pay: python -m unittest/);
});

test('a monorepo advertises exact repair targets only for services with baseline tests', async () => {
  const files = {'services/pay/requirements.txt': pythonFiles['requirements.txt'], 'services/pay/tests/test_client.py': pythonFiles['tests/test_client.py'], 'services/legacy/requirements.txt': 'urllib3==1.26.5\n'};
  const inventory: RepositorySnapshot['inventory'] = [{ecosystem: 'PyPI', name: 'requests', version: '2.31.0', manifestPath: 'services/pay/requirements.txt', direct: true}, {ecosystem: 'PyPI', name: 'urllib3', version: '1.26.5', manifestPath: 'services/legacy/requirements.txt', direct: true}];
  const capability = await getRepositoryRepairCapability(snapshot(files, {inventory}));
  assert.equal(capability.supported, true);
  assert.deepEqual(capability.targets, [{ecosystem: 'PyPI', packageName: 'requests', manifestPath: 'services/pay/requirements.txt'}]);
  assert.match(capability.reason, /Some dependencies need/);
});

test('nginx Compose image repairs require immutable runtime checks and configuration', async () => {
  const files = {'compose.yaml': 'services:\n  web:\n    image: nginx:1.20.0-alpine\n', 'config/nginx.conf': 'events {}\nhttp { server { listen 8080; } }', 'tests/runtime-check.sh': '#!/bin/sh\nset -eu\nnginx -t\n', 'public/index.html': '<html lang="ja">東京</html>'};
  const repo = snapshot(files, {inventory: [{ecosystem: 'Docker', name: 'nginx', version: '1.20.0-alpine', imageRef: 'nginx:1.20.0-alpine', manifestPath: 'compose.yaml', direct: true}]});
  const capability = await getRepositoryRepairCapability(repo);
  assert.equal(capability.supported, true); assert.deepEqual(capability.stack, ['Container']);
  assert.deepEqual(capability.ecosystems, ['Docker']); assert.deepEqual(capability.testCommands, ['sh /oracle/tests/runtime-check.sh']);
  const missing = snapshot({'compose.yaml': files['compose.yaml']}, {inventory: repo.inventory});
  assert.equal((await getRepositoryRepairCapability(missing)).supported, false);
});

test('npm capability requires a direct dependency, committed lock and meaningful tests', async () => {
  const files = {'package.json': JSON.stringify({dependencies: {lodash: '4.17.20'}, scripts: {test: 'node --test'}}), 'package-lock.json': JSON.stringify({packages: {'node_modules/lodash': {version: '4.17.20'}}}), 'tests/money.test.js': 'import test from "node:test"; test("yen",()=>{});'};
  const repo = snapshot(files, {inventory: [{ecosystem: 'npm', name: 'lodash', version: '4.17.20', manifestPath: 'package-lock.json', direct: true}]});
  const capability = await getRepositoryRepairCapability(repo);
  assert.equal(capability.supported, true); assert.deepEqual(capability.stack, ['Node.js']);
  assert.deepEqual(capability.testCommands, ['npm run test --ignore-scripts']);
  assert.equal((await getRepositoryRepairCapability(snapshot({...files, 'package.json': JSON.stringify({dependencies: {lodash: '4.17.20'}, scripts: {test: 'echo no tests && exit 0'}})}, {inventory: repo.inventory}))).supported, false);
});

test('context loads missing frozen inputs at the exact base SHA and excludes credentials and workflows', async () => {
  const calls: string[] = [];
  globalThis.fetch = async input => {
    calls.push(String(input));
    const content = pythonFiles['tests/test_client.py'];
    return new Response(JSON.stringify({type: 'file', encoding: 'base64', size: Buffer.byteLength(content), content: Buffer.from(content).toString('base64')}), {headers: {'content-type': 'application/json'}});
  };
  const repo = snapshot({'requirements.txt': pythonFiles['requirements.txt']}, {paths: ['requirements.txt', 'tests/test_client.py', '.env', '.github/workflows/ci.yml', 'service/client.py']});
  const context = await loadRepairContext(repo);
  assert.deepEqual(context.paths, ['requirements.txt', 'tests/test_client.py']);
  assert.equal(context.files['tests/test_client.py'], pythonFiles['tests/test_client.py']);
  assert.equal(calls.length, 1); assert.ok(calls[0].endsWith(`/contents/tests/test_client.py?ref=${repo.sha}`));
});

test('oversized baseline contexts fail closed instead of omitting tests', async () => {
  const paths = ['requirements.txt', ...Array.from({length: 100}, (_, index) => `tests/test_${index}.py`)];
  await assert.rejects(loadRepairContext(snapshot({'requirements.txt': 'requests==2.31.0'}, {paths})), /100 baseline/);
  await assert.rejects(loadRepairContext(snapshot({...pythonFiles, 'tests/test_client.py': '#'.repeat(1_000_001)})), /one-megabyte/);
});
