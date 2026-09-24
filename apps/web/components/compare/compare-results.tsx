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
import type { ReactNode } from "react";

import { CompareTable } from "./compare-table";
import { DistributionTable } from "./distribution-table";
import type { Series } from "./series";
import type { Comparison } from "./use-compare";

const ChartSkeleton = () => <Skeleton className="h-80 w-full" />;

// Charting code only loads when a comparison has a chart to draw.
const TrendChart = dynamic(
  async () => {
    const { TrendChart: Chart } = await import("./trend-chart");
    return Chart;
  },
  { loading: ChartSkeleton, ssr: false }
);

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
  children: ReactNode;
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

/** Why there is nothing to show yet, or that it is on its way. */
export const CompareStatus = ({
  comparison,
  selected,
}: {
  comparison: Comparison;
  selected: number;
}) => {
  const { distribution, formats, summary, weekly } = comparison;
  if (summary.error ?? weekly.error ?? distribution.error) {
    // Results already on screen stay there; only the wording changes.
    return (
      <p className="text-destructive mb-4 text-sm" role="alert">
        {summary.data
          ? "Could not refresh the comparison. Showing the last loaded results."
          : "Could not load the comparison. Check your connection and try again."}
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

export const CompareResults = ({
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
