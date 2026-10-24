import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { RunnableConfig } from '@langchain/core/runnables';
import { BaseCheckpointSaver, WRITES_IDX_MAP, compareWritesSortKeys, writesSortKey, type ChannelVersions, type Checkpoint, type CheckpointListOptions, type CheckpointMetadata, type CheckpointTuple, type PendingWrite } from '@langchain/langgraph-checkpoint';

type CheckpointRow = { thread: string; namespace: string; checkpoint_id: string; parent_id: string | null; checkpoint_type: string; checkpoint: Uint8Array; metadata_type: string; metadata: Uint8Array };
type WriteRow = { task_id: string; idx: number; task_path: string; channel: string; value_type: string; value: Uint8Array };

/** Official BaseCheckpointSaver protocol over Node's existing SQLite runtime.
 * State survives process restart for inspection. Worker recovery deliberately
 * fails closed; it does not automatically replay external GitHub writes.
 */
export class SqliteGraphSaver extends BaseCheckpointSaver {
  private db: DatabaseSync;
  constructor(path: string) {
    super();
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS graph_checkpoints (
        thread TEXT NOT NULL, namespace TEXT NOT NULL, checkpoint_id TEXT NOT NULL,
        parent_id TEXT, checkpoint_type TEXT NOT NULL, checkpoint BLOB NOT NULL,
        metadata_type TEXT NOT NULL, metadata BLOB NOT NULL,
        PRIMARY KEY(thread, namespace, checkpoint_id));
      CREATE TABLE IF NOT EXISTS graph_writes (
        thread TEXT NOT NULL, namespace TEXT NOT NULL, checkpoint_id TEXT NOT NULL,
        task_id TEXT NOT NULL, idx INTEGER NOT NULL, task_path TEXT NOT NULL,
        channel TEXT NOT NULL, value_type TEXT NOT NULL, value BLOB NOT NULL,
        PRIMARY KEY(thread, namespace, checkpoint_id, task_id, idx));`);
  }
  close() { this.db.close(); }
  private keys(config: RunnableConfig) {
    const thread = config.configurable?.thread_id;
    const namespace = config.configurable?.checkpoint_ns ?? '';
    if (typeof thread !== 'string' || !thread || thread.length > 255 || typeof namespace !== 'string' || namespace.length > 1000) throw new Error('LangGraph requires bounded string thread_id and checkpoint_ns.');
    return { thread, namespace, checkpointId: config.configurable?.checkpoint_id as string | undefined };
  }
  private async tuple(row: CheckpointRow): Promise<CheckpointTuple> {
    const writes = this.db.prepare('SELECT task_id,idx,task_path,channel,value_type,value FROM graph_writes WHERE thread=? AND namespace=? AND checkpoint_id=?').all(row.thread, row.namespace, row.checkpoint_id) as WriteRow[];
    writes.sort((a, b) => compareWritesSortKeys(writesSortKey(a.task_path, a.task_id, a.idx), writesSortKey(b.task_path, b.task_id, b.idx)));
    return {
      config: { configurable: { thread_id: row.thread, checkpoint_ns: row.namespace, checkpoint_id: row.checkpoint_id } },
      checkpoint: await this.serde.loadsTyped(row.checkpoint_type, row.checkpoint) as Checkpoint,
      metadata: await this.serde.loadsTyped(row.metadata_type, row.metadata) as CheckpointMetadata,
      ...(row.parent_id ? { parentConfig: { configurable: { thread_id: row.thread, checkpoint_ns: row.namespace, checkpoint_id: row.parent_id } } } : {}),
      pendingWrites: await Promise.all(writes.map(async (write) => [write.task_id, write.channel, await this.serde.loadsTyped(write.value_type, write.value)] as [string, string, unknown])),
    };
  }
  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const { thread, namespace, checkpointId } = this.keys(config);
    const row = checkpointId
      ? this.db.prepare('SELECT * FROM graph_checkpoints WHERE thread=? AND namespace=? AND checkpoint_id=?').get(thread, namespace, checkpointId)
      : this.db.prepare('SELECT * FROM graph_checkpoints WHERE thread=? AND namespace=? ORDER BY checkpoint_id DESC LIMIT 1').get(thread, namespace);
    return row ? this.tuple(row as CheckpointRow) : undefined;
  }
  async *list(config: RunnableConfig, options: CheckpointListOptions = {}): AsyncGenerator<CheckpointTuple> {
    const { thread, namespace, checkpointId } = this.keys(config);
    const rows = this.db.prepare('SELECT * FROM graph_checkpoints WHERE thread=? AND namespace=? ORDER BY checkpoint_id DESC').all(thread, namespace) as CheckpointRow[];
    let remaining = options.limit ?? Number.POSITIVE_INFINITY;
    for (const row of rows) {
      if (remaining <= 0) return;
      if (checkpointId && row.checkpoint_id !== checkpointId) continue;
      if (options.before?.configurable?.checkpoint_id && row.checkpoint_id >= options.before.configurable.checkpoint_id) continue;
      const tuple = await this.tuple(row);
      if (options.filter && !Object.entries(options.filter).every(([key, value]) => JSON.stringify((tuple.metadata as unknown as Record<string, unknown>)?.[key]) === JSON.stringify(value))) continue;
      remaining--; yield tuple;
    }
  }
  async put(config: RunnableConfig, checkpoint: Checkpoint, metadata: CheckpointMetadata, _newVersions: ChannelVersions): Promise<RunnableConfig> {
    const { thread, namespace, checkpointId } = this.keys(config);
    const [[checkpointType, checkpointBytes], [metadataType, metadataBytes]] = await Promise.all([this.serde.dumpsTyped(checkpoint), this.serde.dumpsTyped(metadata)]);
    this.db.prepare('INSERT OR REPLACE INTO graph_checkpoints VALUES(?,?,?,?,?,?,?,?)').run(thread, namespace, checkpoint.id, checkpointId ?? null, checkpointType, checkpointBytes, metadataType, metadataBytes);
    return { configurable: { thread_id: thread, checkpoint_ns: namespace, checkpoint_id: checkpoint.id } };
  }
  async putWrites(config: RunnableConfig, writes: PendingWrite[], taskId: string, taskPath = ''): Promise<void> {
    const { thread, namespace, checkpointId } = this.keys(config);
    if (!checkpointId) throw new Error('LangGraph pending writes require checkpoint_id.');
    for (let i = 0; i < writes.length; i++) {
      const [channel, value] = writes[i];
      const idx = WRITES_IDX_MAP[channel] ?? i;
      const [valueType, bytes] = await this.serde.dumpsTyped(value);
      const sql = idx < 0 ? 'INSERT OR REPLACE INTO graph_writes VALUES(?,?,?,?,?,?,?,?,?)' : 'INSERT OR IGNORE INTO graph_writes VALUES(?,?,?,?,?,?,?,?,?)';
      this.db.prepare(sql).run(thread, namespace, checkpointId, taskId, idx, taskPath, channel, valueType, bytes);
    }
  }
  async deleteThread(threadId: string): Promise<void> {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare('DELETE FROM graph_writes WHERE thread=?').run(threadId);
      this.db.prepare('DELETE FROM graph_checkpoints WHERE thread=?').run(threadId);
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
}
