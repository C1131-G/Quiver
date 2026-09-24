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
    <View className="flex-row items-center gap-2">
      <Button
        aria-label={`Fewer ${label.toLowerCase()}`}
        disabled={value <= min}
        onPress={() => onChange(value - 1)}
        size="icon"
        variant="outline"
      >
        <MinusIcon colorClassName="accent-foreground" size={18} />
      </Button>
      <Text
        aria-label={`${label}: ${value}`}
        aria-live="polite"
        className="w-8 text-center"
        variant="large"
      >
        {value}
      </Text>
      <Button
        aria-label={`More ${label.toLowerCase()}`}
        disabled={value >= max}
        onPress={() => onChange(value + 1)}
        size="icon"
        variant="outline"
      >
        <PlusIcon colorClassName="accent-foreground" size={18} />
      </Button>
    </View>
  </View>
);
