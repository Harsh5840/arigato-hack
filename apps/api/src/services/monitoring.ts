import { createHash } from 'node:crypto';
import type { MonitoredRepository } from '../../../../packages/contracts/src/monitoring.js';
import { readRepository } from '../adapters/repository.js';
import { fetchForumLeads, forumFeeds, scanDependencies } from '../adapters/supply-sources.js';
import type { MonitoringStore } from '../db/monitoring.js';
import type { RunStore } from '../db/client.js';
import { triageForumLeads } from '../adapters/package-groq.js';
import { getRepositoryRepairCapability } from './stack-discovery.js';

export async function registerRepository(monitor: MonitoringStore, url: string, signal?: AbortSignal) {
  if (monitor.repositories().length >= 20 && !monitor.repositories().some(repo => repo.url === url.replace(/\.git$/, '').replace(/\/$/, ''))) throw new Error('This server supports at most 20 registered repositories.');
  const snapshot = await readRepository(url, signal);
  const previous = monitor.repositories().find(repo => `${repo.owner}/${repo.name}`.toLowerCase() === `${snapshot.owner}/${snapshot.name}`.toLowerCase());
  const repairCapability=await getRepositoryRepairCapability(snapshot,signal);
  const profile: MonitoredRepository['profile'] = repairCapability.supported ? 'generic' : 'monitor-only';
  const now = new Date().toISOString();
  const repo: MonitoredRepository = { id: previous?.id || createHash('sha256').update(`${snapshot.owner}/${snapshot.name}`.toLowerCase()).digest('hex').slice(0, 20), owner: snapshot.owner, name: snapshot.name, url: snapshot.url, defaultBranch: snapshot.defaultBranch, enabled: previous?.enabled ?? true, autoRemediate: repairCapability.supported && (previous?.autoRemediate ?? false), profile, repairCapability, createdAt: previous?.createdAt || now, updatedAt: now, inventory: snapshot.inventory, inventorySha: snapshot.sha, canPush: snapshot.canPush, scanStatus: 'queued', scanRequestedAt: now };
  monitor.saveRepository(repo); return repo;
}

export function queueRemediation(monitor: MonitoringStore, runs: RunStore, findingId: string) {
  const finding = monitor.finding(findingId); if (!finding) throw new Error('Finding not found.');
  if (finding.status === 'draft-created' || finding.pullRequest) throw new Error('A draft PR already exists for this finding. Review that PR instead of creating a duplicate.');
  const repo = monitor.repository(finding.repositoryId); if (!repo) throw new Error('Repository not found.');
  if (!repo.canPush || !repo.repairCapability?.supported || !repo.repairCapability.ecosystems.includes(finding.ecosystem)) throw new Error(repo.repairCapability?.reason || 'Automatic repair needs write access, a supported exact manifest and detected baseline tests.');
  if (repo.repairCapability.targets && !repo.repairCapability.targets.some(target=>target.ecosystem===finding.ecosystem&&target.packageName===finding.packageName&&target.manifestPath===finding.manifestPath)) throw new Error('This package and manifest do not have a detected baseline test policy. Monitoring remains available.');
  if (!finding.fixedVersion) throw new Error('No supported published safe version is known; owner review is required.');
  const result = runs.createForFinding(repo, finding);
  for (const related of monitor.findings(repo.id).filter(item => item.ecosystem === finding.ecosystem && item.packageName === finding.packageName && item.installedVersion === finding.installedVersion && item.fixedVersion === finding.fixedVersion && item.manifestPath === finding.manifestPath)) monitor.patchFinding(related.id, { status: result.run.pullRequest ? 'draft-created' : 'queued', runId: result.run.id });
  return result;
}

let cycling = false;
export async function monitorCycle(monitor: MonitoringStore, runs: RunStore) {
  if (cycling) return;
  const snapshot = monitor.snapshot();
  const forced = monitor.state<boolean>('pollRequested') === true;
  const requested = monitor.repositories().filter(repo => repo.scanStatus === 'queued');
  const due = !snapshot.nextCycleAt || Date.parse(snapshot.nextCycleAt) <= Date.now();
  if (!forced && !requested.length && (!snapshot.enabled || !due)) return;
  cycling = true; monitor.setState('pollRequested', false);
  const signal = AbortSignal.timeout(90_000);
  const started = new Date().toISOString();
  try {
    const forum = await fetchForumLeads(signal);
    monitor.saveLeads(forum.leads);
    const health = forumFeeds.map(feed => {
      const source = typeof feed === 'string' ? feed : (feed as { id?: string; url?: string; name?: string });
      const id = typeof source === 'string' ? source : source.id || source.url || 'forum';
      const error = forum.errors.find(error => error.source === id || (typeof source !== 'string' && error.source === source.url));
      return { id, name: typeof source === 'string' ? source : source.name || id, kind: 'forum' as const, status: error ? 'error' as const : 'ok' as const, checkedAt: started, ...(error ? { error: error.message } : {}) };
    });
    monitor.configure({ sources: [{ id: 'osv', name: 'OSV exact package advisories', kind: 'advisory', status: 'idle' }, {id:'nginx-vendor',name:'nginx image vendor advisories',kind:'advisory',status:'idle'},{id:'php-vendor',name:'PHP + JPCERT image advisories',kind:'advisory',status:'idle'}, ...health] });
    const targets = monitor.repositories().filter(repo => requested.some(item => item.id === repo.id) || ((forced || (snapshot.enabled && due)) && repo.enabled));
    let osvError: string | undefined;
    const sourceResults=new Map<string,{status:'ok'|'error';checkedAt:string;error?:string}>();
    for (const repo of targets) {
      let touchedSources:string[]=[];
      try {
        monitor.patchRepository(repo.id, { scanStatus: 'scanning', lastError: undefined });
        const current = await readRepository({ owner: repo.owner, name: repo.name }, signal);
        const repairCapability=await getRepositoryRepairCapability(current,signal);
        touchedSources=[...(current.inventory.some(item=>item.ecosystem!=='Docker')?['osv']:[]),...(current.inventory.some(item=>item.ecosystem==='Docker'&&item.name==='library/nginx')?['nginx-vendor']:[]),...(current.inventory.some(item=>item.ecosystem==='Docker'&&item.name==='library/php')?['php-vendor']:[])];
        const findings = await scanDependencies(repo.id, current.inventory, signal);
        for(const source of touchedSources)if(sourceResults.get(source)?.status!=='error')sourceResults.set(source,{status:'ok',checkedAt:new Date().toISOString()});
        const checkedAt = new Date().toISOString();
        monitor.patchRepository(repo.id, { inventory: current.inventory, inventorySha: current.sha, canPush: current.canPush, repairCapability, profile:repairCapability.supported?'generic':'monitor-only', autoRemediate:repo.autoRemediate&&repairCapability.supported, defaultBranch: current.defaultBranch, lastCheckedAt: checkedAt, nextCheckAt: new Date(Date.now() + snapshot.intervalSeconds * 1000).toISOString(), scanStatus: 'idle', scanRequestedAt: undefined, lastError: current.warnings.length ? current.warnings.join(' ').slice(0, 1000) : undefined });
        for (const finding of findings) {
          monitor.saveFinding(finding);
          const stored = monitor.finding(finding.id)!;
          if (repo.enabled && repo.autoRemediate && stored.status === 'detected' && repairCapability.supported && repairCapability.ecosystems.includes(stored.ecosystem) && (!repairCapability.targets || repairCapability.targets.some(target=>target.ecosystem===stored.ecosystem&&target.packageName===stored.packageName&&target.manifestPath===stored.manifestPath))) queueRemediation(monitor, runs, stored.id);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Repository scan failed.';
        osvError = message;
        for(const source of touchedSources)sourceResults.set(source,{status:'error',checkedAt:new Date().toISOString(),error:message.slice(0,700)});
        monitor.patchRepository(repo.id, { scanStatus: 'error', scanRequestedAt: undefined, lastError: message.slice(0, 1000) });
      }
    }
    const inventory = monitor.repositories().filter(repo => repo.enabled).flatMap(repo => repo.inventory).slice(0, 100);
    const inventoryKey = createHash('sha256').update(JSON.stringify(inventory.map(item => [item.ecosystem, item.name, item.version]).sort())).digest('hex').slice(0, 20);
    const leadKey = (id: string) => `${id}:${inventoryKey}`;
    const triaged = new Set(monitor.state<string[]>('triagedLeadKeys') || []);
    const newLeads = forum.leads.filter(lead => !triaged.has(leadKey(lead.id))).slice(0, 20);
    if (newLeads.length && inventory.length) {
      try {
        const triage = await triageForumLeads(newLeads, inventory, signal);
        monitor.configure({ supplyTriage: { ...triage, checkedAt: new Date().toISOString() }, scoutError: undefined });
        monitor.setState('triagedLeadKeys', [...new Set([...triaged, ...newLeads.map(lead => leadKey(lead.id))])].slice(-500));
      } catch (error) { monitor.configure({ scoutError: error instanceof Error ? error.message : 'Groq forum scout failed.' }); }
    }
    const current = monitor.snapshot();
    monitor.configure({ lastCycleAt: started, nextCycleAt: new Date(Date.now() + snapshot.intervalSeconds * 1000).toISOString(), lastError: osvError, sources: current.sources.map(source => sourceResults.has(source.id)?{...source,...sourceResults.get(source.id)}:source) });
  } catch (error) { monitor.configure({ lastCycleAt: started, nextCycleAt: new Date(Date.now() + snapshot.intervalSeconds * 1000).toISOString(), lastError: error instanceof Error ? error.message : 'Monitoring cycle failed.' }); }
  finally { cycling = false; }
}
