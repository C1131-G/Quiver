import { eq, or, useLiveQuery } from "@tanstack/react-db";
import { ChevronDown } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { withUniwind } from "uniwind";

import { Sheet } from "@/components/sheet";
import { Text, TextClassContext } from "@/components/ui/text";
import { useScorerDb } from "@/db/scorer-db-context";
import { cn } from "@/lib/utils";

const ChevronIcon = withUniwind(ChevronDown);

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

/** More athletes than this and the switcher becomes a list in a sheet. */
const MAX_SEGMENTS = 3;

const labelOf = (tab: SessionTab) =>
  `${tab.athleteName ?? "Unknown athlete"}${STATUS_MARKS[tab.status]}`;

const TabButton = ({
  className,
  onPress,
  selected,
  tab,
}: {
  className?: string;
  onPress: () => void;
  selected: boolean;
  tab: SessionTab;
}) => (
  <Pressable
    aria-selected={selected}
    className={cn(
      "min-h-11 justify-center border px-3",
      selected
        ? "bg-primary border-primary"
        : "border-input bg-background active:bg-muted dark:bg-input/30",
      className
    )}
    onPress={onPress}
    role="tab"
  >
    <TextClassContext
      value={selected ? "text-primary-foreground" : "text-foreground"}
    >
      <Text className="text-center" numberOfLines={1} variant="small">
        {labelOf(tab)}
      </Text>
    </TextClassContext>
  </Pressable>
);

/**
 * Switches between the athletes being scored without scrolling sideways:
 * equal segments for a few, one button opening a list for more.
 */
export const SessionTabs = ({
  activeId,
  onSelect,
  tabs,
}: {
  activeId: string;
  onSelect: (sessionId: string) => void;
  tabs: readonly SessionTab[];
}) => {
  const [listOpen, setListOpen] = useState(false);
  const active = tabs.find((tab) => tab.id === activeId);

  if (tabs.length <= MAX_SEGMENTS) {
    return (
      <View
        aria-label="Athletes"
        className="border-border flex-row gap-1 border-b px-3 py-2"
        role="tablist"
      >
        {tabs.map((tab) => (
          <TabButton
            className="flex-1"
            key={tab.id}
            onPress={() => onSelect(tab.id)}
            selected={tab.id === activeId}
            tab={tab}
          />
        ))}
      </View>
    );
  }

  return (
    <View className="border-border border-b px-3 py-2">
      <Pressable
        aria-label={`${active ? labelOf(active) : "Athlete"}. Switch between ${tabs.length} athletes`}
        className="border-input bg-background active:bg-muted dark:bg-input/30 min-h-11 flex-row items-center justify-between border px-3"
        onPress={() => setListOpen(true)}
        role="button"
      >
        <Text numberOfLines={1} variant="small">
          {active ? labelOf(active) : "Choose athlete"}
        </Text>
        <View className="flex-row items-center gap-1">
          <Text variant="muted">{tabs.length} athletes</Text>
          <ChevronIcon colorClassName="accent-muted-foreground" size={16} />
        </View>
      </Pressable>
      <Sheet
        onClose={() => setListOpen(false)}
        open={listOpen}
        title="Athletes"
      >
        <ScrollView
          contentContainerClassName="gap-1 p-3"
          contentInsetAdjustmentBehavior="automatic"
          role="tablist"
        >
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              onPress={() => {
                onSelect(tab.id);
                setListOpen(false);
              }}
              selected={tab.id === activeId}
              tab={tab}
            />
          ))}
        </ScrollView>
      </Sheet>
    </View>
  );
};
