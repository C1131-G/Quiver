import type { UserAppMetadata } from "@supabase/supabase-js";

/**
 * The role lives in app_metadata, which only the service role can write, so
 * it is safe to trust from verified JWT claims. user_metadata never is.
 */
export const isAdminRole = (appMetadata: UserAppMetadata | undefined) =>
  appMetadata?.role === "admin";
