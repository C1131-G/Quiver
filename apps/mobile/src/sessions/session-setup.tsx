import { eq, useLiveQuery } from "@tanstack/react-db";
import type { ReactFormExtendedApi } from "@tanstack/react-form";
import { useForm } from "@tanstack/react-form";
import { randomUUID } from "expo-crypto";
import { router, Stack } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { z } from "zod";

import type { Choice } from "@/components/choice-group";
import { ChoiceGroup } from "@/components/choice-group";
import { Stepper } from "@/components/stepper";
import { PlusIcon, StyledSafeAreaView } from "@/components/styled";
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
import { today } from "@/lib/today";
import { cn } from "@/lib/utils";
import type { RoundDraft } from "@/scoring/actions";
import { startSessions } from "@/scoring/actions";
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

/**
 * The form instance shape shared with the extracted rounds section, matching
 * TanStack Form's own pattern for a form-shaped prop (see useFormContext's
 * declared return type).
 */
/* oxlint-disable no-explicit-any -- library generics require it */
type SetupFormApi = ReactFormExtendedApi<
  SetupValues,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>;
/* oxlint-enable no-explicit-any */

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
const choicesOf = <TRow extends { id: number; is_active: boolean }>(
  rows: readonly TRow[],
  inUse: number,
  label: (row: TRow) => string
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

/** An iOS-style section label above a grouped card. */
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <View className="px-1">
    <Text variant="eyebrow">{children}</Text>
  </View>
);

/** A grouped card, like an iOS Settings/Form section: rounded, one hairline edge. */
const Card = ({ children }: { children: React.ReactNode }) => (
  <View className="border-foreground/10 bg-card overflow-hidden rounded-2xl border">
    {children}
  </View>
);

const CardRow = ({
  children,
  last = false,
}: {
  children: React.ReactNode;
  /** Omits the divider under the final row in a card. */
  last?: boolean;
}) => (
  <View
    className={cn("gap-2 p-4", last ? undefined : "border-border/60 border-b")}
  >
    {children}
  </View>
);

/** One round's card: distance, target face and end/arrow steppers. */
const RoundFormCard = ({
  canRemove,
  distances,
  faces,
  form,
  index,
  onRemove,
  round,
}: {
  canRemove: boolean;
  distances: readonly Distance[];
  faces: readonly TargetFace[];
  form: SetupFormApi;
  index: number;
  onRemove: () => void;
  round: RoundForm;
}) => (
  <View className="border-foreground/10 bg-card gap-4 rounded-2xl border p-4">
    <View className="border-border/60 -mx-4 -mt-4 min-h-12 flex-row items-center justify-between border-b px-4 py-1">
      <Text aria-level={2} role="heading" variant="large">
        Round {index + 1}
      </Text>
      {canRemove ? (
        <Button
          onPress={onRemove}
          radius="pill"
          size="sm"
          variant="destructive"
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
              (distance) => `${distance.meters} m`
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
            choices={choicesOf(faces, round.targetFaceId, (face) => face.name)}
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
);

/** The rounds array: one card per round, plus add/remove. */
const RoundsSection = ({
  athlete,
  distances,
  faces,
  form,
}: {
  athlete: Athlete;
  distances: readonly Distance[];
  faces: readonly TargetFace[];
  form: SetupFormApi;
}) => (
  <form.Field mode="array" name="rounds">
    {(roundsField) => (
      <View className="gap-2">
        <SectionLabel>Rounds</SectionLabel>
        <View className="gap-3">
          {roundsField.state.value.map((round, index) => (
            <RoundFormCard
              canRemove={
                roundsField.state.value.length > ROUND_LIMITS.rounds.min &&
                index === roundsField.state.value.length - 1
              }
              distances={distances}
              faces={faces}
              form={form}
              index={index}
              key={round.key}
              onRemove={() => roundsField.removeValue(index)}
              round={round}
            />
          ))}
          {roundsField.state.value.length < ROUND_LIMITS.rounds.max ? (
            <Button
              className="h-11"
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
              radius="pill"
              variant="outline"
            >
              <PlusIcon colorClassName="accent-foreground" size={18} />
              <Text>Add round</Text>
            </Button>
          ) : null}
          <FieldError errors={roundsField.state.meta.errors} />
        </View>
      </View>
    )}
  </form.Field>
);

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
        setSaveError("Could not save the session on this phone. Try again.");
      }
    },
    validators: { onSubmit: setupSchema },
  });

  const submit = async () => {
    try {
      await form.handleSubmit();
    } catch {
      setSaveError("Could not save the session on this phone. Try again.");
    }
  };

  const presetChoices: Choice<string>[] = ROUND_PRESETS.map((option) => ({
    label: option.label,
    value: option.id,
  }));

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 p-4 pb-2"
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center gap-1 pt-1 pb-2">
          <Text className="text-center" variant="h3">
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
                </CardRow>
              )}
            </form.Field>

            <form.Field name="sessionType">
              {(field) => (
                <CardRow>
                  <Label>Type</Label>
                  <ChoiceGroup
                    choices={SESSION_TYPES}
                    label="Session type"
                    onChange={field.handleChange}
                    value={field.state.value}
                  />
                </CardRow>
              )}
            </form.Field>

            <form.Field name="venue">
              {(field) => (
                <CardRow last>
                  <Label>Venue</Label>
                  <ChoiceGroup
                    choices={VENUES}
                    label="Venue"
                    onChange={field.handleChange}
                    value={field.state.value}
                  />
                </CardRow>
              )}
            </form.Field>
          </Card>
        </View>

        <View className="gap-2">
          <SectionLabel>Details</SectionLabel>
          <Card>
            <form.Field name="sessionDate">
              {(field) => (
                <CardRow>
                  <Label nativeID="session-date-label">Date</Label>
                  <Input
                    accessibilityLabelledBy="session-date-label"
                    className="h-11"
                    inputMode="numeric"
                    maxLength={10}
                    onBlur={field.handleBlur}
                    onChangeText={field.handleChange}
                    placeholder="2026-09-24"
                    value={field.state.value}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </CardRow>
              )}
            </form.Field>

            <form.Field name="title">
              {(field) => (
                <CardRow last>
                  <Label nativeID="session-title-label">Title (optional)</Label>
                  <Input
                    accessibilityLabelledBy="session-title-label"
                    className="h-11"
                    maxLength={120}
                    onBlur={field.handleBlur}
                    onChangeText={field.handleChange}
                    placeholder="e.g. State trials, morning"
                    value={field.state.value}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </CardRow>
              )}
            </form.Field>
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
      </ScrollView>

      <View className="border-border bg-background border-t p-4">
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button
              aria-busy={isSubmitting}
              className="h-14"
              disabled={isSubmitting}
              onPress={submit}
              radius="pill"
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
