import { z } from "zod";

import type { AthleteInput, Gender } from "./use-athletes";

const lookupId = (label: string) =>
  z.coerce.number().int().positive(`Select a ${label}.`);

/**
 * The athlete form's fields, validated and turned into the row the database
 * takes. The field names match the form's `name` attributes.
 */
export const athleteFormSchema = z
  .object({
    aaiNo: z.string().trim().max(40, "AAI No. is at most 40 characters."),
    categoryId: lookupId("category"),
    distanceId: lookupId("distance"),
    eventId: lookupId("event"),
    fullName: z
      .string()
      .trim()
      .min(1, "Name is required.")
      .max(120, "Name is at most 120 characters."),
    gender: z.enum(["male", "female"] satisfies Gender[], {
      error: "Select a gender.",
    }),
    idNo: z
      .string()
      .trim()
      .min(1, "ID No. is required.")
      .max(40, "ID No. is at most 40 characters."),
    targetFaceId: lookupId("target face"),
  })
  .transform((fields): AthleteInput => ({
    aai_no: fields.aaiNo || null,
    category_id: fields.categoryId,
    distance_id: fields.distanceId,
    event_id: fields.eventId,
    full_name: fields.fullName,
    gender: fields.gender,
    id_no: fields.idNo,
    target_face_id: fields.targetFaceId,
  }));

export type AthleteFormResult =
  | { input: AthleteInput; ok: true }
  | { error: string; field: string | undefined; ok: false };

/** Reads a submitted athlete form; the first problem is the message shown. */
export const readAthleteForm = (form: FormData): AthleteFormResult => {
  const parsed = athleteFormSchema.safeParse(Object.fromEntries(form));
  if (parsed.success) {
    return { input: parsed.data, ok: true };
  }
  const [issue] = parsed.error.issues;
  return {
    error: issue?.message ?? "Check the form.",
    field: issue?.path[0] === undefined ? undefined : String(issue.path[0]),
    ok: false,
  };
};
