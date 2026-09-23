"use client";

import { useQuery } from "@tanstack/react-query";

import type { Filters } from "@/components/filters/filters";
import { toPerformanceArgs } from "@/components/filters/filters";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetch-all";

export const PERFORMANCE_KEY = ["performance"] as const;

export const fetchPerformance = (filters: Filters, byWeek: boolean) => {
  const supabase = createClient();
  return fetchAllRows((start, end) =>
    supabase
      .rpc("athlete_performance", toPerformanceArgs(filters, byWeek))
      .range(start, end)
  );
};

export type PerformanceRow = Awaited<
  ReturnType<typeof fetchPerformance>
>[number];

/**
 * One row per athlete per round format, or per week too when byWeek is set.
 * The previous result stays on screen while a new filter loads, but only
 * within the same view: summary rows cannot stand in for weekly ones.
 */
export const usePerformance = (filters: Filters, byWeek: boolean) =>
  useQuery({
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === byWeek ? previous : undefined,
    queryFn: () => fetchPerformance(filters, byWeek),
    queryKey: [...PERFORMANCE_KEY, filters, byWeek] as const,
  });

/** Identifies one athlete on one round format. */
export const formatKey = (row: PerformanceRow) =>
  `${row.athlete_id}:${row.distance_id}:${row.target_face_id}`;
