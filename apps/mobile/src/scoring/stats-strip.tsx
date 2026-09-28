import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

import type { RoundCard } from "./use-scorecard";
import { arrowProgress } from "./use-scorecard";

const MAX_POINTS_PER_ARROW = 10;

const Cell = ({
  caption,
  className,
  label,
  value,
}: {
  caption?: string;
  className?: string;
  label: string;
  value: string;
}) => (
  <View className={cn("flex-1 gap-0.5 px-3 py-2", className)}>
    <Text variant="stat">{label}</Text>
    <Text variant="figure">{value}</Text>
    {caption ? <Text variant="stat">{caption}</Text> : null}
  </View>
);

/**
 * The session at a glance, as archery scoring apps show it: total out of
 * the most it could be, the average arrow, and the gold counts.
 */
export const StatsStrip = ({ cards }: { cards: readonly RoundCard[] }) => {
  const total = cards.at(-1)?.score.total ?? 0;
  const { planned, shot } = arrowProgress(cards);
  let tenPlusX = 0;
  let xCount = 0;
  for (const card of cards) {
    tenPlusX += card.score.tenPlusXCount;
    xCount += card.score.xCount;
  }
  const average = shot === 0 ? "–" : (total / shot).toFixed(1);

  return (
    <View
      aria-label="Session totals"
      className="border-foreground/10 bg-card flex-row border"
    >
      <Cell
        caption={`${shot}/${planned} arrows`}
        label="Total"
        value={`${total}/${planned * MAX_POINTS_PER_ARROW}`}
        className="flex-[1.6]"
      />
      <View className="bg-border w-px" />
      <Cell label="Avg" value={average} />
      <View className="bg-border w-px" />
      <Cell label="10+X" value={String(tenPlusX)} />
      <View className="bg-border w-px" />
      <Cell label="X" value={String(xCount)} />
    </View>
  );
};
