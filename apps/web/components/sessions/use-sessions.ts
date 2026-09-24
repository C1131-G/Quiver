"use client";

import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { compareKeys } from "@/components/compare/use-compare";
import type { Filters } from "@/components/filters/filters";
import { performanceKeys } from "@/components/performance/use-performance";
import { createClient } from "@/lib/supabase/client";
import { loadError } from "@/lib/supabase/load-error";

import type { toChanges } from "./score-editor";
import { sessionSummariesQuery } from "./session-list-query";

export const SESSIONS_PAGE_SIZE = 25;

/** Every session query sits under `all`, so one invalidation covers them. */
export const sessionKeys = {
  all: ["sessions"] as const,
  corrections: (sessionId: string) =>
    [...sessionKeys.detail(sessionId), "corrections"] as const,
  detail: (sessionId: string) =>
    [...sessionKeys.all, "detail", sessionId] as const,
  list: (filters: Filters, page: number) =>
    [...sessionKeys.all, "list", filters, page] as const,
};

const fetchSessions = async (filters: Filters, page: number) => {
  const start = page * SESSIONS_PAGE_SIZE;
  const { count, data, error } = await sessionSummariesQuery(filters).range(
    start,
    start + SESSIONS_PAGE_SIZE - 1
  );
  if (error) {
    throw loadError("Could not load sessions.", error);
  }
  return { rows: data, total: count ?? 0 };
};

export type SessionSummary = Awaited<
  ReturnType<typeof fetchSessions>
>["rows"][number];

/** Newest first, a page at a time, so years of sessions stay browsable. */
export const sessionsQuery = (filters: Filters, page: number) =>
  queryOptions({
    placeholderData: keepPreviousData,
    queryFn: () => fetchSessions(filters, page),
    queryKey: sessionKeys.list(filters, page),
  });

export const useSessions = (filters: Filters, page: number) =>
  useQuery(sessionsQuery(filters, page));

const SESSION_SELECT = `*,
  athlete:athletes(id, id_no, aai_no, full_name, gender),
  category:categories(name),
  event:events(name),
  scorer:profiles(full_name, login_id),
  rounds(id, round_no, arrows_per_end, planned_ends,
    distance:distances(meters),
    target_face:target_faces(name, lowest_score),
    ends(id, end_no, arrows(id, arrow_no, value, points, is_x, is_ten_plus_x)))`;

const fetchSession = async (sessionId: string) => {
  const { data, error } = await createClient()
    .from("sessions")
    .select(SESSION_SELECT)
    .eq("id", sessionId)
    .maybeSingle();
  if (error) {
    throw loadError("Could not load the session.", error);
  }
  if (!data) {
    return null;
  }
  // Embedded rows come back unordered; the scorecard reads in shooting order.
  const rounds = data.rounds
    .map((round) => ({
      ...round,
      ends: round.ends
        .map((end) => ({
          ...end,
          arrows: end.arrows.toSorted((a, b) => a.arrow_no - b.arrow_no),
        }))
        .toSorted((a, b) => a.end_no - b.end_no),
    }))
    .toSorted((a, b) => a.round_no - b.round_no);
  return { ...data, rounds };
};

export type SessionDetail = NonNullable<
  Awaited<ReturnType<typeof fetchSession>>
>;
export type SessionRound = SessionDetail["rounds"][number];
export type SessionEnd = SessionRound["ends"][number];
export type SessionArrow = SessionEnd["arrows"][number];

export const sessionQuery = (sessionId: string) =>
  queryOptions({
    queryFn: () => fetchSession(sessionId),
    queryKey: sessionKeys.detail(sessionId),
  });

export const useSession = (sessionId: string) =>
  useQuery(sessionQuery(sessionId));

const fetchCorrections = async (sessionId: string) => {
  const { data, error } = await createClient()
    .from("arrow_corrections")
    .select(
      "id, arrow_id, round_no, end_no, arrow_no, old_value, new_value, reason, corrected_at, corrector:profiles(full_name)"
    )
    .eq("session_id", sessionId)
    .order("corrected_at", { ascending: false })
    .order("id", { ascending: false });
  if (error) {
    throw loadError("Could not load the correction history.", error);
  }
  return data;
};

export type ArrowCorrection = Awaited<
  ReturnType<typeof fetchCorrections>
>[number];

export const correctionsQuery = (sessionId: string) =>
  queryOptions({
    queryFn: () => fetchCorrections(sessionId),
    queryKey: sessionKeys.corrections(sessionId),
  });

export const useCorrections = (sessionId: string) =>
  useQuery(correctionsQuery(sessionId));

const CHECK_VIOLATION = "23514";

/**
 * Saves an admin's edits to a session in one transaction. The database
 * checks each score against the round and face, and logs every change.
 */
export const useSaveScores = (sessionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      changes,
      reason,
    }: {
      changes: ReturnType<typeof toChanges>;
      reason: string;
    }) => {
      const { error } = await createClient().rpc("admin_save_scores", {
        p_changes: changes,
        p_reason: reason,
        p_session_id: sessionId,
      });
      if (error) {
        throw new Error(
          error.code === CHECK_VIOLATION
            ? `Not saved: ${error.message}.`
            : "Could not save the scores. Nothing was changed; try again."
        );
      }
    },
    // Session list, detail and corrections share sessionKeys.all.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
        queryClient.invalidateQueries({ queryKey: performanceKeys.all }),
        queryClient.invalidateQueries({ queryKey: compareKeys.all }),
      ]),
  });
};
