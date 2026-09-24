"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { FieldLegend, FieldSet } from "@workspace/ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group";
import { useState } from "react";

import type { AthleteRow } from "@/components/athletes/use-athletes";

const matches = (athlete: AthleteRow, query: string) =>
  athlete.full_name.toLowerCase().includes(query) ||
  athlete.id_no.toLowerCase().includes(query) ||
  (athlete.category?.name ?? "").toLowerCase().includes(query);

/** The athletes who shoot the plan; search narrows the list, not the choice. */
export const TemplateAthletesField = ({
  athletes,
  onChange,
  selected,
}: {
  athletes: AthleteRow[];
  onChange: (athleteIds: string[]) => void;
  selected: string[];
}) => {
  const [search, setSearch] = useState("");
  const chosen = new Set(selected);
  const query = search.trim().toLowerCase();
  // Deactivated athletes stay listed only while the plan still has them.
  const shown = athletes.filter(
    (athlete) =>
      (athlete.is_active || chosen.has(athlete.id)) && matches(athlete, query)
  );
  const toggle = (id: string, checked: boolean) =>
    onChange(
      checked ? [...selected, id] : selected.filter((other) => other !== id)
    );
  const addShown = () =>
    onChange([
      ...selected,
      ...shown.flatMap((athlete) =>
        chosen.has(athlete.id) ? [] : [athlete.id]
      ),
    ]);

  return (
    <FieldSet>
      <FieldLegend variant="label">Athletes ({chosen.size} chosen)</FieldLegend>
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="max-w-xs">
          <InputGroupAddon>
            <MagnifyingGlassIcon aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search athletes to add"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, ID No. or category"
            value={search}
          />
        </InputGroup>
        <Button
          disabled={shown.every((athlete) => chosen.has(athlete.id))}
          onClick={addShown}
          size="sm"
          type="button"
          variant="outline"
        >
          Choose all shown
        </Button>
        <Button
          disabled={chosen.size === 0}
          onClick={() => onChange([])}
          size="sm"
          type="button"
          variant="ghost"
        >
          Clear
        </Button>
      </div>
      <ul className="border-border flex max-h-64 flex-col overflow-y-auto border">
        {shown.map((athlete) => (
          <li key={athlete.id}>
            <label className="hover:bg-muted flex cursor-pointer items-center gap-3 px-3 py-2 text-xs">
              <Checkbox
                checked={chosen.has(athlete.id)}
                onCheckedChange={(checked) => toggle(athlete.id, checked)}
              />
              <span className="flex-1 font-medium">{athlete.full_name}</span>
              <span className="text-muted-foreground">
                {athlete.category?.name} · {athlete.distance?.meters} m
              </span>
              <span className="text-muted-foreground w-16 text-right font-mono">
                {athlete.id_no}
              </span>
            </label>
          </li>
        ))}
        {shown.length === 0 ? (
          <li className="text-muted-foreground px-3 py-4 text-center text-xs">
            No athletes match.
          </li>
        ) : null}
      </ul>
    </FieldSet>
  );
};
