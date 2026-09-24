/// <reference types="bun" />

import { beforeEach, expect, mock, test } from "bun:test";

const store = new Map<string, string>();
const SECURE_STORE_LIMIT = 2048;

// SecureStore itself, kept in memory and enforcing its 2048-byte limit.
mock.module("expo-secure-store", () => ({
  deleteItemAsync: (key: string) => {
    store.delete(key);
    return Promise.resolve();
  },
  getItemAsync: (key: string) => Promise.resolve(store.get(key) ?? null),
  setItemAsync: (key: string, value: string) => {
    if (value.length > SECURE_STORE_LIMIT) {
      return Promise.reject(new Error("Value too large for SecureStore"));
    }
    store.set(key, value);
    return Promise.resolve();
  },
}));

const { secureStorage } = await import("./secure-storage");

beforeEach(() => store.clear());

test("stores a session larger than SecureStore's limit in chunks", async () => {
  const session = "s".repeat(5000);
  await secureStorage.setItem("quiverscore.auth", session);
  expect(await secureStorage.getItem("quiverscore.auth")).toBe(session);
  expect(store.get("quiverscore.auth")).toBe("3");
});

test("a shorter value removes the chunks it no longer needs", async () => {
  await secureStorage.setItem("quiverscore.auth", "a".repeat(5000));
  await secureStorage.setItem("quiverscore.auth", "short");
  expect(await secureStorage.getItem("quiverscore.auth")).toBe("short");
  expect([...store.keys()].toSorted()).toEqual([
    "quiverscore.auth",
    "quiverscore.auth.0",
  ]);
});

test("removeItem clears every chunk", async () => {
  await secureStorage.setItem("quiverscore.auth", "a".repeat(5000));
  await secureStorage.removeItem("quiverscore.auth");
  expect(store.size).toBe(0);
  expect(await secureStorage.getItem("quiverscore.auth")).toBeNull();
});

test("a missing chunk reads as signed out", async () => {
  await secureStorage.setItem("quiverscore.auth", "a".repeat(5000));
  store.delete("quiverscore.auth.1");
  expect(await secureStorage.getItem("quiverscore.auth")).toBeNull();
});

test("keys are made safe for SecureStore", async () => {
  await secureStorage.setItem("sb-host:auth token", "value");
  expect(store.has("sb-host_auth_token")).toBe(true);
});
