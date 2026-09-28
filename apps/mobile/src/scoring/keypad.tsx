import { isScoreOnFace } from "@workspace/shared/arrows";
import { View } from "react-native";

import { PressableScale } from "@/components/pressable-scale";
import { Text, TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";

import { zoneOf } from "./zones";

/** Four keys a row, from the gold to a miss, as on the target. */
const KEY_ROWS = [
  ["X", "10", "9", "8"],
  ["7", "6", "5", "4"],
  ["3", "2", "1", "M"],
] as const;

const ScoreKey = ({
  disabled,
  onPress,
  value,
}: {
  disabled: boolean;
  onPress: (value: string) => void;
  value: string;
}) => {
  const zone = zoneOf(value);
  return (
    <PressableScale
      aria-disabled={disabled}
      aria-label={value === "M" ? "Miss" : `Score ${value}`}
      className={cn(
        "min-h-11 flex-1 items-center justify-center active:opacity-80",
        zone.background,
        zone.edge,
        disabled && "opacity-25"
      )}
      disabled={disabled}
      onPress={() => onPress(value)}
      role="button"
    >
      <TextClassContext value={zone.text}>
        <Text variant="score">{value}</Text>
      </TextClassContext>
    </PressableScale>
  );
};

/**
 * The scorer's keypad. Its keys share the height it is given, so it grows
 * on a tall phone and shrinks on a small one instead of scrolling. Rings the
 * face cannot score are switched off, as the database would refuse them.
 */
export const Keypad = ({
  disabled,
  lowestScore,
  onScore,
}: {
  disabled: boolean;
  lowestScore: number;
  onScore: (value: string) => void;
}) => (
  <View aria-label="Score keypad" className="flex-1 gap-1.5" role="group">
    {KEY_ROWS.map((row) => (
      <View className="flex-1 flex-row gap-1.5" key={row.join(",")}>
        {row.map((value) => (
          <ScoreKey
            disabled={disabled || !isScoreOnFace(value, lowestScore)}
            key={value}
            onPress={onScore}
            value={value}
          />
        ))}
      </View>
    ))}
  </View>
);
