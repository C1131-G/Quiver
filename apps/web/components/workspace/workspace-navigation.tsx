"use client";

import {
  CalendarDotsIcon,
  ChartLineIcon,
  ClipboardTextIcon,
  GaugeIcon,
  GearIcon,
  UserGearIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";
import { Skeleton } from "@workspace/ui/components/skeleton";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavigationItem {
  href:
    | "/dashboard"
    | "/compare"
    | "/sessions"
    | "/schedule"
    | "/athletes"
    | "/scorers"
    | "/settings";
  icon: PhosphorIcon;
  label: string;
}

const items: NavigationItem[] = [
  { href: "/dashboard", icon: GaugeIcon, label: "Performance" },
  { href: "/compare", icon: ChartLineIcon, label: "Compare" },
  { href: "/sessions", icon: ClipboardTextIcon, label: "Sessions" },
  { href: "/schedule", icon: CalendarDotsIcon, label: "Schedule" },
  { href: "/athletes", icon: UsersThreeIcon, label: "Athletes" },
  { href: "/scorers", icon: UserGearIcon, label: "Scorers" },
  { href: "/settings", icon: GearIcon, label: "Settings" },
];

const isNavigationItemActive = (
  pathname: string,
  href: NavigationItem["href"]
) => pathname === href || pathname.startsWith(`${href}/`);

export const WorkspaceNavigation = () => {
  const pathname = usePathname();
  return (
    <>
      {items.map(({ href, icon: Icon, label }) => (
        <SidebarMenuItem key={href}>
          <SidebarMenuButton
            aria-label={label}
            isActive={isNavigationItemActive(pathname, href)}
            render={
              <Link
                href={href}
                aria-current={
                  isNavigationItemActive(pathname, href) ? "page" : undefined
                }
                transitionTypes={["nav-forward"]}
              />
            }
            tooltip={label}
          >
            {/* Outline by default, filled for the current page. */}
            <Icon
              aria-hidden
              weight={
                isNavigationItemActive(pathname, href) ? "fill" : "regular"
              }
            />
            <span>{label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </>
  );
};

/**
 * Placeholders only. Labelling them would announce navigation that is not
 * there yet, and `aria-label` is prohibited on a span with no role.
 */
export const WorkspaceNavigationSkeleton = () => (
  <>
    {items.map(({ href }) => (
      <SidebarMenuItem aria-hidden="true" key={href}>
        <SidebarMenuButton render={<span />}>
          <Skeleton className="size-4" />
          <Skeleton className="h-4 w-20" />
        </SidebarMenuButton>
      </SidebarMenuItem>
    ))}
  </>
);
