"use client";

import {
  isServer,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import type { ReactNode } from "react";

import { STALE_TIME_MS } from "@/lib/query-defaults";
import { shouldRetry } from "@/lib/supabase/load-error";

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: STALE_TIME_MS },
    },
  });

let browserQueryClient: QueryClient | undefined;

/**
 * A fresh client per server render (never shared between requests) and one
 * per browser, so the cache survives navigation. Data counts as fresh for 30
 * seconds between visits and refetches on focus; while live updates are
 * connected, score data is pushed instead (see workspace/live-updates).
 * Only failures a retry could fix (a dropped connection) are retried.
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
