import { Pressable, View } from "react-native";

import { CheckIcon } from "@/components/styled";
import { Text, TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";

import type { RoundCard } from "./use-scorecard";

export const RoundTabs = ({
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
      const distance =
        card.distanceMeters === null ? "" : `${card.distanceMeters} m, `;
      return (
        <Pressable
          aria-label={`Round ${card.round.round_no}, ${distance}${card.faceName}${complete ? ", complete" : ""}`}
          aria-selected={selected}
          className={cn(
            "min-h-12 flex-1 justify-center gap-0.5 border px-2 py-1.5",
            selected
              ? "bg-primary border-primary"
              : "border-input bg-background active:bg-muted dark:bg-input/30"
          )}
          key={card.round.id}
          onPress={() => onSelect(index)}
          role="tab"
        >
          <TextClassContext
            value={selected ? "text-primary-foreground" : "text-foreground"}
          >
            <View className="flex-row items-center justify-center gap-1">
              <Text variant="small">Round {card.round.round_no}</Text>
              {complete ? (
                <CheckIcon
                  colorClassName={
                    selected ? "accent-primary-foreground" : "accent-foreground"
                  }
                  size={14}
                  strokeWidth={2.5}
                />
              ) : null}
            </View>
            <Text className="text-center" variant="stat">
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
