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
import { formatDateTime } from "@/lib/format";

import type { Profile } from "./use-scorers";

export type AccountDialogKind = "edit" | "reset" | "active";

const column = createDataTableColumnHelper<Profile>();

export const buildAccountColumns = (
  openDialog: (kind: AccountDialogKind, user: Profile) => void
) =>
  column.columns([
    column.accessor("full_name", {
      cell: (cell) => <span className="font-medium">{cell.getValue()}</span>,
      header: "Name",
      sortFn: "text",
    }),
    column.accessor("login_id", {
      cell: (cell) => <span className="font-mono">{cell.getValue()}</span>,
      header: "Login ID",
      sortFn: "text",
    }),
    column.accessor("role", {
      cell: (cell) => (
        <Badge variant={cell.getValue() === "admin" ? "default" : "secondary"}>
          {cell.getValue() === "admin" ? "Admin" : "Scorer"}
        </Badge>
      ),
      header: "Role",
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
    column.accessor("created_at", {
      cell: (cell) => (
        <span className="tabular-nums">{formatDateTime(cell.getValue())}</span>
      ),
      header: "Created",
      sortFn: "text",
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
                onClick={() => openDialog("edit", row.original)}
              >
                Edit name
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openDialog("reset", row.original)}
              >
                Reset password
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
