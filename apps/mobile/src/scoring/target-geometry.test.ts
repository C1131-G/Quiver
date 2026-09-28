/// <reference types="bun" />

import { expect, test } from "bun:test";

import { ringsOf, valueAt } from "./target-geometry";

const RADIUS = 100;

test("the centre scores X, the rest of the 10 ring scores 10", () => {
  expect(valueAt(0, RADIUS, 1)).toBe("X");
  expect(valueAt(4.9, RADIUS, 1)).toBe("X");
  expect(valueAt(5.1, RADIUS, 1)).toBe("10");
  expect(valueAt(9.9, RADIUS, 1)).toBe("10");
});

test("each ring of a full face scores its value", () => {
  expect(valueAt(10.1, RADIUS, 1)).toBe("9");
  expect(valueAt(45, RADIUS, 1)).toBe("6");
  expect(valueAt(95, RADIUS, 1)).toBe("1");
  expect(valueAt(RADIUS, RADIUS, 1)).toBe("1");
});

test("outside the face is a miss", () => {
  expect(valueAt(100.5, RADIUS, 1)).toBe("M");
  expect(valueAt(0, 0, 1)).toBe("M");
});

test("a 6-ring face stretches rings 5 to 10 over the whole circle", () => {
  expect(ringsOf(5)).toEqual([5, 6, 7, 8, 9, 10]);
  // Each of the six rings is a sixth of the radius.
  expect(valueAt(99, RADIUS, 5)).toBe("5");
  expect(valueAt(70, RADIUS, 5)).toBe("6");
  expect(valueAt(8, RADIUS, 5)).toBe("X");
  expect(valueAt(15, RADIUS, 5)).toBe("10");
});

test("a triple spot has rings 6 to 10 and nothing lower", () => {
  expect(ringsOf(6)).toEqual([6, 7, 8, 9, 10]);
  expect(valueAt(99, RADIUS, 6)).toBe("6");
  expect(valueAt(101, RADIUS, 6)).toBe("M");
});
