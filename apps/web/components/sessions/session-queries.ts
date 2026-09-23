import type { Filters } from "@/components/filters/filters";
import { ALL, resolveDateRange } from "@/components/filters/filters";
import { createClient } from "@/lib/supabase/client";

/** Equality filters the session list and the arrow export share. */
const sharedEqualities = (filters: Filters) => {
  const equalities: [string, number | string][] = [];
  if (filters.athlete !== ALL) {
    equalities.push(["athlete_id", filters.athlete]);
  }
  if (filters.category !== ALL) {
    equalities.push(["category_id", Number(filters.category)]);
  }
  if (filters.event !== ALL) {
    equalities.push(["event_id", Number(filters.event)]);
  }
  if (filters.type !== ALL) {
    equalities.push(["session_type", filters.type]);
  }
  if (filters.venue !== ALL) {
    equalities.push(["venue", filters.venue]);
  }
  if (filters.gender !== ALL) {
    equalities.push(["gender", filters.gender]);
  }
  return equalities;
};

/** Sessions matching the filters, newest first. */
export const sessionSummariesQuery = (filters: Filters) => {
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
  for (const [column, value] of sharedEqualities(filters)) {
    query = query.eq(column, value);
  }
  // A session can shoot several formats; match any of its rounds.
  if (filters.distance !== ALL) {
    query = query.overlaps("distance_ids", [Number(filters.distance)]);
  }
  if (filters.face !== ALL) {
    query = query.overlaps("target_face_ids", [Number(filters.face)]);
  }
  return query
    .order("session_date", { ascending: false })
    .order("started_at", { ascending: false })
    .order("id");
};

/** Every arrow matching the filters, in scorecard order. */
export const arrowDetailsQuery = (filters: Filters) => {
  const { from, to } = resolveDateRange(filters);
  let query = createClient().from("arrow_details").select("*");
  if (from) {
    query = query.gte("session_date", from);
  }
  if (to) {
    query = query.lte("session_date", to);
  }
  for (const [column, value] of sharedEqualities(filters)) {
    query = query.eq(column, value);
  }
  // Rounds carry their own format, so only matching rounds' arrows count.
  if (filters.distance !== ALL) {
    query = query.eq("distance_id", Number(filters.distance));
  }
  if (filters.face !== ALL) {
    query = query.eq("target_face_id", Number(filters.face));
  }
  return query
    .order("session_date", { ascending: false })
    .order("session_id")
    .order("round_no")
    .order("end_no")
    .order("arrow_no");
};
