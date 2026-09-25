import type { ExpoSQLiteDatabaseLike } from "@tanstack/expo-db-sqlite-persistence";
import type { SQLiteBindParams, SQLiteDatabase } from "expo-sqlite";
import { z } from "zod";

/**
 * TanStack DB's Expo adapter describes the database loosely (any bind
 * value, a result per transaction); expo-sqlite is stricter. This bridges
 * the two by parsing instead of asserting.
 */

type ExpoSQLiteQueryable = Pick<
  ExpoSQLiteDatabaseLike,
  "execAsync" | "getAllAsync" | "runAsync"
>;
type ExpoSQLiteBindParams = Parameters<ExpoSQLiteQueryable["runAsync"]>[1];

const bindValueSchema = z.union([
  z.null(),
  z.string(),
  z.number(),
  z.boolean(),
  z.instanceof(Uint8Array),
]);

const bindParamsSchema = z.union([
  z.array(bindValueSchema),
  z.record(z.string(), bindValueSchema),
]);

const toBindParams = (params?: ExpoSQLiteBindParams): SQLiteBindParams =>
  params === undefined ? [] : bindParamsSchema.parse(params);

type ExpoQueryable = Pick<
  SQLiteDatabase,
  "execAsync" | "getAllAsync" | "runAsync"
>;

const toQueryable = (database: ExpoQueryable): ExpoSQLiteQueryable => ({
  execAsync: (sql) => database.execAsync(sql),
  getAllAsync: <TRow>(sql: string, params?: ExpoSQLiteBindParams) =>
    database.getAllAsync<TRow>(sql, toBindParams(params)),
  runAsync: async (sql, params) => {
    const { changes, lastInsertRowId } = await database.runAsync(
      sql,
      toBindParams(params)
    );
    return { changes, lastInsertRowId };
  },
});

/** Carries a transaction's result out of expo-sqlite, which returns none. */
interface TransactionResult<TValue> {
  settled?: { value: TValue };
}

export const toPersistenceDatabase = (
  database: SQLiteDatabase
): ExpoSQLiteDatabaseLike => ({
  ...toQueryable(database),
  closeAsync: () => database.closeAsync(),
  withExclusiveTransactionAsync: async <TValue>(
    task: (transaction: ExpoSQLiteQueryable) => Promise<TValue>
  ) => {
    const result: TransactionResult<TValue> = {};
    await database.withExclusiveTransactionAsync(async (transaction) => {
      result.settled = { value: await task(toQueryable(transaction)) };
    });
    if (!result.settled) {
      throw new Error("The SQLite transaction finished without a result");
    }
    return result.settled.value;
  },
});
