import * as SQLite from "expo-sqlite";
import type { SyncBatchItem } from "./recordMapping";

// Fila local persistente (docs/ARCHITECTURE.md): captura sempre funciona
// mesmo sem rede; o envio drena a fila quando houver conexão.
const dbPromise = SQLite.openDatabaseAsync("healthia-sync-queue.db");

async function getDb() {
  const db = await dbPromise;
  await db.execAsync(`
    create table if not exists queue (
      id integer primary key autoincrement,
      record_type text not null,
      external_id text,
      payload text not null,
      created_at text not null default (datetime('now')),
      sent_at text
    );
    create table if not exists sync_state (
      record_type text primary key,
      last_synced_at text not null
    );
  `);
  return db;
}

export async function enqueue(items: SyncBatchItem[]): Promise<void> {
  if (items.length === 0) return;
  const db = await getDb();
  for (const item of items) {
    await db.runAsync(
      "insert into queue (record_type, external_id, payload) values (?, ?, ?)",
      item.record_type,
      item.external_id,
      JSON.stringify(item.payload),
    );
  }
}

export type QueuedItem = SyncBatchItem & { queueId: number };

export async function listPending(limit = 200): Promise<QueuedItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: number;
    record_type: string;
    external_id: string | null;
    payload: string;
  }>(
    "select id, record_type, external_id, payload from queue where sent_at is null order by id asc limit ?",
    limit,
  );

  return rows.map((row) => ({
    queueId: row.id,
    source: "health_connect" as const,
    record_type: row.record_type,
    external_id: row.external_id,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
  }));
}

export async function markSent(queueIds: number[]): Promise<void> {
  if (queueIds.length === 0) return;
  const db = await getDb();
  const placeholders = queueIds.map(() => "?").join(",");
  await db.runAsync(
    `update queue set sent_at = datetime('now') where id in (${placeholders})`,
    ...queueIds,
  );
}

export async function getLastSyncedAt(
  recordType: string,
): Promise<Date | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ last_synced_at: string }>(
    "select last_synced_at from sync_state where record_type = ?",
    recordType,
  );
  return row ? new Date(row.last_synced_at) : null;
}

export async function setLastSyncedAt(
  recordType: string,
  when: Date,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "insert into sync_state (record_type, last_synced_at) values (?, ?) on conflict(record_type) do update set last_synced_at = excluded.last_synced_at",
    recordType,
    when.toISOString(),
  );
}
