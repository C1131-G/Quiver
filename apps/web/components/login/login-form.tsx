"use client";

import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { Button } from "@workspace/ui/components/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@workspace/ui/components/input-group";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { IconSwap } from "@/components/icon-swap";
import { createClient } from "@/lib/supabase/client";
import { supabaseEnv } from "@/lib/supabase/env";
import { isAdminRole } from "@/lib/supabase/roles";
import { usernameToEmail } from "@/lib/supabase/username";

const NOT_CONFIGURED =
  "Sign-in is not configured for this build. Contact your administrator.";

const SCORER_ACCOUNT =
  "This is a scorer account. Scorers use the Quiver mobile app; only admins can sign in here.";

/**
 * Supabase answers a bad username or password with one generic error on
 * purpose (so accounts can't be probed); anything else is a connection issue.
 */
const readableError = (message: string) => {
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

const PasswordField = ({
  describedBy,
  invalid,
}: {
  describedBy: string | undefined;
  invalid: boolean;
}) => {
  const [visible, setVisible] = useState(false);
  const label = visible ? "Hide password" : "Show password";

  return (
    <InputGroup>
      <InputGroupInput
        aria-describedby={describedBy}
        aria-invalid={invalid}
        autoComplete="current-password"
        id="login-password"
        name="password"
        required
        type={visible ? "text" : "password"}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          aria-controls="login-password"
          aria-label={label}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
          size="icon-xs"
          static
          title={label}
        >
          <IconSwap iconKey={visible ? "hide" : "show"}>
            {visible ? (
              <EyeSlashIcon aria-hidden="true" />
            ) : (
              <EyeIcon aria-hidden="true" />
            )}
          </IconSwap>
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
};

interface SignInState {
  error: string | undefined;
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
      const supabase = createClient();
      const { data: session, error: signInError } =
        await supabase.auth.signInWithPassword({
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
      if (!isAdminRole(session.user?.app_metadata)) {
        await supabase.auth.signOut({ scope: "local" });
        return {
          error: SCORER_ACCOUNT,
          signedIn: false,
          username: submittedUsername,
        };
      }
      // The session cookie is set; re-run the proxy so the server sees it.
      router.replace("/dashboard");
      router.refresh();
      return { error: undefined, signedIn: true, username: submittedUsername };
    },
    {
      error: supabaseEnv ? undefined : NOT_CONFIGURED,
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

  // Sign-in failures are form-level (Supabase answers bad credentials with
  // one generic error), so the summary takes focus and both fields point at
  // it until the next attempt.
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(
    // oxlint-disable-next-line prefer-arrow-callback -- named for stack traces and the effects skill
    function focusLoginError() {
      if (error) {
        errorRef.current?.focus();
      }
    },
    [error]
  );

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <header className="mb-6 flex flex-col gap-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-muted-foreground text-sm">
            Log in to your Quiver Dashboard account
          </p>
        </header>
        <form action={signIn}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="login-username">Username</FieldLabel>
              <Input
                aria-describedby={error ? "login-error" : undefined}
                aria-invalid={Boolean(error)}
                autoCapitalize="none"
                autoComplete="username"
                defaultValue={username}
                id="login-username"
                maxLength={64}
                minLength={3}
                name="username"
                required
                spellCheck={false}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="login-password">Password</FieldLabel>
              <PasswordField
                describedBy={error ? "login-error" : undefined}
                invalid={Boolean(error)}
              />
            </Field>
            <Field>
              <Button disabled={isPending || signedIn} size="lg" type="submit">
                {submitLabel}
              </Button>
              {error ? (
                <FieldError id="login-error" ref={errorRef} tabIndex={-1}>
                  {error}
                </FieldError>
              ) : null}
            </Field>
          </FieldGroup>
        </form>
      </div>
    </main>
  );
};
