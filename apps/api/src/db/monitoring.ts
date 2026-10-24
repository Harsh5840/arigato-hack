import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import type { AdvisoryLead, MonitoredRepository, MonitoringSnapshot, SupplyFinding } from '../../../../packages/contracts/src/monitoring.js';

export class MonitoringStore {
  private db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS repositories(id TEXT PRIMARY KEY, identity TEXT UNIQUE NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS findings(id TEXT PRIMARY KEY, repository_id TEXT NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS advisory_leads(id TEXT PRIMARY KEY, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS monitoring_state(key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
    if (!this.state('settings')) this.setState('settings', { enabled: true, intervalSeconds: 300, sources: [] });
    if (!this.repositories().length) {
      const now = new Date().toISOString();
      this.saveRepository({ id: 'sakurashop-php', owner: 'Harsh5840', name: 'arigato-php-demo', url: 'https://github.com/Harsh5840/arigato-php-demo', defaultBranch: 'main', enabled: false, autoRemediate: false, profile: 'php-runtime-demo', createdAt: now, updatedAt: now, inventory: [], canPush: false, scanStatus: 'idle' });
    }
  }
  close() { this.db.close(); }
  state<T = unknown>(key: string): T | undefined { const row = this.db.prepare('SELECT value FROM monitoring_state WHERE key=?').get(key) as { value: string } | undefined; return row ? JSON.parse(row.value) : undefined; }
  setState(key: string, value: unknown) { this.db.prepare('INSERT INTO monitoring_state(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, JSON.stringify(value)); }
  repositories(): MonitoredRepository[] { return (this.db.prepare('SELECT data FROM repositories ORDER BY identity').all() as { data: string }[]).map(row => JSON.parse(row.data)); }
  repository(id: string): MonitoredRepository | undefined { const row = this.db.prepare('SELECT data FROM repositories WHERE id=?').get(id) as { data: string } | undefined; return row ? JSON.parse(row.data) : undefined; }
  saveRepository(repo: MonitoredRepository) { this.db.prepare('INSERT INTO repositories(id,identity,data) VALUES(?,?,?) ON CONFLICT(identity) DO UPDATE SET data=excluded.data').run(repo.id, `${repo.owner}/${repo.name}`.toLowerCase(), JSON.stringify(repo)); }
  patchRepository(id: string, patch: Partial<MonitoredRepository>): MonitoredRepository { const repo = this.repository(id); if (!repo) throw new Error('Repository not found.'); const next = { ...repo, ...patch, updatedAt: new Date().toISOString() }; this.saveRepository(next); return next; }
  findings(repositoryId?: string): SupplyFinding[] { const rows = repositoryId ? this.db.prepare('SELECT data FROM findings WHERE repository_id=? ORDER BY rowid DESC LIMIT 100').all(repositoryId) : this.db.prepare('SELECT data FROM findings ORDER BY rowid DESC LIMIT 100').all(); return (rows as { data: string }[]).map(row => JSON.parse(row.data)); }
  finding(id: string): SupplyFinding | undefined { const row = this.db.prepare('SELECT data FROM findings WHERE id=?').get(id) as { data: string } | undefined; return row ? JSON.parse(row.data) : undefined; }
  saveFinding(finding: SupplyFinding) { const previous = this.finding(finding.id); const sameTarget = previous && ['repositoryId','ecosystem','packageName','installedVersion','fixedVersion','fixedDigest','manifestPath'].every(key => previous[key as keyof SupplyFinding] === finding[key as keyof SupplyFinding]); const next = sameTarget ? { ...finding, detectedAt: previous!.detectedAt, status: finding.status === 'needs-owner' ? 'needs-owner' as const : previous!.status, runId: finding.status === 'needs-owner' ? undefined : previous!.runId, pullRequest: previous!.pullRequest } : { ...finding, runId: undefined }; this.db.prepare('INSERT INTO findings(id,repository_id,data) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(next.id, next.repositoryId, JSON.stringify(next)); }
  patchFinding(id: string, patch: Partial<SupplyFinding>) { const old = this.finding(id); if (!old) throw new Error('Finding not found.'); const next = { ...old, ...patch }; this.db.prepare('UPDATE findings SET data=? WHERE id=?').run(JSON.stringify(next), id); return next; }
  clearRunLinks(deletedIds: readonly string[]) {
    if (!deletedIds.length) return;
    const deleted = new Set(deletedIds);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const rows = this.db.prepare('SELECT id,data FROM findings').all() as {id: string; data: string}[];
      const update = this.db.prepare('UPDATE findings SET data=? WHERE id=?');
      for (const row of rows) {
        const finding = JSON.parse(row.data) as SupplyFinding;
        if (!finding.runId || !deleted.has(finding.runId)) continue;
        delete finding.runId;
        if (finding.status === 'queued') finding.status = 'detected';
        update.run(JSON.stringify(finding), row.id);
      }
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  saveLeads(leads: AdvisoryLead[]) { for (const lead of leads) this.db.prepare('INSERT INTO advisory_leads(id,data) VALUES(?,?) ON CONFLICT(id) DO NOTHING').run(lead.id, JSON.stringify(lead)); this.db.exec('DELETE FROM advisory_leads WHERE rowid NOT IN (SELECT rowid FROM advisory_leads ORDER BY rowid DESC LIMIT 100)'); }
  snapshot(): MonitoringSnapshot { const settings = this.state<Partial<MonitoringSnapshot>>('settings') || {}; return { enabled: true, intervalSeconds: 300, sources: [], ...settings, workerLastSeenAt: this.state<string>('workerLastSeenAt'), leads: (this.db.prepare('SELECT data FROM advisory_leads ORDER BY rowid DESC LIMIT 30').all() as { data: string }[]).map(row => JSON.parse(row.data)), findings: this.findings() }; }
  configure(patch: Partial<MonitoringSnapshot>) { const { leads: _leads, findings: _findings, ...settings } = this.snapshot(); this.setState('settings', { ...settings, ...patch }); return this.snapshot(); }
  requestScan(id: string) { return this.patchRepository(id, { scanStatus: 'queued', scanRequestedAt: new Date().toISOString() }); }
  id() { return randomUUID(); }
}
