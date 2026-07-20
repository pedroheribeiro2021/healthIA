import {
  getGrantedPermissions,
  initialize,
  readRecords,
  requestPermission,
} from "react-native-health-connect";

// Mesmos 9 tipos normalizados no web app (web/src/normalization/registry.ts,
// prefixo "health_connect:"). Manter os dois em sincronia manualmente —
// não há como compartilhar código entre os workspaces web/ e sync-app/.
export const HEALTH_CONNECT_RECORD_TYPES = [
  "SleepSession",
  "ExerciseSession",
  "HeartRate",
  "HeartRateVariabilityRmssd",
  "Steps",
  "Weight",
  "BodyFat",
  "Hydration",
  "Nutrition",
] as const;
export type HealthConnectRecordType =
  (typeof HEALTH_CONNECT_RECORD_TYPES)[number];

export async function ensureHealthConnectInitialized(): Promise<boolean> {
  return initialize();
}

export async function requestHealthConnectPermissions() {
  return requestPermission(
    HEALTH_CONNECT_RECORD_TYPES.map((recordType) => ({
      accessType: "read" as const,
      recordType,
    })),
  );
}

export async function hasAllHealthConnectPermissions(): Promise<boolean> {
  const granted = await getGrantedPermissions();
  const grantedTypes = new Set<string>(
    granted
      .map((permission) =>
        "recordType" in permission ? permission.recordType : undefined,
      )
      .filter((type): type is NonNullable<typeof type> => type !== undefined),
  );
  return HEALTH_CONNECT_RECORD_TYPES.every((type) => grantedTypes.has(type));
}

// Lê todas as páginas de um tipo de registro num intervalo de tempo.
export async function readAllRecords(
  recordType: HealthConnectRecordType,
  since: Date,
  until: Date,
): Promise<Record<string, unknown>[]> {
  const records: Record<string, unknown>[] = [];
  let pageToken: string | undefined;

  do {
    const result = await readRecords(recordType, {
      timeRangeFilter: {
        operator: "between",
        startTime: since.toISOString(),
        endTime: until.toISOString(),
      },
      pageToken,
    });
    records.push(...(result.records as unknown as Record<string, unknown>[]));
    pageToken = result.pageToken;
  } while (pageToken);

  return records;
}
