/// <reference types="bun" />

import { expect, test } from "bun:test";

import type { Athlete, SessionTemplate } from "@/db/rows";

import { sessionsFromTemplate, startedAthletes } from "./scheduled-sessions";

const template: SessionTemplate = {
  athlete_ids: ["a1", "a2"],
  id: "t1",
  rounds: [
    {
      arrows_per_end: 6,
      distance_id: null,
      planned_ends: 6,
      round_no: 1,
      target_face_id: null,
    },
    {
      arrows_per_end: 3,
      distance_id: 9,
      planned_ends: 10,
      round_no: 2,
      target_face_id: null,
    },
  ],
  session_date: "2026-10-03",
  session_type: "competition",
  title: "State trials",
  venue: "outdoor",
};

const athlete = (id: string, distanceId: number, faceId: number): Athlete => ({
  category_id: 1,
  distance_id: distanceId,
  event_id: 1,
  full_name: `Athlete ${id}`,
  id,
  id_no: id,
  target_face_id: faceId,
});

test("each athlete shoots the plan at their own distance where none is set", () => {
  const [first, second] = sessionsFromTemplate(
    template,
    [athlete("a1", 3, 4), athlete("a2", 5, 6)],
    "scorer"
  );
  expect(first?.rounds).toEqual([
    { arrowsPerEnd: 6, distanceId: 3, plannedEnds: 6, targetFaceId: 4 },
    { arrowsPerEnd: 3, distanceId: 9, plannedEnds: 10, targetFaceId: 4 },
  ]);
  expect(second?.rounds.map((round) => round.distanceId)).toEqual([5, 9]);
  expect(first).toMatchObject({
    scorerId: "scorer",
    sessionDate: "2026-10-03",
    sessionType: "competition",
    templateId: "t1",
    title: "State trials",
    venue: "outdoor",
  });
});

test("a cancelled session lets the athlete start the plan again", () => {
  const started = startedAthletes(
    [
      { athlete_id: "a1", status: "in_progress", template_id: "t1" },
      { athlete_id: "a2", status: "cancelled", template_id: "t1" },
      { athlete_id: "a3", status: "completed", template_id: "other" },
      // Stored before sessions carried a template.
      { athlete_id: "a4", status: "in_progress" },
    ],
    "t1"
  );
  expect([...started]).toEqual(["a1"]);
});
