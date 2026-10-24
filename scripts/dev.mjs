import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const commands = [['api', 'src/index.ts'], ['api', 'src/worker.ts'], ['web', 'next']];
const children = commands.map(([app, entry]) => {
  const cwd = resolve(root, 'apps', app);
  const executable = app === 'api' ? ['--experimental-sqlite', '--import', 'tsx', entry] : [resolve(cwd, 'node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', '3000'];
  return spawn(process.execPath, executable, { cwd, stdio: 'inherit', windowsHide: true, env: { ...process.env, PROOFPATCH_ROOT: root } });
});
let ending = false;
function stop(code = 0) { if (ending) return; ending = true; for (const child of children) child.kill(); setTimeout(() => process.exit(code), 500).unref(); }
for (const child of children) child.on('exit', (code) => { if (!ending) stop(code || 0); });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop());
