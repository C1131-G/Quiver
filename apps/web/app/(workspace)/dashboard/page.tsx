import type { Metadata } from "next";
import { Suspense } from "react";

import { supabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard",
};

/** Reads the session cookie, so it streams in behind the static heading. */
const SignedInAs = async () => {
  // Env is inlined at build time, so an unconfigured build renders nothing
  // here rather than failing to prerender.
  if (!supabaseEnv) {
    return null;
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims.email;

  return email ? (
    <p className="text-muted-foreground mt-2">Signed in as {email}</p>
  ) : null;
};

const DashboardPage = () => (
  <div>
    <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
    <Suspense fallback={<p className="text-muted-foreground mt-2">&nbsp;</p>}>
      <SignedInAs />
    </Suspense>
  </div>
);

export default DashboardPage;
