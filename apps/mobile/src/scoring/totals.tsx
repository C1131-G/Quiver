import { View } from "react-native";

import { Text } from "@/components/ui/text";

import type { RoundCard } from "./use-scorecard";
import { arrowProgress } from "./use-scorecard";

export const Totals = ({ cards }: { cards: RoundCard[] }) => {
  const last = cards.at(-1);
  const { planned, shot } = arrowProgress(cards);
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
