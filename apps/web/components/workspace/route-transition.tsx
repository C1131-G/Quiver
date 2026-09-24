"use client";

import type { ReactNode } from "react";
import { ViewTransition } from "react";

/**
 * Pages move up as you go deeper and back down when a link is marked
 * `transitionTypes={["nav-back"]}`, so the direction matches the navigation.
 */
export const RouteTransition = ({ children }: { children: ReactNode }) => (
  <ViewTransition
    enter={{ default: "nav-enter", "nav-back": "nav-back-enter" }}
    exit={{ default: "nav-exit", "nav-back": "nav-back-exit" }}
  >
    {children}
  </ViewTransition>
);
