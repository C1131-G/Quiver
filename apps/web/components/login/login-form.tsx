"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { supabaseEnv } from "@/lib/supabase/env";
import { usernameToEmail } from "@/lib/supabase/username";

import styles from "./login.module.css";

const NOT_CONFIGURED =
  "Sign-in is not configured for this build. Contact your administrator.";

/**
 * Supabase answers a bad username or password with one generic error on
 * purpose (so accounts can't be probed); anything else is a connection issue.
 */
const readableError = (message: string) =>
  message.toLowerCase().includes("invalid login credentials")
    ? "The username or password is incorrect."
    : "Could not sign in. Check your connection and try again.";

const EyeOpen = () => (
  <svg
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeClosed = () => (
  <svg
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" x2="23" y1="1" y2="23" />
  </svg>
);

const PasswordField = () => {
  const [visible, setVisible] = useState(false);
  const label = visible ? "Hide password" : "Show password";

  return (
    <div className={styles.passwordField}>
      <input
        autoComplete="current-password"
        className={styles.input}
        id="login-password"
        name="password"
        required
        type={visible ? "text" : "password"}
      />
      <button
        aria-controls="login-password"
        aria-label={label}
        aria-pressed={visible}
        className={styles.toggle}
        onClick={() => setVisible((current) => !current)}
        title={label}
        type="button"
      >
        {visible ? <EyeClosed /> : <EyeOpen />}
      </button>
    </div>
  );
};

interface SignInState {
  error: string | null;
  signedIn: boolean;
  username: string;
}

export const LoginForm = () => {
  const router = useRouter();

  // The username is returned with the result so a failed attempt keeps it:
  // React resets the form after an action, back to each field default.
  const [{ error, signedIn, username }, signIn, isPending] = useActionState(
    async (
      _previous: SignInState,
      formData: FormData
    ): Promise<SignInState> => {
      const submittedUsername = String(formData.get("username") ?? "").trim();
      if (!supabaseEnv) {
        return {
          error: NOT_CONFIGURED,
          signedIn: false,
          username: submittedUsername,
        };
      }
      const { error: signInError } =
        await createClient().auth.signInWithPassword({
          email: usernameToEmail(submittedUsername),
          password: String(formData.get("password") ?? ""),
        });
      if (signInError) {
        return {
          error: readableError(signInError.message),
          signedIn: false,
          username: submittedUsername,
        };
      }
      // The session cookie is set; re-run the proxy so the server sees it.
      router.replace("/dashboard");
      router.refresh();
      return { error: null, signedIn: true, username: submittedUsername };
    },
    {
      error: supabaseEnv ? null : NOT_CONFIGURED,
      signedIn: false,
      username: "",
    }
  );

  let submitLabel = "Log in";
  if (isPending) {
    submitLabel = "Logging in…";
  } else if (signedIn) {
    submitLabel = "Starting Quiver Dashboard…";
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.intro}>
          <h1>Welcome back</h1>
          <p>Log in to your Quiver Dashboard account</p>
        </section>
        <form action={signIn} className={styles.form}>
          <label className={styles.label} htmlFor="login-username">
            Username
          </label>
          <input
            autoComplete="username"
            className={styles.input}
            defaultValue={username}
            id="login-username"
            maxLength={64}
            minLength={3}
            name="username"
            required
            type="text"
          />
          <label className={styles.label} htmlFor="login-password">
            Password
          </label>
          <PasswordField />
          <button
            className={styles.submit}
            disabled={isPending || signedIn}
            type="submit"
          >
            {submitLabel}
          </button>
        </form>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </main>
    </div>
  );
};
