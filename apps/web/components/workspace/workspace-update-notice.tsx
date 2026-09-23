"use client";

import { ArrowClockwiseIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";

import { useAppUpdate } from "@/lib/use-app-update";

/**
 * Sits in the sidebar footer, above Log out. Renders nothing until a new
 * release has actually finished downloading in the background (the desktop
 * updater auto-downloads once it finds one) — a "checking"/"downloading" row
 * would just be noise the user can't act on yet.
 */
export const WorkspaceUpdateNotice = () => {
  const { available, install, status } = useAppUpdate();

  if (!available || status.state !== "ready") {
    return null;
  }

  const label = `Restart to install Quiver Dashboard ${status.version}`;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        aria-label={label}
        onClick={() => install()}
        tooltip={label}
      >
        <DownloadSimpleIcon aria-hidden="true" />
        <span>Update to v{status.version}</span>
        <ArrowClockwiseIcon aria-hidden="true" className="ml-auto size-4" />
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};
