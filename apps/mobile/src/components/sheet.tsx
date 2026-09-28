import { Modal, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

/**
 * A native page sheet with a title bar and Done, for lists too long to
 * sit on a fixed screen. It scrolls inside; the screen behind never does.
 */
export const Sheet = ({
  children,
  onClose,
  open,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
}) => (
  <Modal
    animationType="slide"
    onRequestClose={onClose}
    presentationStyle="pageSheet"
    visible={open}
  >
    <View className="bg-background flex-1">
      <View className="border-border flex-row items-center justify-between border-b px-4 py-2">
        <Text variant="large">{title}</Text>
        <Button onPress={onClose} variant="ghost">
          <Text>Done</Text>
        </Button>
      </View>
      {children}
    </View>
  </Modal>
);
