import {Buffer} from 'node:buffer';
import type {Dependency, RepairCapability} from '../../../../packages/contracts/src/monitoring.js';
import {readRepositorySnapshot, type RepositorySnapshot} from '../adapters/repository.js';
import {discoverRepairPolicy, isRepairTestPath, safeRepairPath, type RepairPolicy, type RepairTarget} from './repair-policy.js';

const contextBytesLimit = 1_000_000;
const contextFilesLimit = 100;

function isRuntimeOraclePath(path: string): boolean {
  return safeRepairPath(path) && /(?:^|\/)(?:tests\/runtime-check\.sh|config\/nginx\.conf|public\/[^/]+(?:\/[^/]+)*)$/.test(path);
}

/** Read only immutable baseline manifests and verification inputs, never credentials or workflows. */
export async function loadRepairContext(snapshot: RepositorySnapshot, signal?: AbortSignal): Promise<{files: Record<string, string>; paths: string[]}> {
  const paths = [...new Set([...Object.keys(snapshot.files), ...snapshot.paths.filter(path => isRepairTestPath(path) || isRuntimeOraclePath(path))])].sort();
  if (paths.length > contextFilesLimit || paths.some(path => !safeRepairPath(path))) throw new Error('More than 100 baseline manifest or verification files require a maintainer verification policy.');
  const missing = paths.filter(path => !(path in snapshot.files));
  const loaded = missing.length ? await readRepositorySnapshot(snapshot, snapshot.sha, missing, signal) : {};
  const files = {...snapshot.files, ...loaded};
  if (paths.some(path => typeof files[path] !== 'string') || Object.values(files).reduce((sum, value) => sum + Buffer.byteLength(value), 0) > contextBytesLimit) throw new Error('Baseline manifests and verification inputs exceed the one-megabyte context limit.');
  return {files, paths};
}

function detectedStack(snapshot: RepositorySnapshot): string[] {
  const stack = new Set<string>();
  for (const dependency of snapshot.inventory) {
    if (dependency.ecosystem === 'PyPI') stack.add('Python');
    if (dependency.ecosystem === 'npm') stack.add('Node.js');
    if (dependency.ecosystem === 'Packagist') stack.add('PHP');
    if (dependency.ecosystem === 'Docker') {
      stack.add('Container');
      if (/^(?:(?:docker\.io\/)?library\/)?php$/.test(dependency.name)) stack.add('PHP');
    }
  }
  for (const path of Object.keys(snapshot.files)) {
    if (/(?:^|\/)(?:requirements(?:-[\w-]+)?\.txt|pyproject\.toml)$/.test(path)) stack.add('Python');
    if (/(?:^|\/)package(?:-lock)?\.json$/.test(path)) stack.add('Node.js');
    if (/(?:^|\/)composer\.(?:json|lock)$/.test(path)) stack.add('PHP');
    if (/(?:^|\/)(?:Dockerfile(?:\.[\w-]+)?|(?:docker-)?compose(?:[.\w-]*)?\.ya?ml)$/.test(path)) stack.add('Container');
  }
  return [...stack];
}

// This target is a local capability probe. It does not assert a vulnerability or publication.
function policyProbe(dependency: Dependency): RepairTarget {
  const match = /^(v?\d+\.\d+\.)(\d+)(.*)$/.exec(dependency.version);
  const fixedVersion = match ? `${match[1]}${Number(match[2]) + 1}${match[3]}` : `${dependency.version}-proofpatch-probe`;
  return {ecosystem: dependency.ecosystem, packageName: dependency.name, installedVersion: dependency.version, fixedVersion, manifestPath: dependency.manifestPath,
    ...(dependency.ecosystem === 'Docker' ? {imageRef: dependency.imageRef, fixedImageRef: `${dependency.name}:${fixedVersion}@sha256:${'a'.repeat(64)}`} : {})};
}

export async function getRepositoryRepairCapability(snapshot: RepositorySnapshot, signal?: AbortSignal): Promise<RepairCapability> {
  const base: RepairCapability = {supported: false, reason: '', ecosystems: [], testCommands: [], stack: detectedStack(snapshot), runner: 'central-actions', testsDetected: false};
  if (snapshot.private) return {...base, reason: 'Monitoring is available. The central verifier currently checks out public repositories; private repositories need a separately configured checkout credential.'};
  if (!snapshot.canPush) return {...base, reason: 'Monitoring is available with read access. Branch-write permission is required to prepare a draft PR.'};
  if (!snapshot.inventory.length) return {...base, reason: 'No exact dependency pins or supported container image references were found. Monitoring remains available.'};
  let context: Awaited<ReturnType<typeof loadRepairContext>>;
  try {context = await loadRepairContext(snapshot, signal);}
  catch (cause) {
    if (signal?.aborted) throw cause;
    return {...base, reason: `Automatic fixes are unavailable: ${cause instanceof Error ? cause.message : 'The baseline verification context could not be loaded.'}`};
  }
  const policies: {ecosystem: string; packageName: string; manifestPath: string; policy: RepairPolicy}[] = [];
  const failures = new Set<string>();
  for (const dependency of snapshot.inventory) {
    try {policies.push({ecosystem: dependency.ecosystem, packageName: dependency.name, manifestPath: dependency.manifestPath, policy: discoverRepairPolicy(context.files, policyProbe(dependency), context.paths)});}
    catch (cause) {failures.add(cause instanceof Error ? cause.message : 'A supported verification plan could not be detected.');}
  }
  const ecosystems = [...new Set(policies.map(item => item.ecosystem))];
  const testCommands = [...new Set(policies.map(({policy}) => `${policy.root ? `${policy.root}: ` : ''}${policy.testCommand.join(' ')}`))];
  const testsDetected = policies.some(({policy}) => policy.testPaths.length > 0 && policy.testCommand.length > 0);
  if (!policies.length || !testsDetected) return {...base, reason: `${[...failures].slice(0, 2).join(' ') || 'No runnable baseline verification plan was detected.'} Monitoring remains available.`};
  const targets = [...new Map(policies.map(({ecosystem, packageName, manifestPath}) => [JSON.stringify([ecosystem, packageName, manifestPath]), {ecosystem, packageName, manifestPath}])).values()];
  return {...base, supported: true, ecosystems, testCommands, testsDetected, targets,
    reason: `Detected baseline tests support ${ecosystems.join(', ')} dependency or image updates. Frozen tests and isolated checks must pass before a draft PR is created.${failures.size ? ' Some dependencies need an additional maintainer verification policy.' : ''}`};
}
