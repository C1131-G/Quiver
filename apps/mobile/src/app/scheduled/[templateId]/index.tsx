import { useLocalSearchParams } from "expo-router";

import { ScheduledStart } from "@/scheduled/scheduled-start";

const ScheduledStartScreen = () => {
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  return <ScheduledStart templateId={templateId} />;
};

export default ScheduledStartScreen;
