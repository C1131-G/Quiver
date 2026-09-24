import { useSelector } from "@tanstack/react-store";
import { router } from "expo-router";

import { activeSessionAtom, showSession } from "@/scoring/active-session";
import { ScoringScreen } from "@/scoring/scoring-screen";
import { useSessionTabs } from "@/scoring/session-tabs";

const ScoringTabsScreen = () => {
  const activeId = useSelector(activeSessionAtom, (state) => state.sessionId);
  const tabs = useSessionTabs(activeId);
  const sessionId = activeId ?? tabs[0]?.id;

  if (!sessionId) {
    return null;
  }

  // The discarded session's tab goes; the next athlete in progress is shown,
  // or the session list when there is none.
  const handleDiscarded = () => {
    const next = tabs.find(
      (tab) => tab.id !== sessionId && tab.status === "in_progress"
    );
    if (next) {
      showSession(next.id);
    } else {
      router.back();
    }
  };

  return (
    // A new key per session, so choices made on one tab never carry over.
    <ScoringScreen
      key={sessionId}
      onDiscarded={handleDiscarded}
      onSelectTab={showSession}
      sessionId={sessionId}
      tabs={tabs}
    />
  );
};

export default ScoringTabsScreen;
