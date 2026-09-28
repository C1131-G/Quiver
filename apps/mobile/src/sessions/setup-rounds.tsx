import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { ChoiceGroup } from "@/components/choice-group";
import { Sheet } from "@/components/sheet";
import { Stepper } from "@/components/stepper";
import { PlusIcon } from "@/components/styled";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import type { Athlete, Distance, TargetFace } from "@/db/rows";
import { ROUND_LIMITS } from "@/scoring/presets";

import { FieldError, SectionLabel } from "./setup-parts";
import type { RoundForm, SetupFormApi } from "./setup-schema";
import { choicesOf, HAND_ADDED_ROUND, newRound } from "./setup-schema";

interface Lookups {
  distances: readonly Distance[];
  faces: readonly TargetFace[];
}

const TILE = "min-h-14 min-w-[45%] flex-1 justify-center border px-3 py-2";

/** One round's editor: distance, face, and end and arrow counts. */
const RoundEditor = ({
  distances,
  faces,
  form,
  index,
  round,
}: Lookups & { form: SetupFormApi; index: number; round: RoundForm }) => (
  <View className="gap-5">
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
            columns={2}
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

const summaryOf = (round: RoundForm, { distances, faces }: Lookups) => {
  const meters = distances.find((row) => row.id === round.distanceId)?.meters;
  const face = faces.find((row) => row.id === round.targetFaceId)?.name ?? "";
  return {
    layout: `${round.plannedEnds} ends × ${round.arrowsPerEnd}`,
    setup: `${meters === undefined ? "" : `${meters} m · `}${face}`,
  };
};

/**
 * The rounds as compact tiles, two to a line, so even six rounds fit on
 * screen. A tile opens that round's editor in a sheet.
 */
export const RoundsSection = ({
  athlete,
  distances,
  faces,
  form,
}: Lookups & { athlete: Athlete; form: SetupFormApi }) => {
  const [editing, setEditing] = useState<number | null>(null);
  return (
    <form.Field mode="array" name="rounds">
      {(roundsField) => {
        const rounds = roundsField.state.value;
        const edited = editing === null ? undefined : rounds[editing];
        const canRemove = rounds.length > ROUND_LIMITS.rounds.min;
        return (
          <View className="gap-2">
            <SectionLabel>Rounds</SectionLabel>
            <View className="flex-row flex-wrap gap-1">
              {rounds.map((round, index) => {
                const { setup, layout } = summaryOf(round, {
                  distances,
                  faces,
                });
                return (
                  <Pressable
                    aria-label={`Round ${index + 1}: ${setup}, ${layout}. Edit`}
                    className={`${TILE} border-foreground/10 bg-card active:bg-muted`}
                    key={round.key}
                    onPress={() => setEditing(index)}
                    role="button"
                  >
                    <Text variant="small">Round {index + 1}</Text>
                    <Text numberOfLines={1} variant="stat">
                      {setup}
                    </Text>
                    <Text variant="stat">{layout}</Text>
                  </Pressable>
                );
              })}
              {rounds.length < ROUND_LIMITS.rounds.max ? (
                <Pressable
                  aria-label="Add round"
                  className={`${TILE} border-input active:bg-muted flex-row items-center gap-1.5 border-dashed`}
                  onPress={() => {
                    roundsField.pushValue(
                      newRound(
                        rounds.at(-1) ?? {
                          ...HAND_ADDED_ROUND,
                          distanceId: athlete.distance_id,
                          targetFaceId: athlete.target_face_id,
                        }
                      )
                    );
                  }}
                  role="button"
                >
                  <PlusIcon colorClassName="accent-foreground" size={16} />
                  <Text variant="small">Add round</Text>
                </Pressable>
              ) : null}
            </View>
            <FieldError errors={roundsField.state.meta.errors} />
            <Sheet
              onClose={() => setEditing(null)}
              open={edited !== undefined}
              title={editing === null ? "Round" : `Round ${editing + 1}`}
            >
              {edited !== undefined && editing !== null ? (
                <ScrollView
                  contentContainerClassName="gap-6 p-4"
                  contentInsetAdjustmentBehavior="automatic"
                >
                  <RoundEditor
                    distances={distances}
                    faces={faces}
                    form={form}
                    index={editing}
                    round={edited}
                  />
                  {canRemove ? (
                    <Button
                      className="h-12"
                      onPress={() => {
                        roundsField.removeValue(editing);
                        setEditing(null);
                      }}
                      variant="destructive"
                    >
                      <Text>Remove round {editing + 1}</Text>
                    </Button>
                  ) : null}
                </ScrollView>
              ) : null}
            </Sheet>
          </View>
        );
      }}
    </form.Field>
  );
};
