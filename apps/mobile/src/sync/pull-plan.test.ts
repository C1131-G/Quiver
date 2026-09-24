/// <reference types="bun" />

import { expect, test } from "bun:test";

import type { Arrow, End, Round, Session, SyncedTable } from "@/db/rows";

import type { LocalSnapshot, SessionTree } from "./pull-plan";
import { planPull } from "./pull-plan";

const session: Session = {
  athlete_id: "a1",
  category_id: 1,
  completed_at: null,
  event_id: 1,
  id: "s1",
  scorer_id: "u1",
  session_date: "2026-09-24",
  session_type: "training",
  started_at: "2026-09-24T08:00:00+00:00",
  status: "in_progress",
  title: null,
  updated_at: "2026-09-24T08:00:00+00:00",
  venue: "outdoor",
};
const round: Round = {
  arrows_per_end: 3,
  distance_id: 1,
  id: "r1",
  planned_ends: 10,
  round_no: 1,
  session_id: "s1",
  target_face_id: 1,
};
const end: End = { end_no: 1, id: "e1", round_id: "r1" };
const arrow = (id: string, value: string): Arrow => ({
  arrow_no: 1,
  end_id: "e1",
  id,
  updated_at: "2026-09-24T08:01:00+00:00",
  value,
});

const tree = (arrows: Arrow[]): SessionTree => ({
  ...session,
  rounds: [{ ...round, ends: [{ ...end, arrows }] }],
});

const snapshot = (rows: {
  arrows: Arrow[];
  ends: End[];
  rounds: Round[];
  sessions: Session[];
}): LocalSnapshot => ({
  ...rows,
  get: (table, id) => rows[table].find((row) => row.id === id),
});

const nothingPending = () => false;
const x1AndUnsent = (table: SyncedTable, id: string) =>
  table === "arrows" && (id === "x1" || id === "unsent");

test("brings a session scored on another phone", () => {
  const local = snapshot({ arrows: [], ends: [], rounds: [], sessions: [] });
  const changes = planPull([tree([arrow("x1", "9")])], local, nothingPending);
  expect(changes.sessions.put.map((row) => row.id)).toEqual(["s1"]);
  expect(changes.rounds.put.map((row) => row.id)).toEqual(["r1"]);
  expect(changes.ends.put.map((row) => row.id)).toEqual(["e1"]);
  expect(changes.arrows.put.map((row) => row.id)).toEqual(["x1"]);
});

test("rewrites nothing the phone already has", () => {
  const local = snapshot({
    arrows: [arrow("x1", "9")],
    ends: [end],
    rounds: [round],
    sessions: [session],
  });
  const changes = planPull([tree([arrow("x1", "9")])], local, nothingPending);
  expect(
    Object.values(changes).every(
      ({ put, remove }) => put.length === 0 && remove.length === 0
    )
  ).toBe(true);
});

test("keeps unsent changes and drops what the server removed", () => {
  const local = snapshot({
    arrows: [arrow("x1", "7"), arrow("gone", "9"), arrow("unsent", "10")],
    ends: [end],
    rounds: [round],
    sessions: [session],
  });
  const changes = planPull([tree([arrow("x1", "9")])], local, x1AndUnsent);
  // x1 was changed here and not sent yet: the phone's 7 stays.
  expect(changes.arrows.put).toEqual([]);
  expect(changes.arrows.remove).toEqual(["gone"]);
});

test("takes a status set elsewhere", () => {
  const local = snapshot({
    arrows: [],
    ends: [end],
    rounds: [round],
    sessions: [session],
  });
  const submitted: SessionTree = {
    ...tree([]),
    completed_at: "2026-09-24T09:00:00+00:00",
    status: "completed",
  };
  const changes = planPull([submitted], local, nothingPending);
  expect(changes.sessions.put.map((row) => row.status)).toEqual(["completed"]);
});
