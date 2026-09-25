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
import {
  arrowCorrectionSchema,
  parseTableRows,
  sessionDetailSchema,
  sessionSummarySchema,
} from "@/lib/supabase/table-rows";

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
  const {
    count,
    data: summaries,
    error,
  } = await sessionSummariesQuery(filters).range(
    start,
    start + SESSIONS_PAGE_SIZE - 1
  );
  if (error) {
    throw loadError("Could not load sessions.", error);
  }
  return {
    rows: parseTableRows(
      sessionSummarySchema,
      summaries,
      "Could not load sessions."
    ),
    total: count ?? 0,
  };
};

export type { SessionSummary } from "@/lib/supabase/table-rows";

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
  const { data: sessionRow, error } = await createClient()
    .from("sessions")
    .select(SESSION_SELECT)
    .eq("id", sessionId)
    .maybeSingle();
  if (error) {
    throw loadError("Could not load the session.", error);
  }
  if (!sessionRow) {
    return null;
  }
  const parsed = sessionDetailSchema.safeParse(sessionRow);
  if (!parsed.success) {
    throw new Error(
      "Could not load the session. The server sent data in an unexpected shape."
    );
  }
  const session = parsed.data;
  // Embedded rows come back unordered; the scorecard reads in shooting order.
  const rounds = session.rounds
    .map((round) => ({
      ...round,
      ends: round.ends
        .map((end) => ({
          ...end,
          arrows: end.arrows.toSorted(
            (arrowA, arrowB) => arrowA.arrow_no - arrowB.arrow_no
          ),
        }))
        .toSorted((endA, endB) => endA.end_no - endB.end_no),
    }))
    .toSorted((roundA, roundB) => roundA.round_no - roundB.round_no);
  return { ...session, rounds };
};

export type {
  SessionArrow,
  SessionDetail,
  SessionEnd,
  SessionRound,
} from "@/lib/supabase/table-rows";

export const sessionQuery = (sessionId: string) =>
  queryOptions({
    queryFn: () => fetchSession(sessionId),
    queryKey: sessionKeys.detail(sessionId),
  });

export const useSession = (sessionId: string) =>
  useQuery(sessionQuery(sessionId));

const fetchCorrections = async (sessionId: string) => {
  const { data: corrections, error } = await createClient()
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
  return parseTableRows(
    arrowCorrectionSchema,
    corrections,
    "Could not load the correction history."
  );
};

export type { ArrowCorrection } from "@/lib/supabase/table-rows";

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
