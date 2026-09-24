import { z } from "zod";

import type { TemplateInput, TemplateRow } from "./use-templates";

/** The select value for "use each athlete's own distance or face". */
export const ATHLETE_OWN = "own";

/** Limits the database enforces on a round. */
export const ROUND_LIMITS = {
  arrowsPerEnd: { max: 6, min: 1 },
  plannedEnds: { max: 36, min: 1 },
  rounds: { max: 6, min: 1 },
} as const;

export interface RoundDraft {
  arrowsPerEnd: number;
  /** A distance id, or ATHLETE_OWN. */
  distanceId: string;
  /** Stays with the round while others are added or removed. */
  key: string;
  plannedEnds: number;
  /** A target face id, or ATHLETE_OWN. */
  targetFaceId: string;
}

export interface TemplateDraft {
  athleteIds: string[];
  rounds: RoundDraft[];
  sessionDate: string;
  sessionType: TemplateInput["sessionType"];
  title: string;
  venue: TemplateInput["venue"];
}

export const newRound = (from?: RoundDraft): RoundDraft => ({
  arrowsPerEnd: from?.arrowsPerEnd ?? 6,
  distanceId: from?.distanceId ?? ATHLETE_OWN,
  key: crypto.randomUUID(),
  plannedEnds: from?.plannedEnds ?? 6,
  targetFaceId: from?.targetFaceId ?? ATHLETE_OWN,
});

const fromLookup = (id: number | null) =>
  id === null ? ATHLETE_OWN : String(id);

/** The form's starting values: the plan being edited, or a blank one. */
export const draftOf = (
  template: TemplateRow | null,
  today: string
): TemplateDraft =>
  template
    ? {
        athleteIds: template.athletes.map((row) => row.athlete_id),
        rounds: template.rounds.map((round) => ({
          arrowsPerEnd: round.arrows_per_end,
          distanceId: fromLookup(round.distance_id),
          key: crypto.randomUUID(),
          plannedEnds: round.planned_ends,
          targetFaceId: fromLookup(round.target_face_id),
        })),
        sessionDate: template.session_date,
        sessionType: template.session_type,
        title: template.title,
        venue: template.venue,
      }
    : {
        athleteIds: [],
        rounds: [newRound()],
        sessionDate: today,
        sessionType: "training",
        title: "",
        venue: "outdoor",
      };

const lookupOrOwn = z
  .string()
  .transform((value) => (value === ATHLETE_OWN ? null : Number(value)))
  .pipe(z.number().int().positive().nullable());

const templateSchema = z.object({
  athleteIds: z.array(z.uuid()).min(1, "Choose at least one athlete."),
  rounds: z
    .array(
      z.object({
        arrowsPerEnd: z
          .number()
          .int()
          .min(ROUND_LIMITS.arrowsPerEnd.min)
          .max(ROUND_LIMITS.arrowsPerEnd.max),
        distanceId: lookupOrOwn,
        plannedEnds: z
          .number()
          .int()
          .min(ROUND_LIMITS.plannedEnds.min)
          .max(ROUND_LIMITS.plannedEnds.max),
        targetFaceId: lookupOrOwn,
      })
    )
    .min(ROUND_LIMITS.rounds.min, "Add at least one round.")
    .max(ROUND_LIMITS.rounds.max),
  sessionDate: z.iso.date("Choose a date."),
  sessionType: z.enum(["training", "competition"]),
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(120, "Title is at most 120 characters."),
  venue: z.enum(["indoor", "outdoor"]),
});

export type TemplateFormResult =
  | { input: TemplateInput; ok: true }
  | { error: string; ok: false };

/** Checks the form and turns it into what the database takes. */
export const readTemplateDraft = (draft: TemplateDraft): TemplateFormResult => {
  const parsed = templateSchema.safeParse(draft);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the form.",
      ok: false,
    };
  }
  const { rounds, ...rest } = parsed.data;
  return {
    input: {
      ...rest,
      rounds: rounds.map((round) => ({
        arrows_per_end: round.arrowsPerEnd,
        distance_id: round.distanceId,
        planned_ends: round.plannedEnds,
        target_face_id: round.targetFaceId,
      })),
    },
    ok: true,
  };
};
