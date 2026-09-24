/**
 * The admin score editor's model: a draft of changed cells over the saved
 * scorecard. Pure functions, so the grid, the totals and what gets saved all
 * come from the same place.
 */

export interface EditorRound {
  arrowsPerEnd: number;
  id: string;
  plannedEnds: number;
  roundNo: number;
  ends: { arrows: { arrowNo: number; value: string }[]; endNo: number }[];
}

export interface Cell {
  arrowNo: number;
  endNo: number;
  roundId: string;
}

/** round id : end no : arrow no, e.g. "3f2a…:4:2". */
export type CellKey = `${string}:${number}:${number}`;

/**
 * Changed cells. null clears an arrow: it is what admin_save_scores takes
 * to mean "delete this arrow".
 */
export type Draft = ReadonlyMap<CellKey, string | null>;

export const cellKey = (cell: Cell): CellKey =>
  `${cell.roundId}:${cell.endNo}:${cell.arrowNo}`;

/** Saved values by cell key. */
export const savedValues = (rounds: EditorRound[]) => {
  const saved = new Map<CellKey, string>();
  for (const round of rounds) {
    for (const end of round.ends) {
      for (const arrow of end.arrows) {
        saved.set(
          cellKey({
            arrowNo: arrow.arrowNo,
            endNo: end.endNo,
            roundId: round.id,
          }),
          arrow.value
        );
      }
    }
  }
  return saved;
};

export const valueAt = (
  saved: ReadonlyMap<CellKey, string>,
  draft: Draft,
  cell: Cell
) => {
  const key = cellKey(cell);
  return draft.has(key) ? (draft.get(key) ?? null) : (saved.get(key) ?? null);
};

/** Sets a cell, dropping it from the draft when it matches what is saved. */
export const withValue = (
  saved: ReadonlyMap<CellKey, string>,
  draft: Draft,
  cell: Cell,
  value: string | null
): Draft => {
  const key = cellKey(cell);
  const next = new Map(draft);
  if ((saved.get(key) ?? null) === value) {
    next.delete(key);
  } else {
    next.set(key, value);
  }
  return next;
};

export const pointsOf = (value: string | null) => {
  if (value === null || value === "M") {
    return 0;
  }
  return value === "X" ? 10 : Number(value);
};

const RANK = ["M", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "X"];

/** Scorecards list each end's arrows from highest to lowest. */
export const highToLow = <T extends { value: string }>(arrows: T[]) =>
  arrows.toSorted((a, b) => RANK.indexOf(b.value) - RANK.indexOf(a.value));

export interface GridRow {
  /** Running total for this round (the scorecard's "Dist" column). */
  distance: number;
  endNo: number;
  endTotal: number;
  shot: number;
  tenPlusX: number;
  /** Running total for the whole session. */
  total: number;
  values: (string | null)[];
  xCount: number;
}

/** Every planned end of a round, with totals from the draft applied. */
export const scoreGrid = (
  round: EditorRound,
  saved: ReadonlyMap<CellKey, string>,
  draft: Draft,
  totalBefore: number
): GridRow[] => {
  let distance = 0;
  const rows: GridRow[] = [];
  for (let endNo = 1; endNo <= round.plannedEnds; endNo += 1) {
    const values = Array.from({ length: round.arrowsPerEnd }, (_, index) =>
      valueAt(saved, draft, { arrowNo: index + 1, endNo, roundId: round.id })
    );
    const shotValues = values.filter((value) => value !== null);
    const endTotal = shotValues.reduce(
      (sum, value) => sum + pointsOf(value),
      0
    );
    distance += endTotal;
    rows.push({
      distance,
      endNo,
      endTotal,
      shot: shotValues.length,
      tenPlusX: shotValues.filter((value) => value === "X" || value === "10")
        .length,
      total: totalBefore + distance,
      values,
      xCount: shotValues.filter((value) => value === "X").length,
    });
  }
  return rows;
};

/** The draft as the database function expects it, in a stable order. */
export const toChanges = (draft: Draft) =>
  [...draft.entries()]
    .map(([key, value]) => {
      const [roundId = "", endNo = "0", arrowNo = "0"] = key.split(":");
      return {
        arrow_no: Number(arrowNo),
        end_no: Number(endNo),
        round_id: roundId,
        value,
      };
    })
    .toSorted(
      (a, b) =>
        a.round_id.localeCompare(b.round_id) ||
        a.end_no - b.end_no ||
        a.arrow_no - b.arrow_no
    );

/** Keeps a 1-based position inside 1..max. */
const clamp = (value: number, max: number) => Math.min(Math.max(value, 1), max);

export type Direction = "down" | "left" | "next" | "previous" | "right" | "up";

const cellsOf = (rounds: EditorRound[]) =>
  rounds.flatMap((round) =>
    Array.from({ length: round.plannedEnds }, (_end, endIndex) =>
      Array.from({ length: round.arrowsPerEnd }, (_arrow, arrowIndex) => ({
        arrowNo: arrowIndex + 1,
        endNo: endIndex + 1,
        roundId: round.id,
      }))
    ).flat()
  );

/**
 * The cell a key or keypad press moves to. Next and previous run through
 * every arrow in order, across ends and rounds, like the mobile scorer;
 * the arrow keys move within the grid of one round.
 */
export const moveFrom = (
  rounds: EditorRound[],
  cell: Cell,
  direction: Direction
): Cell => {
  const round = rounds.find(({ id }) => id === cell.roundId);
  if (!round) {
    return cell;
  }
  if (direction === "next" || direction === "previous") {
    const cells = cellsOf(rounds);
    const index = cells.findIndex(
      (candidate) => cellKey(candidate) === cellKey(cell)
    );
    const step = direction === "next" ? 1 : -1;
    return cells[index + step] ?? cell;
  }
  const moves: Record<"down" | "left" | "right" | "up", Cell> = {
    down: { ...cell, endNo: clamp(cell.endNo + 1, round.plannedEnds) },
    left: { ...cell, arrowNo: clamp(cell.arrowNo - 1, round.arrowsPerEnd) },
    right: { ...cell, arrowNo: clamp(cell.arrowNo + 1, round.arrowsPerEnd) },
    up: { ...cell, endNo: clamp(cell.endNo - 1, round.plannedEnds) },
  };
  return moves[direction];
};

/** The score a key press means, or undefined when the key is not a score. */
const DIGIT = /^[1-9]$/u;

export const scoreForKey = (key: string) => {
  const upper = key.toUpperCase();
  if (upper === "X" || upper === "M") {
    return upper;
  }
  if (key === "0") {
    return "10";
  }
  return DIGIT.test(key) ? key : undefined;
};

/** Where an arrow key moves the selection, or undefined for any other key. */
export const directionForKey = (key: string): Direction | undefined => {
  switch (key) {
    case "ArrowDown": {
      return "down";
    }
    case "ArrowLeft": {
      return "left";
    }
    case "ArrowRight": {
      return "right";
    }
    case "ArrowUp": {
      return "up";
    }
    default: {
      return undefined;
    }
  }
};

/** Every round's grid, with the session total carried from round to round. */
export const scoreRounds = (
  rounds: EditorRound[],
  saved: ReadonlyMap<CellKey, string>,
  draft: Draft
) => {
  const grids: GridRow[][] = [];
  let totalBefore = 0;
  for (const round of rounds) {
    const rows = scoreGrid(round, saved, draft, totalBefore);
    totalBefore = rows.at(-1)?.total ?? totalBefore;
    grids.push(rows);
  }
  return grids;
};
