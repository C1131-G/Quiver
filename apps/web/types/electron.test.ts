/// <reference types="bun" />

import { expect, test } from "bun:test";

import { updateStatusSchema } from "./electron";

test("updater statuses keep their state, version, and progress", () => {
  expect(
    updateStatusSchema.safeParse({ state: "downloading", version: "1.2.3" })
      .success
  ).toBe(true);
  expect(
    updateStatusSchema.safeParse({
      percent: 42,
      state: "downloading",
      version: "1.2.3",
    }).success
  ).toBe(true);
});

test("malformed updater statuses are rejected before they reach state", () => {
  expect(updateStatusSchema.safeParse({ state: "ready" }).success).toBe(false);
  expect(updateStatusSchema.safeParse({ state: "downloading" }).success).toBe(
    false
  );
  expect(updateStatusSchema.safeParse(null).success).toBe(false);
});
