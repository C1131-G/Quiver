"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { useEffect } from "react";
import type { ComponentProps } from "react";

import { runThemeTransition } from "@/lib/theme-transition";

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
};

// The capitalized name is required for React component semantics.
// oxlint-disable-next-line sonarjs/function-name
const ThemeHotkey = () => {
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(
    // oxlint-disable-next-line prefer-arrow-callback
    function listenForThemeHotkey() {
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.defaultPrevented || event.repeat) {
          return;
        }

        // WCAG 2.1.4 forbids an always-on single-character shortcut with no way
        // to disable or remap it, so this requires a non-printing modifier.
        if (!event.altKey || event.metaKey || event.ctrlKey) {
          return;
        }

        if (event.key.toLowerCase() !== "d") {
          return;
        }

        if (isTypingTarget(event.target)) {
          return;
        }

        event.preventDefault();

        runThemeTransition(() =>
          setTheme(resolvedTheme === "dark" ? "light" : "dark")
        );
      };

      window.addEventListener("keydown", onKeyDown);

      return function stopListeningForThemeHotkey() {
        window.removeEventListener("keydown", onKeyDown);
      };
    },
    [resolvedTheme, setTheme]
  );

  return null;
};

const ThemeProvider = ({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) => (
  <NextThemesProvider
    attribute="class"
    defaultTheme="system"
    enableSystem
    disableTransitionOnChange
    {...props}
  >
    <ThemeHotkey />
    {children}
  </NextThemesProvider>
);

export { ThemeProvider };
