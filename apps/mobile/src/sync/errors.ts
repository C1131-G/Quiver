/**
 * Why a send failed decides what happens next. A transient failure (no
 * signal, a timeout, the server down) is retried later. A rejection is the
 * server saying no, which retrying cannot change: the session's changes stay
 * on the phone and the scorer is told.
 */
export class SyncRejectedError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "SyncRejectedError";
    this.code = code;
  }
}

export const NOT_OPEN = "not_open";
export const NOT_FOUND = "not_found";

const REJECTION_MESSAGES = new Map([
  [
    "42501",
    "The server refused these scores. The session may have been submitted or changed in Quiver Dashboard, or your account switched off.",
  ],
  [
    NOT_OPEN,
    "This session was submitted or cancelled in Quiver Dashboard, so these changes can't be added.",
  ],
  [NOT_FOUND, "This session is no longer on the server."],
]);

export const rejection = (code: string) =>
  new SyncRejectedError(
    code,
    REJECTION_MESSAGES.get(code) ??
      `The server rejected these scores (code ${code}).`
  );

/** HTTP statuses that mean "not now" rather than "no". */
const RETRY_STATUSES = new Set([0, 401, 408, 425, 429]);
const LOWEST_SERVER_ERROR = 500;

/**
 * Turns a failed Supabase response into the error to throw. Only a clear
 * client error counts as a rejection; anything else, including no response
 * at all, is worth trying again.
 */
export const toSyncError = (
  status: number,
  error: { code?: string; message: string }
) => {
  if (RETRY_STATUSES.has(status) || status >= LOWEST_SERVER_ERROR) {
    return new Error(error.message);
  }
  return rejection(error.code || String(status));
};
