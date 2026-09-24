import type { Workbook } from "exceljs";
import { z } from "zod";

export interface SheetColumn<T> {
  header: string;
  /** Excel number format, e.g. "0.00" or "0.0%". */
  numFmt?: string;
  value: (row: T) => Date | number | string | null;
  width?: number;
}

export interface SheetSpec<T> {
  columns: SheetColumn<T>[];
  name: string;
  rows: T[];
}

export const DATE_FORMAT = "yyyy-mm-dd";
export const AVERAGE_FORMAT = "0.00";
export const PERCENT_FORMAT = "0.0%";

const DEFAULT_WIDTH = 14;
const HEADER_ROW = 1;
const REVOKE_DELAY_MS = 10_000;

/**
 * A Postgres `date` as an Excel date. ExcelJS converts through UTC, so the
 * day is built at UTC midnight or it would shift in time zones east of UTC.
 */
export const excelDate = (value: string | null) => {
  if (value === null) {
    return null;
  }
  const date = z.iso.date().parse(value);
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
};

const addSheet = <T>(workbook: Workbook, spec: SheetSpec<T>) => {
  const sheet = workbook.addWorksheet(spec.name, {
    views: [{ state: "frozen", ySplit: HEADER_ROW }],
  });
  sheet.columns = spec.columns.map((column, index) => ({
    header: column.header,
    key: String(index),
    style: column.numFmt ? { numFmt: column.numFmt } : {},
    width: column.width ?? DEFAULT_WIDTH,
  }));
  sheet.getRow(HEADER_ROW).font = { bold: true };
  for (const row of spec.rows) {
    sheet.addRow(spec.columns.map((column) => column.value(row)));
  }
  if (spec.rows.length > 0) {
    sheet.autoFilter = {
      from: { column: 1, row: HEADER_ROW },
      to: { column: spec.columns.length, row: HEADER_ROW },
    };
  }
};

/** One sheet per row type, each checked against its own columns. */
type Sheets<Rows extends readonly unknown[]> = {
  [Index in keyof Rows]: SheetSpec<Rows[Index]>;
};

/** The .xlsx file's bytes. ExcelJS loads only when something is exported. */
export const buildWorkbook = async <Rows extends readonly unknown[]>(
  sheets: Sheets<Rows>
) => {
  const { Workbook: ExcelWorkbook } = await import("exceljs");
  const workbook = new ExcelWorkbook();
  workbook.creator = "Quiver Dashboard";
  workbook.created = new Date();
  for (const sheet of sheets) {
    addSheet(workbook, sheet);
  }
  return workbook.xlsx.writeBuffer();
};

/**
 * Builds the workbook and hands it to the browser as a download. In the
 * desktop app Electron shows its save dialog for it.
 */
export const downloadWorkbook = async <Rows extends readonly unknown[]>(
  filename: string,
  sheets: Sheets<Rows>
) => {
  const buffer = await buildWorkbook(sheets);
  const url = URL.createObjectURL(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.xlsx`;
  link.click();
  // Revoking in the same task can cancel the download before it starts.
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
};
