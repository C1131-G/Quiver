"use client";

import {
  MagnifyingGlassIcon,
  PlusIcon,
  TargetIcon,
} from "@phosphor-icons/react";
import { Button } from "@workspace/ui/components/button";
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
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useDeferredValue, useMemo, useState } from "react";

import { DataTable } from "@/components/data-table/data-table";
import { FilterSelect } from "@/components/filters/filter-select";
import { PageHeader } from "@/components/page-header";

import { AthleteActiveDialog } from "./athlete-active-dialog";
import type { AthleteDialogKind } from "./athlete-columns";
import { buildAthleteColumns } from "./athlete-columns";
import { AthleteFormDialog } from "./athlete-dialogs";
import type { AthleteRow } from "./use-athletes";
import { useAthletes, useLookups } from "./use-athletes";

const ALL = "all";
const STATUS_FILTERS = [
  { label: "All statuses", value: ALL },
  { label: "Active", value: "active" },
  { label: "Deactivated", value: "inactive" },
];

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
  const [dialogKind, setDialogKind] = useState<AthleteDialogKind>();
  const [dialogAthlete, setDialogAthlete] = useState<AthleteRow>();

  const columns = useMemo(
    () =>
      buildAthleteColumns((kind, athlete) => {
        setDialogAthlete(athlete);
        setDialogKind(kind);
      }),
    []
  );
  // The list filters on the deferred keystrokes so typing stays responsive
  // while a large roster re-filters in the background.
  const deferredSearch = useDeferredValue(filters.search);
  const rows = useMemo(
    () =>
      (athletes.data ?? []).filter((athlete) =>
        matchesFilters(athlete, { ...filters, search: deferredSearch })
      ),
    [athletes.data, deferredSearch, filters]
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
      setDialogKind(undefined);
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
              setDialogAthlete(undefined);
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

      <div className="mb-4 flex flex-wrap gap-2">
        <InputGroup className="max-w-xs">
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
          rows={rows}
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
