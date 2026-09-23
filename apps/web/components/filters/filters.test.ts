/// <reference types="bun" />

import { describe, expect, test } from "bun:test";

import {
  ALL,
  DEFAULT_FILTERS,
  filtersToQuery,
  isFiltered,
  parseFilters,
  resolveDateRange,
  toPerformanceArgs,
} from "./filters";

const params = (query: string) => new URLSearchParams(query);
const ATHLETE_ID = "9ff6472d-149b-477a-845d-3940863fa97c";

describe("parseFilters", () => {
  test("an empty query is the default filter set", () => {
    expect(parseFilters(params(""))).toEqual(DEFAULT_FILTERS);
  });

  test("valid values are kept", () => {
    const filters = parseFilters(
      params(
        `athlete=${ATHLETE_ID}&distance=8&gender=female&type=competition&venue=indoor&range=custom&from=2026-09-01&to=2026-09-07`
      )
    );
    expect(filters).toMatchObject({
      athlete: ATHLETE_ID,
      distance: "8",
      from: "2026-09-01",
      gender: "female",
      range: "custom",
      to: "2026-09-07",
      type: "competition",
      venue: "indoor",
    });
  });

  test("malformed values fall back to their defaults", () => {
    const filters = parseFilters(
      params(
        "athlete=1;drop&distance=eight&gender=other&range=forever&from=yesterday&type=x"
      )
    );
    expect(filters).toEqual(DEFAULT_FILTERS);
  });
});

describe("filtersToQuery", () => {
  test("drops defaults so links stay short", () => {
    expect(filtersToQuery(DEFAULT_FILTERS)).toEqual({});
    expect(filtersToQuery({ ...DEFAULT_FILTERS, venue: "outdoor" })).toEqual({
      venue: "outdoor",
    });
  });

  test("round-trips through the URL", () => {
    const filters = {
      ...DEFAULT_FILTERS,
      athlete: ATHLETE_ID,
      face: "3",
      range: "12w" as const,
    };
    const query = new URLSearchParams(filtersToQuery(filters));
    expect(parseFilters(query)).toEqual(filters);
  });
});

test("isFiltered is false only for the defaults", () => {
  expect(isFiltered(DEFAULT_FILTERS)).toBe(false);
  expect(isFiltered({ ...DEFAULT_FILTERS, category: "2" })).toBe(true);
});

describe("resolveDateRange", () => {
  const today = "2026-09-23";

  test("rolling presets end today and include it", () => {
    expect(
      resolveDateRange({ ...DEFAULT_FILTERS, range: "7d" }, today)
    ).toEqual({
      from: "2026-09-17",
      to: today,
    });
    expect(resolveDateRange(DEFAULT_FILTERS, today)).toEqual({
      from: "2026-08-27",
      to: today,
    });
  });

  test("this year starts on 1 January", () => {
    expect(
      resolveDateRange({ ...DEFAULT_FILTERS, range: "year" }, today)
    ).toEqual({ from: "2026-01-01", to: today });
  });

  test("all time is open on both ends", () => {
    expect(
      resolveDateRange({ ...DEFAULT_FILTERS, range: "all" }, today)
    ).toEqual({ from: null, to: null });
  });

  test("a custom range may leave either end open", () => {
    expect(
      resolveDateRange(
        { ...DEFAULT_FILTERS, from: "2026-09-01", range: "custom" },
        today
      )
    ).toEqual({ from: "2026-09-01", to: null });
  });
});

test("toPerformanceArgs sends only the filters that are set", () => {
  const args = toPerformanceArgs(
    {
      ...DEFAULT_FILTERS,
      distance: "8",
      gender: "male",
      range: "all",
      type: ALL,
    },
    true
  );
  expect(args).toEqual({
    p_athlete_ids: undefined,
    p_by_week: true,
    p_category_ids: undefined,
    p_distance_ids: [8],
    p_event_ids: undefined,
    p_from: undefined,
    p_genders: ["male"],
    p_session_types: undefined,
    p_target_face_ids: undefined,
    p_to: undefined,
    p_venues: undefined,
  });
});
