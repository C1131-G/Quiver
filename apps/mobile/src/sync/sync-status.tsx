import { useSelector } from "@tanstack/react-store";
import { useState } from "react";
import { View } from "react-native";
import { toast } from "sonner-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import type { SyncIssue } from "@/db/rows";
import { useScorerDb } from "@/db/scorer-db-context";

import { syncAtom } from "./engine";
import { retrySession, usePendingSync } from "./use-sync-status";

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

/** One quiet line on what has reached the server. Never blocks scoring. */
export const SyncStatusLine = () => {
  const { online, phase } = useSelector(syncAtom, (state) => state);
  const { waitingEnds, waitingSessions } = usePendingSync();

  let label = online ? "All scores sent" : "Offline · all scores sent";
  if (waitingSessions.size > 0) {
    const waiting =
      waitingEnds > 0 ? plural(waitingEnds, "end") : "Session details";
    if (!online) {
      label = `Offline · ${waiting} waiting to send`;
    } else if (phase === "sending") {
      label = `Sending ${waiting.toLowerCase()}…`;
    } else if (phase === "retrying") {
      label = `Can't reach the server · ${waiting} waiting`;
    } else {
      label = `${waiting} waiting to send`;
    }
  }

  return (
    <Text aria-live="polite" numberOfLines={1} variant="muted">
      {label}
    </Text>
  );
};

/** Sessions the server refused, on the session list. */
export const SyncIssuesSummary = () => {
  const { issuesBySession } = usePendingSync();
  if (issuesBySession.size === 0) {
    return null;
  }
  return (
    <View className="border-destructive gap-1 border p-3" role="alert">
      <Text variant="error">
        {plural(issuesBySession.size, "session")} could not be sent.
      </Text>
      <Text variant="muted">
        The scores are kept on this phone. Open the session to see why and try
        again.
      </Text>
    </View>
  );
};

/** Why the server refused this session, and a way to send it again. */
export const SyncIssueNotice = ({ issue }: { issue: SyncIssue }) => {
  const { db } = useScorerDb();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await retrySession(db, issue.id);
    } catch {
      toast.error("Could not try again. Please retry.");
    }
    // Once cleared, the notice closes; this only matters on failure.
    setRetrying(false);
  };

  return (
    <View className="border-destructive gap-2 border p-3" role="alert">
      <Text variant="error">These scores were not sent</Text>
      <Text variant="muted">{issue.message}</Text>
      <Text variant="muted">They are kept on this phone.</Text>
      <Button
        aria-busy={retrying}
        disabled={retrying}
        onPress={handleRetry}
        size="sm"
        variant="outline"
      >
        <Text>{retrying ? "Trying again…" : "Try again"}</Text>
      </Button>
    </View>
  );
};
