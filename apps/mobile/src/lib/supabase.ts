import { createClient } from "@supabase/supabase-js";
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
  // Offline or a dropped connection rejects this; the client's own refresh
  // timer retries on its next tick, so there is nothing more to do here.
  const startRefresh = async () => {
    try {
      await auth.startAutoRefresh();
    } catch {
      // Retried automatically on the client's own refresh timer.
    }
  };
  if (AppState.currentState === "active") {
    startRefresh();
  }
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active") {
      startRefresh();
    } else {
      auth.stopAutoRefresh();
    }
  });
  return () => {
    subscription.remove();
    auth.stopAutoRefresh();
  };
};
