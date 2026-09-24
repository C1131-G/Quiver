import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { createAtom } from "@tanstack/react-store";
import {
  isScorerRole,
  readableSignInError,
  usernameToEmail,
} from "@workspace/shared/accounts";
import { z } from "zod";

import { supabaseEnv } from "@/lib/env";
import { secureStorage } from "@/lib/secure-storage";
import { AUTH_STORAGE_KEY, supabase } from "@/lib/supabase";

/** Who is signed in. Local data is kept per scorer, keyed by `userId`. */
export interface Scorer {
  email: string;
  userId: string;
}

export type AuthState =
  | { status: "loading" }
  | { status: "signed-in"; scorer: Scorer }
  | { status: "signed-out" };

export const authAtom = createAtom<AuthState>({ status: "loading" });

export const NOT_CONFIGURED =
  "Sign-in is not configured for this build. Contact your administrator.";

const ADMIN_ACCOUNT =
  "This is an admin account. Admins sign in to Quiver Dashboard on a computer; QuiverScore is for scorers.";

const toScorer = (user: {
  email?: string | undefined;
  id: User["id"];
}): Scorer => ({
  email: user.email ?? "",
  userId: user.id,
});

/** Just enough of the stored session to know who was signed in. */
const storedSessionSchema = z.object({
  user: z.object({
    app_metadata: z.record(z.string(), z.unknown()),
    email: z.string().optional(),
    id: z.string().min(1),
  }),
});

/**
 * With no signal, Supabase cannot refresh an expired token and reports no
 * session, yet keeps it in storage for when the connection is back. The
 * scorer is still signed in, so read who that is from storage directly.
 */
const readStoredScorer = async () => {
  const stored = await secureStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) {
    return null;
  }
  let json: unknown;
  try {
    json = JSON.parse(stored);
  } catch {
    return null;
  }
  const parsed = storedSessionSchema.safeParse(json);
  if (!(parsed.success && isScorerRole(parsed.data.user.app_metadata))) {
    return null;
  }
  return toScorer(parsed.data.user);
};

const applySession = (session: Session | null) => {
  if (session && isScorerRole(session.user.app_metadata)) {
    authAtom.set({ scorer: toScorer(session.user), status: "signed-in" });
  } else {
    authAtom.set({ status: "signed-out" });
  }
};

// INITIAL_SESSION is handled by restoreSession, which also covers offline.
const TRACKED_EVENTS = new Set<AuthChangeEvent>([
  "SIGNED_IN",
  "SIGNED_OUT",
  "TOKEN_REFRESHED",
  "USER_UPDATED",
]);

const loadSession = async () => {
  if (!supabase) {
    authAtom.set({ status: "signed-out" });
    return;
  }
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error && isAuthRetryableFetchError(error)) {
      const scorer = await readStoredScorer();
      authAtom.set(
        scorer ? { scorer, status: "signed-in" } : { status: "signed-out" }
      );
      return;
    }
    applySession(data.session);
  } catch {
    authAtom.set({ status: "signed-out" });
  }
};

/**
 * Loads the saved session, then follows sign-in, sign-out and refreshes.
 * Returns the cleanup that stops listening.
 */
export const restoreSession = () => {
  const subscription = supabase?.auth.onAuthStateChange((event, session) => {
    if (TRACKED_EVENTS.has(event)) {
      applySession(session);
    }
  }).data.subscription;
  loadSession();
  return () => subscription?.unsubscribe();
};

/** Signs in with a username; returns an error message, or null. */
export const signIn = async (username: string, password: string) => {
  if (!(supabase && supabaseEnv)) {
    return NOT_CONFIGURED;
  }
  const { auth } = supabase;
  const { data, error } = await auth.signInWithPassword({
    email: usernameToEmail(username, supabaseEnv.loginDomain),
    password,
  });
  if (error) {
    return readableSignInError(error.message);
  }
  if (!isScorerRole(data.user.app_metadata)) {
    await auth.signOut({ scope: "local" });
    return ADMIN_ACCOUNT;
  }
  return null;
};

/**
 * Signs out on this phone only. The server session is revoked when online;
 * offline, the local session is dropped anyway so the phone can change hands.
 */
export const signOut = async () => {
  if (!supabase) {
    return;
  }
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) {
    await secureStorage.removeItem(AUTH_STORAGE_KEY);
    authAtom.set({ status: "signed-out" });
  }
};
