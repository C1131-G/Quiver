import type {
  Arrow,
  End,
  Round,
  Session,
  SyncedRows,
  SyncedTable,
} from "@/db/rows";

import { columnsOf } from "./columns";

type SyncedRow = SyncedRows[SyncedTable];

/** A session as the server sends it, with everything scored under it. */
export type SessionTree = Session & {
  rounds: (Round & { ends: (End & { arrows: Arrow[] })[] })[];
};

/** The phone's rows, read before the pulled ones are merged in. */
export interface LocalSnapshot {
  arrows: readonly Arrow[];
  ends: readonly End[];
  get: (table: SyncedTable, id: string) => SyncedRow | undefined;
  rounds: readonly Round[];
}

interface TableChanges<T> {
  put: T[];
  remove: string[];
}

export interface PullChanges {
  arrows: TableChanges<Arrow>;
  ends: TableChanges<End>;
  rounds: TableChanges<Round>;
  sessions: TableChanges<Session>;
}

/** Every column the server sent has the value the phone holds. */
const sameRow = (stored: SyncedRow | undefined, fetched: SyncedRow) => {
  if (!stored) {
    return false;
  }
  const storedValues = new Map(Object.entries(stored));
  return Object.entries(fetched).every(
    ([column, value]) => storedValues.get(column) === value
  );
};

const flatten = (trees: readonly SessionTree[]) => {
  const rounds = trees.flatMap((tree) => tree.rounds);
  const ends = rounds.flatMap((round) => round.ends);
  return {
    arrows: ends.flatMap((end) => end.arrows.map(columnsOf.arrows)),
    ends: ends.map(columnsOf.ends),
    rounds: rounds.map(columnsOf.rounds),
    sessions: trees.map(columnsOf.sessions),
  };
};

/**
 * Merges the server's copy of the scorer's open sessions into the phone.
 * A row with a change still waiting to be sent keeps the phone's version;
 * every other row takes the server's, and rows the server no longer has
 * under those sessions are removed. So a session scored on another phone
 * carries on here, and nothing unsent is lost.
 */
export const planPull = (
  trees: readonly SessionTree[],
  local: LocalSnapshot,
  isPending: (table: SyncedTable, id: string) => boolean
): PullChanges => {
  const server = flatten(trees);

  const changed = <T extends SyncedRow>(table: SyncedTable, rows: T[]) =>
    rows.filter(
      (row) =>
        !(isPending(table, row.id) || sameRow(local.get(table, row.id), row))
    );

  const gone = <T extends { id: string }>(
    table: SyncedTable,
    stored: readonly T[],
    under: (row: T) => boolean,
    kept: readonly { id: string }[]
  ) => {
    const keptIds = new Set(kept.map((row) => row.id));
    return stored.flatMap((row) =>
      under(row) && !keptIds.has(row.id) && !isPending(table, row.id)
        ? [row.id]
        : []
    );
  };

  const sessionIds = new Set(server.sessions.map((row) => row.id));
  const roundIds = new Set([
    ...server.rounds.map((row) => row.id),
    ...local.rounds.flatMap((row) =>
      sessionIds.has(row.session_id) ? [row.id] : []
    ),
  ]);
  const endIds = new Set([
    ...server.ends.map((row) => row.id),
    ...local.ends.flatMap((row) =>
      roundIds.has(row.round_id) ? [row.id] : []
    ),
  ]);

  return {
    arrows: {
      put: changed("arrows", server.arrows),
      remove: gone(
        "arrows",
        local.arrows,
        (row) => endIds.has(row.end_id),
        server.arrows
      ),
    },
    ends: {
      put: changed("ends", server.ends),
      remove: gone(
        "ends",
        local.ends,
        (row) => roundIds.has(row.round_id),
        server.ends
      ),
    },
    rounds: {
      put: changed("rounds", server.rounds),
      remove: gone(
        "rounds",
        local.rounds,
        (row) => sessionIds.has(row.session_id),
        server.rounds
      ),
    },
    sessions: { put: changed("sessions", server.sessions), remove: [] },
  };
};
