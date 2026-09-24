import { isScoreOnFace } from "@workspace/shared/arrows";
import { Pressable, View } from "react-native";

import { Button } from "@/components/ui/button";
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
    <Pressable
      aria-disabled={disabled}
      aria-label={value === "M" ? "Miss" : `Score ${value}`}
      className={cn(
        "border-border h-16 flex-1 items-center justify-center border active:opacity-70",
        zone.background,
        disabled && "opacity-25"
      )}
      disabled={disabled}
      onPress={() => onPress(value)}
      role="button"
    >
      <TextClassContext value={zone.text}>
        <Text variant="score">{value}</Text>
      </TextClassContext>
    </Pressable>
  );
};

/**
 * The scorer's keypad. Rings the face cannot score are switched off, as
 * the database would refuse them.
 */
export const Keypad = ({
  canClear,
  disabled,
  lowestScore,
  onClearEnd,
  onDeleteArrow,
  onScore,
}: {
  canClear: boolean;
  disabled: boolean;
  lowestScore: number;
  onClearEnd: () => void;
  onDeleteArrow: () => void;
  onScore: (value: string) => void;
}) => (
  <View className="gap-2">
    <View aria-label="Score keypad" className="gap-2" role="group">
      {KEY_ROWS.map((row) => (
        <View className="flex-row gap-2" key={row.join(",")}>
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
    <View className="flex-row gap-2">
      <Button
        className="h-12 flex-1"
        disabled={!canClear}
        onPress={onDeleteArrow}
        variant="outline"
      >
        <Text>Delete arrow</Text>
      </Button>
      <Button
        className="h-12 flex-1"
        disabled={!canClear}
        onPress={onClearEnd}
        variant="outline"
      >
        <Text>Clear end</Text>
      </Button>
    </View>
  </View>
);
