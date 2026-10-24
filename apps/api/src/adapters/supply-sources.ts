import type { AdvisoryLead, Dependency, SupplyFinding } from '../../../../packages/contracts/src/monitoring.js';
import { boundedBytes, boundedJson, combinedSignal, object, sha256, string } from './http.js';
import { compareVersions, normalizedPackageName, stableVersion } from './inventory.js';
import { scanContainerDependencies } from './container-supply.js';

const osvRoot = 'https://api.osv.dev/v1';
async function sourceJson(url: string, signal?: AbortSignal, init?: RequestInit, limit = 6_000_000): Promise<unknown> {
  const response = await fetch(url, { ...init, redirect: 'error', signal: combinedSignal(signal, 30_000), headers: { accept: 'application/json', 'user-agent': 'ProofPatch-Monitor', ...init?.headers } });
  if (!response.ok) { await response.body?.cancel(); throw new Error(`Advisory source ${new URL(url).hostname} returned HTTP ${response.status}.`); }
  return boundedJson(response, limit);
}
async function queryBatch(dependencies: Pick<Dependency, 'ecosystem' | 'name' | 'version'>[], signal?: AbortSignal): Promise<string[][]> {
  if (!dependencies.length) return [];
  if (dependencies.length > 1000) throw new Error('OSV request exceeds the 1000-dependency bound.');
  if (dependencies.length > 100) { const results:string[][]=[]; for(let offset=0;offset<dependencies.length;offset+=100)results.push(...await queryBatch(dependencies.slice(offset,offset+100),signal)); return results; }
  const data = object(await sourceJson(`${osvRoot}/querybatch`, signal, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ queries: dependencies.map((dependency) => ({ package: { name: dependency.name, ecosystem: dependency.ecosystem }, version: dependency.version })) }) }), 'OSV batch');
  if (!Array.isArray(data.results) || data.results.length !== dependencies.length) throw new Error('OSV did not return a result for every exact dependency.');
  return data.results.map((raw) => {
    const result = object(raw, 'OSV query result');
    if (result.next_page_token) throw new Error('OSV result was paginated; this scan cannot claim complete advisory coverage.');
    if (result.vulns === undefined) return [];
    if (!Array.isArray(result.vulns) || result.vulns.length > 100) throw new Error('OSV vulnerability result exceeded its bound.');
    return result.vulns.map((vuln) => { const id = string(object(vuln, 'OSV vulnerability').id, 'OSV ID', 160); if (!/^[A-Za-z0-9._-]+$/.test(id)) throw new Error('OSV advisory identity is invalid.'); return id; });
  });
}

/** Select a published stable release within the installed major, then ask OSV
 * again. A model never supplies the authoritative repair version. */
export async function selectPublishedSafeVersion(dependency: Dependency, signal?: AbortSignal): Promise<string> {
  let versions: string[] = [];
  if (dependency.ecosystem === 'PyPI') {
    const data = object(await sourceJson(`https://pypi.org/pypi/${encodeURIComponent(dependency.name)}/json`, signal), 'PyPI package');
    const releases = object(data.releases, 'PyPI releases');
    versions = Object.entries(releases).filter(([, value]) => Array.isArray(value) && value.length && value.some((file) => file && typeof file === 'object' && (file as Record<string, unknown>).yanked === false)).map(([version]) => version);
  } else if (dependency.ecosystem === 'npm') {
    const data = object(await sourceJson(`https://registry.npmjs.org/${encodeURIComponent(dependency.name)}`, signal, { headers: { accept: 'application/vnd.npm.install-v1+json' } }), 'npm package');
    versions = Object.entries(object(data.versions, 'npm versions')).filter(([, value]) => value && typeof value === 'object' && !(value as Record<string, unknown>).deprecated).map(([version]) => version);
  } else {
    const data = object(await sourceJson(`https://repo.packagist.org/p2/${dependency.name}.json`, signal), 'Packagist package');
    const values = object(data.packages, 'Packagist versions')[dependency.name];
    if (!Array.isArray(values)) throw new Error('Packagist did not return the requested package.');
    versions = values.map((value) => { const release = object(value, 'Packagist release'); return typeof release.version === 'string' ? release.version.replace(/^v/, '') : ''; });
  }
  versions = [...new Set(versions)].filter((version) => stableVersion(version) && version.split('.')[0] === dependency.version.split('.')[0] && compareVersions(version, dependency.version) > 0).sort((a, b) => compareVersions(b, a)).slice(0, 20);
  if (!versions.length) return '';
  const results = await queryBatch(versions.map((version) => ({ ...dependency, version })), signal);
  return versions.find((_version, index) => results[index].length === 0) ?? '';
}

export async function scanDependencies(repositoryId: string, inventory: Dependency[], signal?: AbortSignal): Promise<SupplyFinding[]> {
  const images=inventory.filter(dependency=>dependency.ecosystem==='Docker');
  if(images.length) return [...await scanDependencies(repositoryId,inventory.filter(dependency=>dependency.ecosystem!=='Docker'),signal),...await scanContainerDependencies(repositoryId,images,signal)];
  if (!repositoryId || repositoryId.length > 180 || inventory.length > 1000) throw new Error('Repository scan identity or dependency count is invalid.');
  const results = await queryBatch(inventory, signal);
  const ids = [...new Set(results.flat())];
  if (ids.length > 100) throw new Error('This scan has more than 100 distinct advisories; narrow repository scope.');
  const details = new Map<string, Record<string, unknown>>();
  for (const id of ids) details.set(id, object(await sourceJson(`${osvRoot}/vulns/${encodeURIComponent(id)}`, signal), 'OSV advisory'));
  const fixes = new Map<string, string>();
  const findings: SupplyFinding[] = [];
  for (const [index, dependency] of inventory.entries()) {
    const covered = new Set<string>();
    // The same issue is often mirrored as both GHSA and PYSEC. Prefer the
    // upstream GHSA identity and collapse shared aliases within each package.
    const ordered = [...results[index]].sort((a, b) => Number(!a.startsWith('GHSA-')) - Number(!b.startsWith('GHSA-')) || a.localeCompare(b));
    for (const id of ordered) {
      const advisory = details.get(id)!;
      if (advisory.id !== id || advisory.withdrawn) continue;
      const aliases = Array.isArray(advisory.aliases) ? advisory.aliases.filter((value): value is string => typeof value === 'string' && /^[A-Za-z0-9._-]{1,160}$/.test(value)).slice(0, 20) : [];
      const duplicate = [id, ...aliases].some((alias) => covered.has(alias));
      for (const alias of [id, ...aliases]) covered.add(alias);
      if (duplicate) continue;
      const affected = Array.isArray(advisory.affected) ? advisory.affected : [];
      const matches = affected.filter((raw) => {
        const pkg = object(object(raw, 'Affected package').package, 'Advisory package');
        return pkg.ecosystem === dependency.ecosystem && typeof pkg.name === 'string' && normalizedPackageName(pkg.name, dependency.ecosystem) === dependency.name;
      });
      if (!matches.length) throw new Error('OSV advisory detail does not corroborate the queried package.');
      const key = `${dependency.ecosystem}:${dependency.name}:${dependency.version}`;
      if (!fixes.has(key)) fixes.set(key, await selectPublishedSafeVersion(dependency, signal));
      const references: SupplyFinding['references'] = [{ title: 'OSV corroborated exact package version', url: `https://osv.dev/vulnerability/${encodeURIComponent(id)}` }];
      if (Array.isArray(advisory.references)) for (const raw of advisory.references.slice(0, 12)) {
        const reference = object(raw, 'Advisory reference');
        if (typeof reference.url !== 'string' || reference.url.length > 2000) continue;
        try { const url = new URL(reference.url); if (url.protocol === 'https:' && !url.username && !url.password) references.push({ title: typeof reference.type === 'string' ? reference.type.slice(0, 80) : 'Advisory reference', url: url.href }); } catch { /* An invalid reference never becomes a fetch target. */ }
      }
      const fixedVersion = fixes.get(key)!;
      const affectedRanges: NonNullable<SupplyFinding['affectedRanges']> = [];
      for (const match of matches) {
        const ranges = object(match, 'Affected package').ranges;
        if (!Array.isArray(ranges)) continue;
        for (const rawRange of ranges.slice(0, 10)) {
          const range = object(rawRange, 'Affected range');
          if (typeof range.type !== 'string' || !Array.isArray(range.events)) continue;
          const events = range.events.slice(0, 30).map(rawEvent => {
            const event = object(rawEvent, 'Affected range event');
            return Object.fromEntries(Object.entries(event).filter(([key, value]) => ['introduced','fixed','last_affected','limit'].includes(key) && typeof value === 'string' && value.length <= 100)) as Record<string, string>;
          });
          affectedRanges.push({ type: range.type.slice(0, 30), events });
        }
      }
      findings.push({ id: `finding-${sha256(JSON.stringify([repositoryId, dependency.ecosystem, dependency.name, dependency.version, dependency.manifestPath, id])).slice(0, 24)}`, repositoryId, advisoryId: id, aliases, ecosystem: dependency.ecosystem, packageName: dependency.name, installedVersion: dependency.version, fixedVersion, manifestPath: dependency.manifestPath, affectedRanges, summary: typeof advisory.summary === 'string' ? advisory.summary.slice(0, 2000) : `${id}: published advisory affects ${dependency.name} ${dependency.version}.`, references, detectedAt: new Date().toISOString(), status: fixedVersion ? 'detected' : 'needs-owner' });
    }
  }
  return findings;
}

export const forumFeeds = [
  { id: 'python-packaging', name: 'Python Packaging discussions', url: 'https://discuss.python.org/c/packaging/14.rss', host: 'discuss.python.org' },
  { id: 'github-advisories', name: 'GitHub advisory feed', url: 'https://github.com/advisories.atom', host: 'github.com' },
] as const;
function cleanXml(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, ' ').replace(/&(?:amp|lt|gt|quot|apos);/g, (entity) => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" }[entity] ?? '')).replace(/\s+/g, ' ').trim();
}
export function parseForumFeed(xml: string, feed: typeof forumFeeds[number], retrievedAt = new Date().toISOString()): AdvisoryLead[] {
  if (Buffer.byteLength(xml) > 750_000 || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Forum XML contains a forbidden declaration or exceeds the feed bound.');
  const entries = [...xml.matchAll(/<(?:item|entry)\b[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi)].slice(0, 30);
  return entries.flatMap((entry) => {
    const body = entry[1], title = cleanXml(body.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').slice(0, 300);
    const href = body.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i)?.[1] ?? body.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i)?.[1];
    if (!title || !href || !/vulnerab|exploit|security|CVE-|GHSA-|malicious|supply.chain|compromis/i.test(title + ' ' + body)) return [];
    let url: URL;
    try { url = new URL(cleanXml(href)); } catch { return []; }
    if (url.protocol !== 'https:' || url.hostname !== feed.host || url.username || url.password || url.port) return [];
    const summary = cleanXml(body.match(/<(?:description|summary|content)\b[^>]*>([\s\S]*?)<\/(?:description|summary|content)>/i)?.[1] ?? '').slice(0, 2000);
    const aliases = [...new Set((title + ' ' + summary).match(/CVE-\d{4}-\d{4,}|GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}/gi) ?? [])].slice(0, 12);
    const published = cleanXml(body.match(/<(?:pubDate|published|updated)\b[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated)>/i)?.[1] ?? '');
    return [{ id: `lead-${sha256(url.href).slice(0, 24)}`, title, url: url.href, source: feed.id, ...(Number.isFinite(Date.parse(published)) ? { publishedAt: new Date(published).toISOString() } : {}), retrievedAt, trust: 'unconfirmed' as const, aliases, summary }];
  });
}
export async function fetchForumLeads(signal?: AbortSignal): Promise<{ leads: AdvisoryLead[]; errors: { source: string; message: string }[] }> {
  const results = await Promise.allSettled(forumFeeds.map(async (feed) => {
    const response = await fetch(feed.url, { redirect: 'error', signal: combinedSignal(signal, 20_000), headers: { accept: 'application/rss+xml, application/atom+xml, application/xml', 'user-agent': 'ProofPatch-Monitor' } });
    if (!response.ok) { await response.body?.cancel(); throw new Error(`Feed returned HTTP ${response.status}.`); }
    const xml = new TextDecoder('utf-8', { fatal: true }).decode(await boundedBytes(response, 750_000));
    return parseForumFeed(xml, feed);
  }));
  const leads: AdvisoryLead[] = [], errors: { source: string; message: string }[] = [];
  for (const [index, result] of results.entries()) if (result.status === 'fulfilled') leads.push(...result.value); else errors.push({ source: forumFeeds[index].id, message: result.reason instanceof Error ? result.reason.message : 'Feed request failed.' });
  return { leads, errors };
}
