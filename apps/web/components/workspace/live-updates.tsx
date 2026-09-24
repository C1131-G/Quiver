"use client";

import type { QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@workspace/ui/lib/utils";
import { useEffect, useState } from "react";

import { compareKeys } from "@/components/compare/use-compare";
import { performanceKeys } from "@/components/performance/use-performance";
import { sessionKeys } from "@/components/sessions/use-sessions";
import { STALE_TIME_MS } from "@/lib/query-defaults";
import { createClient } from "@/lib/supabase/client";
import { supabaseEnv } from "@/lib/supabase/env";

type LiveStatus = "connecting" | "live" | "paused";

/** Queries built from scores; lookups, athletes and accounts are not. */
const SCORE_QUERY_ROOTS = [
  compareKeys.all,
  performanceKeys.all,
  sessionKeys.all,
] as const;

// A scorer enters a whole end in a burst; refresh once per burst.
const REFRESH_DELAY_MS = 1500;

const SCORE_TABLES = ["sessions", "ends", "arrows"] as const;

const STATUS_LABELS: Record<LiveStatus, string> = {
  connecting: "Connecting to live scores",
  live: "Live scores on",
  paused: "Live scores paused",
};

const refreshScores = (queryClient: QueryClient) =>
  Promise.all(
    SCORE_QUERY_ROOTS.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey })
    )
  );

/**
 * While changes are pushed, score data stays fresh until a push says
 * otherwise, so focus and remounts do not refetch it. When the connection
 * drops, the ordinary 30-second freshness and focus refetch take over.
 */
const setScoreFreshness = (queryClient: QueryClient, live: boolean) => {
  for (const queryKey of SCORE_QUERY_ROOTS) {
    queryClient.setQueryDefaults(queryKey, {
      refetchOnWindowFocus: !live,
      staleTime: live ? Number.POSITIVE_INFINITY : STALE_TIME_MS,
    });
  }
};

/**
 * Subscribes to score changes and refreshes score queries once per burst.
 * Returns the cleanup that removes the channel and any pending refresh.
 */
const subscribeToScores = (
  queryClient: QueryClient,
  onStatus: (status: LiveStatus) => void
) => {
  const supabase = createClient();
  let pending: ReturnType<typeof setTimeout> | undefined;
  const scheduleRefresh = () => {
    if (pending) {
      return;
    }
    pending = setTimeout(() => {
      pending = undefined;
      refreshScores(queryClient);
    }, REFRESH_DELAY_MS);
  };

  const channel = supabase.channel("score-changes");
  for (const table of SCORE_TABLES) {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      scheduleRefresh
    );
  }
  let wasLive = false;
  channel.subscribe((state) => {
    if (state === "SUBSCRIBED") {
      setScoreFreshness(queryClient, true);
      // Anything that changed while disconnected was never pushed.
      if (wasLive) {
        refreshScores(queryClient);
      }
      wasLive = true;
      onStatus("live");
    } else if (
      state === "CHANNEL_ERROR" ||
      state === "TIMED_OUT" ||
      state === "CLOSED"
    ) {
      setScoreFreshness(queryClient, false);
      onStatus("paused");
    }
  });

  return function unsubscribeFromScores() {
    clearTimeout(pending);
    setScoreFreshness(queryClient, false);
    supabase.removeChannel(channel);
  };
};

/**
 * Keeps every score view current while scorers work on the mobile app.
 * Supabase Realtime applies the same RLS as queries, so this sees exactly
 * the rows the admin can read.
 */
export const LiveUpdates = () => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<LiveStatus>(
    supabaseEnv ? "connecting" : "paused"
  );

  useEffect(
    // oxlint-disable-next-line prefer-arrow-callback -- named for stack traces and the effects skill
    function connectToLiveScores() {
      if (!supabaseEnv) {
        return;
      }
      return subscribeToScores(queryClient, setStatus);
    },
    [queryClient]
  );

  return (
    <output
      aria-live="polite"
      className="text-muted-foreground ml-auto flex items-center gap-2 text-xs"
    >
      {/* Filled when live, hollow otherwise; the text says which. */}
      <span
        aria-hidden="true"
        className={cn(
          "size-2 border",
          status === "live"
            ? "border-foreground bg-foreground"
            : "border-muted-foreground"
        )}
      />
      {STATUS_LABELS[status]}
    </output>
  );
};
