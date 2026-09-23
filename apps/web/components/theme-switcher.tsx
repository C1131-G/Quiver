"use client";

import { DesktopIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { domMax, LazyMotion, m, MotionConfig } from "motion/react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { runThemeTransition } from "@/lib/theme-transition";

const subscribe = (_listener: () => void) => () => {
  // Theme readiness is derived from the client snapshot; no external store subscription is needed.
};

const THEME_OPTIONS: { icon: PhosphorIcon; label: string; value: string }[] = [
  { icon: DesktopIcon, label: "System", value: "system" },
  { icon: SunIcon, label: "Light", value: "light" },
  { icon: MoonIcon, label: "Dark", value: "dark" },
];

// better-ui: springs never bounce.
const indicatorSpring = { bounce: 0, duration: 0.3, type: "spring" } as const;

/**
 * System / light / dark picker on shadcn's ToggleGroup. The selection is a
 * shared-layout indicator that slides between options; the theme itself
 * changes through the view-transition wipe in lib/theme-transition.
 */
export const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();
  const isMounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  // The stored theme is unknown until mount; reserve the space meanwhile.
  if (!isMounted) {
    return <div className="h-8 w-24" />;
  }

  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">
        <ToggleGroup
          aria-label="Theme"
          onValueChange={(value) => {
            const [next] = value;
            if (next) {
              runThemeTransition(() => setTheme(next));
            }
          }}
          spacing={0}
          value={theme ? [theme] : []}
          variant="segmented"
        >
          {THEME_OPTIONS.map(({ icon: Icon, label, value }) => (
            <ToggleGroupItem
              aria-label={`${label} theme`}
              className="relative"
              key={value}
              value={value}
            >
              {theme === value ? (
                <m.span
                  aria-hidden="true"
                  className="bg-muted absolute inset-0"
                  layoutId="theme-option"
                  transition={indicatorSpring}
                />
              ) : null}
              <Icon aria-hidden="true" className="relative" />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </MotionConfig>
    </LazyMotion>
  );
};
