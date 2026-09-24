"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";

import type { Filters } from "@/components/filters/filters";
import { toPerformanceArgs } from "@/components/filters/filters";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { parseRows, performanceRowSchema } from "@/lib/supabase/rpc-rows";

export const performanceKeys = {
  all: ["performance"] as const,
  rows: (filters: Filters, byWeek: boolean) =>
    [...performanceKeys.all, filters, byWeek] as const,
};

const parsePerformanceRows = parseRows(performanceRowSchema);

export const fetchPerformance = async (filters: Filters, byWeek: boolean) => {
  const supabase = createClient();
  const rows = await fetchAllRows((start, end) =>
    supabase
      .rpc("athlete_performance", toPerformanceArgs(filters, byWeek))
      .range(start, end)
  );
  return parsePerformanceRows(rows);
};

export type PerformanceRow = Awaited<
  ReturnType<typeof fetchPerformance>
>[number];

/**
 * One row per athlete per round format, or per week too when byWeek is set.
 * The previous result stays on screen while a new filter loads, but only
 * within the same view: summary rows cannot stand in for weekly ones.
 */
export const performanceQuery = (filters: Filters, byWeek: boolean) =>
  queryOptions({
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === byWeek ? previous : undefined,
    queryFn: () => fetchPerformance(filters, byWeek),
    queryKey: performanceKeys.rows(filters, byWeek),
  });

export const usePerformance = (filters: Filters, byWeek: boolean) =>
  useQuery(performanceQuery(filters, byWeek));

/** Identifies one athlete on one round format. */
export const formatKey = (row: PerformanceRow) =>
  `${row.athlete_id}:${row.distance_id}:${row.target_face_id}`;
