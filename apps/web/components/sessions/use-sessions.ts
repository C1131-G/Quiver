"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { Filters } from "@/components/filters/filters";
import { ALL, resolveDateRange } from "@/components/filters/filters";
import { PERFORMANCE_KEY } from "@/components/performance/use-performance";
import { createClient } from "@/lib/supabase/client";

export const SESSIONS_PAGE_SIZE = 25;

const SESSIONS_KEY = ["sessions"] as const;
const SESSION_KEY = ["session"] as const;
const CORRECTIONS_KEY = ["session-corrections"] as const;

const fetchSessions = async (filters: Filters, page: number) => {
  const { from, to } = resolveDateRange(filters);
  let query = createClient()
    .from("session_summaries")
    .select("*", { count: "exact" });
  if (from) {
    query = query.gte("session_date", from);
  }
  if (to) {
    query = query.lte("session_date", to);
  }
  if (filters.athlete !== ALL) {
    query = query.eq("athlete_id", filters.athlete);
  }
  if (filters.category !== ALL) {
    query = query.eq("category_id", Number(filters.category));
  }
  if (filters.event !== ALL) {
    query = query.eq("event_id", Number(filters.event));
  }
  // A session can shoot several formats; match any round.
  if (filters.distance !== ALL) {
    query = query.overlaps("distance_ids", [Number(filters.distance)]);
  }
  if (filters.face !== ALL) {
    query = query.overlaps("target_face_ids", [Number(filters.face)]);
  }
  if (filters.type !== ALL) {
    query = query.eq("session_type", filters.type);
  }
  if (filters.venue !== ALL) {
    query = query.eq("venue", filters.venue);
  }
  if (filters.gender !== ALL) {
    query = query.eq("gender", filters.gender);
  }
  const start = page * SESSIONS_PAGE_SIZE;
  const { count, data, error } = await query
    .order("session_date", { ascending: false })
    .order("started_at", { ascending: false })
    .range(start, start + SESSIONS_PAGE_SIZE - 1);
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
      "id, arrow_id, old_value, new_value, reason, corrected_at, corrector:profiles(full_name), arrow:arrows!inner(arrow_no, end:ends!inner(end_no, round:rounds!inner(round_no, session_id)))"
    )
    .eq("arrow.end.round.session_id", sessionId)
    .order("corrected_at", { ascending: false });
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

/** Admin score correction; the database logs every change with its reason. */
export const useCorrectArrow = (sessionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      arrowId,
      reason,
      value,
    }: {
      arrowId: string;
      reason: string;
      value: string;
    }) => {
      const { error } = await createClient().rpc("correct_arrow", {
        p_arrow_id: arrowId,
        p_reason: reason,
        p_value: value,
      });
      if (error) {
        throw new Error(
          error.code === "23514"
            ? "That score is not possible on this target face."
            : "Could not save the correction. Try again."
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
      ]),
  });
};
