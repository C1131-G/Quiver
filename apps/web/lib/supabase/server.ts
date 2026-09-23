import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseEnv } from "./env";

/**
 * Create a new client per request — never cache it in a module variable, or
 * one user's session could leak into another request.
 */
export const createClient = async () => {
  if (!supabaseEnv) {
    throw new Error("Supabase is not configured.");
  }
  const cookieStore = await cookies();

  return createServerClient(supabaseEnv.url, supabaseEnv.publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, which cannot set cookies. Safe to
          // ignore: proxy.ts refreshes the session on every request.
        }
      },
    },
  });
};
