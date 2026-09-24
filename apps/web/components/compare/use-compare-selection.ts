"use client";

import { useMemo } from "react";

import { useAthletes, useLookups } from "@/components/athletes/use-athletes";
import { useFilters } from "@/components/filters/use-filters";

import { parseFormat, parseSlots, selectedIds } from "./selection";
import { buildSeries } from "./series";
import { useComparison } from "./use-compare";

/**
 * Everything the Compare page shows, read from the URL. The page body and
 * its header's export button both call this; the queries are shared.
 */
export const useCompareSelection = () => {
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
  return { athletes, comparison, filters, ids, lookups, series, slots };
};
