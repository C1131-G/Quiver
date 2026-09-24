"use client";

import { DotsThreeIcon } from "@phosphor-icons/react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

import { createDataTableColumnHelper } from "@/components/data-table/data-table-features";

import type { AthleteRow } from "./use-athletes";

export type AthleteDialogKind = "form" | "active";

const column = createDataTableColumnHelper<AthleteRow>();

export const buildAthleteColumns = (
  openDialog: (kind: AthleteDialogKind, athlete: AthleteRow) => void
) =>
  column.columns([
    column.accessor("id_no", {
      cell: (cell) => <span className="font-mono">{cell.getValue()}</span>,
      header: "ID No.",
      sortFn: "alphanumeric",
    }),
    column.accessor("full_name", {
      cell: (cell) => <span className="font-medium">{cell.getValue()}</span>,
      header: "Name",
      sortFn: "text",
    }),
    column.accessor((row) => row.aai_no ?? "", {
      cell: (cell) =>
        cell.getValue() ? (
          <span className="font-mono">{cell.getValue()}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      header: "AAI No.",
      id: "aai_no",
      sortFn: "alphanumeric",
    }),
    column.accessor("gender", {
      cell: (cell) => (cell.getValue() === "female" ? "Female" : "Male"),
      header: "Gender",
      sortFn: "text",
    }),
    column.accessor((row) => row.category?.name ?? "", {
      header: "Category",
      id: "category",
      sortFn: "text",
    }),
    column.accessor((row) => row.event?.name ?? "", {
      header: "Event",
      id: "event",
      sortFn: "text",
    }),
    column.accessor((row) => row.distance?.meters ?? 0, {
      cell: (cell) => <span className="tabular-nums">{cell.getValue()} m</span>,
      header: "Distance",
      id: "distance",
      sortFn: "basic",
    }),
    column.accessor((row) => row.target_face?.name ?? "", {
      header: "Target face",
      id: "target_face",
      sortFn: "text",
    }),
    column.accessor("is_active", {
      cell: (cell) =>
        cell.getValue() ? (
          <Badge variant="outline">Active</Badge>
        ) : (
          <Badge variant="destructive">Deactivated</Badge>
        ),
      header: "Status",
      sortFn: "basic",
    }),
    column.display({
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  aria-label={`Actions for ${row.original.full_name}`}
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
                onClick={() => openDialog("active", row.original)}
                variant={row.original.is_active ? "destructive" : "default"}
              >
                {row.original.is_active ? "Deactivate" : "Reactivate"}
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
