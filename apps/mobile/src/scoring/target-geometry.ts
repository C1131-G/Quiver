/**
 * Where an arrow landed on a drawn target face, turned into its score.
 *
 * A full face has ten rings of equal width; the X is the inner half of the
 * 10. Reduced faces (6-ring, triple spot) draw only the rings from their
 * lowest score to 10, stretched to fill the same circle, so a tap is first
 * scaled back onto the full face.
 */

const RINGS = 10;

/** The scoring rings a face shows, outermost first: 1…10 or 6…10. */
export const ringsOf = (lowestScore: number) =>
  Array.from(
    { length: RINGS - lowestScore + 1 },
    (_ring, index) => lowestScore + index
  );

/**
 * The score at `distance` from the centre of a face drawn with `radius`.
 * Returns "M" outside the drawn face.
 */
export const valueAt = (
  distance: number,
  radius: number,
  lowestScore: number
) => {
  if (radius <= 0 || distance > radius) {
    return "M";
  }
  const shownRings = RINGS - lowestScore + 1;
  // 0 at the centre, 1 at the outer edge of ring 1 on a full face.
  const onFullFace = (distance / radius) * (shownRings / RINGS);
  // Rounding up gives a line cutter the higher ring, as the rules do.
  const ring = Math.min(RINGS + 1 - Math.ceil(onFullFace * RINGS), RINGS);
  if (ring === RINGS) {
    return onFullFace <= 1 / (RINGS * 2) ? "X" : "10";
  }
  return ring < lowestScore ? "M" : String(ring);
};
