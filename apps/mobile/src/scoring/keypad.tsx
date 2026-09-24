import { isScoreOnFace } from "@workspace/shared/arrows";
import { Delete, Trash2 } from "lucide-react-native";
import { View } from "react-native";
import { withUniwind } from "uniwind";

import { PressableScale } from "@/components/pressable-scale";
import { Button } from "@/components/ui/button";
import { Text, TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";

import { zoneOf } from "./zones";

const BackspaceIcon = withUniwind(Delete);
const TrashIcon = withUniwind(Trash2);

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
        "h-16 flex-1 items-center justify-center active:opacity-80",
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
        <BackspaceIcon colorClassName="accent-foreground" size={18} />
        <Text>Delete arrow</Text>
      </Button>
      <Button
        className="h-12 flex-1"
        disabled={!canClear}
        onPress={onClearEnd}
        variant="outline"
      >
        <TrashIcon colorClassName="accent-foreground" size={18} />
        <Text>Clear end</Text>
      </Button>
    </View>
  </View>
);
