import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import { ArrowValue } from "@/components/sessions/arrow-value";
import { valuesForFace } from "@/components/sessions/arrow-values";
import { formatPercent } from "@/lib/format";

import type { Series } from "./series";
import { SeriesKey } from "./series-key";
import type { DistributionRow } from "./use-compare";

/** Share of each athlete's arrows landing in each ring of the face. */
export const DistributionTable = ({
  lowestScore,
  rows,
  series,
}: {
  lowestScore: number;
  rows: DistributionRow[];
  series: Series[];
}) => {
  const counts = new Map<string, number>();
  const totals = new Map<string, number>();
  for (const row of rows) {
    counts.set(`${row.athlete_id}:${row.value}`, row.arrows);
    totals.set(row.athlete_id, (totals.get(row.athlete_id) ?? 0) + row.arrows);
  }
  return (
    <div className="border tabular-nums">
      <Table>
        <TableCaption className="sr-only">
          Where arrows land, by ring
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Ring</TableHead>
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
          {valuesForFace(lowestScore).map((value) => (
            <TableRow key={value}>
              <TableCell>
                <ArrowValue className="size-6" value={value} />
                {value === "M" ? <span className="sr-only">Miss</span> : null}
              </TableCell>
              {series.map((athleteSeries) => {
                const count =
                  counts.get(`${athleteSeries.athleteId}:${value}`) ?? 0;
                const total = totals.get(athleteSeries.athleteId) ?? 0;
                return (
                  <TableCell key={athleteSeries.key}>
                    {formatPercent(count, total)}
                    <span className="text-muted-foreground"> · {count}</span>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
