/// <reference types="bun" />

import { expect, test } from "bun:test";

import { renderToString } from "react-dom/server";

import { DataTable } from "./data-table";
import { createDataTableColumnHelper } from "./data-table-features";

interface Person {
  age: number;
  id: string;
  name: string;
}

const column = createDataTableColumnHelper<Person>();
const columns = column.columns([
  column.accessor("name", { header: "Name", sortFn: "text" }),
  column.accessor("age", { header: "Age", sortFn: "basic" }),
]);

const rows: Person[] = [
  { age: 30, id: "b", name: "Bravo" },
  { age: 20, id: "a", name: "Alpha" },
  { age: 40, id: "c", name: "Charlie" },
];

const render = (overrides?: {
  initialSorting?: { desc: boolean; id: string }[];
  pageSize?: number;
  rows?: Person[];
}) =>
  renderToString(
    <DataTable
      columns={columns}
      rows={overrides?.rows ?? rows}
      empty={<p>No people</p>}
      getRowId={(row) => row.id}
      label="People"
      {...(overrides?.initialSorting
        ? { initialSorting: overrides.initialSorting }
        : {})}
      {...(overrides?.pageSize === undefined
        ? {}
        : { pageSize: overrides.pageSize })}
    />
  );

test("renders rows in source order when unsorted", () => {
  const html = render();
  expect(html.indexOf("Bravo")).toBeLessThan(html.indexOf("Alpha"));
  expect(html.indexOf("Alpha")).toBeLessThan(html.indexOf("Charlie"));
});

test("applies the initial sorting to the row model", () => {
  const html = render({ initialSorting: [{ desc: true, id: "age" }] });
  expect(html.indexOf("Charlie")).toBeLessThan(html.indexOf("Bravo"));
  expect(html.indexOf("Bravo")).toBeLessThan(html.indexOf("Alpha"));
});

test("paginates the row model at the requested page size", () => {
  // Server rendering separates text nodes with comments; normalize first.
  const html = render({ pageSize: 2 }).replaceAll(/<!--.*?-->/gu, "");
  expect(html).toContain("Page 1 of 2");
  expect(html).toContain("Bravo");
  expect(html).toContain("Alpha");
  expect(html).not.toContain("Charlie");
});

test("renders the empty state instead of a table with no rows", () => {
  const html = render({ rows: [] });
  expect(html).toContain("No people");
  expect(html).not.toContain("<table");
});
