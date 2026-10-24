import { setTimeout as delay } from 'node:timers/promises';
import { resolve } from 'node:path';
import { databasePath, projectRoot } from './config/env.js';
import { RunStore } from './db/client.js';
import { executeRun } from './services/orchestrator.js';

const store = new RunStore(databasePath);
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { stopping = true; });
console.log('ProofPatch worker ready; SQLite queue, one owned repository, five agent calls maximum.');
while (!stopping) {
  store.recoverExpired();
  const run = store.claim();
  if (run) await executeRun(store, run.id, undefined, resolve(projectRoot, 'output/live-runs'));
  else await delay(1000);
}
store.close();
