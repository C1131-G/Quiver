/**
 * Supabase signs in by email, but people log in with a username. A username
 * maps to `<username>@<domain>`, so each account must be created in Supabase
 * with that email (e.g. `coach@quiver.local`). Anything already containing
 * an "@" is used as-is, so real email accounts keep working.
 */
const USERNAME_EMAIL_DOMAIN =
  process.env.NEXT_PUBLIC_LOGIN_USERNAME_DOMAIN ?? "quiver.local";

export const usernameToEmail = (username: string) => {
  const normalized = username.trim().toLowerCase();
  return normalized.includes("@")
    ? normalized
    : `${normalized}@${USERNAME_EMAIL_DOMAIN}`;
};
