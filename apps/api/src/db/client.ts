import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { terminalStatuses, type Run, type RunEvent, type RunStatus } from '../../../../packages/contracts/src/live.js';

export class RunStore {
  private db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, status TEXT NOT NULL, data TEXT NOT NULL, lease_until INTEGER, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL, at TEXT NOT NULL, node TEXT NOT NULL, kind TEXT NOT NULL, message TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS events_run ON events(run_id,id);`);
  }
  close() { this.db.close(); }
  get(id: string): Run | undefined {
    const row = this.db.prepare('SELECT data FROM runs WHERE id=?').get(id) as { data: string } | undefined;
    return row ? JSON.parse(row.data) : undefined;
  }
  list(): Run[] { return (this.db.prepare('SELECT data FROM runs ORDER BY created_at DESC LIMIT 30').all() as { data: string }[]).map((row) => JSON.parse(row.data)); }
  active(): Run | undefined { return this.list().find((run) => !terminalStatuses.has(run.status)); }
  create(sourceMode: Run['sourceMode']): { run: Run; reused: boolean } {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const active = this.active();
      if (active) { this.db.exec('COMMIT'); return { run: active, reused: true }; }
      const now = new Date().toISOString();
      const run: Run = { id: randomUUID(), status: 'queued', createdAt: now, updatedAt: now, sourceMode, mode: 'live-groq', repo: { owner: 'Harsh5840', name: 'arigato-php-demo' }, agentCalls: [], checks: [], mergeReady: false, findingClosed: false };
      this.db.prepare('INSERT INTO runs(id,status,data,created_at) VALUES(?,?,?,?)').run(run.id, run.status, JSON.stringify(run), now);
      this.event(run.id, 'controller', 'queued', 'Run persisted. Waiting for the local worker.');
      this.db.exec('COMMIT');
      return { run, reused: false };
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  update(id: string, patch: Partial<Run>): Run {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const old = this.get(id);
      if (!old) throw new Error('Run not found.');
      const run = { ...old, ...patch, updatedAt: new Date().toISOString(), mergeReady: false as const, findingClosed: false as const };
      this.db.prepare('UPDATE runs SET status=?,data=?,lease_until=CASE WHEN ? THEN NULL ELSE lease_until END WHERE id=?').run(run.status, JSON.stringify(run), terminalStatuses.has(run.status) ? 1 : 0, id);
      this.db.exec('COMMIT'); return run;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  event(runId: string, node: RunEvent['node'], kind: string, message: string): RunEvent {
    const at = new Date().toISOString();
    const result = this.db.prepare('INSERT INTO events(run_id,at,node,kind,message) VALUES(?,?,?,?,?)').run(runId, at, node, kind, message.slice(0, 2000));
    return { id: Number(result.lastInsertRowid), runId, at, node, kind, message: message.slice(0, 2000) };
  }
  events(id: string, after = 0): RunEvent[] {
    return (this.db.prepare('SELECT id,run_id as runId,at,node,kind,message FROM events WHERE run_id=? AND id>? ORDER BY id LIMIT 500').all(id, after) as unknown as RunEvent[]);
  }
  claim(): Run | undefined {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const row = this.db.prepare("SELECT id FROM runs WHERE status='queued' ORDER BY created_at LIMIT 1").get() as { id: string } | undefined;
      if (!row) { this.db.exec('COMMIT'); return; }
      const run = this.get(row.id)!;
      run.status = 'source-fetching'; run.updatedAt = new Date().toISOString();
      this.db.prepare('UPDATE runs SET status=?,data=?,lease_until=? WHERE id=?').run(run.status, JSON.stringify(run), Date.now() + 45_000, run.id);
      this.db.exec('COMMIT'); return run;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  heartbeat(id: string) { this.db.prepare("UPDATE runs SET lease_until=? WHERE id=? AND status NOT IN ('completed','blocked','failed','cancelled')").run(Date.now() + 45_000, id); }
  recoverExpired() {
    const rows = this.db.prepare("SELECT id FROM runs WHERE lease_until < ? AND status NOT IN ('completed','blocked','failed','cancelled')").all(Date.now()) as { id: string }[];
    for (const row of rows) {
      this.update(row.id, { status: 'failed', draftPRAllowed: false, failure: { code: 'WORKER_LOST', message: 'Worker stopped before finishing. Evidence and any candidate branch remain recorded; start a new run to retry.' } });
      this.event(row.id, 'controller', 'failed', 'Worker lease expired. No success or PR approval inferred.');
    }
  }
  transition(id: string, status: RunStatus, node: RunEvent['node'], message: string) {
    this.update(id, { status }); this.event(id, node, status, message);
  }
}
