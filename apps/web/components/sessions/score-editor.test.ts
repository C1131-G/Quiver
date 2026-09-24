/// <reference types="bun" />

import { describe, expect, test } from "bun:test";

import type { EditorRound } from "./score-editor";
import {
  directionForKey,
  highToLow,
  moveFrom,
  savedValues,
  scoreForKey,
  scoreGrid,
  scoreRounds,
  toChanges,
  valueAt,
  withValue,
} from "./score-editor";

const roundOne: EditorRound = {
  arrowsPerEnd: 3,
  ends: [
    {
      arrows: [
        { arrowNo: 1, value: "X" },
        { arrowNo: 2, value: "9" },
        { arrowNo: 3, value: "M" },
      ],
      endNo: 1,
    },
    { arrows: [{ arrowNo: 1, value: "10" }], endNo: 2 },
  ],
  id: "r1",
  plannedEnds: 3,
  roundNo: 1,
};
const roundTwo: EditorRound = {
  arrowsPerEnd: 3,
  ends: [],
  id: "r2",
  plannedEnds: 2,
  roundNo: 2,
};
const saved = savedValues([roundOne, roundTwo]);

describe("draft", () => {
  test("a changed cell shows its draft value", () => {
    const cell = { arrowNo: 2, endNo: 1, roundId: "r1" };
    const draft = withValue(saved, new Map(), cell, "7");
    expect(valueAt(saved, draft, cell)).toBe("7");
    expect(draft.size).toBe(1);
  });

  test("setting a cell back to its saved value drops the change", () => {
    const cell = { arrowNo: 2, endNo: 1, roundId: "r1" };
    const changed = withValue(saved, new Map(), cell, "7");
    expect(withValue(saved, changed, cell, "9").size).toBe(0);
  });

  test("clearing an empty cell is not a change", () => {
    const cell = { arrowNo: 3, endNo: 3, roundId: "r1" };
    expect(withValue(saved, new Map(), cell, null).size).toBe(0);
  });

  test("changes go to the database in scorecard order", () => {
    let draft = withValue(
      saved,
      new Map(),
      { arrowNo: 1, endNo: 2, roundId: "r1" },
      null
    );
    draft = withValue(
      saved,
      draft,
      { arrowNo: 3, endNo: 1, roundId: "r1" },
      "8"
    );
    expect(toChanges(draft)).toEqual([
      { arrow_no: 3, end_no: 1, round_id: "r1", value: "8" },
      { arrow_no: 1, end_no: 2, round_id: "r1", value: null },
    ]);
  });
});

describe("scoreGrid", () => {
  test("every planned end appears, with end, distance and session totals", () => {
    const rows = scoreGrid(roundOne, saved, new Map(), 100);
    expect(rows.map((row) => row.endTotal)).toEqual([19, 10, 0]);
    expect(rows.map((row) => row.distance)).toEqual([19, 29, 29]);
    expect(rows.map((row) => row.total)).toEqual([119, 129, 129]);
    expect(rows[0]).toMatchObject({ shot: 3, tenPlusX: 1, xCount: 1 });
    expect(rows[2]?.values).toEqual([null, null, null]);
  });

  test("totals follow the draft", () => {
    const draft = withValue(
      saved,
      new Map(),
      { arrowNo: 3, endNo: 1, roundId: "r1" },
      "10"
    );
    expect(scoreGrid(roundOne, saved, draft, 0)[0]).toMatchObject({
      endTotal: 29,
      tenPlusX: 2,
    });
  });
});

describe("moveFrom", () => {
  const rounds = [roundOne, roundTwo];

  test("next runs through arrows, then ends, then rounds", () => {
    expect(
      moveFrom(rounds, { arrowNo: 1, endNo: 1, roundId: "r1" }, "next")
    ).toEqual({
      arrowNo: 2,
      endNo: 1,
      roundId: "r1",
    });
    expect(
      moveFrom(rounds, { arrowNo: 3, endNo: 1, roundId: "r1" }, "next")
    ).toEqual({
      arrowNo: 1,
      endNo: 2,
      roundId: "r1",
    });
    expect(
      moveFrom(rounds, { arrowNo: 3, endNo: 3, roundId: "r1" }, "next")
    ).toEqual({
      arrowNo: 1,
      endNo: 1,
      roundId: "r2",
    });
  });

  test("the last and first cells stay put", () => {
    const last = { arrowNo: 3, endNo: 2, roundId: "r2" };
    expect(moveFrom(rounds, last, "next")).toEqual(last);
    const first = { arrowNo: 1, endNo: 1, roundId: "r1" };
    expect(moveFrom(rounds, first, "previous")).toEqual(first);
  });

  test("arrow keys stay inside the round's grid", () => {
    const corner = { arrowNo: 3, endNo: 3, roundId: "r1" };
    expect(moveFrom(rounds, corner, "right")).toEqual(corner);
    expect(moveFrom(rounds, corner, "down")).toEqual(corner);
    expect(moveFrom(rounds, corner, "up")).toEqual({ ...corner, endNo: 2 });
  });
});

test("keys map to scores: X, M, 1 to 9, and 0 for 10", () => {
  expect(scoreForKey("x")).toBe("X");
  expect(scoreForKey("m")).toBe("M");
  expect(scoreForKey("7")).toBe("7");
  expect(scoreForKey("0")).toBe("10");
  expect(scoreForKey("a")).toBeUndefined();
});

test("ends read from the highest arrow to the lowest", () => {
  const values = ["9", "M", "X", "10", "1"].map((value) => ({ value }));
  expect(highToLow(values).map((arrow) => arrow.value)).toEqual([
    "X",
    "10",
    "9",
    "1",
    "M",
  ]);
});

test("arrow keys move the selection; other keys do not", () => {
  expect(directionForKey("ArrowUp")).toBe("up");
  expect(directionForKey("ArrowRight")).toBe("right");
  expect(directionForKey("Enter")).toBeUndefined();
});

test("session totals carry from one round into the next", () => {
  const grids = scoreRounds([roundOne, roundTwo], saved, new Map());
  expect(grids[0]?.at(-1)?.total).toBe(29);
  expect(grids[1]?.map((row) => row.total)).toEqual([29, 29]);
});
