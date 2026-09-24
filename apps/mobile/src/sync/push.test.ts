/// <reference types="bun" />

import { describe, expect, test } from "bun:test";

import type {
  Arrow,
  End,
  OutboxEntry,
  Round,
  Session,
  SyncedTable,
} from "@/db/rows";

import { NOT_OPEN, SyncRejectedError, rejection, toSyncError } from "./errors";
import type { Remote } from "./push";
import { pushSession } from "./push";
import type { LocalRows } from "./push-plan";
import { planSessionPush } from "./push-plan";

const SESSION_ID = "s1";

const session = (patch: Partial<Session> = {}): Session => ({
  athlete_id: "a1",
  category_id: 1,
  completed_at: null,
  event_id: 1,
  id: SESSION_ID,
  scorer_id: "u1",
  session_date: "2026-09-24",
  session_type: "training",
  started_at: "2026-09-24T08:00:00.000Z",
  status: "in_progress",
  title: null,
  updated_at: "2026-09-24T08:00:00.000Z",
  venue: "outdoor",
  ...patch,
});
const round: Round = {
  arrows_per_end: 3,
  distance_id: 1,
  id: "r1",
  planned_ends: 10,
  round_no: 1,
  session_id: SESSION_ID,
  target_face_id: 1,
};
const end: End = { end_no: 1, id: "e1", round_id: "r1" };
const arrow = (id: string, arrowNo: number): Arrow => ({
  arrow_no: arrowNo,
  end_id: "e1",
  id,
  updated_at: "2026-09-24T08:01:00.000Z",
  value: "9",
});

const entry = (table: SyncedTable, rowId: string): OutboxEntry => ({
  end_id: table === "arrows" || table === "ends" ? "e1" : null,
  id: `${table}:${rowId}`,
  queued_at: "2026-09-24T08:00:00.000Z",
  rev: "rev",
  row_id: rowId,
  session_id: SESSION_ID,
  table,
});

const phone = (rows: {
  arrows?: Arrow[];
  ends?: End[];
  rounds?: Round[];
  sessions?: Session[];
}): LocalRows => ({
  arrows: (id) => rows.arrows?.find((row) => row.id === id),
  ends: (id) => rows.ends?.find((row) => row.id === id),
  rounds: (id) => rows.rounds?.find((row) => row.id === id),
  sessions: (id) => rows.sessions?.find((row) => row.id === id),
});

/** A server that records each call, answering as told. */
const fakeServer = ({
  failUpsertOf,
  finished = true,
  status = "in_progress",
}: {
  failUpsertOf?: { error: Error; table: SyncedTable };
  finished?: boolean;
  status?: Session["status"] | undefined;
} = {}) => {
  const calls: string[] = [];
  const remote: Remote = {
    remove: (table, ids) => {
      calls.push(`delete ${table} ${ids.join(",")}`);
      return Promise.resolve();
    },
    sessionStatus: () => {
      calls.push("status");
      return Promise.resolve(status);
    },
    setFinished: (row) => {
      calls.push(`finish ${row.status}`);
      return Promise.resolve(finished);
    },
    upsert: (batch) => {
      const detail =
        batch.table === "sessions"
          ? batch.rows.map((row) => row.status).join(",")
          : batch.rows.map((row) => row.id).join(",");
      calls.push(`upsert ${batch.table} ${detail}`);
      if (failUpsertOf?.table === batch.table) {
        return Promise.reject(failUpsertOf.error);
      }
      return Promise.resolve();
    },
  };
  return { calls, remote };
};

describe("pushSession", () => {
  test("sends a new session parents first", async () => {
    const entries = [
      entry("arrows", "x1"),
      entry("ends", "e1"),
      entry("rounds", "r1"),
      entry("sessions", SESSION_ID),
    ];
    const local = phone({
      arrows: [arrow("x1", 1)],
      ends: [end],
      rounds: [round],
      sessions: [session()],
    });
    const { calls, remote } = fakeServer();
    await pushSession(planSessionPush(SESSION_ID, entries, local), remote);
    expect(calls).toEqual([
      "upsert sessions in_progress",
      "upsert rounds r1",
      "upsert ends e1",
      "upsert arrows x1",
    ]);
  });

  test("deletes a removed arrow before its replacement takes its number", async () => {
    const entries = [entry("arrows", "old"), entry("arrows", "new")];
    const local = phone({ arrows: [arrow("new", 3)], sessions: [session()] });
    const { calls, remote } = fakeServer();
    await pushSession(planSessionPush(SESSION_ID, entries, local), remote);
    expect(calls).toEqual(["status", "delete arrows old", "upsert arrows new"]);
  });

  test("sends a finished session open first and finished last", async () => {
    const done = session({
      completed_at: "2026-09-24T09:00:00.000Z",
      status: "completed",
    });
    const entries = [entry("sessions", SESSION_ID), entry("arrows", "x1")];
    const local = phone({ arrows: [arrow("x1", 1)], sessions: [done] });
    const { calls, remote } = fakeServer();
    await pushSession(planSessionPush(SESSION_ID, entries, local), remote);
    expect(calls).toEqual([
      "upsert sessions in_progress",
      "upsert arrows x1",
      "finish completed",
    ]);
  });

  test("sends a cancel with no new scores as the status alone", async () => {
    const cancelled = session({ status: "cancelled" });
    const entries = [entry("sessions", SESSION_ID)];
    const local = phone({ sessions: [cancelled] });
    const { calls, remote } = fakeServer();
    await pushSession(planSessionPush(SESSION_ID, entries, local), remote);
    expect(calls).toEqual(["finish cancelled"]);
  });

  test("sends scores made offline before the cancel that follows them", async () => {
    const cancelled = session({ status: "cancelled" });
    const entries = [entry("arrows", "x1"), entry("sessions", SESSION_ID)];
    const local = phone({ arrows: [arrow("x1", 1)], sessions: [cancelled] });
    const { calls, remote } = fakeServer();
    await pushSession(planSessionPush(SESSION_ID, entries, local), remote);
    expect(calls).toEqual([
      "upsert sessions in_progress",
      "upsert arrows x1",
      "finish cancelled",
    ]);
  });

  test("treats a finished session the server already has as sent", async () => {
    const done = session({
      completed_at: "2026-09-24T09:00:00.000Z",
      status: "completed",
    });
    const entries = [entry("sessions", SESSION_ID), entry("arrows", "x1")];
    const local = phone({ arrows: [arrow("x1", 1)], sessions: [done] });
    const { calls, remote } = fakeServer({
      failUpsertOf: { error: rejection("42501"), table: "sessions" },
      status: "completed",
    });
    await pushSession(planSessionPush(SESSION_ID, entries, local), remote);
    expect(calls).toEqual(["upsert sessions in_progress", "status"]);
  });

  test("refuses arrows for a session submitted on the dashboard", async () => {
    const entries = [entry("arrows", "x1")];
    const local = phone({ arrows: [arrow("x1", 1)], sessions: [session()] });
    const { calls, remote } = fakeServer({ status: "completed" });
    const push = pushSession(
      planSessionPush(SESSION_ID, entries, local),
      remote
    );
    await expect(push).rejects.toMatchObject({ code: NOT_OPEN });
    expect(calls).toEqual(["status"]);
  });

  test("passes a lost connection through as a plain error", async () => {
    const entries = [entry("arrows", "x1")];
    const local = phone({ arrows: [arrow("x1", 1)], sessions: [session()] });
    const { remote } = fakeServer({
      failUpsertOf: {
        error: new Error("Network request failed"),
        table: "arrows",
      },
    });
    const push = pushSession(
      planSessionPush(SESSION_ID, entries, local),
      remote
    );
    await expect(push).rejects.not.toBeInstanceOf(SyncRejectedError);
  });
});

describe("toSyncError", () => {
  test("retries when there is no answer, a timeout or a server fault", () => {
    for (const status of [0, 401, 408, 429, 500, 503]) {
      const error = toSyncError(status, { code: "", message: "failed" });
      expect(error).not.toBeInstanceOf(SyncRejectedError);
    }
  });

  test("keeps the server's refusal with its code", () => {
    const error = toSyncError(403, { code: "42501", message: "denied" });
    expect(error).toBeInstanceOf(SyncRejectedError);
    expect(error).toMatchObject({ code: "42501" });
  });
});
