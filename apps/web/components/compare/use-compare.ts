"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { Filters } from "@/components/filters/filters";
import { ALL, toArrowFilterArgs } from "@/components/filters/filters";
import type { PerformanceRow } from "@/components/performance/use-performance";
import { formatRoundFormat } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetch-all";

import type { RoundFormat } from "./selection";

const COMPARE_KEY = ["compare"] as const;

/**
 * The page filters for the chosen athletes. Athlete, distance and face come
 * from the comparison itself, never from the shared filter row.
 */
const compareArgs = (
  filters: Filters,
  athleteIds: string[],
  format: RoundFormat | null
) => ({
  ...toArrowFilterArgs({ ...filters, athlete: ALL, distance: ALL, face: ALL }),
  p_athlete_ids: athleteIds,
  p_distance_ids: format ? [format.distanceId] : undefined,
  p_target_face_ids: format ? [format.faceId] : undefined,
});

const fetchPerformanceRows = (
  filters: Filters,
  athleteIds: string[],
  format: RoundFormat | null,
  byWeek: boolean
) => {
  const supabase = createClient();
  return fetchAllRows((start, end) =>
    supabase
      .rpc("athlete_performance", {
        ...compareArgs(filters, athleteIds, format),
        p_by_week: byWeek,
      })
      .range(start, end)
  );
};

/** Every format the athletes shot, so the page can offer a common one. */
export const useCompareSummary = (filters: Filters, athleteIds: string[]) =>
  useQuery({
    enabled: athleteIds.length > 0,
    placeholderData: keepPreviousData,
    queryFn: () => fetchPerformanceRows(filters, athleteIds, null, false),
    queryKey: [...COMPARE_KEY, "summary", filters, athleteIds],
  });

export const useCompareWeekly = (
  filters: Filters,
  athleteIds: string[],
  format: RoundFormat | null
) =>
  useQuery({
    enabled: athleteIds.length > 0 && format !== null,
    placeholderData: keepPreviousData,
    queryFn: () => fetchPerformanceRows(filters, athleteIds, format, true),
    queryKey: [...COMPARE_KEY, "weekly", filters, athleteIds, format],
  });

const fetchDistribution = (
  filters: Filters,
  athleteIds: string[],
  format: RoundFormat | null
) => {
  const supabase = createClient();
  return fetchAllRows((start, end) =>
    supabase
      .rpc("score_distribution", compareArgs(filters, athleteIds, format))
      .range(start, end)
  );
};

export type DistributionRow = Awaited<
  ReturnType<typeof fetchDistribution>
>[number];

export const useScoreDistribution = (
  filters: Filters,
  athleteIds: string[],
  format: RoundFormat | null
) =>
  useQuery({
    enabled: athleteIds.length > 0 && format !== null,
    placeholderData: keepPreviousData,
    queryFn: () => fetchDistribution(filters, athleteIds, format),
    queryKey: [...COMPARE_KEY, "distribution", filters, athleteIds, format],
  });

export interface FormatOption {
  athletes: number;
  arrows: number;
  format: RoundFormat;
  label: string;
}

/**
 * Formats the selected athletes shot, most shared first, so the default is
 * the one where the comparison covers the most athletes.
 */
export const formatsOf = (rows: PerformanceRow[]): FormatOption[] => {
  const options = new Map<string, FormatOption>();
  for (const row of rows) {
    const key = `${row.distance_id}-${row.target_face_id}`;
    const option = options.get(key) ?? {
      arrows: 0,
      athletes: 0,
      format: { distanceId: row.distance_id, faceId: row.target_face_id },
      label: formatRoundFormat(row.meters, row.target_face_name),
    };
    option.arrows += row.arrows;
    option.athletes += 1;
    options.set(key, option);
  }
  return [...options.values()].toSorted(
    (a, b) => b.athletes - a.athletes || b.arrows - a.arrows
  );
};
