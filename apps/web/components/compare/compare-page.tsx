"use client";

import { Skeleton } from "@workspace/ui/components/skeleton";

import { ExportButton } from "@/components/export/export-button";
import { FilterBar, FilterBarSkeleton } from "@/components/filters/filter-bar";
import { FilterSelect } from "@/components/filters/filter-select";
import type { FilterKey } from "@/components/filters/filters";
import {
  resetFilters,
  setFilters,
  updateSearchParams,
} from "@/components/filters/use-filters";

import { AthletePicker } from "./athlete-picker";
import { CompareResults, CompareStatus } from "./compare-results";
import { exportComparison } from "./export-compare";
import { formatParam } from "./selection";
import type { Comparison } from "./use-compare";
import { useCompareSelection } from "./use-compare-selection";

// Compare chooses its own athletes and round format.
const HIDDEN_FILTERS: FilterKey[] = ["athlete", "distance", "face"];

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
      items={formats.map((formatOption) => ({
        label: `${formatOption.label} (${formatOption.athletes} of ${selected})`,
        value: formatParam(formatOption.format),
      }))}
      label="Round format"
      onChange={(value) => updateSearchParams({ format: value })}
      value={formatParam(option.format)}
    />
  );
};

/** Exports the comparison on screen; lives in the page's static header. */
export const CompareExportButton = () => {
  const { comparison, series } = useCompareSelection();
  const { distribution, formatRows, lowestScore, option, weekly } = comparison;
  return (
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
  );
};

export const ComparePage = () => {
  const { athletes, comparison, filters, ids, lookups, series, slots } =
    useCompareSelection();

  return (
    <div>
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

/** The page body while the URL's selection resolves; the header is static. */
export const ComparePageSkeleton = () => (
  <div aria-busy="true">
    <FilterBarSkeleton />
    <Skeleton className="mb-6 h-8 w-80" />
    <Skeleton className="h-96 w-full" />
  </div>
);
