import { View } from "react-native";

import { Text } from "@/components/ui/text";

import type { RoundCard } from "./use-scorecard";
import { arrowProgress } from "./use-scorecard";

/** One headline number, laid out like Quiver Dashboard's StatGrid cards. */
const Stat = ({ label, value }: { label: string; value: string }) => (
  <View className="flex-1 gap-0.5">
    <Text variant="stat">{label}</Text>
    <Text variant="figure">{value}</Text>
  </View>
);

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
      className="border-foreground/10 bg-card flex-row items-end gap-3 border px-4 py-3"
    >
      <View className="flex-1 gap-0.5">
        <Text variant="stat">Total</Text>
        <Text variant="score">{last?.score.total ?? 0}</Text>
      </View>
      <Stat label="10+X" value={String(tenPlusX)} />
      <Stat label="X" value={String(xCount)} />
      <Stat label="Arrows" value={`${shot}/${planned}`} />
    </View>
  );
};
