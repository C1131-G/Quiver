/// <reference types="bun" />

import { expect, test } from "bun:test";

import type { Profile } from "@/lib/supabase/table-rows";

import { upsertAccountProfile } from "./use-scorers";

const profile = (overrides: Partial<Profile>): Profile => ({
  created_at: "2026-09-24T06:00:00+00:00",
  full_name: "Range Scorer",
  id: "00000000-0000-4000-8000-000000000002",
  is_active: true,
  login_id: "scorer1",
  role: "scorer",
  ...overrides,
});

test("an updated profile replaces its row without refetching", () => {
  const previous = [
    profile({ full_name: "Amy", id: "a", login_id: "amy" }),
    profile({ full_name: "Zed", id: "z", login_id: "zed" }),
  ];
  const next = upsertAccountProfile(
    previous,
    profile({ full_name: "Amy Eden", id: "a", login_id: "amy" })
  );
  expect(next?.map((row) => row.full_name)).toEqual(["Amy Eden", "Zed"]);
  expect(previous[0]?.full_name).toBe("Amy");
});

test("a new profile is appended in name order", () => {
  const previous = [
    profile({ full_name: "Amy", id: "a", login_id: "amy" }),
    profile({ full_name: "Zed", id: "z", login_id: "zed" }),
  ];
  const next = upsertAccountProfile(
    previous,
    profile({ full_name: "Moe", id: "m", login_id: "moe" })
  );
  expect(next?.map((row) => row.full_name)).toEqual(["Amy", "Moe", "Zed"]);
});

test("a missing cache stays missing instead of inventing a list", () => {
  expect(upsertAccountProfile(undefined, profile({ id: "m" }))).toBeUndefined();
});
