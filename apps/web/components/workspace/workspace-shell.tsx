"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";
import { TooltipProvider } from "@workspace/ui/components/tooltip";
import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense } from "react";

import { LiveUpdates } from "./live-updates";
import { MAIN_CONTENT_ID, RouteFocus } from "./route-focus";
import { RouteTransition } from "./route-transition";
import { WorkspaceLogout } from "./workspace-logout";
import {
  WorkspaceNavigation,
  WorkspaceNavigationSkeleton,
} from "./workspace-navigation";
import { WorkspaceUpdateNotice } from "./workspace-update-notice";

export const WorkspaceShell = ({ children }: { children: ReactNode }) => (
  <>
    {/* usePathname is dynamic, which a prerendered shell cannot resolve. */}
    {/* RouteFocus has no visible output; its null fallback avoids layout shift. */}
    <Suspense fallback={null}>
      <RouteFocus />
    </Suspense>
    <TooltipProvider>
      <SidebarProvider>
        {/* Sidebar renders a div it owns, so the landmark comes from the role
            rather than a nav tag. Without it axe reports the sidebar header and
            footer as content outside any landmark. */}
        {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role */}
        <Sidebar aria-label="Workspace" collapsible="icon" role="navigation">
          <a
            className="bg-background focus-visible:ring-ring sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:border focus:px-3 focus:py-2 focus:text-sm focus-visible:ring-2"
            href={`#${MAIN_CONTENT_ID}`}
          >
            Skip to main content
          </a>
          <SidebarHeader className="h-14 justify-center">
            <Link
              className="truncate px-2 font-semibold group-data-[collapsible=icon]:hidden"
              href="/dashboard"
            >
              Quiver Dashboard
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <Suspense fallback={<WorkspaceNavigationSkeleton />}>
                    <WorkspaceNavigation />
                  </Suspense>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <WorkspaceUpdateNotice />
              <WorkspaceLogout />
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        <SidebarInset className="h-dvh overflow-hidden">
          <header className="bg-background/95 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
            <SidebarTrigger className="-ml-1" />
            <LiveUpdates />
          </header>
          <main
            className="min-h-0 flex-1 overflow-y-auto focus-visible:outline-none"
            id={MAIN_CONTENT_ID}
            tabIndex={-1}
          >
            <div className="mx-auto w-full max-w-7xl p-8">
              <RouteTransition>{children}</RouteTransition>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  </>
);
