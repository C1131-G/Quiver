"use client";

import { DotsThreeIcon } from "@phosphor-icons/react";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

import type { Lookups } from "@/components/athletes/use-athletes";
import { createDataTableColumnHelper } from "@/components/data-table/data-table-features";
import {
  SESSION_TYPE_LABELS,
  VENUE_LABELS,
} from "@/components/sessions/session-labels";
import { formatDate } from "@/lib/format";

import type { TemplateRow } from "./use-templates";
import { startedAthletes } from "./use-templates";

export type TemplateDialogKind = "form" | "delete";

const column = createDataTableColumnHelper<TemplateRow>();

/** "2 × 6 ends of 6 · 70 m" — each distinct round once, with its count. */
export const describeRounds = (template: TemplateRow, lookups: Lookups) => {
  const meters = new Map(lookups.distances.map((row) => [row.id, row.meters]));
  const counts = new Map<string, number>();
  for (const round of template.rounds) {
    const roundMeters =
      round.distance_id === null ? undefined : meters.get(round.distance_id);
    const label = `${round.planned_ends} ends of ${round.arrows_per_end}${
      roundMeters === undefined ? "" : ` · ${roundMeters} m`
    }`;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts]
    .map(([label, count]) => (count > 1 ? `${count} × ${label}` : label))
    .join(", ");
};

export const buildTemplateColumns = (
  lookups: Lookups,
  openDialog: (kind: TemplateDialogKind, template: TemplateRow) => void
) =>
  column.columns([
    column.accessor("session_date", {
      cell: (cell) => (
        <span className="tabular-nums">{formatDate(cell.getValue())}</span>
      ),
      header: "Date",
      sortFn: "text",
    }),
    column.accessor("title", {
      cell: (cell) => <span className="font-medium">{cell.getValue()}</span>,
      header: "Title",
      sortFn: "text",
    }),
    column.accessor(
      (row) =>
        `${SESSION_TYPE_LABELS[row.session_type]} · ${VENUE_LABELS[row.venue]}`,
      { header: "Session", id: "session", sortFn: "text" }
    ),
    column.accessor((row) => describeRounds(row, lookups), {
      header: "Rounds",
      id: "rounds",
      sortFn: "text",
    }),
    column.accessor((row) => startedAthletes(row).size, {
      cell: ({ getValue, row }) => (
        <span className="tabular-nums">
          {getValue()} of {row.original.athletes.length}
        </span>
      ),
      header: "Started",
      id: "started",
      sortFn: "basic",
    }),
    column.display({
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  aria-label={`Actions for ${row.original.title}`}
                  size="icon-sm"
                  variant="ghost"
                />
              }
            >
              <DotsThreeIcon aria-hidden="true" weight="bold" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => openDialog("form", row.original)}
              >
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => openDialog("delete", row.original)}
                variant="destructive"
              >
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      enableSorting: false,
      header: () => <span className="sr-only">Actions</span>,
      id: "actions",
    }),
  ]);
