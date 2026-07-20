import { API_BASE_URL } from "../config/env";
import { HEALTH_CONNECT_RECORD_TYPES, readAllRecords } from "./healthConnect";
import { enqueue, getLastSyncedAt, listPending, markSent, setLastSyncedAt } from "./queue";
import { toSyncBatchItem } from "./recordMapping";
import { supabase } from "./supabase";

// Retenção documentada do Health Connect (docs/ARCHITECTURE.md): ~30 dias
// de histórico. Usado só na primeira sincronização de cada tipo — depois
// disso, o corte é sempre o último sync bem-sucedido.
const FIRST_SYNC_LOOKBACK_DAYS = 30;

export async function pullFromHealthConnect(): Promise<number> {
  const now = new Date();
  let totalRead = 0;

  for (const recordType of HEALTH_CONNECT_RECORD_TYPES) {
    const lastSyncedAt = await getLastSyncedAt(recordType);
    const since =
      lastSyncedAt ??
      new Date(now.getTime() - FIRST_SYNC_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    const records = await readAllRecords(recordType, since, now);
    const items = records.map((record) => toSyncBatchItem(recordType, record));
    await enqueue(items);
    await setLastSyncedAt(recordType, now);
    totalRead += items.length;
  }

  return totalRead;
}

export type FlushResult = {
  accepted: number;
  duplicates: number;
  failed: number;
  sent: number;
};

export async function flushQueue(deviceId: string): Promise<FlushResult> {
  const pending = await listPending();
  if (pending.length === 0) {
    return { accepted: 0, duplicates: 0, failed: 0, sent: 0 };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error("Sem sessão ativa — faça login novamente.");
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/sync/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      device_id: deviceId,
      records: pending.map(({ queueId: _queueId, ...item }) => item),
    }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao enviar lote: HTTP ${response.status}`);
  }

  const result = (await response.json()) as {
    accepted: number;
    duplicates: number;
    failed: number;
  };
  await markSent(pending.map((item) => item.queueId));

  return { ...result, sent: pending.length };
}

export async function syncNow(deviceId: string): Promise<FlushResult> {
  await pullFromHealthConnect();
  return flushQueue(deviceId);
}
