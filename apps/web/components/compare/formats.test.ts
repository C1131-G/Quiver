/// <reference types="bun" />

import { expect, test } from "bun:test";

import type { PerformanceRow } from "@/components/performance/use-performance";

import { formatsOf } from "./use-compare";

const row = (
  athleteId: string,
  distanceId: number,
  faceId: number,
  arrows: number
): PerformanceRow => ({
  arrows,
  athlete_id: athleteId,
  athlete_name: athleteId,
  avg_arrow: 9,
  best_session_avg: 9,
  category_name: "Senior",
  distance_id: distanceId,
  event_name: "Recurve",
  gender: "male",
  id_no: athleteId,
  last_session_date: "2026-09-22",
  meters: distanceId * 10,
  miss_count: 0,
  sessions: 1,
  target_face_id: faceId,
  target_face_name: `${faceId}`,
  ten_plus_x_count: 0,
  total_points: arrows * 9,
  week_start: "",
  x_count: 0,
});

test("the format most athletes shot comes first, then by arrows", () => {
  const formats = formatsOf([
    row("a", 7, 1, 500),
    row("a", 3, 2, 72),
    row("b", 3, 2, 72),
    row("c", 5, 1, 900),
  ]);
  expect(formats.map((item) => item.label)).toEqual([
    "30 m · 2",
    "50 m · 1",
    "70 m · 1",
  ]);
  expect(formats[0]).toMatchObject({ arrows: 144, athletes: 2 });
});
