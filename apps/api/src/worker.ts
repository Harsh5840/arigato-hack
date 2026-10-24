import { setTimeout as delay } from 'node:timers/promises';
import { resolve } from 'node:path';
import { databasePath, projectRoot } from './config/env.js';
import { RunStore } from './db/client.js';
import { executeRun } from './services/orchestrator.js';
import { MonitoringStore } from './db/monitoring.js';
import { monitorCycle } from './services/monitoring.js';
import { executePackageRun } from './services/package-orchestrator.js';

const store = new RunStore(databasePath);
const monitor = new MonitoringStore(databasePath);
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { stopping = true; });
let pendingCycle: Promise<void> | undefined;
const tick = () => {
  if (stopping) return;
  monitor.setState('workerLastSeenAt', new Date().toISOString());
  if (!pendingCycle) pendingCycle = monitorCycle(monitor, store).catch(error => {
    monitor.configure({ lastError: error instanceof Error ? error.message : 'Background monitoring failed.' });
  }).finally(() => { pendingCycle = undefined; });
};
tick();
const watcher = setInterval(tick, 10_000);
console.log('ProofPatch worker ready; persistent repository monitoring, LangGraph queue and five agent calls maximum per repair.');
while (!stopping) {
  store.recoverExpired();
  const run = store.claim();
  if (run?.target) await executePackageRun(store, monitor, run.id, projectRoot);
  else if (run) await executeRun(store, run.id, undefined, resolve(projectRoot, 'output/live-runs'));
  else await delay(1000);
}
clearInterval(watcher);
await pendingCycle;
monitor.close();
store.close();
