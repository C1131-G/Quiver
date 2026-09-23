/**
 * `NEXT_PUBLIC_` values are inlined at build time, so the desktop installer
 * carries whatever apps/web/.env.local held when it was built.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseEnv =
  url && publishableKey ? { publishableKey, url } : null;
