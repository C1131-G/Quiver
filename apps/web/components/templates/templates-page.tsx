"use client";

import { CalendarPlusIcon, PlusIcon } from "@phosphor-icons/react";
import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useMemo, useState } from "react";

import { useAthletes, useLookups } from "@/components/athletes/use-athletes";
import { DataTable } from "@/components/data-table/data-table";
import { FilterSelect } from "@/components/filters/filter-select";
import { PageHeader } from "@/components/page-header";
import { toIsoDate } from "@/lib/format";

import type { TemplateDialogKind } from "./template-columns";
import { buildTemplateColumns } from "./template-columns";
import { TemplateDeleteDialog } from "./template-delete-dialog";
import { TemplateDialog } from "./template-dialog";
import type { TemplateRow } from "./use-templates";
import { useTemplates } from "./use-templates";

const UPCOMING = "upcoming";
const WHEN_FILTERS = [
  { label: "Today and later", value: UPCOMING },
  { label: "All dates", value: "all" },
];

const TemplatesEmpty = ({ filtered }: { filtered: boolean }) => (
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <CalendarPlusIcon aria-hidden="true" />
      </EmptyMedia>
      <EmptyTitle>
        {filtered ? "Nothing scheduled ahead" : "No scheduled sessions yet"}
      </EmptyTitle>
      <EmptyDescription>
        Schedule a session so scorers can start it in QuiverScore with the
        athletes and rounds already set.
      </EmptyDescription>
    </EmptyHeader>
  </Empty>
);

export const TemplatesPageSkeleton = () => (
  <div>
    <PageHeader
      description="Sessions planned ahead. Scorers start them in QuiverScore, one per athlete, with the rounds filled in."
      title="Schedule"
    />
    <div aria-busy="true" className="flex flex-col gap-2">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  </div>
);

export const TemplatesPage = () => {
  const templates = useTemplates();
  const athletes = useAthletes();
  const lookups = useLookups();
  const [when, setWhen] = useState(UPCOMING);
  // The plan outlives the open state so a closing dialog keeps its text.
  const [dialogKind, setDialogKind] = useState<TemplateDialogKind | null>(null);
  const [dialogTemplate, setDialogTemplate] = useState<TemplateRow | null>(
    null
  );

  const columns = useMemo(
    () =>
      lookups.data
        ? buildTemplateColumns(lookups.data, (kind, template) => {
            setDialogTemplate(template);
            setDialogKind(kind);
          })
        : [],
    [lookups.data]
  );
  const rows = useMemo(() => {
    if (!templates.data) {
      return [];
    }
    const today = toIsoDate(new Date());
    return templates.data.filter(
      (template) => when !== UPCOMING || template.session_date >= today
    );
  }, [templates.data, when]);
  const closeDialog = (open: boolean) => {
    if (!open) {
      setDialogKind(null);
    }
  };
  const error = templates.error ?? athletes.error ?? lookups.error;
  const ready = templates.data && lookups.data;

  return (
    <div>
      <PageHeader
        action={
          <Button
            disabled={!(lookups.data && athletes.data)}
            onClick={() => {
              setDialogTemplate(null);
              setDialogKind("form");
            }}
          >
            <PlusIcon aria-hidden="true" data-icon="inline-start" />
            Schedule session
          </Button>
        }
        description="Sessions planned ahead. Scorers start them in QuiverScore, one per athlete, with the rounds filled in."
        title="Schedule"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterSelect
          items={WHEN_FILTERS}
          label="Filter by date"
          onChange={setWhen}
          value={when}
        />
      </div>

      {templates.isPending ? (
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
      {ready ? (
        <DataTable
          columns={columns}
          rows={rows}
          empty={<TemplatesEmpty filtered={when === UPCOMING} />}
          getRowId={(template) => template.id}
          initialSorting={[{ desc: false, id: "session_date" }]}
          label="Scheduled sessions"
        />
      ) : null}

      {lookups.data && athletes.data ? (
        <TemplateDialog
          athletes={athletes.data}
          lookups={lookups.data}
          onOpenChange={closeDialog}
          open={dialogKind === "form"}
          template={dialogTemplate}
        />
      ) : null}
      <TemplateDeleteDialog
        onOpenChange={closeDialog}
        open={dialogKind === "delete"}
        template={dialogTemplate}
      />
    </div>
  );
};
