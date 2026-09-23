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

const A = "9ff6472d-149b-477a-845d-3940863fa97c";
const B = "d4efdf87-d11c-4840-af0c-10f5daa94334";
const C = "0b6c9d3e-8a3f-4c1e-9d7a-2f5b8e1c4a60";

test("slots survive the URL, gaps included", () => {
  const slots = parseSlots(`${A},,${C}`);
  expect(slots).toEqual([A, null, C]);
  expect(serializeSlots(slots)).toBe(`${A},,${C}`);
});

test("a repeated athlete keeps only its first slot", () => {
  expect(parseSlots(`${A},${A},${B}`)).toEqual([A, null, B]);
});

test("junk ids become empty slots and trailing gaps are dropped", () => {
  expect(parseSlots(`${A},nope,`)).toEqual([A]);
  expect(parseSlots(null)).toEqual([]);
  expect(serializeSlots([null])).toBeNull();
});

test("removing an athlete keeps everyone else in their slot", () => {
  expect(removeFromSlots([A, B, C], B)).toEqual([A, null, C]);
  expect(removeFromSlots([A, B], B)).toEqual([A]);
});

test("a new athlete fills the first free slot", () => {
  expect(addToSlots([A, null, C], B)).toEqual([A, B, C]);
  expect(addToSlots([A], B)).toEqual([A, B]);
  expect(addToSlots([A, B], A)).toEqual([A, B]);
});

test("no more than six athletes", () => {
  const ids = [1, 2, 3, 4, 5, 6].map(
    (n) => `${n}${n}${n}${n}${n}${n}${n}${n}-1111-4111-8111-111111111111`
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
