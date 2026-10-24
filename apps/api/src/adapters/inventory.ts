import type { Dependency } from '../../../../packages/contracts/src/monitoring.js';
import { parseDocument } from 'yaml';

export const inventoryLimit = 1000;
export const repositoryBytesLimit = 1_000_000;
const ignored = /(?:^|\/)(?:node_modules|vendor|\.git|\.venv|venv)(?:\/|$)/;
export function isInventoryPath(path: string): boolean {
  return !ignored.test(path) && !path.startsWith('.github/') && /(?:^|\/)(?:requirements(?:-[\w.-]+)?\.txt|package(?:-lock)?\.json|composer\.(?:lock|json)|pyproject\.toml|pytest\.ini|phpunit\.xml(?:\.dist)?|Dockerfile(?:\.[\w.-]+)?|(?:docker-)?compose[\w.-]*\.ya?ml|deployment[\w.-]*\.ya?ml)$/.test(path);
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
    if (!/^(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._/-]*$/.test(name) || !(ecosystem === 'Docker' ? /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9_.-]+)?$/.test(version) : stableVersion(version))) { warnings.push(`${manifestPath}: unsupported package name or non-stable exact version for ${name}.`); return; }
    const key = `${ecosystem}:${name}:${version}:${manifestPath}`;
    if (seen.has(key)) return;
    seen.add(key); inventory.push({ ecosystem, name, version, manifestPath, direct });
    if (inventory.length > inventoryLimit) throw new Error('Repository exceeds the 1000 exact dependency monitoring limit; select a smaller service repository.');
  };
  const addImage = (imageRef: unknown, manifestPath: string) => {
    if (typeof imageRef !== 'string') return;
    const match = /^(?:(?:docker\.io|index\.docker\.io)\/)?(?:library\/)?([a-z0-9][a-z0-9._-]*):(\d+\.\d+\.\d+(?:-[A-Za-z0-9_.-]+)?)(?:@(sha256:[a-f0-9]{64}))?$/.exec(imageRef);
    if (!match) { warnings.push(`${manifestPath}: image ${imageRef.slice(0,100)} has a mutable, unresolved or unsupported registry reference; no clean-image claim is made.`); return; }
    const before=inventory.length; add('Docker',`library/${match[1]}`,match[2],manifestPath,true);
    if (inventory.length>before) Object.assign(inventory.at(-1)!,{imageRef,...(match[3]?{digest:match[3]}:{})});
    if (!['nginx','php'].includes(match[1])) warnings.push(`${manifestPath}: ${match[1]} is inventoried, but vendor-version corroboration currently supports nginx and PHP; a missing finding does not establish a clean image.`);
  };
  for (const [path, content] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
    if (!safeRepositoryPath(path)) throw new Error('Repository inventory contains an unsafe path.');
    if (!isInventoryPath(path)) continue;
    if (/(?:^|\/)Dockerfile(?:\.[\w.-]+)?$/.test(path)) {
      for (const line of content.split(/\r?\n/)) { const match=/^\s*FROM\s+(?:--platform=\S+\s+)?(\S+)/i.exec(line); if(match && match[1]!=='scratch')addImage(match[1],path); }
      continue;
    }
    if (/\.ya?ml$/.test(path)) {
      try {
        const doc=parseDocument(content,{uniqueKeys:true}); if(doc.errors.length)throw new Error('Invalid YAML');
        const value=doc.toJS({maxAliasCount:0}) as unknown;
        const visit=(item:unknown,depth=0)=>{if(depth>20)throw new Error('YAML nesting exceeds 20');if(!item||typeof item!=='object')return;if(Array.isArray(item)){for(const child of item)visit(child,depth+1);return;}for(const [key,child]of Object.entries(item)){if(key==='image')addImage(child,path);else visit(child,depth+1);}};
        visit(value);
      } catch { warnings.push(`${path}: YAML is invalid, contains aliases or exceeds parser bounds; image inventory is incomplete.`); }
      continue;
    }
    if (/\.(?:toml|ini|xml)(?:\.dist)?$/.test(path)) continue;
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
  if (!inventory.length) warnings.push('No supported exact dependency or image inventory found. Add exact Python requirements, an npm/Composer lockfile, or a versioned Dockerfile/Compose image.');
  return { inventory, warnings: [...new Set(warnings)].slice(0, 40) };
}
