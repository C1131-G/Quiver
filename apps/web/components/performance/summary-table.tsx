"use client";

import Link from "next/link";
import { useMemo } from "react";

import { DataTable } from "@/components/data-table/data-table";
import { createDataTableColumnHelper } from "@/components/data-table/data-table-features";
import type { Filters } from "@/components/filters/filters";
import { sessionsHref } from "@/components/sessions/sessions-href";
import {
  formatAverage,
  formatDate,
  formatInteger,
  formatPercent,
  formatRoundFormat,
} from "@/lib/format";

import { PerformanceEmpty } from "./performance-empty";
import type { PerformanceRow } from "./use-performance";
import { formatKey } from "./use-performance";

const column = createDataTableColumnHelper<PerformanceRow>();

const numeric = (value: string) => (
  <span className="tabular-nums">{value}</span>
);

const buildColumns = (filters: Filters) =>
  column.columns([
    column.accessor("athlete_name", {
      cell: ({ row }) => (
        <div className="flex flex-col">
          <Link
            className="font-medium underline-offset-4 hover:underline"
            href={sessionsHref(filters, {
              athlete: row.original.athlete_id,
              distance: String(row.original.distance_id),
              face: String(row.original.target_face_id),
            })}
          >
            {row.original.athlete_name}
          </Link>
          <span className="text-muted-foreground font-mono">
            {row.original.id_no}
          </span>
        </div>
      ),
      header: "Athlete",
      sortFn: "text",
    }),
    column.accessor((row) => `${row.category_name} · ${row.event_name}`, {
      header: "Category",
      id: "category",
      sortFn: "text",
    }),
    column.accessor("meters", {
      cell: ({ row }) =>
        formatRoundFormat(row.original.meters, row.original.target_face_name),
      header: "Format",
      sortFn: "basic",
    }),
    column.accessor("sessions", {
      cell: (cell) => numeric(formatInteger(cell.getValue())),
      header: "Sessions",
      sortFn: "basic",
    }),
    column.accessor("arrows", {
      cell: (cell) => numeric(formatInteger(cell.getValue())),
      header: "Arrows",
      sortFn: "basic",
    }),
    column.accessor("avg_arrow", {
      cell: (cell) => (
        <span className="font-semibold tabular-nums">
          {formatAverage(cell.getValue())}
        </span>
      ),
      header: "Avg / arrow",
      sortFn: "basic",
    }),
    column.accessor("best_session_avg", {
      cell: (cell) => numeric(formatAverage(cell.getValue())),
      header: "Best session",
      sortFn: "basic",
    }),
    column.accessor((row) => row.ten_plus_x_count / row.arrows, {
      cell: ({ row }) =>
        numeric(
          formatPercent(row.original.ten_plus_x_count, row.original.arrows)
        ),
      header: "10 + X",
      id: "ten_plus_x",
      sortFn: "basic",
    }),
    column.accessor((row) => row.x_count / row.arrows, {
      cell: ({ row }) =>
        numeric(formatPercent(row.original.x_count, row.original.arrows)),
      header: "X",
      id: "x",
      sortFn: "basic",
    }),
    column.accessor("miss_count", {
      cell: (cell) => numeric(formatInteger(cell.getValue())),
      header: "Misses",
      sortFn: "basic",
    }),
    column.accessor("last_session_date", {
      cell: (cell) => formatDate(cell.getValue()),
      header: "Last shot",
      sortFn: "text",
    }),
  ]);

/** Totals per athlete per round format; names drill into their sessions. */
export const SummaryTable = ({
  filters,
  rows,
}: {
  filters: Filters;
  rows: PerformanceRow[];
}) => {
  const columns = useMemo(() => buildColumns(filters), [filters]);
  return (
    <DataTable
      columns={columns}
      data={rows}
      empty={<PerformanceEmpty />}
      getRowId={formatKey}
      initialSorting={[{ desc: true, id: "avg_arrow" }]}
      label="Performance by athlete and round format"
      pageSize={25}
    />
  );
};
