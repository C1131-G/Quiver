import { View } from "react-native";

import { PressableScale } from "@/components/pressable-scale";
import { CheckIcon } from "@/components/styled";
import { Text, TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export interface Choice<TValue extends number | string> {
  label: string;
  value: TValue;
}

/** How many segments share a line before the rest wrap onto the next. */
const PER_LINE = {
  2: "min-w-[45%]",
  4: "min-w-[22%]",
} as const;

/**
 * A square segmented control: one option is chosen, like radio buttons.
 * Segments share the width equally and wrap onto more lines instead of
 * scrolling sideways when there are many.
 */
export const ChoiceGroup = <TValue extends number | string>({
  choices,
  columns = 4,
  label,
  onChange,
  value,
}: {
  choices: readonly Choice<TValue>[];
  columns?: keyof typeof PER_LINE;
  label: string;
  onChange: (value: TValue) => void;
  value: TValue | null;
}) => (
  <View
    aria-label={label}
    className="flex-row flex-wrap gap-1"
    role="radiogroup"
  >
    {choices.map((choice) => {
      const selected = choice.value === value;
      return (
        <PressableScale
          aria-checked={selected}
          className={cn(
            "min-h-11 flex-1 flex-row items-center justify-center gap-1.5 border px-2 py-1.5",
            PER_LINE[columns],
            selected
              ? "bg-primary border-primary"
              : "border-input bg-background active:bg-muted dark:bg-input/30"
          )}
          key={choice.value}
          onPress={() => onChange(choice.value)}
          role="radio"
        >
          {selected ? (
            <CheckIcon
              colorClassName="accent-primary-foreground"
              size={14}
              strokeWidth={2.5}
            />
          ) : null}
          <TextClassContext
            value={selected ? "text-primary-foreground" : "text-foreground"}
          >
            <Text className="shrink text-center" variant="small">
              {choice.label}
            </Text>
          </TextClassContext>
        </PressableScale>
      );
    })}
  </View>
);
