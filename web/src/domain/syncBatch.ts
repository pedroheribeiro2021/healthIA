import { z } from "zod";
import { rawRecordSourceSchema } from "./rawRecord";

// Corpo de POST /api/v1/sync/batch (docs/ARCHITECTURE.md). snake_case no
// fio porque é o mesmo formato consumido pelo sync-app (Expo).
export const syncBatchRequestSchema = z.object({
  device_id: z.string().nullable().optional(),
  records: z
    .array(
      z.object({
        source: rawRecordSourceSchema,
        record_type: z.string().min(1),
        external_id: z.string().nullable().optional(),
        payload: z.record(z.string(), z.unknown()),
      }),
    )
    .max(500),
});
export type SyncBatchRequest = z.infer<typeof syncBatchRequestSchema>;
