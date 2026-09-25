import { z } from "zod";

import type { Database } from "./database.types";

type Functions = Database["public"]["Functions"];

/**
 * Rows from the analytics functions, checked at the boundary. The generated
 * types cannot express `returns table` nullability: `week_start` is null
 * unless the rows are per week.
 */
export const performanceRowSchema = z.object({
  arrows: z.number().int(),
  athlete_id: z.uuid(),
  athlete_name: z.string(),
  avg_arrow: z.number(),
  best_session_avg: z.number(),
  category_name: z.string(),
  distance_id: z.number().int(),
  event_name: z.string(),
  gender: z.enum([
    "male",
    "female",
  ] satisfies Database["public"]["Enums"]["gender"][]),
  id_no: z.string(),
  last_session_date: z.iso.date(),
  meters: z.number(),
  miss_count: z.number().int(),
  sessions: z.number().int(),
  target_face_id: z.number().int(),
  target_face_name: z.string(),
  ten_plus_x_count: z.number().int(),
  total_points: z.number().int(),
  week_start: z.iso.date().nullable(),
  x_count: z.number().int(),
}) satisfies z.ZodType<
  Omit<Functions["athlete_performance"]["Returns"][number], "week_start"> & {
    week_start: string | null;
  }
>;

export const distributionRowSchema = z.object({
  arrows: z.number().int(),
  athlete_id: z.uuid(),
  distance_id: z.number().int(),
  target_face_id: z.number().int(),
  value: z.string(),
}) satisfies z.ZodType<Functions["score_distribution"]["Returns"][number]>;

/** Parses a page of rows; one malformed row fails the load loudly. */
export const parseRows =
  <TRow>(schema: z.ZodType<TRow>) =>
  (rows: unknown[]): TRow[] => {
    const parsed = z.array(schema).safeParse(rows);
    if (!parsed.success) {
      throw new Error(
        "The server sent data in an unexpected shape. Update the app and try again."
      );
    }
    return parsed.data;
  };
