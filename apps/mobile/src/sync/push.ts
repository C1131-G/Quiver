import type { Session, SyncedRows, SyncedTable } from "@/db/rows";

import { NOT_FOUND, NOT_OPEN, SyncRejectedError, rejection } from "./errors";
import type { SessionPush } from "./push-plan";

export type UpsertBatch = {
  [T in SyncedTable]: { rows: SyncedRows[T][]; table: T };
}[SyncedTable];

/**
 * The server, as the push needs it. Every call throws a SyncRejectedError
 * when the server says no, and any other error when it could not be reached.
 */
export interface Remote {
  /** Deletes rows by id; ids the server does not have are ignored. */
  remove: (table: SyncedTable, ids: readonly string[]) => Promise<void>;
  /** The session's status on the server, or undefined when it has none. */
  sessionStatus: (id: string) => Promise<Session["status"] | undefined>;
  /** Sets the session's final status; false when no row was updated. */
  setFinished: (session: Session) => Promise<boolean>;
  upsert: (batch: UpsertBatch) => Promise<void>;
}

/**
 * Sends a session open. For one finished on the phone, a refusal can mean
 * it already landed in full: the finish is always the last write, so a
 * server showing the same final status has everything before it too.
 */
const sendOpen = async (push: SessionPush, remote: Remote) => {
  if (!push.open) {
    return "sent";
  }
  try {
    await remote.upsert({ rows: [push.open], table: "sessions" });
    return "sent";
  } catch (error) {
    if (push.finish && error instanceof SyncRejectedError) {
      const status = await remote.sessionStatus(push.sessionId);
      if (status === push.finish.status) {
        return "landed";
      }
    }
    throw error;
  }
};

const ensureOpen = async (push: SessionPush, remote: Remote) => {
  const status = await remote.sessionStatus(push.sessionId);
  if (status === undefined) {
    throw rejection(NOT_FOUND);
  }
  if (status !== "in_progress") {
    throw rejection(NOT_OPEN);
  }
};

const sendFinish = async (session: Session, remote: Remote) => {
  if (await remote.setFinished(session)) {
    return;
  }
  // Nothing updated: fine if it is already finished this way (a retry).
  const status = await remote.sessionStatus(session.id);
  if (status === undefined) {
    throw rejection(NOT_FOUND);
  }
  if (status !== session.status) {
    throw rejection(NOT_OPEN);
  }
};

/**
 * Sends one session's changes: the session open, deletes children first,
 * upserts parents first, then the finish. Every step is an idempotent
 * write by id, so a send cut off halfway is simply repeated.
 */
export const pushSession = async (push: SessionPush, remote: Remote) => {
  if ((await sendOpen(push, remote)) === "landed") {
    return;
  }
  if (push.checkOpen) {
    await ensureOpen(push, remote);
  }

  const { deletes, upserts } = push;
  if (deletes.arrows.length > 0) {
    await remote.remove("arrows", deletes.arrows);
  }
  if (deletes.ends.length > 0) {
    await remote.remove("ends", deletes.ends);
  }
  if (deletes.rounds.length > 0) {
    await remote.remove("rounds", deletes.rounds);
  }
  if (upserts.rounds.length > 0) {
    await remote.upsert({ rows: upserts.rounds, table: "rounds" });
  }
  if (upserts.ends.length > 0) {
    await remote.upsert({ rows: upserts.ends, table: "ends" });
  }
  if (upserts.arrows.length > 0) {
    await remote.upsert({ rows: upserts.arrows, table: "arrows" });
  }

  if (push.finish) {
    await sendFinish(push.finish, remote);
  }
  if (push.deleteSession) {
    await remote.remove("sessions", [push.sessionId]);
  }
};
