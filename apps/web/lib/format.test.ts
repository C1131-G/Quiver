/// <reference types="bun" />

import { expect, test } from "bun:test";

import { valuesForFace } from "@/components/sessions/arrow-values";

import {
  addDays,
  formatPercent,
  formatRoundFormat,
  formatSessionTime,
  parseIsoDate,
  toIsoDate,
} from "./format";

test("dates stay on the same calendar day in any time zone", () => {
  expect(toIsoDate(parseIsoDate("2026-09-01"))).toBe("2026-09-01");
  expect(parseIsoDate("2026-09-01").getDate()).toBe(1);
});

test("addDays crosses month and year boundaries", () => {
  expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
  expect(addDays("2026-12-29", 6)).toBe("2027-01-04");
  expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
});

test("percentages of nothing show a dash, not NaN", () => {
  expect(formatPercent(0, 0)).toBe("—");
  expect(formatPercent(1, 4)).toContain("25");
});

test("round formats read as distance and face", () => {
  expect(formatRoundFormat(70, "122 cm")).toBe("70 m · 122 cm");
});

test("a face only offers the rings it has", () => {
  expect(valuesForFace(1)).toHaveLength(12);
  expect(valuesForFace(6)).toEqual(["X", "10", "9", "8", "7", "6", "M"]);
  expect(valuesForFace(5)).toContain("5");
  expect(valuesForFace(5)).not.toContain("4");
});

test("session times read 12-hour with FN before noon and AN after", () => {
  expect(formatSessionTime(new Date(2026, 8, 22, 9, 5).toISOString())).toBe(
    "9:05 FN"
  );
  expect(formatSessionTime(new Date(2026, 8, 22, 12, 30).toISOString())).toBe(
    "12:30 AN"
  );
  expect(formatSessionTime(new Date(2026, 8, 22, 0, 15).toISOString())).toBe(
    "12:15 FN"
  );
  expect(formatSessionTime(new Date(2026, 8, 22, 16, 45).toISOString())).toBe(
    "4:45 AN"
  );
});
