"use client";

import type { ChartConfig } from "@workspace/ui/components/chart";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart";
import { useMemo } from "react";
// This module is only loaded through next/dynamic (see compare-page.tsx),
// so recharts never ships in the initial bundle.
// oxlint-disable-next-line react-doctor/prefer-dynamic-import
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import type { PerformanceRow } from "@/components/performance/use-performance";
import { formatAverage, formatShortDate } from "@/lib/format";

import type { Series } from "./series";

/** Past this many lines, labels on the lines crowd; the legend carries them. */
const MAX_DIRECT_LABELS = 4;
const Y_PADDING = 0.2;

type TrendPoint = Record<string, number | string | null>;

/** One point per week, one key per compared athlete. */
const toPoints = (rows: PerformanceRow[], series: Series[]) => {
  const keyOf = new Map(series.map((item) => [item.athleteId, item.key]));
  const weeks = new Map<string, TrendPoint>();
  for (const row of rows) {
    const key = keyOf.get(row.athlete_id);
    if (!(key && row.week_start)) {
      continue;
    }
    const point = weeks.get(row.week_start) ?? {
      label: `Week of ${formatShortDate(row.week_start)}`,
      week: row.week_start,
    };
    point[key] = row.avg_arrow;
    weeks.set(row.week_start, point);
  }
  return [...weeks.values()].toSorted((a, b) =>
    String(a.week).localeCompare(String(b.week))
  );
};

/** Index of the last week each athlete shot, where its label goes. */
const lastPointIndex = (points: TrendPoint[], key: string) =>
  points.findLastIndex((point) => key in point);

export const TrendChart = ({
  rows,
  series,
}: {
  rows: PerformanceRow[];
  series: Series[];
}) => {
  const points = useMemo(() => toPoints(rows, series), [rows, series]);
  const config = useMemo(
    () =>
      Object.fromEntries(
        series.map((item) => [
          item.key,
          {
            label: item.name,
            theme: { dark: item.color.dark, light: item.color.light },
          },
        ])
      ) satisfies ChartConfig,
    [series]
  );
  const directLabels = series.length <= MAX_DIRECT_LABELS;

  return (
    <figure>
      <figcaption className="sr-only">
        Average per arrow by week for each compared athlete. The same numbers
        are in the tables below and in the Excel export.
      </figcaption>
      <ChartContainer className="aspect-auto h-80 w-full" config={config}>
        <LineChart
          data={points}
          margin={{ bottom: 4, left: 4, right: 96, top: 12 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="week"
            tickFormatter={(week: string) => formatShortDate(week)}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis
            axisLine={false}
            domain={[
              (min: number) =>
                Math.max(0, Math.floor((min - Y_PADDING) * 10) / 10),
              (max: number) =>
                Math.min(10, Math.ceil((max + Y_PADDING) * 10) / 10),
            ]}
            tickFormatter={(value: number) => formatAverage(value)}
            tickLine={false}
            width={40}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                indicator="line"
                labelFormatter={(_, payload) =>
                  String(payload?.[0]?.payload?.label ?? "")
                }
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          {series.map((item) => {
            const last = lastPointIndex(points, item.key);
            return (
              <Line
                activeDot={{ r: 5 }}
                dataKey={item.key}
                dot={{
                  fill: `var(--color-${item.key})`,
                  r: 4,
                  stroke: "var(--card)",
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
                key={item.key}
                name={item.key}
                stroke={`var(--color-${item.key})`}
                strokeWidth={2}
                type="linear"
              >
                {directLabels ? (
                  <LabelList
                    className="fill-foreground"
                    dataKey={item.key}
                    offset={10}
                    position="right"
                    // Only the last week each athlete shot carries its name.
                    valueAccessor={(_entry, index) =>
                      index === last ? item.name : null
                    }
                  />
                ) : null}
              </Line>
            );
          })}
        </LineChart>
      </ChartContainer>
    </figure>
  );
};
