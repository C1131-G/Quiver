"use client";

import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from "@tanstack/react-query";
import { useMemo } from "react";

import type { Lookups } from "@/components/athletes/use-athletes";
import type { Filters } from "@/components/filters/filters";
import { ALL, toArrowFilterArgs } from "@/components/filters/filters";
import type { PerformanceRow } from "@/components/performance/use-performance";
import { formatRoundFormat } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import {
  distributionRowSchema,
  parseRows,
  performanceRowSchema,
} from "@/lib/supabase/rpc-rows";

import type { RoundFormat } from "./selection";

export const compareKeys = {
  all: ["compare"] as const,
  distribution: (
    filters: Filters,
    athleteIds: string[],
    format: RoundFormat | null
  ) =>
    [...compareKeys.all, "distribution", filters, athleteIds, format] as const,
  summary: (filters: Filters, athleteIds: string[]) =>
    [...compareKeys.all, "summary", filters, athleteIds] as const,
  weekly: (
    filters: Filters,
    athleteIds: string[],
    format: RoundFormat | null
  ) => [...compareKeys.all, "weekly", filters, athleteIds, format] as const,
};

/**
 * The page filters for the chosen athletes. Athlete, distance and face come
 * from the comparison itself, never from the shared filter row.
 */
const compareArgs = (
  filters: Filters,
  athleteIds: string[],
  format: RoundFormat | null
) => {
  const args = toArrowFilterArgs({
    ...filters,
    athlete: ALL,
    distance: ALL,
    face: ALL,
  });
  args.p_athlete_ids = athleteIds;
  if (format) {
    args.p_distance_ids = [format.distanceId];
    args.p_target_face_ids = [format.faceId];
  }
  return args;
};

const parsePerformanceRows = parseRows(performanceRowSchema);
const parseDistributionRows = parseRows(distributionRowSchema);

const fetchPerformanceRows = async (
  filters: Filters,
  athleteIds: string[],
  format: RoundFormat | null,
  byWeek: boolean
) => {
  const supabase = createClient();
  const rows = await fetchAllRows((start, end) =>
    supabase
      .rpc("athlete_performance", {
        ...compareArgs(filters, athleteIds, format),
        p_by_week: byWeek,
      })
      .range(start, end)
  );
  return parsePerformanceRows(rows);
};

const fetchDistribution = async (
  filters: Filters,
  athleteIds: string[],
  format: RoundFormat | null
) => {
  const supabase = createClient();
  const rows = await fetchAllRows((start, end) =>
    supabase
      .rpc("score_distribution", compareArgs(filters, athleteIds, format))
      .range(start, end)
  );
  return parseDistributionRows(rows);
};

export type DistributionRow = Awaited<
  ReturnType<typeof fetchDistribution>
>[number];

/** Every format the athletes shot, so the page can offer a common one. */
export const compareSummaryQuery = (filters: Filters, athleteIds: string[]) =>
  queryOptions({
    enabled: athleteIds.length > 0,
    placeholderData: keepPreviousData,
    queryFn: () => fetchPerformanceRows(filters, athleteIds, null, false),
    queryKey: compareKeys.summary(filters, athleteIds),
  });

export const compareWeeklyQuery = (
  filters: Filters,
  athleteIds: string[],
  format: RoundFormat | null
) =>
  queryOptions({
    enabled: athleteIds.length > 0 && format !== null,
    placeholderData: keepPreviousData,
    queryFn: () => fetchPerformanceRows(filters, athleteIds, format, true),
    queryKey: compareKeys.weekly(filters, athleteIds, format),
  });

export const scoreDistributionQuery = (
  filters: Filters,
  athleteIds: string[],
  format: RoundFormat | null
) =>
  queryOptions({
    enabled: athleteIds.length > 0 && format !== null,
    placeholderData: keepPreviousData,
    queryFn: () => fetchDistribution(filters, athleteIds, format),
    queryKey: compareKeys.distribution(filters, athleteIds, format),
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
    (optionA, optionB) =>
      optionB.athletes - optionA.athletes || optionB.arrows - optionA.arrows
  );
};

const sameFormat = (formatA: RoundFormat, formatB: RoundFormat | null) =>
  formatA.distanceId === formatB?.distanceId &&
  formatA.faceId === formatB.faceId;

export type Comparison = ReturnType<typeof useComparison>;

/** The comparison's data: which format, and every query behind it. */
export const useComparison = (
  filters: Filters,
  ids: string[],
  requested: RoundFormat | null,
  lookups: Lookups | undefined
) => {
  const summary = useQuery(compareSummaryQuery(filters, ids));
  const formats = useMemo(() => formatsOf(summary.data ?? []), [summary.data]);
  const option =
    formats.find((candidate) => sameFormat(candidate.format, requested)) ??
    formats[0];
  const format = option?.format ?? null;
  const weekly = useQuery(compareWeeklyQuery(filters, ids, format));
  const distribution = useQuery(scoreDistributionQuery(filters, ids, format));
  const formatRows = useMemo(
    () =>
      (summary.data ?? []).filter(
        (row) =>
          format !== null &&
          sameFormat(
            { distanceId: row.distance_id, faceId: row.target_face_id },
            format
          )
      ),
    [format, summary.data]
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
