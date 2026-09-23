const ARROW_VALUES = [
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

/** Scores the face can produce: X to its lowest ring, then a miss. */
export const valuesForFace = (lowestScore: number) =>
  ARROW_VALUES.filter(
    (value) => value === "X" || value === "M" || Number(value) >= lowestScore
  );
