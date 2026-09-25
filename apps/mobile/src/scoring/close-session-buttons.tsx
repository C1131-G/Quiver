import { eq, useLiveQuery } from "@tanstack/react-db";
import { useState } from "react";
import { Alert, View } from "react-native";
import { toast } from "sonner-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useScorerDb } from "@/db/scorer-db-context";

import { abandonSession, submitSession } from "./close-session";
import type { RoundCard } from "./use-scorecard";
import { arrowProgress } from "./use-scorecard";

const SAVE_FAILED = "Could not save on this phone. Try again.";

/** Live form of canDiscard, for the button's label and warning. */
const useCanDiscard = (sessionId: string) => {
  const { db } = useScorerDb();
  const { data: queued } = useLiveQuery({
    query: (query) =>
      query
        .from({ entry: db.outbox })
        .where(({ entry }) => eq(entry.id, `sessions:${sessionId}`))
        .findOne(),
    queryKey: ["scoring", "session-queued", sessionId],
  });
  const { data: sent } = useLiveQuery({
    query: (query) =>
      query
        .from({ sent: db.sentSessions })
        .where(({ sent: row }) => eq(row.id, sessionId))
        .findOne(),
    queryKey: ["scoring", "session-sent", sessionId],
  });
  return queued !== undefined && sent === undefined;
};

const submitWarning = (cards: readonly RoundCard[]) => {
  const { planned, shot } = arrowProgress(cards);
  const locked = "After submitting, its scores can't be changed on this phone.";
  if (shot < planned) {
    return {
      message: `Only ${shot} of ${planned} arrows are scored. ${locked}`,
      title: "Submit with arrows missing?",
    };
  }
  return {
    message: `${locked} An admin can still correct them in Quiver Dashboard.`,
    title: "Submit this session?",
  };
};

/**
 * Submit, and Cancel or Discard, for a session in progress. Both wait while
 * the server is refusing the session's changes: closing it would hide the
 * scores it never received.
 */
export const CloseSessionButtons = ({
  cards,
  onDiscarded,
  sendBlocked,
  sessionId,
}: {
  cards: readonly RoundCard[];
  onDiscarded: () => void;
  sendBlocked: boolean;
  sessionId: string;
}) => {
  const { db } = useScorerDb();
  const discardable = useCanDiscard(sessionId);
  const [closing, setClosing] = useState(false);

  const submit = async () => {
    setClosing(true);
    try {
      await submitSession(db, sessionId);
      toast.success("Session submitted.");
    } catch {
      toast.error(SAVE_FAILED);
    }
    setClosing(false);
  };

  const abandon = async () => {
    setClosing(true);
    try {
      const outcome = await abandonSession(db, sessionId);
      if (outcome === "discarded") {
        toast.success("Session discarded.");
        onDiscarded();
      } else {
        toast.success("Session cancelled.");
      }
    } catch {
      toast.error(SAVE_FAILED);
    }
    setClosing(false);
  };

  const confirmSubmit = () => {
    const { message, title } = submitWarning(cards);
    Alert.alert(title, message, [
      { style: "cancel", text: "Keep scoring" },
      { onPress: submit, text: "Submit" },
    ]);
  };

  const confirmAbandon = () => {
    if (discardable) {
      Alert.alert(
        "Discard this session?",
        "It was never sent, so it is deleted from this phone with its scores.",
        [
          { style: "cancel", text: "Keep scoring" },
          { onPress: abandon, style: "destructive", text: "Discard" },
        ]
      );
      return;
    }
    Alert.alert(
      "Cancel this session?",
      "Quiver Dashboard keeps its scores but leaves it out of every statistic. It can't be scored again.",
      [
        { style: "cancel", text: "Keep scoring" },
        { onPress: abandon, style: "destructive", text: "Cancel session" },
      ]
    );
  };

  const disabled = closing || sendBlocked;

  return (
    <View className="gap-2">
      {sendBlocked ? (
        <Text variant="muted">
          Submitting and cancelling wait until the send problem above is solved.
        </Text>
      ) : null}
      <View className="flex-row gap-2">
        <Button
          aria-busy={closing}
          className="h-11 flex-1"
          disabled={disabled}
          onPress={confirmAbandon}
          radius="pill"
          variant="destructive"
        >
          <Text>{discardable ? "Discard" : "Cancel"}</Text>
        </Button>
        <Button
          aria-busy={closing}
          className="h-11 flex-1"
          disabled={disabled}
          onPress={confirmSubmit}
          radius="pill"
        >
          <Text>Submit session</Text>
        </Button>
      </View>
    </View>
  );
};
