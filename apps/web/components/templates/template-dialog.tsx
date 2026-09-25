"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import type { FormEvent } from "react";
import { useState } from "react";

import type { AthleteRow, Lookups } from "@/components/athletes/use-athletes";
import { FilterSelect } from "@/components/filters/filter-select";
import {
  SESSION_TYPE_LABELS,
  VENUE_LABELS,
} from "@/components/sessions/session-labels";
import { toIsoDate } from "@/lib/format";

import { TemplateAthletesField } from "./template-athletes-field";
import type { TemplateDraft } from "./template-form";
import { draftOf, readTemplateDraft } from "./template-form";
import { TemplateRoundsField } from "./template-rounds-field";
import type { TemplateRow } from "./use-templates";
import { useSaveTemplate } from "./use-templates";

const optionsOf = <TKey extends string>(labels: Record<TKey, string>) =>
  Object.entries<string>(labels).map(([value, label]) => ({ label, value }));

const SESSION_TYPES = optionsOf(SESSION_TYPE_LABELS);
const VENUES = optionsOf(VENUE_LABELS);

const isKeyOf = <TKey extends string>(
  labels: Record<TKey, string>,
  value: string
): value is TKey => Object.hasOwn(labels, value);

/** The form itself; it mounts with the dialog, so every open starts clean. */
const TemplateForm = ({
  athletes,
  lookups,
  onSaved,
  template,
}: {
  athletes: AthleteRow[];
  lookups: Lookups;
  onSaved: () => void;
  template: TemplateRow | null;
}) => {
  const mutation = useSaveTemplate();
  const [draft, setDraft] = useState<TemplateDraft>(() =>
    draftOf(template, toIsoDate(new Date()))
  );
  const [formError, setFormError] = useState<string | undefined>();
  const set = <TKey extends keyof TemplateDraft>(
    key: TKey,
    value: TemplateDraft[TKey]
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mutation.isPending) {
      return;
    }
    const read = readTemplateDraft(draft);
    setFormError(read.ok ? undefined : read.error);
    if (read.ok) {
      // Closes once the list has refetched, so the saved plan is there.
      mutation.mutate(
        { id: template?.id ?? null, input: read.input },
        { onSuccess: onSaved }
      );
    }
  };
  const error = formError ?? mutation.error?.message;

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <DialogHeader>
        <DialogTitle>
          {template ? "Edit scheduled session" : "Schedule a session"}
        </DialogTitle>
        <DialogDescription>
          Scorers see it in QuiverScore and start one session per athlete, with
          these rounds filled in.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <div className="grid grid-cols-2 gap-4">
          <Field className="col-span-2">
            <FieldLabel htmlFor="template-title">Title</FieldLabel>
            <Input
              autoComplete="off"
              id="template-title"
              maxLength={120}
              onChange={(event) => set("title", event.target.value)}
              placeholder="e.g. State trials, morning"
              required
              value={draft.title}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="template-date">Date</FieldLabel>
            <Input
              id="template-date"
              onChange={(event) => set("sessionDate", event.target.value)}
              required
              type="date"
              value={draft.sessionDate}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Session</FieldLabel>
              <FilterSelect
                className="w-full"
                items={SESSION_TYPES}
                label="Session type"
                onChange={(value) => {
                  if (isKeyOf(SESSION_TYPE_LABELS, value)) {
                    set("sessionType", value);
                  }
                }}
                value={draft.sessionType}
              />
            </Field>
            <Field>
              <FieldLabel>Venue</FieldLabel>
              <FilterSelect
                className="w-full"
                items={VENUES}
                label="Venue"
                onChange={(value) => {
                  if (isKeyOf(VENUE_LABELS, value)) {
                    set("venue", value);
                  }
                }}
                value={draft.venue}
              />
            </Field>
          </div>
        </div>
        <TemplateRoundsField
          lookups={lookups}
          onChange={(rounds) => set("rounds", rounds)}
          rounds={draft.rounds}
        />
        <TemplateAthletesField
          athletes={athletes}
          onChange={(athleteIds) => set("athleteIds", athleteIds)}
          selected={draft.athleteIds}
        />
        {error ? <FieldError>{error}</FieldError> : null}
      </FieldGroup>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <Button disabled={mutation.isPending} type="submit">
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
};

export const TemplateDialog = ({
  athletes,
  lookups,
  onOpenChange,
  open,
  template,
}: {
  athletes: AthleteRow[];
  lookups: Lookups;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  template: TemplateRow | null;
}) => (
  <Dialog onOpenChange={onOpenChange} open={open}>
    <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
      <TemplateForm
        athletes={athletes}
        key={template?.id ?? "new"}
        lookups={lookups}
        onSaved={() => onOpenChange(false)}
        template={template}
      />
    </DialogContent>
  </Dialog>
);
