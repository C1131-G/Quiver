import type { PendingMutation } from "@tanstack/react-db";
import { randomUUID } from "expo-crypto";
import { z } from "zod";

import type { OutboxEntry, SyncedTable } from "@/db/rows";
import { SYNCED_TABLES } from "@/db/rows";
import type { ScorerDb } from "@/db/scorer-db";

const roundRow = z.object({ session_id: z.string() });
const endRow = z.object({ round_id: z.string() });
const arrowRow = z.object({ end_id: z.string() });

const syncedTableOf = (collectionId: string) =>
  SYNCED_TABLES.find((table) => table === collectionId);

const sessionOfRound = (db: ScorerDb, roundId: string) =>
  db.rounds.get(roundId)?.session_id;

/** The session a changed row belongs to, and its end when it has one. */
const placeOf = (
  db: ScorerDb,
  table: SyncedTable,
  mutation: PendingMutation
) => {
  const rowId = String(mutation.key);
  // A deleted row is only in the mutation's copy of it as it was.
  const row =
    mutation.type === "delete" ? mutation.original : mutation.modified;
  switch (table) {
    case "sessions": {
      return { endId: null, sessionId: rowId };
    }
    case "rounds": {
      return { endId: null, sessionId: roundRow.parse(row).session_id };
    }
    case "ends": {
      return {
        endId: rowId,
        sessionId: sessionOfRound(db, endRow.parse(row).round_id),
      };
    }
    case "arrows": {
      const endId = arrowRow.parse(row).end_id;
      const end = db.ends.get(endId);
      return { endId, sessionId: end && sessionOfRound(db, end.round_id) };
    }
    default: {
      const unknownTable: never = table;
      throw new Error(`Unknown table ${unknownTable}`);
    }
  }
};

/**
 * Queues the rows a transaction changed for the server. Call it inside the
 * same transaction, so the phone never holds a change nobody will send.
 */
export const queueForServer = (
  db: ScorerDb,
  mutations: readonly PendingMutation[]
) => {
  const queuedAt = new Date().toISOString();
  for (const mutation of mutations) {
    const table = syncedTableOf(mutation.collection.id);
    if (!table) {
      continue;
    }
    const rowId = String(mutation.key);
    const { endId, sessionId } = placeOf(db, table, mutation);
    if (!sessionId) {
      throw new Error(`No session found for ${table} ${rowId}`);
    }
    const id = `${table}:${rowId}`;
    const rev = randomUUID();
    if (db.outbox.has(id)) {
      db.outbox.update(id, (draft) => {
        draft.rev = rev;
      });
    } else {
      const entry: OutboxEntry = {
        end_id: endId,
        id,
        queued_at: queuedAt,
        rev,
        row_id: rowId,
        session_id: sessionId,
        table,
      };
      db.outbox.insert(entry);
    }
  }
};

/**
 * Clears entries once their rows reached the server, except any rewritten
 * while they were being sent: those go again.
 */
export const clearSent = async (db: ScorerDb, sent: readonly OutboxEntry[]) => {
  const unchanged = sent.flatMap((entry) =>
    db.outbox.get(entry.id)?.rev === entry.rev ? [entry.id] : []
  );
  if (unchanged.length > 0) {
    await db.outbox.delete(unchanged).isPersisted.promise;
  }
};
