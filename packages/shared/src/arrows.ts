/**
 * Arrow scoring rules shared by Quiver Dashboard and QuiverScore. An arrow is
 * stored as text: X, 10 to 1, or M for a miss. The database derives points
 * from the same rules, so these must stay in step with `validate_arrow`.
 */

export const ARROW_VALUES = [
  "X",
  "10",
  "9",
  "8",
  "7",
  "6",
  "5",
  "4",
  "3",
  "2",
  "1",
  "M",
] as const;

export type ArrowValue = (typeof ARROW_VALUES)[number];

const INNER_TEN_POINTS = 10;

export const isArrowValue = (value: string): value is ArrowValue =>
  ARROW_VALUES.some((allowed) => allowed === value);

/** Scores the face can produce: X to its lowest ring, then a miss. */
export const valuesForFace = (lowestScore: number) =>
  ARROW_VALUES.filter(
    (value) => value === "X" || value === "M" || Number(value) >= lowestScore
  );

export const isScoreOnFace = (value: string, lowestScore: number) =>
  valuesForFace(lowestScore).some((allowed) => allowed === value);

/** Points for an arrow; an empty slot or a miss scores nothing. */
export const pointsOf = (value: string | null) => {
  if (value === null || value === "M") {
    return 0;
  }
  return value === "X" ? INNER_TEN_POINTS : Number(value);
};

/** Lowest to highest, so a larger index is a better arrow. */
const RANK: readonly string[] = ARROW_VALUES.toReversed();

/** Scorecards list each end's arrows from highest to lowest. */
export const highToLow = <T extends { value: string }>(arrows: readonly T[]) =>
  arrows.toSorted((a, b) => RANK.indexOf(b.value) - RANK.indexOf(a.value));
