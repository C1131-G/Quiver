import { eq, or, useLiveQuery } from "@tanstack/react-db";
import { Pressable, ScrollView } from "react-native";

import { Text, TextClassContext } from "@/components/ui/text";
import { useScorerDb } from "@/db/scorer-db-context";
import { cn } from "@/lib/utils";

const EMPTY: never[] = [];

/** Closed sessions keep their tab while on screen, marked as closed. */
const STATUS_MARKS = {
  cancelled: " · Cancelled",
  completed: " ✓",
  in_progress: "",
} as const;

/**
 * One tab per athlete being scored on this phone: every session still in
 * progress, oldest first, plus the one on screen even once it is closed.
 */
export const useSessionTabs = (activeId: string | undefined) => {
  const { db } = useScorerDb();
  const { data } = useLiveQuery({
    query: (query) =>
      query
        .from({ session: db.sessions })
        .leftJoin({ athlete: db.athletes }, ({ athlete, session }) =>
          eq(athlete.id, session.athlete_id)
        )
        .where(({ session }) =>
          or(eq(session.status, "in_progress"), eq(session.id, activeId ?? ""))
        )
        .orderBy(({ session }) => session.started_at, "asc")
        .select(({ athlete, session }) => ({
          athleteName: athlete?.full_name,
          id: session.id,
          status: session.status,
        })),
    queryKey: ["scoring", "tabs", activeId ?? ""],
  });
  return data ?? EMPTY;
};

export type SessionTab = ReturnType<typeof useSessionTabs>[number];

export const SessionTabs = ({
  activeId,
  onSelect,
  tabs,
}: {
  activeId: string;
  onSelect: (sessionId: string) => void;
  tabs: readonly SessionTab[];
}) => (
  <ScrollView
    aria-label="Athletes"
    className="border-border grow-0 border-b"
    contentContainerClassName="gap-2 px-4 py-2"
    horizontal
    role="tablist"
    showsHorizontalScrollIndicator={false}
  >
    {tabs.map((tab) => {
      const selected = tab.id === activeId;
      return (
        <Pressable
          aria-selected={selected}
          className={cn(
            "min-h-11 max-w-48 justify-center border px-3",
            selected
              ? "bg-primary border-primary"
              : "border-input bg-background active:bg-muted dark:bg-input/30"
          )}
          key={tab.id}
          onPress={() => onSelect(tab.id)}
          role="tab"
        >
          <TextClassContext
            value={selected ? "text-primary-foreground" : "text-foreground"}
          >
            <Text numberOfLines={1} variant="small">
              {tab.athleteName ?? "Unknown athlete"}
              {STATUS_MARKS[tab.status]}
            </Text>
          </TextClassContext>
        </Pressable>
      );
    })}
  </ScrollView>
);
