import { describe, expect, test } from "bun:test";

import type { ScoredEnd } from "./scorecard";
import {
  endDisplayOrder,
  lastShot,
  nextArrowNo,
  nextEndToScore,
  scoreRound,
} from "./scorecard";

const plan = { arrowsPerEnd: 3, plannedEnds: 10 };

const end = (endNo: number, ...values: string[]): ScoredEnd => ({
  arrows: values.map((value, index) => ({ arrowNo: index + 1, value })),
  endNo,
});

describe("endDisplayOrder", () => {
  test("an end being shot reads in entry order", () => {
    const { arrows } = end(1, "7", "X");
    expect(endDisplayOrder(arrows, 3).map(({ value }) => value)).toEqual([
      "7",
      "X",
    ]);
  });

  test("a full end reads from highest to lowest", () => {
    const { arrows } = end(1, "7", "M", "X");
    expect(endDisplayOrder(arrows, 3).map(({ value }) => value)).toEqual([
      "X",
      "7",
      "M",
    ]);
  });
});

describe("scoreRound", () => {
  test("every planned end appears, shot or not", () => {
    const { rows } = scoreRound(plan, [end(2, "9")]);
    expect(rows).toHaveLength(10);
    expect(rows[0]?.values).toEqual([null, null, null]);
    expect(rows[1]?.values).toEqual(["9", null, null]);
  });

  test("totals: X is 10, a miss is 0, and X and 10 count as 10+X", () => {
    const score = scoreRound(plan, [
      end(1, "X", "10", "M"),
      end(2, "9", "8", "7"),
    ]);
    expect(score.rows[0]).toMatchObject({
      complete: true,
      endTotal: 20,
      roundTotal: 20,
      tenPlusXCount: 2,
      xCount: 1,
    });
    expect(score.rows[1]?.roundTotal).toBe(44);
    expect(score).toMatchObject({
      shot: 6,
      tenPlusXCount: 2,
      total: 44,
      xCount: 1,
    });
  });

  test("the session total carries in from earlier rounds", () => {
    const score = scoreRound(plan, [end(1, "10")], 250);
    expect(score.rows[0]?.roundTotal).toBe(10);
    expect(score.rows[0]?.total).toBe(260);
    expect(score.total).toBe(260);
  });
});

describe("next slot", () => {
  test("the next end is the first with a free slot", () => {
    expect(nextEndToScore(plan, [])).toBe(1);
    expect(nextEndToScore(plan, [end(1, "X", "9", "8"), end(2, "7")])).toBe(2);
    // A cleared end earlier in the round is filled before later ones.
    expect(nextEndToScore(plan, [end(1), end(2, "9", "9", "9")])).toBe(1);
  });

  test("a full round has no next end", () => {
    const full = Array.from({ length: 10 }, (_end, index) =>
      end(index + 1, "9", "9", "9")
    );
    expect(nextEndToScore(plan, full)).toBeNull();
  });

  test("arrows are numbered in the order they are shot", () => {
    expect(nextArrowNo([], 3)).toBe(1);
    expect(nextArrowNo(end(1, "9", "8").arrows, 3)).toBe(3);
    expect(nextArrowNo(end(1, "9", "8", "7").arrows, 3)).toBeNull();
  });

  test("delete arrow removes the one shot last, not the lowest", () => {
    expect(lastShot(end(1, "M", "X").arrows)?.value).toBe("X");
    expect(lastShot([])).toBeNull();
  });
});
