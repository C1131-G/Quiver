/// <reference types="bun" />

import { expect, test } from "bun:test";

import { endWindow } from "./end-window";

const tenEnds = (shotThrough: number) =>
  Array.from({ length: 10 }, (_row, index) => ({
    endNo: index + 1,
    shot: index + 1 <= shotThrough ? 6 : 0,
  }));

test("a round that fits shows every end", () => {
  expect(endWindow(tenEnds(0).slice(0, 4), 1, 4)).toEqual({ end: 4, start: 0 });
});

test("the first ends show while the round starts", () => {
  expect(endWindow(tenEnds(0), 1, 4)).toEqual({ end: 4, start: 0 });
});

test("the end being scored is the last row, with the ends just shot above", () => {
  // Ends 4–7 on screen while end 7 is scored.
  expect(endWindow(tenEnds(6), 7, 4)).toEqual({ end: 7, start: 3 });
});

test("near the end of the round the window stops at the last end", () => {
  expect(endWindow(tenEnds(9), 10, 4)).toEqual({ end: 10, start: 6 });
});

test("a finished round shows how it ended", () => {
  expect(endWindow(tenEnds(10), null, 4)).toEqual({ end: 10, start: 6 });
});

test("choosing an early end brings it into view", () => {
  expect(endWindow(tenEnds(8), 2, 4)).toEqual({ end: 4, start: 0 });
});
