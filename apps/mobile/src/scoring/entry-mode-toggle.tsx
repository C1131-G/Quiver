import { useSelector } from "@tanstack/react-store";
import { View } from "react-native";

import { PressableScale } from "@/components/pressable-scale";
import { Text, TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";

import type { EntryMode } from "./active-session";
import { entryModeAtom } from "./active-session";

const MODES = [
  { label: "Keypad", value: "keypad" },
  { label: "Target", value: "target" },
] as const satisfies readonly { label: string; value: EntryMode }[];

export const useEntryMode = () => useSelector(entryModeAtom, (mode) => mode);

/** Chooses between typing scores on the keypad and tapping the target. */
export const EntryModeToggle = () => {
  const mode = useEntryMode();
  return (
    <View aria-label="Enter arrows with" className="flex-row" role="radiogroup">
      {MODES.map((option) => {
        const selected = option.value === mode;
        return (
          <PressableScale
            aria-checked={selected}
            className={cn(
              "min-h-9 justify-center border px-3",
              selected
                ? "bg-foreground border-foreground"
                : "border-input bg-background active:bg-muted dark:bg-input/30"
            )}
            key={option.value}
            onPress={() => entryModeAtom.set(option.value)}
            role="radio"
          >
            <TextClassContext
              value={selected ? "text-background" : "text-foreground"}
            >
              <Text variant="small">{option.label}</Text>
            </TextClassContext>
          </PressableScale>
        );
      })}
    </View>
  );
};
