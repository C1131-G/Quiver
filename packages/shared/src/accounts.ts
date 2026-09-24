import type { UserAppMetadata } from "@supabase/supabase-js";

/**
 * Supabase signs in by email, but people log in with a username. A username
 * maps to `<username>@<domain>`, so each account must be created in Supabase
 * with that email (e.g. `coach@quiver.local`). Anything already containing
 * an "@" is used as-is, so real email accounts keep working.
 */
export const DEFAULT_USERNAME_EMAIL_DOMAIN = "quiver.local";

export const usernameToEmail = (
  username: string,
  domain: string = DEFAULT_USERNAME_EMAIL_DOMAIN
) => {
  const normalized = username.trim().toLowerCase();
  return normalized.includes("@") ? normalized : `${normalized}@${domain}`;
};

/**
 * The role lives in app_metadata, which only the service role can write, so
 * it is safe to trust from verified JWT claims. user_metadata never is.
 */
export const isAdminRole = (appMetadata?: UserAppMetadata) =>
  appMetadata?.role === "admin";

export const isScorerRole = (appMetadata?: UserAppMetadata) =>
  appMetadata?.role === "scorer";

/**
 * Supabase answers a bad username or password with one generic error on
 * purpose (so accounts can't be probed); anything else is a connection issue.
 */
export const readableSignInError = (message: string) => {
  const lowered = message.toLowerCase();
  if (lowered.includes("invalid login credentials")) {
    return "The username or password is incorrect.";
  }
  // Deactivated accounts are banned in Supabase Auth.
  if (lowered.includes("banned")) {
    return "This account has been deactivated. Contact your administrator.";
  }
  return "Could not sign in. Check your connection and try again.";
};
