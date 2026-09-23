import {
  Table,
  TableBody,
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
      <Table aria-label="Where arrows land, by ring">
        <TableHeader>
          <TableRow>
            <TableHead>Ring</TableHead>
            {series.map((item) => (
              <TableHead key={item.key}>
                <span className="flex items-center gap-2">
                  <SeriesKey color={item.color} />
                  {item.name}
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
              {series.map((item) => {
                const count = counts.get(`${item.athleteId}:${value}`) ?? 0;
                const total = totals.get(item.athleteId) ?? 0;
                return (
                  <TableCell key={item.key}>
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
