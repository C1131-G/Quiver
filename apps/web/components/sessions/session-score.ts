import type { SessionEnd } from "./use-sessions";

/** Per-end totals with the running score carried through the round. */
export const scoreEnds = (ends: SessionEnd[]) => {
  let running = 0;
  return ends.map((end) => {
    let points = 0;
    let tenPlusX = 0;
    let xCount = 0;
    for (const arrow of end.arrows) {
      points += arrow.points ?? 0;
      tenPlusX += arrow.is_ten_plus_x ? 1 : 0;
      xCount += arrow.is_x ? 1 : 0;
    }
    running += points;
    return { end, points, running, tenPlusX, xCount };
  });
};
