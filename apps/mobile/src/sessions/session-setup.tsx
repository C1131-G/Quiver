import { eq, useLiveQuery } from "@tanstack/react-db";
import { useForm } from "@tanstack/react-form";
import { router, Stack } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { ChoiceGroup } from "@/components/choice-group";
import { StyledSafeAreaView } from "@/components/styled";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import type { Athlete, Distance, TargetFace } from "@/db/rows";
import { useScorerDb } from "@/db/scorer-db-context";
import { today } from "@/lib/today";
import { startSessions } from "@/scoring/actions";
import { openScoring } from "@/scoring/active-session";
import { ROUND_PRESETS } from "@/scoring/presets";

import { DetailsRow } from "./setup-details";
import { Card, CardRow, SectionLabel } from "./setup-parts";
import { RoundsSection } from "./setup-rounds";
import type { SetupValues } from "./setup-schema";
import {
  defaultPreset,
  PRESET_CHOICES,
  roundsFromPreset,
  SESSION_TYPES,
  setupSchema,
  VENUES,
} from "./setup-schema";

const SAVE_FAILED = "Could not save the session on this phone. Try again.";

const SetupForm = ({
  athlete,
  distances,
  faces,
}: {
  athlete: Athlete;
  distances: readonly Distance[];
  faces: readonly TargetFace[];
}) => {
  const { db, userId } = useScorerDb();
  const [saveError, setSaveError] = useState<string | null>(null);
  const athleteMeters = distances.find(
    (distance) => distance.id === athlete.distance_id
  )?.meters;
  const preset = defaultPreset(athleteMeters);

  const defaultValues: SetupValues = {
    presetId: preset?.id ?? "",
    rounds: preset ? roundsFromPreset(preset, athlete) : [],
    sessionDate: today(),
    sessionType: "training",
    title: "",
    venue: preset?.venue ?? "outdoor",
  };

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setSaveError(null);
      try {
        const [sessionId] = await startSessions(db, [
          {
            athlete,
            rounds: value.rounds,
            scorerId: userId,
            sessionDate: value.sessionDate,
            sessionType: value.sessionType,
            templateId: null,
            title: value.title,
            venue: value.venue,
          },
        ]);
        // Back to the list first, so leaving the scoring screen returns there.
        router.dismissTo("/");
        if (sessionId) {
          openScoring(sessionId);
        }
      } catch {
        setSaveError(SAVE_FAILED);
      }
    },
    validators: { onSubmit: setupSchema },
  });

  const submit = async () => {
    try {
      await form.handleSubmit();
    } catch {
      setSaveError(SAVE_FAILED);
    }
  };

  return (
    <View className="flex-1">
      <View className="flex-1 gap-4 p-3">
        <View className="items-center gap-0.5">
          <Text className="text-center" numberOfLines={1} variant="h4">
            {athlete.full_name}
          </Text>
          <Text variant="muted">{athlete.id_no}</Text>
        </View>

        <View className="gap-2">
          <SectionLabel>Session</SectionLabel>
          <Card>
            <form.Field name="presetId">
              {(field) => (
                <CardRow>
                  <Label>Format</Label>
                  <ChoiceGroup
                    choices={PRESET_CHOICES}
                    columns={2}
                    label="Format"
                    onChange={(presetId) => {
                      field.handleChange(presetId);
                      const chosen = ROUND_PRESETS.find(
                        (option) => option.id === presetId
                      );
                      if (chosen) {
                        form.setFieldValue(
                          "rounds",
                          roundsFromPreset(chosen, athlete)
                        );
                        form.setFieldValue("venue", chosen.venue);
                      }
                    }}
                    value={field.state.value}
                  />
                </CardRow>
              )}
            </form.Field>
            {/* Type above venue, each option half the card's width, so a
                selected option's tick and label stay on one line. */}
            <CardRow>
              <form.Field name="sessionType">
                {(field) => (
                  <ChoiceGroup
                    choices={SESSION_TYPES}
                    columns={2}
                    label="Session type"
                    onChange={field.handleChange}
                    value={field.state.value}
                  />
                )}
              </form.Field>
              <form.Field name="venue">
                {(field) => (
                  <ChoiceGroup
                    choices={VENUES}
                    columns={2}
                    label="Venue"
                    onChange={field.handleChange}
                    value={field.state.value}
                  />
                )}
              </form.Field>
            </CardRow>
            <DetailsRow form={form} />
          </Card>
        </View>

        <RoundsSection
          athlete={athlete}
          distances={distances}
          faces={faces}
          form={form}
        />

        {saveError ? (
          <Text role="alert" variant="error">
            {saveError}
          </Text>
        ) : null}
      </View>

      <View className="border-border bg-background border-t p-3">
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button
              aria-busy={isSubmitting}
              className="h-14"
              disabled={isSubmitting}
              onPress={submit}
              size="lg"
            >
              <Text variant="large">
                {isSubmitting ? "Starting…" : "Start scoring"}
              </Text>
            </Button>
          )}
        </form.Subscribe>
      </View>
    </View>
  );
};

/** Step two of a new session: format, date and rounds for one athlete. */
export const SessionSetup = ({ athleteId }: { athleteId: string }) => {
  const { db } = useScorerDb();

  const { data: found, isLoading } = useLiveQuery({
    query: (query) =>
      query
        .from({ athlete: db.athletes })
        .where(({ athlete }) => eq(athlete.id, athleteId))
        .findOne(),
    queryKey: ["athletes", "one", athleteId],
  });
  const { data: distances } = useLiveQuery({
    query: (query) =>
      query
        .from({ distance: db.distances })
        .orderBy(({ distance }) => distance.meters, "asc"),
    queryKey: ["lookups", "distances", "by-meters"],
  });
  const { data: faces } = useLiveQuery({
    query: (query) =>
      query
        .from({ face: db.targetFaces })
        .orderBy(({ face }) => face.sort_order, "asc"),
    queryKey: ["lookups", "target-faces", "sorted"],
  });

  return (
    <StyledSafeAreaView className="bg-muted/30 flex-1" edges={["bottom"]}>
      <Stack.Screen options={{ title: "New session" }} />
      {found ? (
        <SetupForm athlete={found} distances={distances} faces={faces} />
      ) : (
        <View className="p-4">
          <Text variant="muted">
            {isLoading ? "Loading…" : "This athlete is not on this phone."}
          </Text>
        </View>
      )}
    </StyledSafeAreaView>
  );
};
