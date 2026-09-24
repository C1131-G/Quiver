import { z } from "zod";

import type { Database } from "./database.types";

type Enums = Database["public"]["Enums"];

// Postgres `timestamptz` values arrive with numeric offsets ("+00:00"), which
// the default ISO datetime pattern rejects; offsets must stay allowed.
const isoDateTimeSchema = z.iso.datetime({ offset: true });

export const genderSchema = z.enum([
  "male",
  "female",
] satisfies Enums["gender"][]);
export type Gender = z.infer<typeof genderSchema>;
export const appRoleSchema = z.enum([
  "admin",
  "scorer",
] satisfies Enums["app_role"][]);
export type AppRole = z.infer<typeof appRoleSchema>;
const sessionTypeSchema = z.enum([
  "training",
  "competition",
] satisfies Enums["session_type"][]);
const venueSchema = z.enum(["indoor", "outdoor"] satisfies Enums["venue"][]);
const sessionStatusSchema = z.enum([
  "in_progress",
  "completed",
] satisfies Enums["session_status"][]);

/** Fail loudly when a table or view returns an unexpected shape. */
export const parseTableRows = <T>(
  schema: z.ZodType<T>,
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- boundary parser: unknown in, schema-validated rows out (type-safety-validation)
  rows: unknown,
  message: string
): T[] => {
  const parsed = z.array(schema).safeParse(rows ?? []);
  if (!parsed.success) {
    throw new Error(
      `${message} The server sent data in an unexpected shape. Update the app and try again.`
    );
  }
  return parsed.data;
};

const categorySchema = z.object({
  id: z.number().int(),
  is_active: z.boolean(),
  name: z.string(),
  sort_order: z.number().int(),
});
const eventSchema = z.object({
  id: z.number().int(),
  is_active: z.boolean(),
  name: z.string(),
  sort_order: z.number().int(),
});
const distanceSchema = z.object({
  id: z.number().int(),
  is_active: z.boolean(),
  meters: z.number().int(),
});
const targetFaceLookupSchema = z.object({
  id: z.number().int(),
  is_active: z.boolean(),
  lowest_score: z.number().int(),
  name: z.string(),
});

export const lookupsSchema = z.object({
  categories: z.array(categorySchema),
  distances: z.array(distanceSchema),
  events: z.array(eventSchema),
  targetFaces: z.array(targetFaceLookupSchema),
});
export type Lookups = z.infer<typeof lookupsSchema>;

export const athleteRowSchema = z.object({
  aai_no: z.string().nullable(),
  category: z.object({ name: z.string() }).nullable(),
  category_id: z.number().int(),
  distance: z.object({ meters: z.number().int() }).nullable(),
  distance_id: z.number().int(),
  event: z.object({ name: z.string() }).nullable(),
  event_id: z.number().int(),
  full_name: z.string(),
  gender: genderSchema,
  id: z.uuid(),
  id_no: z.string(),
  is_active: z.boolean(),
  target_face: z.object({ name: z.string() }).nullable(),
  target_face_id: z.number().int(),
});
export type AthleteRow = z.infer<typeof athleteRowSchema>;

export const profileSchema = z.object({
  created_at: isoDateTimeSchema,
  full_name: z.string(),
  id: z.uuid(),
  is_active: z.boolean(),
  login_id: z.string(),
  role: appRoleSchema,
});
export type Profile = z.infer<typeof profileSchema>;

export const sessionSummarySchema = z.object({
  arrows: z.number().int().nullable(),
  athlete_id: z.uuid().nullable(),
  athlete_name: z.string().nullable(),
  avg_arrow: z.number().nullable(),
  category_id: z.number().int().nullable(),
  category_name: z.string().nullable(),
  completed_at: isoDateTimeSchema.nullable(),
  correction_count: z.number().int().nullable(),
  distance_ids: z.array(z.number().int()).nullable(),
  event_id: z.number().int().nullable(),
  event_name: z.string().nullable(),
  formats: z.string().nullable(),
  gender: genderSchema.nullable(),
  id: z.uuid(),
  id_no: z.string().nullable(),
  max_points: z.number().int().nullable(),
  miss_count: z.number().int().nullable(),
  rounds: z.number().int().nullable(),
  scorer_id: z.uuid().nullable(),
  scorer_name: z.string().nullable(),
  session_date: z.iso.date(),
  session_type: sessionTypeSchema.nullable(),
  started_at: isoDateTimeSchema.nullable(),
  status: sessionStatusSchema.nullable(),
  target_face_ids: z.array(z.number().int()).nullable(),
  ten_plus_x_count: z.number().int().nullable(),
  title: z.string().nullable(),
  total_points: z.number().int().nullable(),
  venue: venueSchema.nullable(),
  x_count: z.number().int().nullable(),
});
export type SessionSummary = z.infer<typeof sessionSummarySchema>;

export const arrowDetailSchema = z.object({
  aai_no: z.string().nullable(),
  arrow_no: z.number().int().nullable(),
  athlete_id: z.uuid().nullable(),
  athlete_name: z.string().nullable(),
  category_id: z.number().int().nullable(),
  category_name: z.string().nullable(),
  distance_id: z.number().int().nullable(),
  end_no: z.number().int().nullable(),
  event_id: z.number().int().nullable(),
  event_name: z.string().nullable(),
  gender: genderSchema.nullable(),
  id: z.uuid().nullable(),
  id_no: z.string().nullable(),
  is_ten_plus_x: z.boolean().nullable(),
  is_x: z.boolean().nullable(),
  meters: z.number().nullable(),
  points: z.number().int().nullable(),
  round_no: z.number().int().nullable(),
  scorer_id: z.uuid().nullable(),
  scorer_name: z.string().nullable(),
  session_date: z.iso.date().nullable(),
  session_id: z.uuid().nullable(),
  session_type: sessionTypeSchema.nullable(),
  status: sessionStatusSchema.nullable(),
  target_face_id: z.number().int().nullable(),
  target_face_name: z.string().nullable(),
  title: z.string().nullable(),
  value: z.string().nullable(),
  venue: venueSchema.nullable(),
});
export type ArrowDetail = z.infer<typeof arrowDetailSchema>;

const sessionArrowSchema = z.object({
  arrow_no: z.number().int(),
  id: z.uuid(),
  is_ten_plus_x: z.boolean().nullable(),
  is_x: z.boolean().nullable(),
  points: z.number().int().nullable(),
  value: z.string(),
});
const sessionEndSchema = z.object({
  arrows: z.array(sessionArrowSchema),
  end_no: z.number().int(),
  id: z.uuid(),
});
const sessionRoundSchema = z.object({
  arrows_per_end: z.number().int(),
  distance: z.object({ meters: z.number().int() }).nullable(),
  ends: z.array(sessionEndSchema),
  id: z.uuid(),
  planned_ends: z.number().int(),
  round_no: z.number().int(),
  target_face: z
    .object({ lowest_score: z.number().int(), name: z.string() })
    .nullable(),
});
export const sessionDetailSchema = z.object({
  athlete: z.object({
    aai_no: z.string().nullable(),
    full_name: z.string(),
    gender: genderSchema,
    id: z.uuid(),
    id_no: z.string(),
  }),
  athlete_id: z.uuid(),
  category: z.object({ name: z.string() }).nullable(),
  category_id: z.number().int(),
  completed_at: isoDateTimeSchema.nullable(),
  event: z.object({ name: z.string() }).nullable(),
  event_id: z.number().int(),
  id: z.uuid(),
  notes: z.string().nullable(),
  rounds: z.array(sessionRoundSchema),
  scorer: z.object({ full_name: z.string(), login_id: z.string() }).nullable(),
  scorer_id: z.uuid().nullable(),
  session_date: z.iso.date(),
  session_type: sessionTypeSchema,
  started_at: isoDateTimeSchema,
  status: sessionStatusSchema,
  title: z.string().nullable(),
  venue: venueSchema,
});
export type SessionDetail = z.infer<typeof sessionDetailSchema>;
export type SessionRound = SessionDetail["rounds"][number];
export type SessionEnd = SessionRound["ends"][number];
export type SessionArrow = SessionEnd["arrows"][number];

export const arrowCorrectionSchema = z.object({
  arrow_id: z.uuid().nullable(),
  arrow_no: z.number().int(),
  corrected_at: isoDateTimeSchema,
  corrector: z.object({ full_name: z.string() }).nullable(),
  end_no: z.number().int(),
  id: z.number().int(),
  new_value: z.string().nullable(),
  old_value: z.string().nullable(),
  reason: z.string().nullable(),
  round_no: z.number().int(),
  session_id: z.uuid(),
});
export type ArrowCorrection = z.infer<typeof arrowCorrectionSchema>;
