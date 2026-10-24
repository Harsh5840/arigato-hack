import { serve } from '@hono/node-server';
import { databasePath, port, webOrigin } from './config/env.js';
import { RunStore } from './db/client.js';
import { createApp } from './app.js';

const store = new RunStore(databasePath);
const server = serve({ fetch: createApp(store, webOrigin).fetch, hostname: '127.0.0.1', port });
console.log(`ProofPatch API http://127.0.0.1:${port}; local fixed-repository demo`);
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => server.close(() => { store.close(); process.exit(0); }));
