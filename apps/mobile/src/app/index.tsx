import { useSelector } from "@tanstack/react-store";
import { useState } from "react";
import { View } from "react-native";
import { toast } from "sonner-native";

import { authAtom, signOut } from "@/auth/auth-store";
import { StyledSafeAreaView } from "@/components/styled";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

/** Placeholder until scoring arrives in Phase 2. */
const HomeScreen = () => {
  const email = useSelector(authAtom, (state) =>
    state.status === "signed-in" ? state.scorer.email : ""
  );
  const [signingOut, setSigningOut] = useState(false);

  // Signing out swaps this screen for sign-in, so there is no state to reset.
  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    toast.success("Signed out");
  };

  return (
    <StyledSafeAreaView className="bg-background flex-1">
      <View className="flex-1 justify-between p-6">
        <View className="gap-1">
          <Text variant="h3">QuiverScore</Text>
          <Text variant="muted">Signed in as {email}</Text>
        </View>
        <View className="border-border gap-2 border p-4">
          <Text variant="large">Scoring is coming next</Text>
          <Text variant="muted">
            Sessions, rounds and the scoring keypad arrive in the next update.
          </Text>
        </View>
        <Button
          aria-busy={signingOut}
          className="h-12"
          disabled={signingOut}
          onPress={handleSignOut}
          variant="outline"
        >
          <Text>{signingOut ? "Signing out…" : "Sign out"}</Text>
        </Button>
      </View>
    </StyledSafeAreaView>
  );
};

export default HomeScreen;
