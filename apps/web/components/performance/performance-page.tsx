"use client";

import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";

import { useAthletes, useLookups } from "@/components/athletes/use-athletes";
import { FilterBar, FilterBarSkeleton } from "@/components/filters/filter-bar";
import {
  resetFilters,
  setFilters,
  updateSearchParams,
  useFilters,
} from "@/components/filters/use-filters";
import { StatGrid } from "@/components/stat-grid";

import { PerformanceStats } from "./performance-stats";
import { SummaryTable } from "./summary-table";
import { usePerformance } from "./use-performance";
import { WeeklyTable } from "./weekly-table";

const WEEKLY = "weekly";
const SUMMARY = "summary";

const TableSkeleton = () => (
  <div aria-busy="true" className="flex flex-col gap-2">
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-full" />
  </div>
);

export const PerformancePage = () => {
  const { filters, searchParams } = useFilters();
  const view = searchParams.get("view") === WEEKLY ? WEEKLY : SUMMARY;
  const performance = usePerformance(filters, view === WEEKLY);
  const athletes = useAthletes();
  const lookups = useLookups();
  const rows = performance.data;
  const showSummary = view === SUMMARY && rows !== undefined;
  const showWeekly = view === WEEKLY && rows !== undefined;

  return (
    <div>
      <FilterBar
        athletes={athletes.data}
        filters={filters}
        lookups={lookups.data}
        onChange={setFilters}
        onReset={resetFilters}
      />
      <PerformanceStats rows={rows} />
      <Tabs
        onValueChange={(next) =>
          updateSearchParams({ view: next === WEEKLY ? WEEKLY : null })
        }
        value={view}
      >
        <TabsList>
          <TabsTrigger value={SUMMARY}>Summary</TabsTrigger>
          <TabsTrigger value={WEEKLY}>Weekly</TabsTrigger>
        </TabsList>
        {performance.error ? (
          <p className="text-destructive text-sm" role="alert">
            {performance.error.message}
          </p>
        ) : null}
        <TabsContent aria-busy={performance.isFetching} value={SUMMARY}>
          {showSummary ? (
            <SummaryTable filters={filters} rows={rows ?? []} />
          ) : (
            <TableSkeleton />
          )}
        </TabsContent>
        <TabsContent aria-busy={performance.isFetching} value={WEEKLY}>
          {showWeekly ? (
            <WeeklyTable filters={filters} rows={rows ?? []} />
          ) : (
            <TableSkeleton />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

/** The page body while the URL's filters resolve; the header is static. */
export const PerformancePageSkeleton = () => (
  <div aria-busy="true">
    <FilterBarSkeleton />
    <StatGrid stats={null} />
    <Skeleton className="mb-2 h-8 w-40" />
    <TableSkeleton />
  </div>
);
