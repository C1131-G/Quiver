import { eq, useLiveQuery } from "@tanstack/react-db";
import { useForm } from "@tanstack/react-form";
import { randomUUID } from "expo-crypto";
import { router, Stack } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { z } from "zod";

import type { Choice } from "@/components/choice-group";
import { ChoiceGroup } from "@/components/choice-group";
import { Stepper } from "@/components/stepper";
import { StyledSafeAreaView } from "@/components/styled";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import type {
  Athlete,
  Distance,
  SessionType,
  TargetFace,
  Venue,
} from "@/db/rows";
import { useScorerDb } from "@/db/scorer-db-context";
import type { RoundDraft } from "@/scoring/actions";
import { startSession } from "@/scoring/actions";
import { openScoring } from "@/scoring/active-session";
import type { RoundPreset } from "@/scoring/presets";
import { ROUND_LIMITS, ROUND_PRESETS } from "@/scoring/presets";

const SESSION_TYPES: Choice<SessionType>[] = [
  { label: "Training", value: "training" },
  { label: "Competition", value: "competition" },
];

const VENUES: Choice<Venue>[] = [
  { label: "Indoor", value: "indoor" },
  { label: "Outdoor", value: "outdoor" },
];

/** A round added by hand when none is there to copy: 6 ends of 6. */
const HAND_ADDED_ROUND = { arrowsPerEnd: 6, plannedEnds: 6 } as const;

/** Short distances are usually shot indoors, in ends of three. */
const INDOOR_MAX_METERS = 25;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;

const pad = (value: number) => String(value).padStart(2, "0");

/** Today on the phone's calendar, as the database stores dates. */
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const setupSchema = z.object({
  presetId: z.string(),
  rounds: z
    .array(
      z.object({
        arrowsPerEnd: z
          .number()
          .int()
          .min(ROUND_LIMITS.arrowsPerEnd.min)
          .max(ROUND_LIMITS.arrowsPerEnd.max),
        distanceId: z.number().int().positive("Choose a distance."),
        key: z.string(),
        plannedEnds: z
          .number()
          .int()
          .min(ROUND_LIMITS.plannedEnds.min)
          .max(ROUND_LIMITS.plannedEnds.max),
        targetFaceId: z.number().int().positive("Choose a target face."),
      })
    )
    .min(ROUND_LIMITS.rounds.min, "Add at least one round.")
    .max(ROUND_LIMITS.rounds.max),
  sessionDate: z
    .string()
    .regex(ISO_DATE, "Use the format 2026-09-24.")
    .refine(
      (value) => !Number.isNaN(Date.parse(value)),
      "This is not a real date."
    ),
  sessionType: z.enum(["training", "competition"]),
  title: z.string().max(120, "Keep the title under 120 characters."),
  venue: z.enum(["indoor", "outdoor"]),
});

type SetupValues = z.infer<typeof setupSchema>;

/** A round being set up, with a key that stays with it while editing. */
type RoundForm = RoundDraft & { key: string };

const newRound = (draft: RoundDraft): RoundForm => ({
  ...draft,
  key: randomUUID(),
});

const roundsFromPreset = (preset: RoundPreset, athlete: Athlete): RoundForm[] =>
  Array.from({ length: preset.rounds }, () =>
    newRound({
      arrowsPerEnd: preset.arrowsPerEnd,
      distanceId: athlete.distance_id,
      plannedEnds: preset.plannedEnds,
      targetFaceId: athlete.target_face_id,
    })
  );

const defaultPreset = (meters: number | undefined) => {
  const indoor = meters !== undefined && meters <= INDOOR_MAX_METERS;
  return (
    ROUND_PRESETS.find(
      (preset) => preset.venue === (indoor ? "indoor" : "outdoor")
    ) ?? ROUND_PRESETS[0]
  );
};

/** Active options, plus the one in use even if it has since been retired. */
const choicesOf = <T extends { id: number; is_active: boolean }>(
  rows: readonly T[],
  inUse: number,
  label: (row: T) => string
): Choice<number>[] => {
  const choices: Choice<number>[] = [];
  for (const row of rows) {
    if (row.is_active || row.id === inUse) {
      choices.push({ label: label(row), value: row.id });
    }
  }
  return choices;
};

const firstError = (errors: readonly unknown[]) => {
  const parsed = z
    .object({ message: z.string() })
    .or(z.string().transform((message) => ({ message })))
    .safeParse(errors[0]);
  return parsed.success ? parsed.data.message : null;
};

const FieldError = ({ errors }: { errors: readonly unknown[] }) => {
  const message = firstError(errors);
  return message ? (
    <Text role="alert" variant="error">
      {message}
    </Text>
  ) : null;
};

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
    (d) => d.id === athlete.distance_id
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
        const sessionId = await startSession(db, {
          athlete,
          rounds: value.rounds,
          scorerId: userId,
          sessionDate: value.sessionDate,
          sessionType: value.sessionType,
          title: value.title,
          venue: value.venue,
        });
        // Back to the list first, so leaving the scoring screen returns there.
        router.dismissTo("/");
        openScoring(sessionId);
      } catch {
        setSaveError("Could not save the session on this phone. Try again.");
      }
    },
    validators: { onSubmit: setupSchema },
  });

  const submit = async () => {
    await form.handleSubmit();
  };

  const presetChoices: Choice<string>[] = ROUND_PRESETS.map((option) => ({
    label: option.label,
    value: option.id,
  }));

  return (
    <ScrollView
      contentContainerClassName="gap-6 p-4"
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-1">
        <Text variant="h4">{athlete.full_name}</Text>
        <Text variant="muted">{athlete.id_no}</Text>
      </View>

      <form.Field name="presetId">
        {(field) => (
          <View className="gap-2">
            <Label>Format</Label>
            <ChoiceGroup
              choices={presetChoices}
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
          </View>
        )}
      </form.Field>

      <form.Field name="sessionType">
        {(field) => (
          <View className="gap-2">
            <Label>Session</Label>
            <ChoiceGroup
              choices={SESSION_TYPES}
              label="Session type"
              onChange={field.handleChange}
              value={field.state.value}
            />
          </View>
        )}
      </form.Field>

      <form.Field name="venue">
        {(field) => (
          <View className="gap-2">
            <Label>Venue</Label>
            <ChoiceGroup
              choices={VENUES}
              label="Venue"
              onChange={field.handleChange}
              value={field.state.value}
            />
          </View>
        )}
      </form.Field>

      <form.Field name="sessionDate">
        {(field) => (
          <View className="gap-2">
            <Label nativeID="session-date-label">Date</Label>
            <Input
              accessibilityLabelledBy="session-date-label"
              className="h-12"
              inputMode="numeric"
              maxLength={10}
              onBlur={field.handleBlur}
              onChangeText={field.handleChange}
              placeholder="2026-09-24"
              value={field.state.value}
            />
            <FieldError errors={field.state.meta.errors} />
          </View>
        )}
      </form.Field>

      <form.Field name="title">
        {(field) => (
          <View className="gap-2">
            <Label nativeID="session-title-label">Title (optional)</Label>
            <Input
              accessibilityLabelledBy="session-title-label"
              className="h-12"
              maxLength={120}
              onBlur={field.handleBlur}
              onChangeText={field.handleChange}
              placeholder="e.g. State trials, morning"
              value={field.state.value}
            />
            <FieldError errors={field.state.meta.errors} />
          </View>
        )}
      </form.Field>

      <form.Field mode="array" name="rounds">
        {(roundsField) => (
          <View className="gap-4">
            {roundsField.state.value.map((round, index) => (
              <View className="border-border gap-4 border p-4" key={round.key}>
                <View className="flex-row items-center justify-between">
                  <Text variant="large">Round {index + 1}</Text>
                  {roundsField.state.value.length > ROUND_LIMITS.rounds.min &&
                  index === roundsField.state.value.length - 1 ? (
                    <Button
                      onPress={() => roundsField.removeValue(index)}
                      size="sm"
                      variant="ghost"
                    >
                      <Text>Remove</Text>
                    </Button>
                  ) : null}
                </View>
                <form.Field name={`rounds[${index}].distanceId`}>
                  {(field) => (
                    <View className="gap-2">
                      <Label>Distance</Label>
                      <ChoiceGroup
                        choices={choicesOf(
                          distances,
                          round.distanceId,
                          (d) => `${d.meters} m`
                        )}
                        label={`Round ${index + 1} distance`}
                        onChange={field.handleChange}
                        value={field.state.value}
                      />
                    </View>
                  )}
                </form.Field>
                <form.Field name={`rounds[${index}].targetFaceId`}>
                  {(field) => (
                    <View className="gap-2">
                      <Label>Target face</Label>
                      <ChoiceGroup
                        choices={choicesOf(
                          faces,
                          round.targetFaceId,
                          (f) => f.name
                        )}
                        label={`Round ${index + 1} target face`}
                        onChange={field.handleChange}
                        value={field.state.value}
                      />
                    </View>
                  )}
                </form.Field>
                <form.Field name={`rounds[${index}].plannedEnds`}>
                  {(field) => (
                    <Stepper
                      label="Ends"
                      max={ROUND_LIMITS.plannedEnds.max}
                      min={ROUND_LIMITS.plannedEnds.min}
                      onChange={field.handleChange}
                      value={field.state.value}
                    />
                  )}
                </form.Field>
                <form.Field name={`rounds[${index}].arrowsPerEnd`}>
                  {(field) => (
                    <Stepper
                      label="Arrows per end"
                      max={ROUND_LIMITS.arrowsPerEnd.max}
                      min={ROUND_LIMITS.arrowsPerEnd.min}
                      onChange={field.handleChange}
                      value={field.state.value}
                    />
                  )}
                </form.Field>
              </View>
            ))}
            {roundsField.state.value.length < ROUND_LIMITS.rounds.max ? (
              <Button
                className="h-12"
                onPress={() => {
                  const last = roundsField.state.value.at(-1);
                  roundsField.pushValue(
                    newRound(
                      last ?? {
                        ...HAND_ADDED_ROUND,
                        distanceId: athlete.distance_id,
                        targetFaceId: athlete.target_face_id,
                      }
                    )
                  );
                }}
                variant="outline"
              >
                <Text>Add round</Text>
              </Button>
            ) : null}
            <FieldError errors={roundsField.state.meta.errors} />
          </View>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button
            aria-busy={isSubmitting}
            className="h-12"
            disabled={isSubmitting}
            onPress={submit}
            size="lg"
          >
            <Text>{isSubmitting ? "Starting…" : "Start scoring"}</Text>
          </Button>
        )}
      </form.Subscribe>
      {saveError ? (
        <Text role="alert" variant="error">
          {saveError}
        </Text>
      ) : null}
    </ScrollView>
  );
};

/** Step two of a new session: format, date and rounds for one athlete. */
export const SessionSetup = ({ athleteId }: { athleteId: string }) => {
  const { db } = useScorerDb();

  const { data: found, isLoading } = useLiveQuery({
    query: (q) =>
      q
        .from({ athlete: db.athletes })
        .where(({ athlete }) => eq(athlete.id, athleteId))
        .findOne(),
    queryKey: ["athletes", "one", athleteId],
  });
  const { data: distances } = useLiveQuery({
    query: (q) =>
      q
        .from({ distance: db.distances })
        .orderBy(({ distance }) => distance.meters, "asc"),
    queryKey: ["lookups", "distances", "by-meters"],
  });
  const { data: faces } = useLiveQuery({
    query: (q) =>
      q
        .from({ face: db.targetFaces })
        .orderBy(({ face }) => face.sort_order, "asc"),
    queryKey: ["lookups", "target-faces", "sorted"],
  });

  return (
    <StyledSafeAreaView className="bg-background flex-1" edges={["bottom"]}>
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
