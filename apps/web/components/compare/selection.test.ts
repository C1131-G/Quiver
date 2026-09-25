/// <reference types="bun" />

import { expect, test } from "bun:test";

import {
  addToSlots,
  formatParam,
  parseFormat,
  parseSlots,
  removeFromSlots,
  serializeSlots,
} from "./selection";

const ATHLETE_A = "9ff6472d-149b-477a-845d-3940863fa97c";
const ATHLETE_B = "d4efdf87-d11c-4840-af0c-10f5daa94334";
const ATHLETE_C = "0b6c9d3e-8a3f-4c1e-9d7a-2f5b8e1c4a60";

test("slots survive the URL, gaps included", () => {
  const slots = parseSlots(`${ATHLETE_A},,${ATHLETE_C}`);
  expect(slots).toEqual([ATHLETE_A, null, ATHLETE_C]);
  expect(serializeSlots(slots)).toBe(`${ATHLETE_A},,${ATHLETE_C}`);
});

test("a repeated athlete keeps only its first slot", () => {
  expect(parseSlots(`${ATHLETE_A},${ATHLETE_A},${ATHLETE_B}`)).toEqual([
    ATHLETE_A,
    null,
    ATHLETE_B,
  ]);
});

test("junk ids become empty slots and trailing gaps are dropped", () => {
  expect(parseSlots(`${ATHLETE_A},nope,`)).toEqual([ATHLETE_A]);
  expect(parseSlots(null)).toEqual([]);
  expect(serializeSlots([null])).toBeNull();
});

test("removing an athlete keeps everyone else in their slot", () => {
  expect(removeFromSlots([ATHLETE_A, ATHLETE_B, ATHLETE_C], ATHLETE_B)).toEqual(
    [ATHLETE_A, null, ATHLETE_C]
  );
  expect(removeFromSlots([ATHLETE_A, ATHLETE_B], ATHLETE_B)).toEqual([
    ATHLETE_A,
  ]);
});

test("a new athlete fills the first free slot", () => {
  expect(addToSlots([ATHLETE_A, null, ATHLETE_C], ATHLETE_B)).toEqual([
    ATHLETE_A,
    ATHLETE_B,
    ATHLETE_C,
  ]);
  expect(addToSlots([ATHLETE_A], ATHLETE_B)).toEqual([ATHLETE_A, ATHLETE_B]);
  expect(addToSlots([ATHLETE_A, ATHLETE_B], ATHLETE_A)).toEqual([
    ATHLETE_A,
    ATHLETE_B,
  ]);
});

test("no more than six athletes", () => {
  const ids = [1, 2, 3, 4, 5, 6].map(
    (digit) =>
      `${digit}${digit}${digit}${digit}${digit}${digit}${digit}${digit}-1111-4111-8111-111111111111`
  );
  const full = parseSlots(ids.join(","));
  expect(full).toHaveLength(6);
  expect(addToSlots(full, "77777777-1111-4111-8111-111111111111")).toBe(full);
});

test("formats round-trip and reject junk", () => {
  expect(parseFormat("8-1")).toEqual({ distanceId: 8, faceId: 1 });
  expect(formatParam({ distanceId: 8, faceId: 1 })).toBe("8-1");
  expect(parseFormat("8")).toBeNull();
  expect(parseFormat("8-1;drop")).toBeNull();
});
