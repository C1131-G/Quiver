import { useLocalSearchParams } from "expo-router";

import { ScoringScreen } from "@/scoring/scoring-screen";

const SessionScreen = () => {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  // A new key per session, so choices made on one never carry to the next.
  return <ScoringScreen key={sessionId} sessionId={sessionId} />;
};

export default SessionScreen;
