import type { Stat } from "@/components/stat-grid";
import { StatGrid } from "@/components/stat-grid";
import { formatAverage, formatInteger, formatPercent } from "@/lib/format";

import type { PerformanceRow } from "./use-performance";

const summarize = (rows: PerformanceRow[]): Stat[] => {
  let arrows = 0;
  let points = 0;
  let tenPlusX = 0;
  let xCount = 0;
  const athletes = new Set<string>();
  for (const row of rows) {
    arrows += row.arrows;
    points += row.total_points;
    tenPlusX += row.ten_plus_x_count;
    xCount += row.x_count;
    athletes.add(row.athlete_id);
  }
  return [
    { label: "Athletes", value: formatInteger(athletes.size) },
    { label: "Arrows shot", value: formatInteger(arrows) },
    {
      label: "Average per arrow",
      value: formatAverage(arrows > 0 ? points / arrows : null),
    },
    { label: "10 + X rate", value: formatPercent(tenPlusX, arrows) },
    { label: "X rate", value: formatPercent(xCount, arrows) },
  ];
};

/** Headline totals for whatever the filters currently select. */
export const PerformanceStats = ({
  rows,
}: {
  rows: PerformanceRow[] | undefined;
}) => <StatGrid stats={rows ? summarize(rows) : null} />;
