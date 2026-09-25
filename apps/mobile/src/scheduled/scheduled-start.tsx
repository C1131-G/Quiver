import type { LegendListRenderItemProps } from "@legendapp/list/react-native";
import { LegendList } from "@legendapp/list/react-native";
import { AnimatePresence, Motion } from "@legendapp/motion";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { router, Stack } from "expo-router";
import { memo, useCallback, useMemo, useState } from "react";
import { View } from "react-native";

import { ListRow } from "@/components/list-row";
import { CheckIcon, StyledSafeAreaView } from "@/components/styled";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import type { Athlete, Distance, SessionTemplate } from "@/db/rows";
import { useScorerDb } from "@/db/scorer-db-context";
import { cn } from "@/lib/utils";
import { startSessions } from "@/scoring/actions";
import { openScoring } from "@/scoring/active-session";

import { sessionsFromTemplate, startedAthletes } from "./scheduled-sessions";

const describeRound = (
  round: SessionTemplate["rounds"][number],
  distances: readonly Distance[]
) => {
  const meters = distances.find((row) => row.id === round.distance_id)?.meters;
  const distance = meters === undefined ? "own distance" : `${meters} m`;
  return `${round.planned_ends} ends of ${round.arrows_per_end} · ${distance}`;
};

const AthleteRow = memo(
  // oxlint-disable-next-line prefer-arrow-callback -- named so React DevTools shows it
  function AthleteRow({
    athlete,
    checked,
    onToggle,
    started,
  }: {
    athlete: Athlete;
    checked: boolean;
    onToggle: (athleteId: string) => void;
    started: boolean;
  }) {
    const handleToggle = useCallback(
      () => onToggle(athlete.id),
      [athlete.id, onToggle]
    );
    return (
      <ListRow
        aria-checked={checked}
        aria-disabled={started}
        aria-label={`${athlete.full_name}, ${athlete.id_no}${started ? ", started" : ""}`}
        className={cn(checked && "border-primary", started && "opacity-60")}
        disabled={started}
        onPress={handleToggle}
        opens={false}
        role="checkbox"
      >
        <View
          className={cn(
            "border-input size-6 items-center justify-center border",
            checked && "bg-primary border-primary"
          )}
        >
          <AnimatePresence>
            {checked ? (
              <Motion.View
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                initial={{ opacity: 0, scale: 0 }}
                key="check"
                transition={{ type: "spring" }}
              >
                <CheckIcon
                  colorClassName="accent-primary-foreground"
                  size={16}
                />
              </Motion.View>
            ) : null}
          </AnimatePresence>
        </View>
        <View className="flex-1 gap-1">
          <Text numberOfLines={1} variant="large">
            {athlete.full_name}
          </Text>
          <Text variant="muted">{athlete.id_no}</Text>
        </View>
        {started ? (
          <Badge variant="outline">
            <Text>Started</Text>
          </Badge>
        ) : null}
      </ListRow>
    );
  }
);

const StartForm = ({ template }: { template: SessionTemplate }) => {
  const { db, userId } = useScorerDb();
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const { data: athletes } = useLiveQuery({
    query: (q) =>
      q
        .from({ athlete: db.athletes })
        .orderBy(({ athlete }) => athlete.full_name, "asc"),
    queryKey: ["athletes", "by-name"],
  });
  const { data: fromTemplate } = useLiveQuery({
    query: (q) =>
      q
        .from({ session: db.sessions })
        .where(({ session }) => eq(session.template_id, template.id))
        .select(({ session }) => ({
          athlete_id: session.athlete_id,
          status: session.status,
          template_id: session.template_id,
        })),
    queryKey: ["sessions", "from-template", template.id],
  });
  const { data: distances } = useLiveQuery({
    query: (q) => q.from({ distance: db.distances }),
    queryKey: ["lookups", "distances"],
  });

  const planned = new Set(template.athlete_ids);
  const onPhone = athletes.filter((athlete) => planned.has(athlete.id));
  const missing = planned.size - onPhone.length;
  const started = useMemo(
    () => startedAthletes(fromTemplate, template.id),
    [fromTemplate, template.id]
  );
  const picked = onPhone.filter((athlete) => chosen.has(athlete.id));

  const toggle = useCallback((id: string) => {
    setChosen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleStart = async () => {
    setStarting(true);
    setStartError(null);
    try {
      const [first] = await startSessions(
        db,
        sessionsFromTemplate(template, picked, userId)
      );
      // Back to the list first, so leaving the scoring screen returns there.
      router.dismissTo("/");
      if (first) {
        openScoring(first);
      }
    } catch {
      setStartError("Could not save the sessions on this phone. Try again.");
      setStarting(false);
    }
  };

  const extraData = useMemo(() => ({ chosen, started }), [chosen, started]);
  const keyExtractor = useCallback((athlete: Athlete) => athlete.id, []);
  const renderAthlete = useCallback(
    ({ item }: LegendListRenderItemProps<Athlete>) => (
      <AthleteRow
        athlete={item}
        checked={chosen.has(item.id)}
        onToggle={toggle}
        started={started.has(item.id)}
      />
    ),
    [chosen, started, toggle]
  );

  return (
    <LegendList
      contentContainerClassName="gap-2 p-4"
      data={onPhone}
      extraData={extraData}
      keyExtractor={keyExtractor}
      maintainVisibleContentPosition
      // Not recycled: each row's checkmark animates its own mount/unmount
      // (AnimatePresence), which item reuse would confuse.
      ListFooterComponent={
        <View className="gap-2 pt-4">
          {missing > 0 ? (
            <Text variant="muted">
              {missing === 1
                ? "1 athlete on this plan is not on this phone. Connect to the internet to load them."
                : `${missing} athletes on this plan are not on this phone. Connect to the internet to load them.`}
            </Text>
          ) : null}
          <Button
            aria-busy={starting}
            className="h-12"
            disabled={starting || picked.length === 0}
            onPress={handleStart}
            size="lg"
          >
            <Text>
              {starting
                ? "Starting…"
                : `Start ${picked.length === 1 ? "1 session" : `${picked.length} sessions`}`}
            </Text>
          </Button>
          {startError ? (
            <Text role="alert" variant="error">
              {startError}
            </Text>
          ) : null}
        </View>
      }
      ListHeaderComponent={
        <View className="gap-4 pb-2">
          <View className="border-foreground/10 bg-card border">
            <View className="border-border gap-1 border-b p-4">
              <Text variant="h4">{template.title}</Text>
              <Text variant="muted">
                {template.session_date} ·{" "}
                {template.session_type === "competition"
                  ? "Competition"
                  : "Training"}{" "}
                · {template.venue === "indoor" ? "Indoor" : "Outdoor"}
              </Text>
            </View>
            <View className="gap-2 p-4">
              {template.rounds.map((round) => (
                <View className="flex-row gap-3" key={round.round_no}>
                  <Text className="w-16" variant="stat">
                    Round {round.round_no}
                  </Text>
                  <Text className="flex-1" variant="small">
                    {describeRound(round, distances)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <Text variant="section">
            Choose the athletes you are scoring. Each gets their own tab.
          </Text>
        </View>
      }
      renderItem={renderAthlete}
    />
  );
};

/** A session an admin scheduled: pick athletes, then score them in tabs. */
export const ScheduledStart = ({ templateId }: { templateId: string }) => {
  const { db } = useScorerDb();
  const { data: found, isLoading } = useLiveQuery({
    query: (q) =>
      q
        .from({ template: db.sessionTemplates })
        .where(({ template }) => eq(template.id, templateId))
        .findOne(),
    queryKey: ["session-templates", "one", templateId],
  });

  return (
    <StyledSafeAreaView className="bg-background flex-1" edges={["bottom"]}>
      <Stack.Screen options={{ title: "Scheduled session" }} />
      {found ? (
        <StartForm template={found} />
      ) : (
        <View className="p-4">
          <Text variant="muted">
            {isLoading
              ? "Loading…"
              : "This scheduled session is no longer on this phone."}
          </Text>
        </View>
      )}
    </StyledSafeAreaView>
  );
};
