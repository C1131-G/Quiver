import type { Collection } from "@tanstack/react-db";
import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { today } from "@/lib/today";

import type { SessionTemplate } from "./rows";
import type { ScorerDb } from "./scorer-db";

/** Athletes and lookups change rarely; check again after this long. */
const REFERENCE_STALE_MS = 5 * 60 * 1000;

const ATHLETE_COLUMNS =
  "id, id_no, full_name, category_id, event_id, distance_id, target_face_id";

const TEMPLATE_COLUMNS = `
  id, session_date, session_type, title, venue,
  rounds:session_template_rounds(round_no, arrows_per_end, distance_id, planned_ends, target_face_id),
  athletes:session_template_athletes(athlete_id)
`;

/** Every column the server sent has the value already stored. */
const sameRow = <T extends object>(stored: T, fetched: T) => {
  const storedValues = new Map(Object.entries(stored));
  // Scheduled sessions hold their rounds and athletes as lists.
  return Object.entries(fetched).every(
    ([column, value]) =>
      JSON.stringify(storedValues.get(column)) === JSON.stringify(value)
  );
};

/**
 * Makes a local copy match the server's rows: new rows in, changed rows
 * updated, rows the server no longer returns removed. Resolves once the
 * copy is saved to SQLite.
 */
const reconcile = async <T extends { id: TKey }, TKey extends number | string>(
  collection: Collection<T, TKey>,
  fetched: readonly T[]
) => {
  const fetchedIds = new Set(fetched.map((row) => row.id));
  const toInsert: T[] = [];
  const toUpdate: T[] = [];
  for (const row of fetched) {
    const stored = collection.get(row.id);
    if (!stored) {
      toInsert.push(row);
    } else if (!sameRow(stored, row)) {
      toUpdate.push(row);
    }
  }
  const toDelete = [...collection.keys()].filter((id) => !fetchedIds.has(id));

  const writes = [];
  if (toInsert.length > 0) {
    writes.push(collection.insert(toInsert));
  }
  for (const row of toUpdate) {
    writes.push(
      collection.update(row.id, (draft) => {
        Object.assign(draft, row);
      })
    );
  }
  if (toDelete.length > 0) {
    writes.push(collection.delete(toDelete));
  }
  await Promise.all(writes.map((write) => write.isPersisted.promise));
};

const orThrow = <T>({
  data,
  error,
}: {
  data: T | null;
  error: Error | null;
}) => {
  if (error || data === null) {
    throw error ?? new Error("Supabase returned no rows");
  }
  return data;
};

/** The server's nested rows as the phone keeps a scheduled session. */
const toTemplate = ({
  athletes,
  rounds,
  ...template
}: {
  athletes: { athlete_id: string }[];
  rounds: SessionTemplate["rounds"];
} & Omit<SessionTemplate, "athlete_ids" | "rounds">): SessionTemplate => ({
  ...template,
  athlete_ids: athletes.map((row) => row.athlete_id).toSorted(),
  rounds: rounds.toSorted((a, b) => a.round_no - b.round_no),
});

/**
 * Fetches every athlete, lookup and upcoming scheduled session a scorer may
 * use and stores them.
 */
const refreshReference = async (db: ScorerDb) => {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }
  const [athletes, categories, events, distances, targetFaces, templates] =
    await Promise.all([
      supabase
        .from("athletes")
        .select(ATHLETE_COLUMNS)
        .eq("is_active", true)
        .order("full_name"),
      supabase.from("categories").select("id, is_active, name, sort_order"),
      supabase.from("events").select("id, is_active, name, sort_order"),
      supabase.from("distances").select("id, is_active, meters"),
      supabase
        .from("target_faces")
        .select("id, is_active, lowest_score, name, sort_order"),
      supabase
        .from("session_templates")
        .select(TEMPLATE_COLUMNS)
        .gte("session_date", today())
        .order("session_date"),
    ]);

  await Promise.all([
    reconcile(db.athletes, orThrow(athletes)),
    reconcile(db.categories, orThrow(categories)),
    reconcile(db.events, orThrow(events)),
    reconcile(db.distances, orThrow(distances)),
    reconcile(db.targetFaces, orThrow(targetFaces)),
    reconcile(db.sessionTemplates, orThrow(templates).map(toTemplate)),
  ]);
  return Date.now();
};

export const referenceKeys = {
  all: ["reference"] as const,
  forScorer: (userId: string) => [...referenceKeys.all, userId] as const,
};

/**
 * Keeps the phone's athletes and lookups current. The data itself is read
 * from SQLite through live queries, so it is there offline; this query only
 * says when the copy was last refreshed.
 */
export const referenceQuery = (db: ScorerDb, userId: string) =>
  queryOptions({
    queryFn: () => refreshReference(db),
    queryKey: referenceKeys.forScorer(userId),
    retry: 1,
    staleTime: REFERENCE_STALE_MS,
  });
