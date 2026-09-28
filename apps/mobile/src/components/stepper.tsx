import { Minus, Plus } from "lucide-react-native";
import { View } from "react-native";
import { withUniwind } from "uniwind";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

const MinusIcon = withUniwind(Minus);
const PlusIcon = withUniwind(Plus);

/** A whole number between min and max, changed one step at a time. */
export const Stepper = ({
  label,
  max,
  min,
  onChange,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  value: number;
}) => (
  <View className="flex-row items-center justify-between gap-3">
    <Text variant="small">{label}</Text>
    <View className="border-input flex-row items-center border">
      <Button
        aria-label={`Fewer ${label.toLowerCase()}`}
        disabled={value <= min}
        onPress={() => onChange(value - 1)}
        size="icon"
        variant="ghost"
      >
        <MinusIcon colorClassName="accent-foreground" size={16} />
      </Button>
      <View className="bg-border h-full w-px" />
      <Text
        aria-label={`${label}: ${value}`}
        aria-live="polite"
        className="w-10 text-center"
        variant="figure"
      >
        {value}
      </Text>
      <View className="bg-border h-full w-px" />
      <Button
        aria-label={`More ${label.toLowerCase()}`}
        disabled={value >= max}
        onPress={() => onChange(value + 1)}
        size="icon"
        variant="ghost"
      >
        <PlusIcon colorClassName="accent-foreground" size={16} />
      </Button>
    </View>
  </View>
);
