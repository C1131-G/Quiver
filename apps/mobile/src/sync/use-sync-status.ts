import { useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";

import type { SyncIssue } from "@/db/rows";
import type { ScorerDb } from "@/db/scorer-db";
import { useScorerDb } from "@/db/scorer-db-context";

const EMPTY: never[] = [];

/**
 * What is still waiting to reach the server, counted in ends because that
 * is how a scorer thinks of their work. Sessions the server refused are
 * counted apart: they wait for the scorer, not for a signal.
 */
export const usePendingSync = () => {
  const { db } = useScorerDb();
  const { data: entries } = useLiveQuery((query) =>
    query.from({ entry: db.outbox })
  );
  const { data: issues } = useLiveQuery((query) =>
    query.from({ issue: db.syncIssues })
  );

  return useMemo(() => {
    const issuesBySession = new Map<string, SyncIssue>(
      (issues ?? EMPTY).map((issue) => [issue.id, issue])
    );
    const waitingSessions = new Set<string>();
    const waitingEnds = new Set<string>();
    for (const entry of entries ?? EMPTY) {
      if (issuesBySession.has(entry.session_id)) {
        continue;
      }
      waitingSessions.add(entry.session_id);
      if (entry.end_id) {
        waitingEnds.add(entry.end_id);
      }
    }
    return {
      issuesBySession,
      waitingEnds: waitingEnds.size,
      waitingSessions,
    };
  }, [entries, issues]);
};

/** Clears a session's refusal, which sends its changes again. */
export const retrySession = async (db: ScorerDb, sessionId: string) => {
  await db.syncIssues.delete(sessionId).isPersisted.promise;
};
