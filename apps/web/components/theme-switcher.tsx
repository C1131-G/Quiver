"use client";

import { DesktopIcon, SunIcon, MoonIcon } from "@phosphor-icons/react";
import { domMax, LazyMotion, m } from "motion/react";
import { useTheme } from "next-themes";
import type { JSX } from "react";
import { useSyncExternalStore } from "react";

import { runThemeTransition } from "@/lib/theme-transition";

const subscribe = (_listener: () => void) => () => {
  // Theme readiness is derived from the client snapshot; no external store subscription is needed.
};

const ThemeOption = ({
  icon,
  value,
  isActive,
  onClick,
}: {
  icon: JSX.Element;
  value: string;
  isActive?: boolean;
  onClick: (value: string) => void;
}) => (
  <button
    type="button"
    data-active={isActive}
    className="text-muted-foreground hover:text-foreground data-[active=true]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 relative flex size-8 items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-3 [&_svg]:size-4"
    aria-label={`Switch to ${value} theme`}
    aria-pressed={isActive}
    onClick={() => onClick(value)}
  >
    {icon}

    {isActive && (
      <m.span
        layoutId="theme-option"
        transition={{ bounce: 0.3, duration: 0.6, type: "spring" }}
        className="pointer-events-none absolute inset-0 rounded-full border"
      />
    )}
  </button>
);

const THEME_OPTIONS = [
  {
    icon: <DesktopIcon />,
    value: "system",
  },
  {
    icon: <SunIcon />,
    value: "light",
  },
  {
    icon: <MoonIcon />,
    value: "dark",
  },
];

const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();

  const isMounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  if (!isMounted) {
    return <div className="flex h-8 w-24" />;
  }

  const handleThemeChange = (value: string) => {
    runThemeTransition(() => setTheme(value));
  };

  // domMax (not domAnimation) because the active pill animates via layoutId.
  return (
    <LazyMotion features={domMax} strict>
      <m.div
        key={String(isMounted)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-background inset-ring-border inline-flex items-center overflow-clip rounded-full inset-ring-1"
      >
        {THEME_OPTIONS.map((option) => (
          <ThemeOption
            key={option.value}
            icon={option.icon}
            value={option.value}
            isActive={theme === option.value}
            onClick={handleThemeChange}
          />
        ))}
      </m.div>
    </LazyMotion>
  );
};

export { ThemeSwitcher };
