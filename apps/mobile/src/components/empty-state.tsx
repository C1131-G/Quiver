import { View } from "react-native";

import { Text } from "@/components/ui/text";

/** A dashed placeholder where a list has nothing to show yet. */
export const EmptyState = ({ children }: { children: string }) => (
  <View className="border-border items-center border border-dashed px-6 py-10">
    <Text className="text-center" variant="muted">
      {children}
    </Text>
  </View>
);
