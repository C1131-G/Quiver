import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { supabaseEnv } from "./env";
import { isAdminRole } from "./roles";

const LOGIN_PATH = "/login";
const HOME_PATH = "/dashboard";

const redirectTo = (
  request: NextRequest,
  pathname: string,
  response?: NextResponse
) => {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  // Carry refreshed session cookies across the redirect, or the browser and
  // server fall out of sync and the user is signed out.
  for (const cookie of response?.cookies.getAll() ?? []) {
    redirect.cookies.set(cookie);
  }
  return redirect;
};

/**
 * Refreshes the Supabase session on every request and gates the app: signed
 * out → /login, signed in → away from /login. Accounts are created in
 * Supabase, never here, so there are no sign-up or recovery routes.
 */
export const updateSession = async (request: NextRequest) => {
  const isLoginPage = request.nextUrl.pathname === LOGIN_PATH;

  // Without configuration nobody can sign in; the login page explains why.
  if (!supabaseEnv) {
    return isLoginPage
      ? NextResponse.next({ request })
      : redirectTo(request, LOGIN_PATH);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseEnv.url,
    supabaseEnv.publishableKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // Nothing may run between createServerClient and getClaims(), or users get
  // randomly signed out. getClaims() validates the JWT; never trust
  // getSession() on the server.
  const { data: claims } = await supabase.auth.getClaims();
  let isSignedIn = Boolean(claims?.claims);

  // Scorer accounts are mobile-only. A non-admin session here is ended, not
  // just redirected, so it can't reach any page or data from the desktop.
  if (isSignedIn && !isAdminRole(claims?.claims?.app_metadata)) {
    await supabase.auth.signOut({ scope: "local" });
    isSignedIn = false;
  }

  if (!isSignedIn && !isLoginPage) {
    return redirectTo(request, LOGIN_PATH, response);
  }
  if (isSignedIn && (isLoginPage || request.nextUrl.pathname === "/")) {
    return redirectTo(request, HOME_PATH, response);
  }

  return response;
};
