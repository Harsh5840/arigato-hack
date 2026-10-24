import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const projectRoot = resolve(process.env.PROOFPATCH_ROOT || '../..');
const envFile = resolve(projectRoot, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);
export const databasePath = resolve(process.env.PROOFPATCH_DB || resolve(projectRoot, '.data/proofpatch.sqlite'));
export const port = Number(process.env.API_PORT || 8787);
export const webOrigin = process.env.WEB_ORIGIN || 'http://127.0.0.1:3000';
