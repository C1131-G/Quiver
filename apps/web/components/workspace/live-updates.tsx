"use client";

import type { QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@workspace/ui/lib/utils";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { supabaseEnv } from "@/lib/supabase/env";

type LiveStatus = "connecting" | "live" | "paused";

/** Queries built from scores; lookups, athletes and accounts are not. */
const SCORE_QUERY_ROOTS = new Set([
  "compare",
  "performance",
  "session",
  "session-corrections",
  "sessions",
]);

// A scorer enters a whole end in a burst; refresh once per burst.
const REFRESH_DELAY_MS = 1500;

const SCORE_TABLES = ["sessions", "ends", "arrows"] as const;

const STATUS_LABELS: Record<LiveStatus, string> = {
  connecting: "Connecting to live scores",
  live: "Live scores on",
  paused: "Live scores paused",
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
      queryClient.invalidateQueries({
        predicate: (query) => SCORE_QUERY_ROOTS.has(String(query.queryKey[0])),
      });
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
  channel.subscribe((state) => {
    if (state === "SUBSCRIBED") {
      onStatus("live");
    } else if (
      state === "CHANNEL_ERROR" ||
      state === "TIMED_OUT" ||
      state === "CLOSED"
    ) {
      onStatus("paused");
    }
  });

  return () => {
    clearTimeout(pending);
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

  useEffect(() => {
    if (!supabaseEnv) {
      return;
    }
    return subscribeToScores(queryClient, setStatus);
  }, [queryClient]);

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
