import { z } from "zod";
import { isoDateTimeSchema as isoDateTime } from "./shared";

export const recommendationStatusSchema = z.enum(["open", "done", "dismissed"]);
export type RecommendationStatus = z.infer<typeof recommendationStatusSchema>;

// `priority`: 1 = mais importante (docs/ENGINES.md).
export const recommendationSchema = z.object({
  id: z.number(),
  insightId: z.number().nullable(),
  actionType: z.string(),
  title: z.string(),
  body: z.string(),
  priority: z.number().int(),
  status: recommendationStatusSchema,
  createdAt: isoDateTime,
});
export type Recommendation = z.infer<typeof recommendationSchema>;

export const newRecommendationSchema = recommendationSchema.omit({
  id: true,
  status: true,
  createdAt: true,
});
export type NewRecommendation = z.infer<typeof newRecommendationSchema>;
