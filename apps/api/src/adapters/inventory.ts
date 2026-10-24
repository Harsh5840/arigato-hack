import type { Dependency } from '../../../../packages/contracts/src/monitoring.js';

export const inventoryLimit = 100;
export const repositoryBytesLimit = 1_000_000;
const ignored = /(?:^|\/)(?:node_modules|vendor|\.git|\.venv|venv)(?:\/|$)/;
export function isInventoryPath(path: string): boolean {
  return !ignored.test(path) && /(?:^|\/)(?:requirements(?:-[\w.-]+)?\.txt|package-lock\.json|composer\.lock|composer\.json)$/.test(path);
}
export function safeRepositoryPath(path: string): boolean {
  return path.length > 0 && path.length <= 240 && !path.startsWith('/') && !path.includes('\\') && !path.split('/').some((part) => part === '.' || part === '..' || !part) && !/[\x00-\x1f\x7f]/.test(path);
}
export function normalizedPackageName(name: string, ecosystem: Dependency['ecosystem']): string {
  return ecosystem === 'PyPI' ? name.toLowerCase().replace(/[-_.]+/g, '-') : name.toLowerCase();
}
export function stableVersion(value: unknown): value is string {
  return typeof value === 'string' && /^\d+(?:\.\d+){1,3}$/.test(value) && value.length <= 40;
}
export function compareVersions(left: string, right: string): number {
  const a = left.split('.').map(Number), b = right.split('.').map(Number);
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference) return difference;
  }
  return 0;
}

/** Inventory is deliberately exact-version only: an unresolved range cannot be
 * represented as a known installed release in a vulnerability query. */
export function parseInventoryFiles(files: Record<string, string>): { inventory: Dependency[]; warnings: string[] } {
  if (Buffer.byteLength(JSON.stringify(files), 'utf8') > repositoryBytesLimit) throw new Error('Repository manifest files exceed the one-megabyte limit.');
  const inventory: Dependency[] = [], warnings: string[] = [];
  const seen = new Set<string>();
  const add = (ecosystem: Dependency['ecosystem'], name: string, version: string, manifestPath: string, direct: boolean) => {
    name = normalizedPackageName(name, ecosystem);
    if (!/^(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._/-]*$/.test(name) || !stableVersion(version)) { warnings.push(`${manifestPath}: unsupported package name or non-stable exact version for ${name}.`); return; }
    const key = `${ecosystem}:${name}:${version}:${manifestPath}`;
    if (seen.has(key)) return;
    seen.add(key); inventory.push({ ecosystem, name, version, manifestPath, direct });
    if (inventory.length > inventoryLimit) throw new Error('Repository exceeds the 100 exact dependency monitoring limit; select a smaller service repository.');
  };
  for (const [path, content] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
    if (!safeRepositoryPath(path)) throw new Error('Repository inventory contains an unsafe path.');
    if (!isInventoryPath(path)) continue;
    if (/(?:^|\/)requirements(?:-[\w.-]+)?\.txt$/.test(path)) {
      for (const original of content.split(/\r?\n/)) {
        const line = original.replace(/\s+#.*$/, '').trim();
        if (!line || line.startsWith('#')) continue;
        const match = line.match(/^([A-Za-z0-9][A-Za-z0-9._-]*)(?:\[[A-Za-z0-9_,.-]+\])?\s*==\s*(\d+(?:\.\d+){1,3})\s*$/);
        if (match) add('PyPI', match[1], match[2], path, true);
        else warnings.push(`${path}: skipped an unresolved constraint, include, URL, hash continuation or environment-specific requirement.`);
      }
      continue;
    }
    let json: Record<string, unknown>;
    try { const value: unknown = JSON.parse(content); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); json = value as Record<string, unknown>; }
    catch { warnings.push(`${path}: invalid JSON; not monitored.`); continue; }
    if (path.endsWith('package-lock.json')) {
      if (json.packages && typeof json.packages === 'object' && !Array.isArray(json.packages)) {
        const packages = json.packages as Record<string, Record<string, unknown>>;
        const root = packages[''] ?? {};
        const direct = new Set(Object.keys({ ...(root.dependencies as object ?? {}), ...(root.devDependencies as object ?? {}) }));
        for (const [key, pkg] of Object.entries(packages)) {
          if (!key || !pkg || typeof pkg !== 'object' || pkg.link === true) continue;
          const name = typeof pkg.name === 'string' ? pkg.name : key.split('node_modules/').at(-1);
          if (name && typeof pkg.version === 'string') add('npm', name, pkg.version, path, direct.has(name));
        }
      } else if (json.dependencies && typeof json.dependencies === 'object') {
        const visit = (deps: Record<string, unknown>, direct: boolean, depth = 0) => {
          if (depth > 20) throw new Error('Legacy npm lockfile dependency tree is too deep.');
          for (const [name, raw] of Object.entries(deps)) {
            if (!raw || typeof raw !== 'object') continue;
            const pkg = raw as Record<string, unknown>;
            if (typeof pkg.version === 'string') add('npm', name, pkg.version, path, direct);
            if (pkg.dependencies && typeof pkg.dependencies === 'object' && !Array.isArray(pkg.dependencies)) visit(pkg.dependencies as Record<string, unknown>, false, depth + 1);
          }
        };
        visit(json.dependencies as Record<string, unknown>, true);
      } else warnings.push(`${path}: no supported npm lockfile dependency inventory.`);
    }
    if (path.endsWith('composer.lock')) {
      for (const key of ['packages', 'packages-dev']) {
        if (!Array.isArray(json[key])) continue;
        for (const raw of json[key]) {
          if (!raw || typeof raw !== 'object') continue;
          const pkg = raw as Record<string, unknown>;
          if (typeof pkg.name === 'string' && typeof pkg.version === 'string') add('Packagist', pkg.name, pkg.version.replace(/^v/, ''), path, false);
        }
      }
    }
  }
  if (!inventory.length) warnings.push('No supported exact dependencies found. Add a requirements.txt, package-lock.json or composer.lock; runtime-only Docker declarations need a separate runtime policy.');
  return { inventory, warnings: [...new Set(warnings)].slice(0, 40) };
}
