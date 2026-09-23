"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { Filters } from "@/components/filters/filters";
import { PERFORMANCE_KEY } from "@/components/performance/use-performance";
import { createClient } from "@/lib/supabase/client";

import type { toChanges } from "./score-editor";
import { sessionSummariesQuery } from "./session-queries";

export const SESSIONS_PAGE_SIZE = 25;

const SESSIONS_KEY = ["sessions"] as const;
const SESSION_KEY = ["session"] as const;
const CORRECTIONS_KEY = ["session-corrections"] as const;

const fetchSessions = async (filters: Filters, page: number) => {
  const start = page * SESSIONS_PAGE_SIZE;
  const { count, data, error } = await sessionSummariesQuery(filters).range(
    start,
    start + SESSIONS_PAGE_SIZE - 1
  );
  if (error) {
    throw new Error("Could not load sessions.");
  }
  return { rows: data, total: count ?? 0 };
};

export type SessionSummary = Awaited<
  ReturnType<typeof fetchSessions>
>["rows"][number];

/** Newest first, a page at a time, so years of sessions stay browsable. */
export const useSessions = (filters: Filters, page: number) =>
  useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => fetchSessions(filters, page),
    queryKey: [...SESSIONS_KEY, filters, page],
  });

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
    throw new Error("Could not load the session.");
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

export const useSession = (sessionId: string) =>
  useQuery({
    queryFn: () => fetchSession(sessionId),
    queryKey: [...SESSION_KEY, sessionId],
  });

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
    throw new Error("Could not load the correction history.");
  }
  return data;
};

export type ArrowCorrection = Awaited<
  ReturnType<typeof fetchCorrections>
>[number];

export const useCorrections = (sessionId: string) =>
  useQuery({
    queryFn: () => fetchCorrections(sessionId),
    queryKey: [...CORRECTIONS_KEY, sessionId],
  });

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
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...SESSION_KEY, sessionId],
        }),
        queryClient.invalidateQueries({
          queryKey: [...CORRECTIONS_KEY, sessionId],
        }),
        queryClient.invalidateQueries({ queryKey: SESSIONS_KEY }),
        queryClient.invalidateQueries({ queryKey: PERFORMANCE_KEY }),
        queryClient.invalidateQueries({ queryKey: ["compare"] }),
      ]),
  });
};
