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

import { SectionErrorBoundary } from "@/components/section-error-boundary";

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
    <SectionErrorBoundary title="Navigation could not be shown">
      <Suspense fallback={null}>
        <RouteFocus />
      </Suspense>
    </SectionErrorBoundary>
    <TooltipProvider>
      <SidebarProvider>
        {/* The sidebar renders a native nav landmark, so its header and
            footer sit inside a landmark instead of orphaned content. */}
        <Sidebar aria-label="Workspace" collapsible="icon">
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
              translate="no"
            >
              Quiver Dashboard
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SectionErrorBoundary title="Navigation could not be shown">
                    <Suspense fallback={<WorkspaceNavigationSkeleton />}>
                      <WorkspaceNavigation />
                    </Suspense>
                  </SectionErrorBoundary>
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
            className="focus-visible:ring-ring/50 min-h-0 flex-1 scroll-mt-14 overflow-y-auto focus-visible:ring-2 focus-visible:outline-none"
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
