import { createBrowserClient } from "@supabase/ssr";

import { supabaseEnv } from "./env";

export const createClient = () => {
  if (!supabaseEnv) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in apps/web/.env.local."
    );
  }
  return createBrowserClient(supabaseEnv.url, supabaseEnv.publishableKey);
};
