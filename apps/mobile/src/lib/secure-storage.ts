import type { SupportedStorage } from "@supabase/supabase-js";
import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";

/**
 * SecureStore rejects values over 2048 bytes, and a Supabase session is
 * often larger. Each value is split into chunks under that limit, with a
 * count stored under the key itself, so the session stays in the Keychain
 * or Keystore instead of plain storage.
 */
const CHUNK_SIZE = 1800;

// SecureStore keys allow only letters, digits, ".", "-" and "_".
const UNSAFE_KEY_CHARACTERS = /[^\w.-]/gu;

const safeKey = (key: string) => key.replaceAll(UNSAFE_KEY_CHARACTERS, "_");

const chunkKey = (key: string, index: number) => `${safeKey(key)}.${index}`;

const readCount = async (key: string) => {
  const stored = await getItemAsync(safeKey(key));
  const count = Number(stored);
  return Number.isInteger(count) && count > 0 ? count : 0;
};

const removeChunks = async (key: string, from: number, to: number) => {
  const removals: Promise<void>[] = [];
  for (let index = from; index < to; index += 1) {
    removals.push(deleteItemAsync(chunkKey(key, index)));
  }
  await Promise.all(removals);
};

export const secureStorage: SupportedStorage = {
  async getItem(key) {
    const count = await readCount(key);
    if (count === 0) {
      return null;
    }
    const chunks = await Promise.all(
      Array.from({ length: count }, (_chunk, index) =>
        getItemAsync(chunkKey(key, index))
      )
    );
    // A chunk missing means an interrupted write; treat it as signed out.
    if (chunks.some((chunk) => chunk === null)) {
      return null;
    }
    return chunks.join("");
  },

  async removeItem(key) {
    const count = await readCount(key);
    await deleteItemAsync(safeKey(key));
    await removeChunks(key, 0, count);
  },

  async setItem(key, value) {
    const previousCount = await readCount(key);
    const chunks: string[] = [];
    for (let start = 0; start < value.length; start += CHUNK_SIZE) {
      chunks.push(value.slice(start, start + CHUNK_SIZE));
    }
    await Promise.all(
      chunks.map((chunk, index) => setItemAsync(chunkKey(key, index), chunk))
    );
    // The count goes last, so a reader never sees a half-written value.
    await setItemAsync(safeKey(key), String(chunks.length));
    await removeChunks(key, chunks.length, previousCount);
  },
};
