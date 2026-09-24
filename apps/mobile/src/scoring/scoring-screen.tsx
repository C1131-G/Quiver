import {
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  impactAsync,
  notificationAsync,
} from "expo-haptics";
import { Stack } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { toast } from "sonner-native";

import { StyledSafeAreaView } from "@/components/styled";
import { Text, TextClassContext } from "@/components/ui/text";
import { useScorerDb } from "@/db/scorer-db-context";
import { cn } from "@/lib/utils";

import { clearEnd, deleteLastArrow, scoreArrow } from "./actions";
import { Keypad } from "./keypad";
import { ScoreGrid } from "./score-grid";
import type { RoundCard } from "./use-scorecard";
import { useScorecard } from "./use-scorecard";

const SAVE_FAILED = "Could not save on this phone. Try again.";

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

const RoundTabs = ({
  cards,
  onSelect,
  selectedIndex,
}: {
  cards: RoundCard[];
  onSelect: (index: number) => void;
  selectedIndex: number;
}) => (
  <View aria-label="Rounds" className="flex-row gap-2" role="tablist">
    {cards.map((card, index) => {
      const selected = index === selectedIndex;
      const complete = card.nextEndNo === null;
      return (
        <Pressable
          aria-selected={selected}
          className={cn(
            "border-input min-h-11 flex-1 justify-center border px-2",
            selected ? "bg-primary border-primary" : "active:bg-accent"
          )}
          key={card.round.id}
          onPress={() => onSelect(index)}
          role="tab"
        >
          <TextClassContext
            value={selected ? "text-primary-foreground" : "text-foreground"}
          >
            <Text className="text-center" variant="small">
              Round {card.round.round_no}
              {complete ? " ✓" : ""}
            </Text>
            <Text className="text-center" variant="small">
              {card.distanceMeters === null
                ? ""
                : `${card.distanceMeters} m · `}
              {card.faceName}
            </Text>
          </TextClassContext>
        </Pressable>
      );
    })}
  </View>
);

const Totals = ({ cards }: { cards: RoundCard[] }) => {
  const last = cards.at(-1);
  const shot = cards.reduce((sum, card) => sum + card.score.shot, 0);
  const planned = cards.reduce(
    (sum, card) => sum + card.round.planned_ends * card.round.arrows_per_end,
    0
  );
  const tenPlusX = cards.reduce(
    (sum, card) => sum + card.score.tenPlusXCount,
    0
  );
  const xCount = cards.reduce((sum, card) => sum + card.score.xCount, 0);
  return (
    <View
      aria-label="Session totals"
      className="border-border flex-row justify-between border p-3"
    >
      <View>
        <Text variant="muted">Total</Text>
        <Text variant="h3">{last?.score.total ?? 0}</Text>
      </View>
      <View className="items-end">
        <Text variant="muted">10+X</Text>
        <Text variant="large">{tenPlusX}</Text>
      </View>
      <View className="items-end">
        <Text variant="muted">X</Text>
        <Text variant="large">{xCount}</Text>
      </View>
      <View className="items-end">
        <Text variant="muted">Arrows</Text>
        <Text variant="large">
          {shot}/{planned}
        </Text>
      </View>
    </View>
  );
};

/** First round with an end left to shoot; the last round once all are done. */
const currentRoundIndex = (cards: RoundCard[]) => {
  const open = cards.findIndex((card) => card.nextEndNo !== null);
  return open === -1 ? Math.max(cards.length - 1, 0) : open;
};

export const ScoringScreen = ({ sessionId }: { sessionId: string }) => {
  const { db } = useScorerDb();
  const { cards, session } = useScorecard(sessionId);
  // null follows the scoring: the round and end still to be shot.
  const [chosenRoundIndex, setChosenRoundIndex] = useState<number | null>(null);
  const [chosenEndNo, setChosenEndNo] = useState<number | null>(null);

  const roundIndex = chosenRoundIndex ?? currentRoundIndex(cards);
  const card = cards[roundIndex];
  const title = session?.athleteName ?? "Scoring";

  if (!card) {
    return (
      <StyledSafeAreaView className="bg-background flex-1 p-6">
        <Stack.Screen options={{ title }} />
        <Text variant="muted">This session has no rounds.</Text>
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

  let prompt = `End ${targetEndNo ?? ""}: arrow ${targetShot + 1} of ${card.round.arrows_per_end}`;
  if (readOnly) {
    prompt = "This session is finished.";
  } else if (targetEndNo === null) {
    prompt = "Round complete.";
  } else if (targetFull) {
    prompt = `End ${targetEndNo} is full. Delete an arrow to change it.`;
  }

  return (
    <StyledSafeAreaView className="bg-background flex-1" edges={["bottom"]}>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerClassName="gap-3 p-4">
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
        />
      </ScrollView>
      <View className="border-border gap-3 border-t p-4">
        <Totals cards={cards} />
        <Text aria-live="polite" variant="muted">
          {prompt}
        </Text>
        <Keypad
          canClear={!readOnly && editableEndNo !== null}
          disabled={readOnly || targetEndNo === null || targetFull}
          lowestScore={card.lowestScore}
          onClearEnd={confirmClearEnd}
          onDeleteArrow={handleDeleteArrow}
          onScore={handleScore}
        />
      </View>
    </StyledSafeAreaView>
  );
};
