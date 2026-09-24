import { summarySheet, weeklySheet } from "@/components/export/sheets";
import type { PerformanceRow } from "@/components/performance/use-performance";
import { valuesForFace } from "@/components/sessions/arrow-values";
import type { SheetSpec } from "@/lib/export/workbook";
import { downloadWorkbook, PERCENT_FORMAT } from "@/lib/export/workbook";
import { toIsoDate } from "@/lib/format";

import type { Series } from "./series";
import type { DistributionRow } from "./use-compare";

interface RingRow {
  counts: Map<string, number>;
  value: string;
}

const distributionSheet = (
  rows: DistributionRow[],
  series: Series[],
  lowestScore: number
): SheetSpec<RingRow> => {
  const totals = new Map<string, number>();
  const counts = new Map<string, Map<string, number>>();
  for (const row of rows) {
    totals.set(row.athlete_id, (totals.get(row.athlete_id) ?? 0) + row.arrows);
    const byAthlete = counts.get(row.value) ?? new Map<string, number>();
    byAthlete.set(row.athlete_id, row.arrows);
    counts.set(row.value, byAthlete);
  }
  return {
    columns: [
      { header: "Ring", value: (row) => row.value, width: 8 },
      ...series.flatMap((athleteSeries) => [
        {
          header: `${athleteSeries.name} arrows`,
          value: (row: RingRow) => row.counts.get(athleteSeries.athleteId) ?? 0,
          width: 20,
        },
        {
          header: `${athleteSeries.name} share`,
          numFmt: PERCENT_FORMAT,
          value: (row: RingRow) => {
            const total = totals.get(athleteSeries.athleteId) ?? 0;
            return total
              ? (row.counts.get(athleteSeries.athleteId) ?? 0) / total
              : null;
          },
          width: 20,
        },
      ]),
    ],
    name: "Distribution",
    rows: valuesForFace(lowestScore).map((value) => ({
      counts: counts.get(value) ?? new Map(),
      value,
    })),
  };
};

/** The comparison as shown: totals, the weekly trend and ring shares. */
export const exportComparison = ({
  distribution,
  formatLabel,
  lowestScore,
  series,
  summary,
  weekly,
}: {
  distribution: DistributionRow[];
  formatLabel: string;
  lowestScore: number;
  series: Series[];
  summary: PerformanceRow[];
  weekly: PerformanceRow[];
}) =>
  downloadWorkbook(`quiver-comparison-${toIsoDate(new Date())}`, [
    {
      ...summarySheet(summary),
      name: `Comparison ${formatLabel}`.slice(0, 31),
    },
    weeklySheet(weekly),
    distributionSheet(distribution, series, lowestScore),
  ]);
