import { ChevronRight } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { withUniwind } from "uniwind";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

import { firstError } from "./setup-schema";

const ChevronIcon = withUniwind(ChevronRight);

export const FieldError = ({ errors }: { errors: readonly unknown[] }) => {
  const message = firstError(errors);
  return message ? (
    <Text role="alert" variant="error">
      {message}
    </Text>
  ) : null;
};

/** A section label above a grouped card. */
export const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <View className="px-1">
    <Text variant="eyebrow">{children}</Text>
  </View>
);

/** A grouped card with Quiver Dashboard's square hairline edge. */
export const Card = ({ children }: { children: React.ReactNode }) => (
  <View className="border-foreground/10 bg-card border">{children}</View>
);

export const CardRow = ({
  children,
  className,
  last = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Omits the divider under the final row in a card. */
  last?: boolean;
}) => (
  <View
    className={cn(
      "gap-2 px-3 py-2.5",
      last ? undefined : "border-border/60 border-b",
      className
    )}
  >
    {children}
  </View>
);

/** A row showing a value; tapping it opens where the value is changed. */
export const SummaryRow = ({
  label,
  last = false,
  onPress,
  value,
}: {
  label: string;
  last?: boolean;
  onPress: () => void;
  value: string;
}) => (
  <Pressable
    aria-label={`${label}: ${value}. Change`}
    className={cn(
      "active:bg-muted min-h-12 flex-row items-center justify-between gap-3 px-3",
      last ? undefined : "border-border/60 border-b"
    )}
    onPress={onPress}
    role="button"
  >
    <Text variant="small">{label}</Text>
    <View className="shrink flex-row items-center gap-1">
      <Text numberOfLines={1} variant="muted">
        {value}
      </Text>
      <ChevronIcon colorClassName="accent-muted-foreground" size={16} />
    </View>
  </Pressable>
);
