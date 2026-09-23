"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import Link from "next/link";
import { useMemo } from "react";

import type { Filters } from "@/components/filters/filters";
import { sessionsHref } from "@/components/sessions/sessions-href";
import {
  addDays,
  formatAverage,
  formatRoundFormat,
  formatShortDate,
} from "@/lib/format";

import { PerformanceEmpty } from "./performance-empty";
import type { PerformanceRow } from "./use-performance";
import { formatKey } from "./use-performance";

const DAYS_PER_WEEK = 7;

interface WeeklyLine {
  first: PerformanceRow;
  key: string;
  weeks: Map<string, PerformanceRow>;
}

/** Pivots week rows into one line per athlete per format. */
const pivot = (rows: PerformanceRow[]) => {
  const lines = new Map<string, WeeklyLine>();
  const weeks = new Set<string>();
  for (const row of rows) {
    // The weekly query always sets week_start; skip anything that did not.
    if (!row.week_start) {
      continue;
    }
    weeks.add(row.week_start);
    const key = formatKey(row);
    const line = lines.get(key) ?? { first: row, key, weeks: new Map() };
    line.weeks.set(row.week_start, row);
    lines.set(key, line);
  }
  return { lines: [...lines.values()], weeks: [...weeks].toSorted() };
};

const signedAverage = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  signDisplay: "exceptZero",
});

/** Change in average from the first week shot to the last. */
const weeklyChange = (line: WeeklyLine, weeks: string[]) => {
  const shot = weeks.filter((week) => line.weeks.has(week));
  const first = line.weeks.get(shot[0] ?? "");
  const last = line.weeks.get(shot.at(-1) ?? "");
  if (!first || !last || shot.length < 2) {
    return "—";
  }
  return signedAverage.format(last.avg_arrow - first.avg_arrow);
};

const WeekCell = ({
  filters,
  line,
  week,
}: {
  filters: Filters;
  line: WeeklyLine;
  week: string;
}) => {
  const row = line.weeks.get(week);
  if (!row) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <Link
      aria-label={`${line.first.athlete_name}, week of ${formatShortDate(week)}: average ${formatAverage(row.avg_arrow)} from ${row.arrows} arrows`}
      className="flex flex-col underline-offset-4 hover:underline"
      href={sessionsHref(filters, {
        athlete: line.first.athlete_id,
        distance: String(line.first.distance_id),
        face: String(line.first.target_face_id),
        from: week,
        range: "custom",
        to: addDays(week, DAYS_PER_WEEK - 1),
      })}
    >
      <span className="font-semibold tabular-nums">
        {formatAverage(row.avg_arrow)}
      </span>
      <span className="text-muted-foreground tabular-nums">
        {row.arrows} arrows
      </span>
    </Link>
  );
};

/** Average per arrow by ISO week (Monday start); each cell drills down. */
export const WeeklyTable = ({
  filters,
  rows,
}: {
  filters: Filters;
  rows: PerformanceRow[];
}) => {
  const { lines, weeks } = useMemo(() => pivot(rows), [rows]);
  if (lines.length === 0) {
    return <PerformanceEmpty />;
  }
  return (
    <div className="border tabular-nums">
      <Table aria-label="Weekly average per arrow">
        <TableHeader>
          <TableRow>
            <TableHead>Athlete</TableHead>
            {weeks.map((week) => (
              <TableHead key={week}>Week of {formatShortDate(week)}</TableHead>
            ))}
            <TableHead>Change</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line.key}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{line.first.athlete_name}</span>
                  <span className="text-muted-foreground">
                    {formatRoundFormat(
                      line.first.meters,
                      line.first.target_face_name
                    )}
                  </span>
                </div>
              </TableCell>
              {weeks.map((week) => (
                <TableCell key={week}>
                  <WeekCell filters={filters} line={line} week={week} />
                </TableCell>
              ))}
              <TableCell>{weeklyChange(line, weeks)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
