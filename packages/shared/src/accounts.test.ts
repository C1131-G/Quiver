import { describe, expect, test } from "bun:test";

import {
  isAdminRole,
  isScorerRole,
  readableSignInError,
  usernameToEmail,
} from "./accounts";

describe("usernameToEmail", () => {
  test("maps a username to the login domain", () => {
    expect(usernameToEmail("  Scorer1 ")).toBe("scorer1@quiver.local");
  });

  test("keeps a real email and honours another domain", () => {
    expect(usernameToEmail("Coach@Club.org")).toBe("coach@club.org");
    expect(usernameToEmail("scorer1", "club.org")).toBe("scorer1@club.org");
  });
});

test("roles come from app_metadata only", () => {
  expect(isAdminRole({ role: "admin" })).toBe(true);
  expect(isScorerRole({ role: "scorer" })).toBe(true);
  expect(isScorerRole({ role: "admin" })).toBe(false);
  expect(isScorerRole()).toBe(false);
});

test("readableSignInError hides the difference between bad username and password", () => {
  expect(readableSignInError("Invalid login credentials")).toBe(
    "The username or password is incorrect."
  );
  expect(readableSignInError("User is banned")).toContain("deactivated");
  expect(readableSignInError("Network request failed")).toContain("connection");
});
