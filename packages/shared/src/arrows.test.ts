import { describe, expect, test } from "bun:test";

import {
  highToLow,
  isArrowValue,
  isScoreOnFace,
  pointsOf,
  valuesForFace,
} from "./arrows";

describe("valuesForFace", () => {
  test("a full face offers X to 1 and a miss", () => {
    expect(valuesForFace(1)).toEqual([
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
    ]);
  });

  test("a six-ring face stops at 5", () => {
    expect(valuesForFace(5)).toEqual(["X", "10", "9", "8", "7", "6", "5", "M"]);
    expect(isScoreOnFace("4", 5)).toBe(false);
    expect(isScoreOnFace("M", 5)).toBe(true);
  });
});

test("isArrowValue accepts only stored values", () => {
  expect(isArrowValue("X")).toBe(true);
  expect(isArrowValue("0")).toBe(false);
  expect(isArrowValue("x")).toBe(false);
});

test("pointsOf scores X as 10 and empty or missed arrows as 0", () => {
  expect(pointsOf("X")).toBe(10);
  expect(pointsOf("10")).toBe(10);
  expect(pointsOf("7")).toBe(7);
  expect(pointsOf("M")).toBe(0);
  expect(pointsOf(null)).toBe(0);
});

test("highToLow puts X above 10 and a miss last, without mutating", () => {
  const arrows = [
    { value: "M" },
    { value: "10" },
    { value: "X" },
    { value: "9" },
  ];
  expect(highToLow(arrows).map(({ value }) => value)).toEqual([
    "X",
    "10",
    "9",
    "M",
  ]);
  expect(arrows[0]?.value).toBe("M");
});
