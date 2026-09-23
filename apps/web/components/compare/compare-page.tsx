"use client";

import { UsersThreeIcon } from "@phosphor-icons/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { Skeleton } from "@workspace/ui/components/skeleton";
import dynamic from "next/dynamic";
import { useMemo } from "react";

import type { Lookups } from "@/components/athletes/use-athletes";
import { useAthletes, useLookups } from "@/components/athletes/use-athletes";
import { ExportButton } from "@/components/export/export-button";
import { FilterBar } from "@/components/filters/filter-bar";
import { FilterSelect } from "@/components/filters/filter-select";
import type { FilterKey, Filters } from "@/components/filters/filters";
import {
  resetFilters,
  setFilters,
  updateSearchParams,
  useFilters,
} from "@/components/filters/use-filters";
import { PageHeader } from "@/components/page-header";

import { AthletePicker } from "./athlete-picker";
import { CompareTable } from "./compare-table";
import { DistributionTable } from "./distribution-table";
import { exportComparison } from "./export-compare";
import type { RoundFormat } from "./selection";
import { formatParam, parseFormat, parseSlots, selectedIds } from "./selection";
import type { Series } from "./series";
import { buildSeries } from "./series";
import {
  formatsOf,
  useCompareSummary,
  useCompareWeekly,
  useScoreDistribution,
} from "./use-compare";

const ChartSkeleton = () => <Skeleton className="h-80 w-full" />;

// Charting code only loads when a comparison has a chart to draw.
const TrendChart = dynamic(
  async () => {
    const { TrendChart: Chart } = await import("./trend-chart");
    return Chart;
  },
  { loading: ChartSkeleton, ssr: false }
);

// Compare chooses its own athletes and round format.
const HIDDEN_FILTERS: FilterKey[] = ["athlete", "distance", "face"];

const PickAthletes = () => (
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <UsersThreeIcon aria-hidden="true" />
      </EmptyMedia>
      <EmptyTitle>Pick athletes to compare</EmptyTitle>
      <EmptyDescription>
        Choose up to six. They are compared on one round format at a time, so
        averages stay like for like.
      </EmptyDescription>
    </EmptyHeader>
  </Empty>
);

const NoSharedArrows = () => (
  <Empty>
    <EmptyHeader>
      <EmptyTitle>No arrows in this date range</EmptyTitle>
      <EmptyDescription>
        None of these athletes shot in the selected range. Widen the dates or
        clear a filter.
      </EmptyDescription>
    </EmptyHeader>
  </Empty>
);

const Section = ({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

type Comparison = ReturnType<typeof useComparison>;

/** The comparison's data: which format, and every query behind it. */
const useComparison = (
  filters: Filters,
  ids: string[],
  requested: RoundFormat | null,
  lookups: Lookups | undefined
) => {
  const summary = useCompareSummary(filters, ids);
  const formats = useMemo(() => formatsOf(summary.data ?? []), [summary.data]);
  const option =
    formats.find(
      (item) =>
        item.format.distanceId === requested?.distanceId &&
        item.format.faceId === requested.faceId
    ) ?? formats[0];
  const format = option?.format ?? null;
  const weekly = useCompareWeekly(filters, ids, format);
  const distribution = useScoreDistribution(filters, ids, format);
  const formatRows = (summary.data ?? []).filter(
    (row) =>
      row.distance_id === format?.distanceId &&
      row.target_face_id === format.faceId
  );
  const lowestScore =
    lookups?.targetFaces.find((face) => face.id === format?.faceId)
      ?.lowest_score ?? 1;
  return {
    distribution,
    formatRows,
    formats,
    lowestScore,
    option,
    summary,
    weekly,
  };
};

const FormatPicker = ({
  comparison,
  selected,
}: {
  comparison: Comparison;
  selected: number;
}) => {
  const { formats, option } = comparison;
  if (!option) {
    return null;
  }
  return (
    <FilterSelect
      className="w-56"
      items={formats.map((item) => ({
        label: `${item.label} (${item.athletes} of ${selected})`,
        value: formatParam(item.format),
      }))}
      label="Round format"
      onChange={(value) => updateSearchParams({ format: value })}
      value={formatParam(option.format)}
    />
  );
};

/** Why there is nothing to show yet, or that it is on its way. */
const CompareStatus = ({
  comparison,
  selected,
}: {
  comparison: Comparison;
  selected: number;
}) => {
  const { distribution, formats, summary, weekly } = comparison;
  if (summary.error ?? weekly.error ?? distribution.error) {
    return (
      <p className="text-destructive mb-4 text-sm" role="alert">
        Could not load the comparison. Check your connection and try again.
      </p>
    );
  }
  if (selected === 0) {
    return <PickAthletes />;
  }
  if (summary.isPending) {
    return <Skeleton aria-busy="true" className="h-96 w-full" />;
  }
  return formats.length === 0 ? <NoSharedArrows /> : null;
};

const CompareResults = ({
  comparison,
  series,
}: {
  comparison: Comparison;
  series: Series[];
}) => {
  const { distribution, formatRows, lowestScore, option, summary, weekly } =
    comparison;
  if (!option) {
    return null;
  }
  const fetching =
    summary.isFetching || weekly.isFetching || distribution.isFetching;
  return (
    <div aria-busy={fetching} className="flex flex-col gap-6">
      <Section
        description={`Weekly average per arrow at ${option.label}. Gaps are weeks without shooting.`}
        title="Trend"
      >
        {weekly.data ? (
          <TrendChart rows={weekly.data} series={series} />
        ) : (
          <ChartSkeleton />
        )}
      </Section>
      <Section
        description="Totals for the date range. The best value in each row is marked."
        title="Side by side"
      >
        <CompareTable rows={formatRows} series={series} />
      </Section>
      <Section
        description="Share of each athlete’s arrows in each ring, with the arrow count."
        title="Where arrows land"
      >
        {distribution.data ? (
          <DistributionTable
            lowestScore={lowestScore}
            rows={distribution.data}
            series={series}
          />
        ) : (
          <Skeleton className="h-64 w-full" />
        )}
      </Section>
    </div>
  );
};

export const ComparePage = () => {
  const { filters, searchParams } = useFilters();
  const slots = useMemo(
    () => parseSlots(searchParams.get("athletes")),
    [searchParams]
  );
  const ids = useMemo(() => selectedIds(slots), [slots]);
  const athletes = useAthletes();
  const lookups = useLookups();
  const series = useMemo(
    () => buildSeries(slots, athletes.data),
    [slots, athletes.data]
  );
  const comparison = useComparison(
    filters,
    ids,
    parseFormat(searchParams.get("format")),
    lookups.data
  );
  const { distribution, formatRows, lowestScore, option, weekly } = comparison;

  return (
    <div>
      <PageHeader
        action={
          <ExportButton
            disabled={!(option && weekly.data && distribution.data)}
            onExport={() =>
              exportComparison({
                distribution: distribution.data ?? [],
                formatLabel: option?.label ?? "",
                lowestScore,
                series,
                summary: formatRows,
                weekly: weekly.data ?? [],
              })
            }
          />
        }
        description="Put athletes side by side on the same round format: totals, the weekly trend and where their arrows land."
        title="Compare"
      />
      <FilterBar
        athletes={athletes.data}
        filters={filters}
        hidden={HIDDEN_FILTERS}
        lookups={lookups.data}
        onChange={setFilters}
        onReset={resetFilters}
      />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <AthletePicker athletes={athletes.data} series={series} slots={slots} />
        <FormatPicker comparison={comparison} selected={ids.length} />
      </div>
      <CompareStatus comparison={comparison} selected={ids.length} />
      <CompareResults comparison={comparison} series={series} />
    </div>
  );
};
