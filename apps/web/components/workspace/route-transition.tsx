"use client";

import type { ReactNode } from "react";
import { ViewTransition } from "react";

export const RouteTransition = ({ children }: { children: ReactNode }) => (
  <ViewTransition enter="nav-enter" exit="nav-exit">
    {children}
  </ViewTransition>
);
