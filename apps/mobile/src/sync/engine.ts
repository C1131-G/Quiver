import { addEventListener as onNetworkChange } from "@react-native-community/netinfo";
import { createAtom } from "@tanstack/react-store";
import { AppState } from "react-native";

import type { OutboxEntry } from "@/db/rows";
import type { ScorerDb } from "@/db/scorer-db";
import { supabase } from "@/lib/supabase";

import { SyncRejectedError } from "./errors";
import { clearSent } from "./outbox";
import { pullOpenSessions } from "./pull";
import { pushSession } from "./push";
import type { LocalRows } from "./push-plan";
import { planSessionPush } from "./push-plan";
import { supabaseRemote } from "./supabase-remote";

export interface SyncState {
  online: boolean;
  /** Sending: changes are on their way. Retrying: the last try failed. */
  phase: "idle" | "retrying" | "sending";
}

export const syncAtom = createAtom<SyncState>({ online: true, phase: "idle" });

const setSyncState = (patch: Partial<SyncState>) => {
  syncAtom.set((state) => ({ ...state, ...patch }));
};

/** Waits between tries after a failure, backing off to once a minute. */
const RETRY_DELAYS_MS = [2000, 5000, 15_000, 30_000, 60_000] as const;
const LAST_RETRY_DELAY_MS = 60_000;

/** Pending entries by session, oldest session first. */
const groupBySession = (entries: readonly OutboxEntry[]) => {
  const bySession = new Map<string, OutboxEntry[]>();
  const sorted = entries.toSorted((a, b) =>
    a.queued_at.localeCompare(b.queued_at)
  );
  for (const entry of sorted) {
    const group = bySession.get(entry.session_id) ?? [];
    // A copy: the entry's revision must stay as it was when sent.
    group.push({ ...entry });
    bySession.set(entry.session_id, group);
  }
  return bySession;
};

const localRowsOf = (db: ScorerDb): LocalRows => ({
  arrows: (id) => db.arrows.get(id),
  ends: (id) => db.ends.get(id),
  rounds: (id) => db.rounds.get(id),
  sessions: (id) => db.sessions.get(id),
});

const recordRejection = async (
  db: ScorerDb,
  sessionId: string,
  error: SyncRejectedError
) => {
  const issue = {
    code: error.code,
    failed_at: new Date().toISOString(),
    id: sessionId,
    message: error.message,
  };
  const write = db.syncIssues.has(sessionId)
    ? db.syncIssues.update(sessionId, (draft) => {
        Object.assign(draft, issue);
      })
    : db.syncIssues.insert(issue);
  await write.isPersisted.promise;
};

/**
 * Keeps the signed-in scorer's phone and the server in step: sends queued
 * changes whenever there are some and the phone is online, retries with
 * a growing wait when the server can't be reached, and brings in their open
 * sessions at start and whenever the app returns to the foreground.
 * Returns the function that stops it; nothing when the build has no
 * Supabase settings.
 */
export const startSync = (db: ScorerDb, userId: string) => {
  const client = supabase;
  if (!client) {
    return;
  }
  const remote = supabaseRemote(client);
  const local = localRowsOf(db);
  let stopped = false;
  let running = false;
  let runAgain = false;
  let pullWanted = true;
  let online = true;
  let failures = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  const isSignedIn = async () => {
    const { data } = await client.auth.getSession();
    return data.session?.user.id === userId;
  };

  /** Sends one session. A refusal is recorded against it, not thrown. */
  const sendSession = async (sessionId: string, sent: OutboxEntry[]) => {
    try {
      await pushSession(planSessionPush(sessionId, sent, local), remote);
    } catch (error) {
      if (!(error instanceof SyncRejectedError)) {
        throw error;
      }
      await recordRejection(db, sessionId, error);
      return;
    }
    await clearSent(db, sent);
  };

  const pushPending = async () => {
    const entries = [...db.outbox.values()].filter(
      (entry) => !db.syncIssues.has(entry.session_id)
    );
    if (entries.length === 0) {
      return;
    }
    setSyncState({ phase: "sending" });
    // Sessions are independent, so they go side by side; each settles
    // before a failure is reported, so no send outlives this sync.
    const results = await Promise.allSettled(
      [...groupBySession(entries)].map(([sessionId, sent]) =>
        sendSession(sessionId, sent)
      )
    );
    const failed = results.find((result) => result.status === "rejected");
    if (failed) {
      throw failed.reason;
    }
  };

  const ready = () =>
    Promise.all([
      db.outbox.preload(),
      db.syncIssues.preload(),
      db.sessions.preload(),
      db.rounds.preload(),
      db.ends.preload(),
      db.arrows.preload(),
    ]);

  const scheduleRetry = (retry: () => Promise<void>) => {
    const delay = RETRY_DELAYS_MS[failures - 1] ?? LAST_RETRY_DELAY_MS;
    retryTimer = setTimeout(retry, delay);
  };

  // Runs one sync at a time; a request made meanwhile runs right after it.
  const requestSync = async () => {
    if (running) {
      runAgain = true;
      return;
    }
    clearTimeout(retryTimer);
    if (stopped || !online) {
      return;
    }
    running = true;
    runAgain = false;
    try {
      await ready();
      // Offline with an expired token there is no session to send with yet.
      if (!(await isSignedIn())) {
        throw new Error("The sign-in could not be refreshed yet");
      }
      await pushPending();
      if (pullWanted) {
        pullWanted = false;
        await pullOpenSessions(client, db, userId);
      }
      failures = 0;
      setSyncState({ phase: "idle" });
    } catch {
      failures += 1;
      pullWanted = true;
      setSyncState({ phase: "retrying" });
      scheduleRetry(requestSync);
    }
    running = false;
    if (runAgain) {
      await requestSync();
    }
  };

  const outboxChanges = db.outbox.subscribeChanges((changes) => {
    // Clearing sent entries needs no new sync; a new or rewritten one does.
    if (changes.some((change) => change.type !== "delete")) {
      requestSync();
    }
  });
  const issueChanges = db.syncIssues.subscribeChanges((changes) => {
    // A cleared issue is the scorer asking to try that session again.
    if (changes.some((change) => change.type === "delete")) {
      requestSync();
    }
  });
  const stopNetInfo = onNetworkChange((state) => {
    // Unknown counts as online; a failed send says otherwise soon enough.
    online = state.isConnected !== false;
    setSyncState({ online });
    if (online) {
      failures = 0;
      requestSync();
    }
  });
  const appState = AppState.addEventListener("change", (state) => {
    if (state === "active") {
      pullWanted = true;
      requestSync();
    }
  });

  setSyncState({ phase: "idle" });
  requestSync();

  return () => {
    stopped = true;
    clearTimeout(retryTimer);
    outboxChanges.unsubscribe();
    issueChanges.unsubscribe();
    stopNetInfo();
    appState.remove();
  };
};
