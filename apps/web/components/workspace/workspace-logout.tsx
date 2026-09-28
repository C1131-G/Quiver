"use client";

import { SignOutIcon } from "@phosphor-icons/react";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";
import { useState, useTransition } from "react";

import { createClient } from "@/lib/supabase/client";

export const WorkspaceLogout = () => {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const logout = () => {
    if (isPending) {
      return;
    }
    startTransition(async () => {
      const { error: signOutError } = await createClient().auth.signOut();
      if (signOutError) {
        setError("Could not log out. Your session is still active.");
        return;
      }
      // A full load, not router.replace: Cache Components would otherwise
      // keep the signed-in pages and their cached data alive in memory, and
      // bring back the login page as it was left, mid sign-in.
      window.location.replace("/login");
    });
  };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        disabled={isPending}
        onClick={logout}
        tooltip="Log out"
      >
        <SignOutIcon aria-hidden="true" />
        <span>{isPending ? "Logging out…" : "Log out"}</span>
      </SidebarMenuButton>
      {error ? (
        <p className="text-destructive px-2 text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </SidebarMenuItem>
  );
};
