"use client";

import {
  DotsThreeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TargetIcon,
} from "@phosphor-icons/react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useMemo, useState } from "react";

import { DataTable } from "@/components/data-table/data-table";
import { createDataTableColumnHelper } from "@/components/data-table/data-table-features";
import { PageHeader } from "@/components/page-header";

import { AthleteActiveDialog, AthleteFormDialog } from "./athlete-dialogs";
import type { AthleteRow } from "./use-athletes";
import { useAthletes, useLookups } from "./use-athletes";

type DialogKind = "form" | "active";

const ALL = "all";
const STATUS_FILTERS = [
  { label: "All statuses", value: ALL },
  { label: "Active", value: "active" },
  { label: "Deactivated", value: "inactive" },
];

const helper = createDataTableColumnHelper<AthleteRow>();

const buildColumns = (
  openDialog: (kind: DialogKind, athlete: AthleteRow) => void
) =>
  helper.columns([
    helper.accessor("id_no", {
      cell: (cell) => <span className="font-mono">{cell.getValue()}</span>,
      header: "ID No.",
      sortFn: "alphanumeric",
    }),
    helper.accessor("full_name", {
      cell: (cell) => <span className="font-medium">{cell.getValue()}</span>,
      header: "Name",
      sortFn: "text",
    }),
    helper.accessor((row) => row.aai_no ?? "", {
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
    helper.accessor("gender", {
      cell: (cell) => (cell.getValue() === "female" ? "Female" : "Male"),
      header: "Gender",
      sortFn: "text",
    }),
    helper.accessor((row) => row.category?.name ?? "", {
      header: "Category",
      id: "category",
      sortFn: "text",
    }),
    helper.accessor((row) => row.event?.name ?? "", {
      header: "Event",
      id: "event",
      sortFn: "text",
    }),
    helper.accessor((row) => row.distance?.meters ?? 0, {
      cell: (cell) => <span className="tabular-nums">{cell.getValue()} m</span>,
      header: "Distance",
      id: "distance",
      sortFn: "basic",
    }),
    helper.accessor((row) => row.target_face?.name ?? "", {
      header: "Target face",
      id: "target_face",
      sortFn: "text",
    }),
    helper.accessor("is_active", {
      cell: (cell) =>
        cell.getValue() ? (
          <Badge variant="outline">Active</Badge>
        ) : (
          <Badge variant="destructive">Deactivated</Badge>
        ),
      header: "Status",
      sortFn: "basic",
    }),
    helper.display({
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

interface Filters {
  categoryId: string;
  eventId: string;
  search: string;
  status: string;
}

const matchesFilters = (athlete: AthleteRow, filters: Filters) => {
  const query = filters.search.trim().toLowerCase();
  const matchesSearch =
    !query ||
    athlete.full_name.toLowerCase().includes(query) ||
    athlete.id_no.toLowerCase().includes(query) ||
    (athlete.aai_no ?? "").toLowerCase().includes(query);
  const matchesCategory =
    filters.categoryId === ALL ||
    String(athlete.category_id) === filters.categoryId;
  const matchesEvent =
    filters.eventId === ALL || String(athlete.event_id) === filters.eventId;
  const matchesStatus =
    filters.status === ALL ||
    (filters.status === "active") === athlete.is_active;
  return matchesSearch && matchesCategory && matchesEvent && matchesStatus;
};

const FilterSelect = ({
  items,
  label,
  onChange,
  value,
}: {
  items: { label: string; value: string }[];
  label: string;
  onChange: (value: string) => void;
  value: string;
}) => (
  <Select
    items={items}
    onValueChange={(next) => onChange(String(next))}
    value={value}
  >
    <SelectTrigger aria-label={label} className="sm:w-44">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {items.map((item) => (
        <SelectItem key={item.value} value={item.value}>
          {item.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const AthletesEmpty = ({ filtered }: { filtered: boolean }) => (
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <TargetIcon aria-hidden="true" />
      </EmptyMedia>
      <EmptyTitle>
        {filtered ? "No matching athletes" : "No athletes yet"}
      </EmptyTitle>
      <EmptyDescription>
        {filtered
          ? "Try a different search or clear the filters."
          : "Add an athlete so scorers can select them on the mobile app."}
      </EmptyDescription>
    </EmptyHeader>
  </Empty>
);

export const AthletesPage = () => {
  const athletes = useAthletes();
  const lookups = useLookups();
  const [filters, setFilters] = useState<Filters>({
    categoryId: ALL,
    eventId: ALL,
    search: "",
    status: ALL,
  });
  // The athlete outlives the open state so a closing dialog keeps its text.
  const [dialogKind, setDialogKind] = useState<DialogKind | null>(null);
  const [dialogAthlete, setDialogAthlete] = useState<AthleteRow | null>(null);

  const columns = useMemo(
    () =>
      buildColumns((kind, athlete) => {
        setDialogAthlete(athlete);
        setDialogKind(kind);
      }),
    []
  );
  const rows = useMemo(
    () =>
      (athletes.data ?? []).filter((athlete) =>
        matchesFilters(athlete, filters)
      ),
    [athletes.data, filters]
  );
  const categoryItems = useMemo(
    () => [
      { label: "All categories", value: ALL },
      ...(lookups.data?.categories ?? []).map((row) => ({
        label: row.name,
        value: String(row.id),
      })),
    ],
    [lookups.data]
  );
  const eventItems = useMemo(
    () => [
      { label: "All events", value: ALL },
      ...(lookups.data?.events ?? []).map((row) => ({
        label: row.name,
        value: String(row.id),
      })),
    ],
    [lookups.data]
  );
  const filtered =
    filters.search !== "" ||
    filters.categoryId !== ALL ||
    filters.eventId !== ALL ||
    filters.status !== ALL;
  const setFilter = (key: keyof Filters) => (value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const closeDialog = (open: boolean) => {
    if (!open) {
      setDialogKind(null);
    }
  };
  const error = athletes.error ?? lookups.error;

  return (
    <div>
      <PageHeader
        action={
          <Button
            disabled={!lookups.data}
            onClick={() => {
              setDialogAthlete(null);
              setDialogKind("form");
            }}
          >
            <PlusIcon aria-hidden="true" data-icon="inline-start" />
            Add athlete
          </Button>
        }
        description="Athlete profiles that scorers select when they start a scoring session."
        title="Athletes"
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <InputGroup className="sm:max-w-xs">
          <InputGroupAddon>
            <MagnifyingGlassIcon aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search athletes"
            onChange={(event) => setFilter("search")(event.target.value)}
            placeholder="Search name, ID No. or AAI No."
            value={filters.search}
          />
        </InputGroup>
        <FilterSelect
          items={categoryItems}
          label="Filter by category"
          onChange={setFilter("categoryId")}
          value={filters.categoryId}
        />
        <FilterSelect
          items={eventItems}
          label="Filter by event"
          onChange={setFilter("eventId")}
          value={filters.eventId}
        />
        <FilterSelect
          items={STATUS_FILTERS}
          label="Filter by status"
          onChange={setFilter("status")}
          value={filters.status}
        />
      </div>

      {athletes.isPending ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error.message}
        </p>
      ) : null}
      {athletes.data ? (
        <DataTable
          columns={columns}
          data={rows}
          empty={<AthletesEmpty filtered={filtered} />}
          getRowId={(athlete) => athlete.id}
          initialSorting={[{ desc: false, id: "full_name" }]}
          label="Athletes"
        />
      ) : null}

      {lookups.data ? (
        <AthleteFormDialog
          athlete={dialogAthlete}
          lookups={lookups.data}
          onOpenChange={closeDialog}
          open={dialogKind === "form"}
        />
      ) : null}
      <AthleteActiveDialog
        athlete={dialogAthlete}
        onOpenChange={closeDialog}
        open={dialogKind === "active"}
      />
    </div>
  );
};
