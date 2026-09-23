"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export const MAIN_CONTENT_ID = "main-content";

/**
 * A soft navigation replaces the page without moving focus, so screen reader
 * and keyboard users stay wherever they were. Moving focus to the new main
 * region makes the destination announce itself and puts Tab at the top of it.
 */
export const RouteFocus = () => {
  const pathname = usePathname();
  const previousPathname = useRef("");

  const focusMainOnRouteChange = () => {
    const previous = previousPathname.current;
    previousPathname.current = pathname;

    if (!previous || previous === pathname) {
      return;
    }

    const main = document.querySelector(`#${MAIN_CONTENT_ID}`);
    if (main instanceof HTMLElement) {
      main.focus();
    }
  };
  useEffect(focusMainOnRouteChange, [pathname]);

  return null;
};
