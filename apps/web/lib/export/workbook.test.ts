/// <reference types="bun" />

import { expect, test } from "bun:test";

import {
  AVERAGE_FORMAT,
  buildWorkbook,
  DATE_FORMAT,
  excelDate,
} from "./workbook";

test("export dates land on the same calendar day in Excel", () => {
  const date = excelDate("2026-09-01");
  expect(date?.getUTCFullYear()).toBe(2026);
  expect(date?.getUTCMonth()).toBe(8);
  expect(date?.getUTCDate()).toBe(1);
  expect(date?.getUTCHours()).toBe(0);
});

test("a missing date stays empty", () => {
  expect(excelDate(null)).toBeNull();
});

test("a built workbook reads back with typed cells and a frozen header", async () => {
  const { Workbook } = await import("exceljs");
  const buffer = await buildWorkbook([
    {
      columns: [
        {
          header: "Date",
          numFmt: DATE_FORMAT,
          value: (row) => excelDate(row.date),
        },
        { header: "Athlete", value: (row) => row.name },
        {
          header: "Avg / arrow",
          numFmt: AVERAGE_FORMAT,
          value: (row) => row.avg,
        },
      ],
      name: "Summary",
      rows: [{ avg: 8.77, date: "2026-09-22", name: "Aarav Sharma" }],
    },
  ]);
  const workbook = new Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet("Summary");
  expect(sheet?.getRow(1).values).toEqual([
    undefined,
    "Date",
    "Athlete",
    "Avg / arrow",
  ]);
  const date = sheet?.getCell("A2").value;
  expect(date instanceof Date ? date.toISOString().slice(0, 10) : date).toBe(
    "2026-09-22"
  );
  expect(sheet?.getCell("C2").value).toBe(8.77);
  expect(sheet?.getCell("C2").numFmt).toBe(AVERAGE_FORMAT);
  expect(sheet?.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
});
