/**
 * electron-updater puts the whole HTTP failure in `error.message` — status
 * line, every response header, and the `Set-Cookie` values the server sent
 * back. None of that belongs in the UI, so errors are reduced to one
 * sentence before they are broadcast to any renderer; the original is logged
 * in the main process for diagnosis.
 *
 * Kept in its own module so it can be tested without loading
 * electron-updater, which constructs an updater against the Electron `app` at
 * import time and throws outside a real Electron process.
 */
const NETWORK_CODES =
  /ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENETUNREACH/u;

const describeUpdateError = (error) => {
  const raw = String(error?.message ?? "");
  if (/\b404\b/u.test(raw)) {
    return "No published release was found to update from.";
  }
  if (/\b(?:401|403)\b/u.test(raw)) {
    return "The update server refused the request.";
  }
  if (NETWORK_CODES.test(raw)) {
    return "Could not reach the update server. Check your connection.";
  }
  return "Could not check for updates.";
};

module.exports = { describeUpdateError };
