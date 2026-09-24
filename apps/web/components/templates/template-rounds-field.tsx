"use client";

import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { Button } from "@workspace/ui/components/button";
import { FieldLegend, FieldSet } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";

import type { Lookups } from "@/components/athletes/use-athletes";
import type { FilterOption } from "@/components/filters/filter-select";
import { FilterSelect } from "@/components/filters/filter-select";

import type { RoundDraft } from "./template-form";
import { ATHLETE_OWN, newRound, ROUND_LIMITS } from "./template-form";

/** Active options, plus the one a saved round still uses. */
const optionsOf = <T extends { id: number; is_active: boolean }>(
  rows: T[],
  label: (row: T) => string,
  ownLabel: string,
  inUse: ReadonlySet<string>
): FilterOption[] => [
  { label: ownLabel, value: ATHLETE_OWN },
  ...rows.flatMap((row) =>
    row.is_active || inUse.has(String(row.id))
      ? [{ label: label(row), value: String(row.id) }]
      : []
  ),
];

const NumberField = ({
  label,
  limits,
  onChange,
  value,
}: {
  label: string;
  limits: { max: number; min: number };
  onChange: (value: number) => void;
  value: number;
}) => (
  <Input
    aria-label={label}
    className="w-20"
    max={limits.max}
    min={limits.min}
    onChange={(event) => onChange(event.target.valueAsNumber)}
    required
    type="number"
    value={Number.isNaN(value) ? "" : value}
  />
);

/** The rounds every athlete on the plan shoots, in order. */
export const TemplateRoundsField = ({
  lookups,
  onChange,
  rounds,
}: {
  lookups: Lookups;
  onChange: (rounds: RoundDraft[]) => void;
  rounds: RoundDraft[];
}) => {
  const distances = optionsOf(
    lookups.distances,
    (row) => `${row.meters} m`,
    "Athlete's own",
    new Set(rounds.map((round) => round.distanceId))
  );
  const faces = optionsOf(
    lookups.targetFaces,
    (row) => row.name,
    "Athlete's own",
    new Set(rounds.map((round) => round.targetFaceId))
  );
  const update = (key: string, patch: Partial<RoundDraft>) =>
    onChange(
      rounds.map((round) =>
        round.key === key ? { ...round, ...patch } : round
      )
    );

  return (
    <FieldSet>
      <FieldLegend variant="label">Rounds</FieldLegend>
      <div className="flex flex-col gap-2">
        <div
          aria-hidden="true"
          className="text-muted-foreground grid grid-cols-[4rem_1fr_1fr_5rem_5rem_2rem] gap-2 text-xs"
        >
          <span />
          <span>Distance</span>
          <span>Target face</span>
          <span>Ends</span>
          <span>Arrows</span>
        </div>
        {rounds.map((round, index) => {
          const name = `Round ${index + 1}`;
          return (
            <fieldset
              aria-label={name}
              className="grid grid-cols-[4rem_1fr_1fr_5rem_5rem_2rem] items-center gap-2"
              key={round.key}
            >
              <span className="text-xs font-medium">{name}</span>
              <FilterSelect
                className="w-full"
                items={distances}
                label={`${name} distance`}
                onChange={(distanceId) => update(round.key, { distanceId })}
                value={round.distanceId}
              />
              <FilterSelect
                className="w-full"
                items={faces}
                label={`${name} target face`}
                onChange={(targetFaceId) => update(round.key, { targetFaceId })}
                value={round.targetFaceId}
              />
              <NumberField
                label={`${name} ends`}
                limits={ROUND_LIMITS.plannedEnds}
                onChange={(plannedEnds) => update(round.key, { plannedEnds })}
                value={round.plannedEnds}
              />
              <NumberField
                label={`${name} arrows per end`}
                limits={ROUND_LIMITS.arrowsPerEnd}
                onChange={(arrowsPerEnd) => update(round.key, { arrowsPerEnd })}
                value={round.arrowsPerEnd}
              />
              <Button
                aria-label={`Remove ${name.toLowerCase()}`}
                disabled={rounds.length <= ROUND_LIMITS.rounds.min}
                onClick={() =>
                  onChange(rounds.filter((other) => other.key !== round.key))
                }
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <TrashIcon aria-hidden="true" />
              </Button>
            </fieldset>
          );
        })}
        {rounds.length < ROUND_LIMITS.rounds.max ? (
          <Button
            className="self-start"
            onClick={() => onChange([...rounds, newRound(rounds.at(-1))])}
            size="sm"
            type="button"
            variant="outline"
          >
            <PlusIcon aria-hidden="true" data-icon="inline-start" />
            Add round
          </Button>
        ) : null}
      </div>
    </FieldSet>
  );
};
