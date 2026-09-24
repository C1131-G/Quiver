import { Eye, EyeOff } from "lucide-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

/**
 * Third-party views that only take `style` and `color`, wrapped so they take
 * `className` and `colorClassName` (accent-*) like core components do.
 */
export const StyledGestureRoot = withUniwind(GestureHandlerRootView);
export const StyledSafeAreaView = withUniwind(SafeAreaView);
export const EyeIcon = withUniwind(Eye);
export const EyeOffIcon = withUniwind(EyeOff);
