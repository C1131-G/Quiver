import { View } from "react-native";

import { PressableScale } from "@/components/pressable-scale";
import { Text, TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export interface Choice<T extends number | string> {
  label: string;
  value: T;
}

/**
 * A row of options where exactly one is chosen, like radio buttons. Wraps
 * onto more lines when the options do not fit.
 */
export const ChoiceGroup = <T extends number | string>({
  choices,
  label,
  onChange,
  value,
}: {
  choices: readonly Choice<T>[];
  label: string;
  onChange: (value: T) => void;
  value: T | null;
}) => (
  <View
    aria-label={label}
    className="flex-row flex-wrap gap-2"
    role="radiogroup"
  >
    {choices.map((choice) => {
      const selected = choice.value === value;
      return (
        <PressableScale
          aria-checked={selected}
          className={cn(
            "min-h-11 justify-center border px-4",
            selected
              ? "bg-primary border-primary"
              : "border-input bg-background active:bg-muted dark:bg-input/30"
          )}
          key={choice.value}
          onPress={() => onChange(choice.value)}
          role="radio"
        >
          <TextClassContext
            value={selected ? "text-primary-foreground" : "text-foreground"}
          >
            <Text variant="small">{choice.label}</Text>
          </TextClassContext>
        </PressableScale>
      );
    })}
  </View>
);
