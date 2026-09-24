import { Pressable, View } from "react-native";

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
