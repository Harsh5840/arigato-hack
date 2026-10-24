import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import { buildSecurityGraph, securityNodeNames, type SecurityNodes } from '../src/graphs/security-graph.js';
import { SqliteGraphSaver } from '../src/graphs/sqlite-checkpointer.js';

function fixture(overrides: Partial<SecurityNodes> = {}) {
  const visited: string[] = [];
  const nodes = Object.fromEntries(securityNodeNames.map((name) => [name, () => { visited.push(name); return name === 'gate' ? { decision: 'publish' } : {}; }])) as unknown as SecurityNodes;
  return { visited, nodes: { ...nodes, ...overrides } };
}

test('actual StateGraph executes separate nodes and conditional scope-repair retry before verification', async () => {
  const calls: string[] = [];
  const f = fixture({ repair: (state) => {
    calls.push(`repair-${state.attempt}`);
    return state.attempt === 1 ? { decision: 'retry', feedback: 'Outside write scope.' } : { data: { ...state.data, accepted: true } };
  } });
  const saver = new SqliteGraphSaver(':memory:');
  try {
    const graph = buildSecurityGraph(f.nodes, { checkpointer: saver, beforeNode: (name) => { calls.push(name); } });
    const result = await graph.invoke({ runId: 'graph-routing' }, { configurable: { thread_id: 'graph-routing' }, recursionLimit: 30 });
    assert.equal(result.attempt, 2);
    assert.equal(result.decision, 'publish');
    assert.deepEqual(calls, ['source', 'inventory', 'triage', 'baseline', 'repair', 'repair-1', 'repair', 'repair-2', 'verify', 'review', 'gate', 'publish']);
    assert.equal(result.data.accepted, true);
    const topology = await graph.getGraphAsync();
    for (const name of securityNodeNames) assert.ok(name in topology.nodes, `Real compiled graph must contain ${name}.`);
    assert.ok(topology.edges.some((edge) => edge.source === 'gate' && edge.target === 'repair' && edge.conditional));
    assert.ok(topology.edges.some((edge) => edge.source === 'repair' && edge.target === 'repair' && edge.conditional));
  } finally { saver.close(); }
});

test('two rejected candidates reach the blocked node without verification or publication', async () => {
  const attempts: number[] = [];
  const f = fixture({ repair: (state) => { attempts.push(state.attempt); return { decision: 'retry' }; } });
  await buildSecurityGraph(f.nodes).invoke({ runId: 'exhausted' }, { recursionLimit: 30 });
  assert.deepEqual(attempts, [1, 2]);
  assert.deepEqual(f.visited, ['source', 'inventory', 'triage', 'baseline', 'blocked']);
});

test('a failed verifier stops the graph before senior review, approval gate and external publication', async () => {
  const f = fixture({ verify: () => { throw new Error('Stale CI artifact candidate SHA.'); } });
  await assert.rejects(buildSecurityGraph(f.nodes).invoke({ runId: 'stale-evidence' }), /Stale CI artifact/);
  assert.equal(f.visited.includes('review'), false);
  assert.equal(f.visited.includes('gate'), false);
  assert.equal(f.visited.includes('publish'), false);
});

test('senior review feedback follows the conditional gate edge through one bounded repair and a fresh verification', async () => {
  const f = fixture({ gate: (state) => state.attempt === 1 ? { decision: 'retry', feedback: 'Missing compatibility constraint.' } : { decision: 'publish' } });
  const result = await buildSecurityGraph(f.nodes).invoke({ runId: 'review-retry' }, { recursionLimit: 30 });
  assert.equal(result.attempt, 2);
  assert.equal(f.visited.filter((name) => name === 'repair').length, 2);
  assert.equal(f.visited.filter((name) => name === 'verify').length, 2);
  assert.equal(f.visited.filter((name) => name === 'review').length, 2);
  assert.equal(f.visited.filter((name) => name === 'publish').length, 1);
});

test('an uncertain source-to-inventory triage cannot reach remediation', async () => {
  const f = fixture({ triage: () => ({ decision: 'block', feedback: 'Unconfirmed forum lead only.' }) });
  await buildSecurityGraph(f.nodes).invoke({ runId: 'unconfirmed' });
  assert.deepEqual(f.visited, ['source', 'inventory', 'blocked']);
});

test('SQLite checkpoints survive closing and reopening without re-executing external nodes', async () => {
  const path = join(tmpdir(), `proofpatch-graph-${randomUUID()}.sqlite`);
  const config = { configurable: { thread_id: 'durable-graph' } };
  let saver = new SqliteGraphSaver(path);
  const f = fixture({ source: (state) => ({ data: { ...state.data, sourceDigest: 'source-snapshot-hash' } }) });
  try {
    const first = buildSecurityGraph(f.nodes, { checkpointer: saver });
    await first.invoke({ runId: 'durable-graph' }, config);
    const visitsBeforeClose = f.visited.length;
    saver.close();
    saver = new SqliteGraphSaver(path);
    const reopened = buildSecurityGraph(f.nodes, { checkpointer: saver });
    const saved = await reopened.getState(config);
    assert.equal(saved.values.data.sourceDigest, 'source-snapshot-hash');
    assert.equal(saved.values.attempt, 1);
    assert.deepEqual(saved.next, []);
    assert.equal(f.visited.length, visitsBeforeClose, 'Inspection must not replay GitHub/model side effects.');
    const history = [];
    for await (const checkpoint of reopened.getStateHistory(config)) history.push(checkpoint);
    assert.ok(history.length >= 11, 'Each separate graph super-step must have durable checkpoint history.');
    assert.ok(history.some((checkpoint) => checkpoint.next.includes('verify')));
    await saver.deleteThread('durable-graph');
    assert.equal(await saver.getTuple(config), undefined);
  } finally {
    saver.close();
    for (const suffix of ['', '-wal', '-shm']) rmSync(path + suffix, { force: true });
  }
});
