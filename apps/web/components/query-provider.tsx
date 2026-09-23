"use client";

import {
  isServer,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import type { ReactNode } from "react";

const STALE_TIME_MS = 30_000;

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: STALE_TIME_MS },
    },
  });

let browserQueryClient: QueryClient | undefined;

/**
 * A fresh client per server render (never shared between requests) and one
 * per browser, so the cache survives navigation. The desktop app always
 * talks to a live backend: data refetches on focus and counts as fresh for
 * 30 seconds between visits.
 */
const getQueryClient = () => {
  if (isServer) {
    return makeQueryClient();
  }
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
};

export const QueryProvider = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={getQueryClient()}>
    {children}
  </QueryClientProvider>
);
