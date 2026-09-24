import { useLocalSearchParams } from "expo-router";

import { SessionSetup } from "@/sessions/session-setup";

const SessionSetupScreen = () => {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  return <SessionSetup athleteId={athleteId} />;
};

export default SessionSetupScreen;
