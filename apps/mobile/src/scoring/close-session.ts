import { createTransaction } from "@tanstack/react-db";

import type { Session } from "@/db/rows";
import type { ScorerDb } from "@/db/scorer-db";

import { writeLocally } from "./actions";

type FinalStatus = Exclude<Session["status"], "in_progress">;

/** Closes the session for good; the sync sends the status after its scores. */
const closeAs = async (
  db: ScorerDb,
  sessionId: string,
  status: FinalStatus
) => {
  const now = new Date().toISOString();
  await writeLocally(db, () => {
    db.sessions.update(sessionId, (draft) => {
      draft.status = status;
      // The server only accepts a completion time on a completed session.
      draft.completed_at = status === "completed" ? now : null;
      draft.updated_at = now;
    });
  });
};

/** Submits the session. From now on only an admin can change its scores. */
export const submitSession = (db: ScorerDb, sessionId: string) =>
  closeAs(db, sessionId, "completed");

/**
 * Whether the session can be deleted rather than cancelled: it is still in
 * progress and the server has never been sent it. A session with no queued
 * change of its own reached the server long ago, or came from it.
 */
export const canDiscard = (db: ScorerDb, sessionId: string) =>
  db.sessions.get(sessionId)?.status === "in_progress" &&
  db.outbox.has(`sessions:${sessionId}`) &&
  !db.sentSessions.has(sessionId);

/**
 * Deletes the session and everything under it from the phone, and drops
 * its queued changes. Nothing is sent: the server never had it.
 */
const discardLocally = async (db: ScorerDb, sessionId: string) => {
  const roundIds = new Set<string>();
  for (const round of db.rounds.values()) {
    if (round.session_id === sessionId) {
      roundIds.add(round.id);
    }
  }
  const endIds = new Set<string>();
  for (const end of db.ends.values()) {
    if (roundIds.has(end.round_id)) {
      endIds.add(end.id);
    }
  }
  const arrowIds = [...db.arrows.values()].flatMap((arrow) =>
    endIds.has(arrow.end_id) ? [arrow.id] : []
  );
  const entryIds = [...db.outbox.values()].flatMap((entry) =>
    entry.session_id === sessionId ? [entry.id] : []
  );

  const transaction = createTransaction({
    autoCommit: false,
    mutationFn: async ({ transaction: pending }) => {
      // Rows go first. Should the app die before the outbox is saved, the
      // sync finds entries for rows that are gone, which sends nothing.
      await Promise.all([
        db.sessions.utils.acceptMutations(pending),
        db.rounds.utils.acceptMutations(pending),
        db.ends.utils.acceptMutations(pending),
        db.arrows.utils.acceptMutations(pending),
      ]);
      await Promise.all([
        db.outbox.utils.acceptMutations(pending),
        db.syncIssues.utils.acceptMutations(pending),
      ]);
    },
  });
  transaction.mutate(() => {
    if (arrowIds.length > 0) {
      db.arrows.delete(arrowIds);
    }
    if (endIds.size > 0) {
      db.ends.delete([...endIds]);
    }
    if (roundIds.size > 0) {
      db.rounds.delete([...roundIds]);
    }
    db.sessions.delete(sessionId);
    if (entryIds.length > 0) {
      db.outbox.delete(entryIds);
    }
    if (db.syncIssues.has(sessionId)) {
      db.syncIssues.delete(sessionId);
    }
  });
  await Promise.all([transaction.commit(), transaction.isPersisted.promise]);
};

/**
 * Stops scoring the session. One the server never had is deleted from the
 * phone; one it may have is cancelled, so it stays on Quiver Dashboard but
 * counts in no statistic. Decided at the moment of the tap, since a send
 * can start while the scorer is confirming.
 */
export const abandonSession = async (db: ScorerDb, sessionId: string) => {
  // Every row the decision and the delete read must be loaded from disk.
  await Promise.all([
    db.sessions.preload(),
    db.rounds.preload(),
    db.ends.preload(),
    db.arrows.preload(),
    db.outbox.preload(),
    db.sentSessions.preload(),
    db.syncIssues.preload(),
  ]);
  if (canDiscard(db, sessionId)) {
    await discardLocally(db, sessionId);
    return "discarded";
  }
  await closeAs(db, sessionId, "cancelled");
  return "cancelled";
};
