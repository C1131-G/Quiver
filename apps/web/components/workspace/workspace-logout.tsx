"use client";

import { SignOutIcon } from "@phosphor-icons/react";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export const WorkspaceLogout = () => {
  const router = useRouter();
  const [error, setError] = useState<string>();

  const logout = async () => {
    const { error: signOutError } = await createClient().auth.signOut();
    if (signOutError) {
      setError("Could not log out. Your session is still active.");
      return;
    }
    router.replace("/login");
    router.refresh();
  };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        aria-label="Log out"
        render={<button aria-label="Log out" onClick={logout} type="button" />}
        tooltip="Log out"
      >
        <SignOutIcon aria-hidden="true" />
        <span>Log out</span>
      </SidebarMenuButton>
      {error ? (
        <p className="text-destructive px-2 text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </SidebarMenuItem>
  );
};
