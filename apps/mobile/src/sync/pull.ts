import type { SupabaseClient } from "@supabase/supabase-js";
import type { Collection } from "@tanstack/react-db";
import { createTransaction } from "@tanstack/react-db";
import type { Database } from "@workspace/shared/database.types";

import type { SyncedTable } from "@/db/rows";
import type { ScorerDb } from "@/db/scorer-db";

import { toSyncError } from "./errors";
import type { PullChanges } from "./pull-plan";
import { planPull } from "./pull-plan";

const SESSION_TREE = `
  athlete_id, category_id, completed_at, event_id, id, scorer_id,
  session_date, session_type, started_at, status, template_id, title,
  updated_at, venue,
  rounds (
    arrows_per_end, distance_id, id, planned_ends, round_no, session_id,
    target_face_id,
    ends ( end_no, id, round_id, arrows ( arrow_no, end_id, id, updated_at, value ) )
  )
`;

/** Inserts rows the phone lacks and overwrites the ones it has. */
const putAll = <TRow extends { id: string }>(
  collection: Collection<TRow, string>,
  rows: readonly TRow[]
) => {
  for (const row of rows) {
    if (collection.has(row.id)) {
      collection.update(row.id, (draft) => {
        Object.assign(draft, row);
      });
    } else {
      collection.insert(row);
    }
  }
};

/** Writes pulled rows to the phone only; nothing here is queued to send. */
const applyPull = async (db: ScorerDb, changes: PullChanges) => {
  const transaction = createTransaction({
    autoCommit: false,
    mutationFn: async ({ transaction: pending }) => {
      await Promise.all([
        db.sessions.utils.acceptMutations(pending),
        db.rounds.utils.acceptMutations(pending),
        db.ends.utils.acceptMutations(pending),
        db.arrows.utils.acceptMutations(pending),
      ]);
    },
  });
  transaction.mutate(() => {
    // Children are removed first and added last, parents the other way.
    for (const table of ["arrows", "ends", "rounds"] as const) {
      if (changes[table].remove.length > 0) {
        db[table].delete(changes[table].remove);
      }
    }
    putAll(db.sessions, changes.sessions.put);
    putAll(db.rounds, changes.rounds.put);
    putAll(db.ends, changes.ends.put);
    putAll(db.arrows, changes.arrows.put);
  });
  if (transaction.mutations.length === 0) {
    transaction.rollback();
    return;
  }
  await Promise.all([transaction.commit(), transaction.isPersisted.promise]);
};

/**
 * Brings the scorer's open sessions from the server: those still in
 * progress there, and any the phone still has open, in case they were
 * finished elsewhere. Sessions the server refused a send for are left alone.
 */
export const pullOpenSessions = async (
  client: SupabaseClient<Database>,
  db: ScorerDb,
  userId: string
) => {
  const openHere = [...db.sessions.values()].flatMap((session) =>
    session.status === "in_progress" ? [session.id] : []
  );
  const openFilter =
    openHere.length > 0
      ? `status.eq.in_progress,id.in.(${openHere.join(",")})`
      : "status.eq.in_progress";

  const { data, error, status } = await client
    .from("sessions")
    .select(SESSION_TREE)
    .eq("scorer_id", userId)
    .or(openFilter);
  if (error) {
    throw toSyncError(status, error);
  }

  const trees = data.filter((tree) => !db.syncIssues.has(tree.id));
  const isPending = (table: SyncedTable, id: string) =>
    db.outbox.has(`${table}:${id}`);
  // Planned and applied in one go, so no tap lands in between.
  const changes = planPull(
    trees,
    {
      arrows: [...db.arrows.values()],
      ends: [...db.ends.values()],
      get: (table, id) => db[table].get(id),
      rounds: [...db.rounds.values()],
    },
    isPending
  );
  await applyPull(db, changes);
};
