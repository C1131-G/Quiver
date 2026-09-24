import type {
  Arrow,
  End,
  OutboxEntry,
  Round,
  Session,
  SyncedRows,
  SyncedTable,
} from "@/db/rows";

import { columnsOf } from "./columns";

/** Reads a row as the phone has it now, or undefined once deleted. */
export type LocalRows = {
  [T in SyncedTable]: (id: string) => SyncedRows[T] | undefined;
};

interface ChildChanges {
  arrows: Arrow[];
  ends: End[];
  rounds: Round[];
}

/**
 * One session's pending changes, in the order the server accepts them.
 * Rounds, ends and arrows can only be written while the session is open
 * on the server, so a session finished on the phone is sent open first and
 * finished last.
 */
export interface SessionPush {
  /** Make sure the server still has the session open before writing under it. */
  checkOpen: boolean;
  /** Children first, so no row is left pointing at a deleted parent. */
  deletes: { arrows: string[]; ends: string[]; rounds: string[] };
  deleteSession: boolean;
  entries: readonly OutboxEntry[];
  /** Sent last: the session as the phone finished it. */
  finish: Session | undefined;
  /** Sent first: the session, open, so its rows may be written. */
  open: Session | undefined;
  sessionId: string;
  /** Parents first, so every row's parent is already there. */
  upserts: ChildChanges;
}

const hasWork = (push: Pick<SessionPush, "deletes" | "upserts">) =>
  Object.values(push.deletes).some((ids) => ids.length > 0) ||
  Object.values(push.upserts).some((rows) => rows.length > 0);

const splitChildren = (
  entries: readonly OutboxEntry[],
  local: LocalRows
): Pick<SessionPush, "deletes" | "upserts"> => {
  const deletes: SessionPush["deletes"] = { arrows: [], ends: [], rounds: [] };
  const upserts: ChildChanges = { arrows: [], ends: [], rounds: [] };
  for (const entry of entries) {
    const { row_id: id, table } = entry;
    if (table === "rounds") {
      const row = local.rounds(id);
      if (row) {
        upserts.rounds.push(columnsOf.rounds(row));
      } else {
        deletes.rounds.push(id);
      }
    } else if (table === "ends") {
      const row = local.ends(id);
      if (row) {
        upserts.ends.push(columnsOf.ends(row));
      } else {
        deletes.ends.push(id);
      }
    } else if (table === "arrows") {
      const row = local.arrows(id);
      if (row) {
        upserts.arrows.push(columnsOf.arrows(row));
      } else {
        deletes.arrows.push(id);
      }
    }
  }
  return { deletes, upserts };
};

/** Works out what to send for one session's outbox entries. */
export const planSessionPush = (
  sessionId: string,
  entries: readonly OutboxEntry[],
  local: LocalRows
): SessionPush => {
  const children = splitChildren(entries, local);
  const childWork = hasWork(children);
  const sessionChanged = entries.some((entry) => entry.table === "sessions");
  const stored = local.sessions(sessionId);
  const base = { ...children, entries, sessionId };

  if (!stored) {
    return {
      ...base,
      checkOpen: false,
      deleteSession: sessionChanged,
      finish: undefined,
      open: undefined,
    };
  }
  const session = columnsOf.sessions(stored);
  if (session.status === "in_progress") {
    return {
      ...base,
      // An unchanged session is not resent, so an edit made on Quiver
      // Dashboard is not overwritten; it is only checked.
      checkOpen: childWork && !sessionChanged,
      deleteSession: false,
      finish: undefined,
      open: sessionChanged ? session : undefined,
    };
  }
  return {
    ...base,
    checkOpen: false,
    deleteSession: false,
    finish: sessionChanged || childWork ? session : undefined,
    open: childWork
      ? { ...session, completed_at: null, status: "in_progress" }
      : undefined,
  };
};
