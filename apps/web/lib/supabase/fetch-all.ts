import { loadError } from "./load-error";

/** PostgREST returns at most this many rows per request (config.toml). */
const MAX_ROWS = 1000;

/**
 * Reads a whole ordered result a page at a time, so the row cap never
 * silently truncates a table or an export.
 */
export const fetchAllRows = async <T>(
  fetchPage: (
    start: number,
    end: number
  ) => PromiseLike<{ data: T[] | null; error: { code?: string } | null }>
) => {
  const rows: T[] = [];
  for (let start = 0; ; start += MAX_ROWS) {
    // Pages must load in order; each one decides whether another follows.
    // oxlint-disable-next-line no-await-in-loop
    const { data, error } = await fetchPage(start, start + MAX_ROWS - 1);
    if (error || !data) {
      throw loadError(
        "Could not load the data. Check your connection and try again.",
        error ?? {}
      );
    }
    rows.push(...data);
    if (data.length < MAX_ROWS) {
      return rows;
    }
  }
};
