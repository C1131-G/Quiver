/**
 * A failed read, with whether trying again could help. A network drop can
 * recover; a permission, constraint or malformed-request error from Postgres
 * or PostgREST gives the same answer every time.
 */
export class LoadError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "LoadError";
    this.retryable = retryable;
  }
}

// Postgres answers with a five-character SQLSTATE; PostgREST with PGRSTnnn.
// Neither changes on a retry. Network failures come back without a code.
const PERMANENT_CODE = /^(?:[0-9A-Z]{5}|PGRST\d+)$/u;

/** Wraps a Supabase error in the message people should see. */
export const loadError = (message: string, cause: { code?: string }) =>
  new LoadError(message, !PERMANENT_CODE.test(cause.code ?? ""));

const MAX_RETRIES = 1;

/** Query retry policy: one more try, and only when it could help. */
export const shouldRetry = (failureCount: number, error: Error) =>
  failureCount < MAX_RETRIES &&
  !(error instanceof LoadError && !error.retryable);
