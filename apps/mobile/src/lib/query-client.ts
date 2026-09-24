import { focusManager, QueryClient } from "@tanstack/react-query";
import { AppState } from "react-native";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Most reads come from the phone's database; queries only refresh it.
      retry: 1,
    },
  },
});

/**
 * React Native has no window focus. Treat the app coming to the foreground
 * as focus, so stale queries refresh when the scorer returns to the app.
 * Returns the cleanup that stops listening.
 */
export const followAppFocus = () => {
  const subscription = AppState.addEventListener("change", (state) => {
    focusManager.setFocused(state === "active");
  });
  return () => subscription.remove();
};
