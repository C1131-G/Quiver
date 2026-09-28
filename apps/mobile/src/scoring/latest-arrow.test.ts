/// <reference types="bun" />

import { expect, test } from "bun:test";

import { latestArrow } from "./latest-arrow";

const arrow = (id: string, arrowNo: number, updatedAt: string) => ({
  arrow_no: arrowNo,
  id,
  updated_at: updatedAt,
});

test("no arrows, nothing to undo", () => {
  expect(latestArrow([])).toBeNull();
});

test("the arrow saved last is undone first, whatever its end", () => {
  const arrows = [
    arrow("end2-a1", 1, "2026-09-28T10:00:03.000Z"),
    arrow("end1-a6", 6, "2026-09-28T10:00:01.000Z"),
    arrow("end1-a5", 5, "2026-09-28T10:00:00.000Z"),
  ];
  expect(latestArrow(arrows)?.id).toBe("end2-a1");
});

test("undoing twice walks back through the arrows in entry order", () => {
  const arrows = [
    arrow("first", 1, "2026-09-28T10:00:00.000Z"),
    arrow("second", 2, "2026-09-28T10:00:01.000Z"),
  ];
  const last = latestArrow(arrows);
  expect(last?.id).toBe("second");
  expect(latestArrow(arrows.filter((row) => row !== last))?.id).toBe("first");
});

test("two arrows saved in the same millisecond: the higher number is later", () => {
  const arrows = [
    arrow("a2", 2, "2026-09-28T10:00:00.000Z"),
    arrow("a1", 1, "2026-09-28T10:00:00.000Z"),
  ];
  expect(latestArrow(arrows)?.id).toBe("a2");
});
