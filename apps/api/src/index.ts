import { serve } from '@hono/node-server';
import { apiHost, apiToken, apiTrustedHosts, databasePath, port, webOrigin } from './config/env.js';
import { RunStore } from './db/client.js';
import { createApp } from './app.js';
import { MonitoringStore } from './db/monitoring.js';

const store = new RunStore(databasePath);
const monitor = new MonitoringStore(databasePath);
const server = serve({ fetch: createApp(store, webOrigin, monitor, { host: apiHost, token: apiToken, trustedHosts: apiTrustedHosts }).fetch, hostname: apiHost, port });
console.log(`ProofPatch API listening on ${apiHost}:${port}; ${apiToken ? 'server bearer authentication enabled' : 'loopback access only'}`);
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => server.close(() => { store.close(); process.exit(0); }));
