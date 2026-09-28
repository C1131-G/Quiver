import { Modal, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { StyledSafeAreaView } from "@/components/styled";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

/**
 * A native page sheet with a title bar and Done, for lists too long to
 * sit on a fixed screen. It scrolls inside; the screen behind never does.
 *
 * On Android the sheet is a full-screen window drawn under the status bar,
 * and a modal is a separate window, so it needs its own safe-area provider
 * to keep the title bar clear of the status bar and the list clear of the
 * navigation bar. On iOS the page sheet already sits below them.
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
    navigationBarTranslucent
    onRequestClose={onClose}
    presentationStyle="pageSheet"
    statusBarTranslucent
    visible={open}
  >
    <SafeAreaProvider>
      <StyledSafeAreaView
        className="bg-background flex-1"
        edges={["top", "bottom"]}
      >
        <View className="border-border min-h-14 flex-row items-center justify-between border-b px-4">
          <Text variant="large">{title}</Text>
          <Button onPress={onClose} variant="ghost">
            <Text>Done</Text>
          </Button>
        </View>
        {children}
      </StyledSafeAreaView>
    </SafeAreaProvider>
  </Modal>
);
