import { highToLow, pointsOf } from "./arrows";

/**
 * How a scorecard reads, shared by QuiverScore and Quiver Dashboard. Arrows
 * are stored in the order they were shot (`arrowNo`); a finished end reads
 * from its highest arrow to its lowest, as on a paper scorecard.
 */

export interface ScoredArrow {
  arrowNo: number;
  value: string;
}

export interface ScoredEnd {
  arrows: readonly ScoredArrow[];
  endNo: number;
}

export interface RoundPlan {
  arrowsPerEnd: number;
  plannedEnds: number;
}

export interface EndRow {
  complete: boolean;
  endNo: number;
  endTotal: number;
  /** Running total for this round. */
  roundTotal: number;
  shot: number;
  tenPlusXCount: number;
  /** Running total for the whole session. */
  total: number;
  /** One slot per arrow in the end; null where no arrow is shot yet. */
  values: (string | null)[];
  xCount: number;
}

export interface RoundScore {
  rows: EndRow[];
  shot: number;
  tenPlusXCount: number;
  total: number;
  xCount: number;
}

const isTenPlusX = (value: string) => value === "X" || value === "10";

const byArrowNo = (a: ScoredArrow, b: ScoredArrow) => a.arrowNo - b.arrowNo;

/** Entry order while an end is being shot; highest first once it is full. */
export const endDisplayOrder = (
  arrows: readonly ScoredArrow[],
  arrowsPerEnd: number
) => {
  const inOrder = arrows.toSorted(byArrowNo);
  return inOrder.length >= arrowsPerEnd ? highToLow(inOrder) : inOrder;
};

/** Every planned end of a round, with totals carried from `totalBefore`. */
export const scoreRound = (
  plan: RoundPlan,
  ends: readonly ScoredEnd[],
  totalBefore = 0
): RoundScore => {
  const arrowsByEnd = new Map(ends.map((end) => [end.endNo, end.arrows]));
  const rows: EndRow[] = [];
  let roundTotal = 0;
  let shot = 0;
  let xCount = 0;
  let tenPlusXCount = 0;

  for (let endNo = 1; endNo <= plan.plannedEnds; endNo += 1) {
    const arrows = endDisplayOrder(
      arrowsByEnd.get(endNo) ?? [],
      plan.arrowsPerEnd
    );
    const values = Array.from(
      { length: plan.arrowsPerEnd },
      (_slot, index) => arrows[index]?.value ?? null
    );
    let endTotal = 0;
    let endX = 0;
    let endTenPlusX = 0;
    for (const { value } of arrows) {
      endTotal += pointsOf(value);
      endX += value === "X" ? 1 : 0;
      endTenPlusX += isTenPlusX(value) ? 1 : 0;
    }

    roundTotal += endTotal;
    shot += arrows.length;
    xCount += endX;
    tenPlusXCount += endTenPlusX;
    rows.push({
      complete: arrows.length >= plan.arrowsPerEnd,
      endNo,
      endTotal,
      roundTotal,
      shot: arrows.length,
      tenPlusXCount: endTenPlusX,
      total: totalBefore + roundTotal,
      values,
      xCount: endX,
    });
  }

  return {
    rows,
    shot,
    tenPlusXCount,
    total: totalBefore + roundTotal,
    xCount,
  };
};

/** The first planned end with a free slot, or null when the round is full. */
export const nextEndToScore = (
  plan: RoundPlan,
  ends: readonly ScoredEnd[]
): number | null => {
  const shotByEnd = new Map(ends.map((end) => [end.endNo, end.arrows.length]));
  for (let endNo = 1; endNo <= plan.plannedEnds; endNo += 1) {
    if ((shotByEnd.get(endNo) ?? 0) < plan.arrowsPerEnd) {
      return endNo;
    }
  }
  return null;
};

/** The number the next arrow in an end takes, or null when the end is full. */
export const nextArrowNo = (
  arrows: readonly ScoredArrow[],
  arrowsPerEnd: number
): number | null => {
  let highest = 0;
  for (const { arrowNo } of arrows) {
    highest = Math.max(highest, arrowNo);
  }
  const next = highest + 1;
  return next <= arrowsPerEnd ? next : null;
};

/** The arrow shot last in an end: the one "Delete arrow" removes. */
export const lastShot = <T extends ScoredArrow>(arrows: readonly T[]) =>
  arrows.toSorted(byArrowNo).at(-1) ?? null;
