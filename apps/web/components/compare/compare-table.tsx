import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import type { PerformanceRow } from "@/components/performance/use-performance";
import {
  formatAverage,
  formatDate,
  formatInteger,
  formatPercent,
} from "@/lib/format";

import type { Series } from "./series";
import { SeriesKey } from "./series-key";

interface Metric {
  /** Which way is better, when a best value makes sense. */
  better?: "higher" | "lower";
  format: (row: PerformanceRow) => string;
  label: string;
  score?: (row: PerformanceRow) => number;
}

const METRICS: Metric[] = [
  { format: (row) => formatInteger(row.sessions), label: "Sessions" },
  { format: (row) => formatInteger(row.arrows), label: "Arrows" },
  {
    better: "higher",
    format: (row) => formatAverage(row.avg_arrow),
    label: "Average per arrow",
    score: (row) => row.avg_arrow,
  },
  {
    better: "higher",
    format: (row) => formatAverage(row.best_session_avg),
    label: "Best session average",
    score: (row) => row.best_session_avg,
  },
  {
    better: "higher",
    format: (row) => formatPercent(row.ten_plus_x_count, row.arrows),
    label: "10 + X rate",
    score: (row) => row.ten_plus_x_count / row.arrows,
  },
  {
    better: "higher",
    format: (row) => formatPercent(row.x_count, row.arrows),
    label: "X rate",
    score: (row) => row.x_count / row.arrows,
  },
  {
    better: "lower",
    format: (row) => formatPercent(row.miss_count, row.arrows),
    label: "Miss rate",
    score: (row) => row.miss_count / row.arrows,
  },
  { format: (row) => formatDate(row.last_session_date), label: "Last shot" },
];

/** The athlete ids holding the best value, when at least two can compare. */
const bestOf = (metric: Metric, rows: PerformanceRow[]) => {
  const { better, score } = metric;
  if (!(better && score) || rows.length < 2) {
    return new Set<string>();
  }
  const values = rows.map(score);
  const best = better === "higher" ? Math.max(...values) : Math.min(...values);
  return new Set(
    rows.flatMap((row) => (score(row) === best ? [row.athlete_id] : []))
  );
};

/** Metrics down the side, athletes across; the best value is marked. */
export const CompareTable = ({
  rows,
  series,
}: {
  rows: PerformanceRow[];
  series: Series[];
}) => {
  const rowOf = new Map(rows.map((row) => [row.athlete_id, row]));
  const compared = new Set(
    series.map((athleteSeries) => athleteSeries.athleteId)
  );
  const shooting = rows.filter((row) => compared.has(row.athlete_id));
  return (
    <div className="border tabular-nums">
      <Table>
        <TableCaption className="sr-only">Comparison by metric</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Metric</TableHead>
            {series.map((athleteSeries) => (
              <TableHead key={athleteSeries.key} scope="col">
                <span className="flex items-center gap-2">
                  <SeriesKey color={athleteSeries.color} />
                  {athleteSeries.name}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {METRICS.map((metric) => {
            const best = bestOf(metric, shooting);
            return (
              <TableRow key={metric.label}>
                <TableCell>{metric.label}</TableCell>
                {series.map((athleteSeries) => {
                  const row = rowOf.get(athleteSeries.athleteId);
                  if (!row) {
                    return (
                      <TableCell key={athleteSeries.key}>
                        <span className="text-muted-foreground">No arrows</span>
                      </TableCell>
                    );
                  }
                  const isBest = best.has(athleteSeries.athleteId);
                  return (
                    <TableCell key={athleteSeries.key}>
                      <span className="flex items-center gap-2">
                        <span className={isBest ? "font-semibold" : undefined}>
                          {metric.format(row)}
                        </span>
                        {isBest ? (
                          <Badge variant="secondary">Best</Badge>
                        ) : null}
                      </span>
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
