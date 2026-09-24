import { createClient, processLock } from "@supabase/supabase-js";
import type { Database } from "@workspace/shared/database.types";
import { AppState } from "react-native";

import { supabaseEnv } from "./env";
import { secureStorage } from "./secure-storage";

/** A fixed key, so the stored session does not move if the URL changes. */
export const AUTH_STORAGE_KEY = "quiverscore.auth";

/**
 * One client for the app, or null when the build has no Supabase settings.
 * The session lives in SecureStore and survives restarts; scorers stay
 * signed in until they sign out, even while offline.
 */
export const supabase = supabaseEnv
  ? createClient<Database>(supabaseEnv.url, supabaseEnv.publishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        lock: processLock,
        persistSession: true,
        storage: secureStorage,
        storageKey: AUTH_STORAGE_KEY,
      },
    })
  : null;

/**
 * React Native keeps timers paused in the background, so tokens are only
 * refreshed while the app is in the foreground.
 */
export const refreshTokensWhileActive = () => {
  if (!supabase) {
    return;
  }
  const { auth } = supabase;
  if (AppState.currentState === "active") {
    auth.startAutoRefresh();
  }
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active") {
      auth.startAutoRefresh();
    } else {
      auth.stopAutoRefresh();
    }
  });
  return () => {
    subscription.remove();
    auth.stopAutoRefresh();
  };
};
