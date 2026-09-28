import {
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  impactAsync,
  notificationAsync,
} from "expo-haptics";
import { Stack } from "expo-router";
import { useState } from "react";
import { Alert, useWindowDimensions, View } from "react-native";
import { toast } from "sonner-native";

import { StyledSafeAreaView } from "@/components/styled";
import { Text } from "@/components/ui/text";
import type { Session } from "@/db/rows";
import { useScorerDb } from "@/db/scorer-db-context";
import { SyncIssueNotice, SyncStatusLine } from "@/sync/sync-status";
import { usePendingSync } from "@/sync/use-sync-status";

import {
  clearEnd,
  deleteLastArrow,
  scoreArrow,
  undoLastArrow,
} from "./actions";
import { SessionMenuButton } from "./close-session-buttons";
import { EntryArea } from "./entry-area";
import { EntryModeToggle } from "./entry-mode-toggle";
import { RoundTabs } from "./round-tabs";
import { ScoreGrid } from "./score-grid";
import type { SessionTab } from "./session-tabs";
import { SessionTabs } from "./session-tabs";
import { StatsStrip } from "./stats-strip";
import type { RoundCard } from "./use-scorecard";
import { arrowProgress, useScorecard } from "./use-scorecard";

const SAVE_FAILED = "Could not save on this phone. Try again.";

const MIN_ENDS_SHOWN = 2;

/**
 * How many ends the scorecard shows, so it fits above the keypad. Athlete
 * and round tabs each take about one end's height when they are shown.
 */
const endsThatFit = (
  screenHeight: number,
  { athleteTabs, roundTabs }: { athleteTabs: boolean; roundTabs: boolean }
) => {
  let ends = 5;
  if (screenHeight < 700) {
    ends = 3;
  } else if (screenHeight < 820) {
    ends = 4;
  }
  ends -= Number(athleteTabs) + Number(roundTabs);
  return Math.max(ends, MIN_ENDS_SHOWN);
};

/** The end the keypad writes to: the one chosen, else the next with room. */
const targetEndOf = (card: RoundCard, chosenEndNo: number | null) =>
  chosenEndNo ?? card.nextEndNo;

/**
 * The end "Delete arrow" and "Clear end" act on: the chosen end, else the
 * end being shot, else the last end with arrows (just finished).
 */
const editableEndOf = (card: RoundCard, chosenEndNo: number | null) => {
  const target = targetEndOf(card, chosenEndNo);
  if (target !== null && (card.ends.get(target)?.arrows.length ?? 0) > 0) {
    return target;
  }
  if (chosenEndNo !== null) {
    return null;
  }
  let lastShotEnd: number | null = null;
  for (const { arrows, end } of card.ends.values()) {
    if (arrows.length > 0 && end.end_no > (lastShotEnd ?? 0)) {
      lastShotEnd = end.end_no;
    }
  }
  return lastShotEnd;
};

/** What the scorer is asked for next, or why nothing can be scored. */
const promptFor = ({
  arrowsPerEnd,
  status,
  targetEndNo,
  targetShot,
}: {
  arrowsPerEnd: number;
  status: Session["status"] | undefined;
  targetEndNo: number | null;
  targetShot: number;
}) => {
  if (status === "cancelled") {
    return "This session was cancelled.";
  }
  if (status !== "in_progress") {
    return "This session is submitted. Only an admin can change it now.";
  }
  if (targetEndNo === null) {
    return "Round complete.";
  }
  if (targetShot >= arrowsPerEnd) {
    return `End ${targetEndNo} is full. Delete an arrow to change it.`;
  }
  return `End ${targetEndNo}: arrow ${targetShot + 1} of ${arrowsPerEnd}`;
};

/** First round with an end left to shoot; the last round once all are done. */
const currentRoundIndex = (cards: RoundCard[]) => {
  const open = cards.findIndex((card) => card.nextEndNo !== null);
  return open === -1 ? Math.max(cards.length - 1, 0) : open;
};

export const ScoringScreen = ({
  onDiscarded,
  onSelectTab,
  sessionId,
  tabs,
}: {
  /** Called once the session on screen was deleted from the phone. */
  onDiscarded: () => void;
  onSelectTab: (sessionId: string) => void;
  sessionId: string;
  tabs: readonly SessionTab[];
}) => {
  const { db } = useScorerDb();
  const { height } = useWindowDimensions();
  const { cards, session } = useScorecard(sessionId);
  const syncIssue = usePendingSync().issuesBySession.get(sessionId);
  // null follows the scoring: the round and end still to be shot.
  const [chosenRoundIndex, setChosenRoundIndex] = useState<number | null>(null);
  const [chosenEndNo, setChosenEndNo] = useState<number | null>(null);

  const roundIndex = chosenRoundIndex ?? currentRoundIndex(cards);
  const card = cards[roundIndex];
  const title = session?.athleteName ?? "Scoring";
  const athleteTabs =
    tabs.length > 1 ? (
      <SessionTabs activeId={sessionId} onSelect={onSelectTab} tabs={tabs} />
    ) : null;

  if (!card) {
    return (
      <StyledSafeAreaView className="bg-background flex-1">
        <Stack.Screen options={{ title }} />
        {athleteTabs}
        <View className="p-6">
          <Text variant="muted">This session has no rounds.</Text>
        </View>
      </StyledSafeAreaView>
    );
  }

  const targetEndNo = targetEndOf(card, chosenEndNo);
  const editableEndNo = editableEndOf(card, chosenEndNo);
  const targetShot =
    targetEndNo === null ? 0 : (card.ends.get(targetEndNo)?.arrows.length ?? 0);
  const targetFull = targetShot >= card.round.arrows_per_end;
  const readOnly = session?.status !== "in_progress";

  const selectRound = (index: number) => {
    setChosenRoundIndex(index);
    setChosenEndNo(null);
  };

  // Tapping the end already chosen goes back to following the scoring.
  const selectEnd = (endNo: number) => {
    setChosenEndNo((current) => (current === endNo ? null : endNo));
  };

  const handleScore = async (value: string) => {
    if (targetEndNo === null) {
      return;
    }
    const finishesEnd = targetShot + 1 === card.round.arrows_per_end;
    try {
      const saved = await scoreArrow(
        db,
        {
          arrowsPerEnd: card.round.arrows_per_end,
          endNo: targetEndNo,
          roundId: card.round.id,
        },
        value
      );
      if (!saved) {
        return;
      }
      if (finishesEnd) {
        notificationAsync(NotificationFeedbackType.Success);
        // Back to following the scoring: the next end, or the next round.
        setChosenEndNo(null);
        setChosenRoundIndex(null);
      } else {
        impactAsync(ImpactFeedbackStyle.Light);
      }
    } catch {
      toast.error(SAVE_FAILED);
    }
  };

  const handleDeleteArrow = async () => {
    if (editableEndNo === null) {
      return;
    }
    try {
      await deleteLastArrow(db, {
        endNo: editableEndNo,
        roundId: card.round.id,
      });
      impactAsync(ImpactFeedbackStyle.Medium);
    } catch {
      toast.error(SAVE_FAILED);
    }
  };

  const handleUndo = async () => {
    try {
      if (await undoLastArrow(db, sessionId)) {
        impactAsync(ImpactFeedbackStyle.Medium);
        setChosenEndNo(null);
        setChosenRoundIndex(null);
      }
    } catch {
      toast.error(SAVE_FAILED);
    }
  };

  const confirmClearEnd = () => {
    if (editableEndNo === null) {
      return;
    }
    const ref = { endNo: editableEndNo, roundId: card.round.id };
    Alert.alert(
      `Clear end ${editableEndNo}?`,
      "Every arrow in this end is removed so it can be scored again.",
      [
        { style: "cancel", text: "Keep" },
        {
          onPress: async () => {
            try {
              await clearEnd(db, ref);
              setChosenEndNo(editableEndNo);
            } catch {
              toast.error(SAVE_FAILED);
            }
          },
          style: "destructive",
          text: "Clear end",
        },
      ]
    );
  };

  const prompt = promptFor({
    arrowsPerEnd: card.round.arrows_per_end,
    status: session?.status,
    targetEndNo,
    targetShot,
  });

  const closeProps = {
    cards,
    onDiscarded,
    sendBlocked: syncIssue !== undefined,
    sessionId,
  };
  const canScore = !readOnly && targetEndNo !== null && !targetFull;

  return (
    <StyledSafeAreaView className="bg-background flex-1" edges={["bottom"]}>
      <Stack.Screen options={{ title }} />
      {athleteTabs}
      <View className="flex-1 gap-2 p-3">
        {syncIssue ? <SyncIssueNotice issue={syncIssue} /> : null}
        <StatsStrip cards={cards} />
        {cards.length > 1 ? (
          <RoundTabs
            cards={cards}
            onSelect={selectRound}
            selectedIndex={roundIndex}
          />
        ) : null}
        <ScoreGrid
          arrowsPerEnd={card.round.arrows_per_end}
          onSelectEnd={selectEnd}
          rows={card.score.rows}
          targetEndNo={targetEndNo}
          windowSize={endsThatFit(height, {
            athleteTabs: tabs.length > 1,
            roundTabs: cards.length > 1,
          })}
        />
        <View className="min-h-9 flex-row items-center justify-between gap-2">
          <Text
            aria-live="polite"
            className="flex-1"
            numberOfLines={2}
            variant="small"
          >
            {prompt}
          </Text>
          {canScore ? <EntryModeToggle /> : null}
          {readOnly ? null : <SessionMenuButton {...closeProps} />}
        </View>
        <SyncStatusLine />
        {readOnly ? null : (
          <EntryArea
            allShot={cards.every((round) => round.nextEndNo === null)}
            canScore={canScore}
            close={closeProps}
            edit={{
              canEditEnd: editableEndNo !== null,
              canUndo: arrowProgress(cards).shot > 0,
              onClearEnd: confirmClearEnd,
              onDeleteArrow: handleDeleteArrow,
              onUndo: handleUndo,
            }}
            lowestScore={card.lowestScore}
            onScore={handleScore}
          />
        )}
      </View>
    </StyledSafeAreaView>
  );
};
