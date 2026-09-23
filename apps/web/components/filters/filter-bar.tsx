"use client";

import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { useMemo } from "react";

import type { AthleteRow, Lookups } from "@/components/athletes/use-athletes";

import type { FilterOption } from "./filter-select";
import { FilterSelect } from "./filter-select";
import type { Filters } from "./filters";
import { ALL, isFiltered, RANGE_PRESETS } from "./filters";

const withAll = (label: string, options: FilterOption[]) => [
  { label, value: ALL },
  ...options,
];

const RANGE_ITEMS: FilterOption[] = RANGE_PRESETS.map(({ label, value }) => ({
  label,
  value,
}));
const TYPE_ITEMS = withAll("All session types", [
  { label: "Training", value: "training" },
  { label: "Competition", value: "competition" },
]);
const VENUE_ITEMS = withAll("Indoor and outdoor", [
  { label: "Indoor", value: "indoor" },
  { label: "Outdoor", value: "outdoor" },
]);
const GENDER_ITEMS = withAll("All genders", [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
]);

const useFilterOptions = (
  lookups: Lookups | undefined,
  athletes: AthleteRow[] | undefined
) =>
  useMemo(
    () => ({
      athletes: withAll(
        "All athletes",
        (athletes ?? []).map((athlete) => ({
          label: `${athlete.full_name} (${athlete.id_no})`,
          value: athlete.id,
        }))
      ),
      categories: withAll(
        "All categories",
        (lookups?.categories ?? []).map((row) => ({
          label: row.name,
          value: String(row.id),
        }))
      ),
      distances: withAll(
        "All distances",
        (lookups?.distances ?? []).map((row) => ({
          label: `${row.meters} m`,
          value: String(row.id),
        }))
      ),
      events: withAll(
        "All events",
        (lookups?.events ?? []).map((row) => ({
          label: row.name,
          value: String(row.id),
        }))
      ),
      faces: withAll(
        "All target faces",
        (lookups?.targetFaces ?? []).map((row) => ({
          label: row.name,
          value: String(row.id),
        }))
      ),
    }),
    [athletes, lookups]
  );

/** One filter row shared by the dashboard and the sessions list. */
export const FilterBar = ({
  athletes,
  filters,
  lookups,
  onChange,
  onReset,
}: {
  athletes: AthleteRow[] | undefined;
  filters: Filters;
  lookups: Lookups | undefined;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
}) => {
  const options = useFilterOptions(lookups, athletes);
  const set = (key: keyof Filters) => (value: string) =>
    onChange({ [key]: value });

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <FilterSelect
        items={RANGE_ITEMS}
        label="Date range"
        onChange={set("range")}
        value={filters.range}
      />
      {filters.range === "custom" ? (
        <>
          <Input
            aria-label="From date"
            className="w-40"
            max={filters.to || undefined}
            onChange={(event) => onChange({ from: event.target.value })}
            type="date"
            value={filters.from}
          />
          <Input
            aria-label="To date"
            className="w-40"
            min={filters.from || undefined}
            onChange={(event) => onChange({ to: event.target.value })}
            type="date"
            value={filters.to}
          />
        </>
      ) : null}
      <FilterSelect
        className="w-60"
        items={options.athletes}
        label="Filter by athlete"
        onChange={set("athlete")}
        value={filters.athlete}
      />
      <FilterSelect
        items={options.categories}
        label="Filter by category"
        onChange={set("category")}
        value={filters.category}
      />
      <FilterSelect
        items={options.events}
        label="Filter by event"
        onChange={set("event")}
        value={filters.event}
      />
      <FilterSelect
        className="w-36"
        items={options.distances}
        label="Filter by distance"
        onChange={set("distance")}
        value={filters.distance}
      />
      <FilterSelect
        items={options.faces}
        label="Filter by target face"
        onChange={set("face")}
        value={filters.face}
      />
      <FilterSelect
        items={TYPE_ITEMS}
        label="Filter by session type"
        onChange={set("type")}
        value={filters.type}
      />
      <FilterSelect
        items={VENUE_ITEMS}
        label="Filter by venue"
        onChange={set("venue")}
        value={filters.venue}
      />
      <FilterSelect
        className="w-36"
        items={GENDER_ITEMS}
        label="Filter by gender"
        onChange={set("gender")}
        value={filters.gender}
      />
      {isFiltered(filters) ? (
        <Button onClick={onReset} variant="ghost">
          <ArrowCounterClockwiseIcon
            aria-hidden="true"
            data-icon="inline-start"
          />
          Reset filters
        </Button>
      ) : null}
    </div>
  );
};
