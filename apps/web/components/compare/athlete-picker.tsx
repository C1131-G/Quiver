"use client";

import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

import type { AthleteRow } from "@/components/athletes/use-athletes";
import { updateSearchParams } from "@/components/filters/use-filters";

import type { Slots } from "./selection";
import {
  addToSlots,
  MAX_COMPARED,
  removeFromSlots,
  selectedIds,
  serializeSlots,
} from "./selection";
import type { Series } from "./series";
import { SeriesKey } from "./series-key";

const saveSlots = (slots: Slots) =>
  updateSearchParams({ athletes: serializeSlots(slots) });

/** Pick up to six athletes; each keeps its slot, and so its colour. */
export const AthletePicker = ({
  athletes,
  series,
  slots,
}: {
  athletes: AthleteRow[] | undefined;
  series: Series[];
  slots: Slots;
}) => {
  const chosen = new Set(selectedIds(slots));
  const full = chosen.size >= MAX_COMPARED;
  // Deactivated athletes stay listed only while they are being compared.
  const options = (athletes ?? []).filter(
    (athlete) => athlete.is_active || chosen.has(athlete.id)
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button disabled={!athletes} variant="outline" />}
        >
          <PlusIcon aria-hidden="true" data-icon="inline-start" />
          Athletes ({chosen.size} of {MAX_COMPARED})
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-80 w-72">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              {full
                ? "Six athletes chosen; remove one to add another"
                : "Compare athletes"}
            </DropdownMenuLabel>
            {options.map((athlete) => {
              const checked = chosen.has(athlete.id);
              return (
                <DropdownMenuCheckboxItem
                  checked={checked}
                  disabled={full && !checked}
                  key={athlete.id}
                  onCheckedChange={(next) =>
                    saveSlots(
                      next
                        ? addToSlots(slots, athlete.id)
                        : removeFromSlots(slots, athlete.id)
                    )
                  }
                >
                  {athlete.full_name}
                  <span className="text-muted-foreground ml-auto font-mono">
                    {athlete.id_no}
                  </span>
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {series.map((item) => (
        <Badge key={item.key} variant="outline">
          <SeriesKey color={item.color} />
          {item.name}
          <Button
            aria-label={`Remove ${item.name} from the comparison`}
            onClick={() => saveSlots(removeFromSlots(slots, item.athleteId))}
            size="icon-xs"
            variant="ghost"
          >
            <XIcon aria-hidden="true" />
          </Button>
        </Badge>
      ))}
    </div>
  );
};
