import type { ReactFormExtendedApi } from "@tanstack/react-form";
import { randomUUID } from "expo-crypto";
import { z } from "zod";

import type { Choice } from "@/components/choice-group";
import type { Athlete, SessionType, Venue } from "@/db/rows";
import type { RoundDraft } from "@/scoring/actions";
import type { RoundPreset } from "@/scoring/presets";
import { ROUND_LIMITS, ROUND_PRESETS } from "@/scoring/presets";

export const SESSION_TYPES: Choice<SessionType>[] = [
  { label: "Training", value: "training" },
  { label: "Competition", value: "competition" },
];

export const VENUES: Choice<Venue>[] = [
  { label: "Indoor", value: "indoor" },
  { label: "Outdoor", value: "outdoor" },
];

/** Each preset on two lines: the arrow count, then how they are shot. */
export const PRESET_CHOICES: Choice<string>[] = ROUND_PRESETS.map((option) => ({
  label: option.label.replace(" · ", "\n"),
  value: option.id,
}));

/** A round added by hand when none is there to copy: 6 ends of 6. */
export const HAND_ADDED_ROUND = { arrowsPerEnd: 6, plannedEnds: 6 } as const;

/** Short distances are usually shot indoors, in ends of three. */
const INDOOR_MAX_METERS = 25;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;

export const setupSchema = z.object({
  presetId: z.string(),
  rounds: z
    .array(
      z.object({
        arrowsPerEnd: z
          .number()
          .int()
          .min(ROUND_LIMITS.arrowsPerEnd.min)
          .max(ROUND_LIMITS.arrowsPerEnd.max),
        distanceId: z.number().int().positive("Choose a distance."),
        key: z.string(),
        plannedEnds: z
          .number()
          .int()
          .min(ROUND_LIMITS.plannedEnds.min)
          .max(ROUND_LIMITS.plannedEnds.max),
        targetFaceId: z.number().int().positive("Choose a target face."),
      })
    )
    .min(ROUND_LIMITS.rounds.min, "Add at least one round.")
    .max(ROUND_LIMITS.rounds.max),
  sessionDate: z
    .string()
    .regex(ISO_DATE, "Use the format 2026-09-24.")
    .refine(
      (value) => !Number.isNaN(Date.parse(value)),
      "This is not a real date."
    ),
  sessionType: z.enum(["training", "competition"]),
  title: z.string().max(120, "Keep the title under 120 characters."),
  venue: z.enum(["indoor", "outdoor"]),
});

export type SetupValues = z.infer<typeof setupSchema>;

/**
 * The form instance shape shared with the extracted sections, matching
 * TanStack Form's own pattern for a form-shaped prop (see useFormContext's
 * declared return type).
 */
/* oxlint-disable no-explicit-any -- library generics require it */
export type SetupFormApi = ReactFormExtendedApi<
  SetupValues,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>;
/* oxlint-enable no-explicit-any */

/** A round being set up, with a key that stays with it while editing. */
export type RoundForm = RoundDraft & { key: string };

export const newRound = (draft: RoundDraft): RoundForm => ({
  ...draft,
  key: randomUUID(),
});

export const roundsFromPreset = (
  preset: RoundPreset,
  athlete: Athlete
): RoundForm[] =>
  Array.from({ length: preset.rounds }, () =>
    newRound({
      arrowsPerEnd: preset.arrowsPerEnd,
      distanceId: athlete.distance_id,
      plannedEnds: preset.plannedEnds,
      targetFaceId: athlete.target_face_id,
    })
  );

export const defaultPreset = (meters: number | undefined) => {
  const indoor = meters !== undefined && meters <= INDOOR_MAX_METERS;
  return (
    ROUND_PRESETS.find(
      (preset) => preset.venue === (indoor ? "indoor" : "outdoor")
    ) ?? ROUND_PRESETS[0]
  );
};

/** Active options, plus the one in use even if it has since been retired. */
export const choicesOf = <TRow extends { id: number; is_active: boolean }>(
  rows: readonly TRow[],
  inUse: number,
  label: (row: TRow) => string
): Choice<number>[] => {
  const choices: Choice<number>[] = [];
  for (const row of rows) {
    if (row.is_active || row.id === inUse) {
      choices.push({ label: label(row), value: row.id });
    }
  }
  return choices;
};

export const firstError = (errors: readonly unknown[]) => {
  const parsed = z
    .object({ message: z.string() })
    .or(z.string().transform((message) => ({ message })))
    .safeParse(errors[0]);
  return parsed.success ? parsed.data.message : null;
};
