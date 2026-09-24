import type { Venue } from "@/db/rows";

/**
 * Common round formats. A preset fills in the rounds; the scorer can still
 * change any of them before starting. Distance and face come from the
 * athlete's usual setup.
 */
export interface RoundPreset {
  arrowsPerEnd: number;
  id: string;
  label: string;
  plannedEnds: number;
  rounds: number;
  venue: Venue;
}

export const ROUND_PRESETS: readonly RoundPreset[] = [
  {
    arrowsPerEnd: 3,
    id: "indoor-60",
    label: "60 arrows · 2 × 10 ends of 3",
    plannedEnds: 10,
    rounds: 2,
    venue: "indoor",
  },
  {
    arrowsPerEnd: 6,
    id: "outdoor-72",
    label: "72 arrows · 2 × 6 ends of 6",
    plannedEnds: 6,
    rounds: 2,
    venue: "outdoor",
  },
  {
    arrowsPerEnd: 6,
    id: "outdoor-36",
    label: "36 arrows · 6 ends of 6",
    plannedEnds: 6,
    rounds: 1,
    venue: "outdoor",
  },
  {
    arrowsPerEnd: 3,
    id: "practice-30",
    label: "30 arrows · 10 ends of 3",
    plannedEnds: 10,
    rounds: 1,
    venue: "indoor",
  },
];

/** Limits the database enforces on a round. */
export const ROUND_LIMITS = {
  arrowsPerEnd: { max: 6, min: 1 },
  plannedEnds: { max: 36, min: 1 },
  rounds: { max: 6, min: 1 },
} as const;
