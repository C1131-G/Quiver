import "@/global.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Toaster } from "sonner-native";
import { useUniwind } from "uniwind";

import { authAtom, restoreSession } from "@/auth/auth-store";
import { StyledGestureRoot } from "@/components/styled";
import { ScorerDbProvider } from "@/db/scorer-db-context";
import { followAppFocus, queryClient } from "@/lib/query-client";
import { refreshTokensWhileActive } from "@/lib/supabase";
import { SyncRunner } from "@/sync/sync-runner";

const Loading = () => (
  <View className="bg-background flex-1 items-center justify-center">
    <ActivityIndicator accessibilityLabel="Loading QuiverScore" />
  </View>
);

const RootLayout = () => {
  const { theme } = useUniwind();
  const status = useSelector(authAtom, (state) => state.status);

  useEffect(
    // oxlint-disable-next-line prefer-arrow-callback -- named for stack traces and the effects skill
    function followAuthSession() {
      return restoreSession();
    },
    []
  );

  useEffect(
    // oxlint-disable-next-line prefer-arrow-callback -- named for stack traces and the effects skill
    function refreshTokensInForeground() {
      return refreshTokensWhileActive();
    },
    []
  );

  useEffect(
    // oxlint-disable-next-line prefer-arrow-callback -- named for stack traces and the effects skill
    function refetchOnForeground() {
      return followAppFocus();
    },
    []
  );

  const signedIn = status === "signed-in";

  return (
    <StyledGestureRoot className="bg-background flex-1">
      {/* The default "auto" style follows the system theme, as Uniwind does. */}
      <StatusBar />
      {status === "loading" ? (
        <Loading />
      ) : (
        <QueryClientProvider client={queryClient}>
          <ScorerDbProvider>
            <SyncRunner />
            {/* The navigator's own background, so dark mode never flashes
                white between screens; each screen paints bg-background. */}
            <ThemeProvider value={theme === "dark" ? DarkTheme : DefaultTheme}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Protected guard={signedIn}>
                  <Stack.Screen name="index" />
                  <Stack.Screen
                    name="new-session/index"
                    options={{ headerShown: true, title: "Choose athlete" }}
                  />
                  <Stack.Screen
                    name="new-session/[athleteId]/index"
                    options={{ headerShown: true, title: "New session" }}
                  />
                  <Stack.Screen
                    name="scoring/index"
                    options={{ headerShown: true, title: "Scoring" }}
                  />
                </Stack.Protected>
                <Stack.Protected guard={!signedIn}>
                  <Stack.Screen name="sign-in" />
                </Stack.Protected>
              </Stack>
            </ThemeProvider>
          </ScorerDbProvider>
        </QueryClientProvider>
      )}
      <Toaster position="bottom-center" richColors theme="system" />
    </StyledGestureRoot>
  );
};

export default RootLayout;
