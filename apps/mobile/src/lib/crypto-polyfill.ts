import { getRandomValues, randomUUID } from "expo-crypto";

interface MinimalCrypto {
  getRandomValues: typeof getRandomValues;
  randomUUID: () => string;
}

/**
 * Hermes has no `crypto` global. @tanstack/db's persistence layer needs
 * `crypto.randomUUID`/`getRandomValues`, so this must load before anything
 * that might construct a persisted collection (imported first in _layout).
 */
// SAFETY: globalThis has no `crypto` type on React Native; this assertion
// only widens it enough to read and assign the property we polyfill below.
const target = globalThis as { crypto?: MinimalCrypto };

if (target.crypto === undefined) {
  target.crypto = { getRandomValues, randomUUID };
}
