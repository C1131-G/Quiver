/// <reference types="bun" />

import { expect, test } from "bun:test";

import type { TemplateDraft } from "./template-form";
import { ATHLETE_OWN, draftOf, readTemplateDraft } from "./template-form";
import type { TemplateRow } from "./use-templates";

const ATHLETE = "3f1c6a52-8d7e-4b1a-9c2d-5e6f7a8b9c0d";

const valid: TemplateDraft = {
  athleteIds: [ATHLETE],
  rounds: [
    {
      arrowsPerEnd: 6,
      distanceId: ATHLETE_OWN,
      key: "a",
      plannedEnds: 6,
      targetFaceId: ATHLETE_OWN,
    },
    {
      arrowsPerEnd: 3,
      distanceId: "2",
      key: "b",
      plannedEnds: 10,
      targetFaceId: "4",
    },
  ],
  sessionDate: "2026-10-03",
  sessionType: "competition",
  title: "  State trials ",
  venue: "outdoor",
};

test("a complete plan becomes what the database takes, trimmed", () => {
  expect(readTemplateDraft(valid)).toEqual({
    input: {
      athleteIds: [ATHLETE],
      rounds: [
        {
          arrows_per_end: 6,
          distance_id: null,
          planned_ends: 6,
          target_face_id: null,
        },
        {
          arrows_per_end: 3,
          distance_id: 2,
          planned_ends: 10,
          target_face_id: 4,
        },
      ],
      sessionDate: "2026-10-03",
      sessionType: "competition",
      title: "State trials",
      venue: "outdoor",
    },
    ok: true,
  });
});

test("a plan needs a title, an athlete and a round", () => {
  expect(readTemplateDraft({ ...valid, title: "  " })).toMatchObject({
    error: "Title is required.",
  });
  expect(readTemplateDraft({ ...valid, athleteIds: [] })).toMatchObject({
    error: "Choose at least one athlete.",
  });
  expect(readTemplateDraft({ ...valid, rounds: [] })).toMatchObject({
    error: "Add at least one round.",
  });
});

test("a round stays within what the database allows", () => {
  const [first] = valid.rounds;
  if (!first) {
    throw new Error("The plan has no round");
  }
  expect(
    readTemplateDraft({ ...valid, rounds: [{ ...first, plannedEnds: 37 }] }).ok
  ).toBe(false);
  expect(
    readTemplateDraft({ ...valid, rounds: [{ ...first, arrowsPerEnd: 0 }] }).ok
  ).toBe(false);
});

test("editing starts from the saved plan, athlete's own as empty", () => {
  const saved = {
    athletes: [{ athlete_id: ATHLETE }],
    id: "t1",
    rounds: [
      {
        arrows_per_end: 3,
        distance_id: null,
        planned_ends: 10,
        round_no: 1,
        target_face_id: 4,
      },
    ],
    session_date: "2026-10-03",
    session_type: "training",
    sessions: [],
    title: "Club night",
    venue: "indoor",
  } satisfies TemplateRow;
  const draft = draftOf(saved, "2026-09-24");
  expect(draft.rounds).toMatchObject([
    { distanceId: ATHLETE_OWN, targetFaceId: "4" },
  ]);
  expect(draft).toMatchObject({
    athleteIds: [ATHLETE],
    sessionDate: "2026-10-03",
    title: "Club night",
  });
});
