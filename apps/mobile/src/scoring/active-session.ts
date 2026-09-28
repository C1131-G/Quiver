import { createAtom } from "@tanstack/react-store";
import { router } from "expo-router";

/**
 * The session the scoring screen shows. Each athlete being scored has a
 * tab of their own; switching tabs changes this, not the route.
 */
export const activeSessionAtom = createAtom<{ sessionId: string | undefined }>({
  sessionId: undefined,
});

export type EntryMode = "keypad" | "target";

/** How arrows are entered, kept while the scorer moves between athletes. */
export const entryModeAtom = createAtom<EntryMode>("keypad");

export const showSession = (sessionId: string) => {
  activeSessionAtom.set({ sessionId });
};

/** Opens the scoring screen on the session's tab. */
export const openScoring = (sessionId: string) => {
  showSession(sessionId);
  router.push("/scoring");
};
