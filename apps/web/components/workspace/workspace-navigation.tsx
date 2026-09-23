"use client";

import {
  GaugeIcon,
  GearIcon,
  UserGearIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar";
import { Skeleton } from "@workspace/ui/components/skeleton";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

interface NavigationItem {
  href: "/dashboard" | "/athletes" | "/users" | "/settings";
  icon: ComponentType<{ "aria-hidden"?: boolean }>;
  label: string;
}

const items: NavigationItem[] = [
  { href: "/dashboard", icon: GaugeIcon, label: "Dashboard" },
  { href: "/athletes", icon: UsersThreeIcon, label: "Athletes" },
  { href: "/users", icon: UserGearIcon, label: "Users" },
  { href: "/settings", icon: GearIcon, label: "Settings" },
];

const isNavigationItemActive = (
  pathname: string,
  href: NavigationItem["href"]
) => pathname === href || pathname.startsWith(`${href}/`);

export const WorkspaceNavigation = () => {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
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
                onClick={() => {
                  if (isMobile) {
                    setOpenMobile(false);
                  }
                }}
                transitionTypes={["nav-forward"]}
              />
            }
            tooltip={label}
          >
            <Icon aria-hidden />
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
