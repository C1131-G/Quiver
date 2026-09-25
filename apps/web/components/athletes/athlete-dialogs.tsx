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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import type { FormEvent } from "react";
import { startTransition, useActionState, useEffect, useRef } from "react";

import { readAthleteForm } from "./athlete-form";
import type { AthleteRow, Gender, Lookups } from "./use-athletes";
import { useSaveAthlete } from "./use-athletes";

const GENDER_ITEMS: { label: string; value: Gender }[] = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
];

interface Option {
  label: string;
  value: string;
}

/** Inactive options stay selectable only when the athlete already uses them. */
const toOptions = <TRow extends { id: number; is_active: boolean }>(
  rows: TRow[],
  label: (row: TRow) => string,
  currentId: number | undefined
): Option[] => {
  const options: Option[] = [];
  for (const row of rows) {
    if (row.is_active || row.id === currentId) {
      options.push({ label: label(row), value: String(row.id) });
    }
  }
  return options;
};

const SelectField = ({
  defaultValue,
  describedBy,
  id,
  invalid,
  items,
  label,
  name,
}: {
  /** Undefined for a new athlete, which starts with nothing selected. */
  defaultValue: string | undefined;
  describedBy: string | undefined;
  id: string;
  invalid: boolean;
  items: Option[];
  label: string;
  name: string;
}) => (
  <Field>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <Select defaultValue={defaultValue} items={items} name={name} required>
      <SelectTrigger
        aria-describedby={describedBy}
        aria-invalid={invalid}
        className="w-full"
        id={id}
      >
        <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
      </SelectTrigger>
      <SelectContent>
        {items.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </Field>
);

interface SaveState {
  error: string | undefined;
  field: string | undefined;
}

const NO_ERROR: SaveState = { error: undefined, field: undefined };

const FORM_ERROR_ID = "athlete-form-error";

/** The form itself; it mounts with the dialog, so every open starts clean. */
const AthleteForm = ({
  athlete,
  lookups,
  onSaved,
}: {
  athlete: AthleteRow | undefined;
  lookups: Lookups;
  onSaved: () => void;
}) => {
  const mutation = useSaveAthlete();
  const editing = athlete !== null;

  const [state, saveAction, isPending] = useActionState(
    async (_previous: SaveState, form: FormData): Promise<SaveState> => {
      const read = readAthleteForm(form);
      if (!read.ok) {
        return { error: read.error, field: read.field };
      }
      try {
        // Resolves after the athletes list has refetched, so the closing
        // dialog reveals the saved row.
        await mutation.mutateAsync({
          id: athlete?.id,
          input: read.input,
        });
      } catch (error) {
        return {
          error:
            error instanceof Error
              ? error.message
              : "Could not save the athlete.",
          field: undefined,
        };
      }
      onSaved();
      return NO_ERROR;
    },
    NO_ERROR
  );

  // Dispatched by hand: a <form action> would reset every field after an
  // error, losing what the admin typed.
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) {
      return;
    }
    const form = new FormData(event.currentTarget);
    startTransition(() => saveAction(form));
  };

  // Validation errors move focus to the failing field so keyboard and screen
  // reader users land where they need to act; server errors focus the summary.
  const errorRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(
    // oxlint-disable-next-line prefer-arrow-callback -- named for stack traces and the effects skill
    function focusFormError() {
      if (!state.error) {
        return;
      }
      const field = state.field
        ? formRef.current?.querySelector(`[name="${CSS.escape(state.field)}"]`)
        : null;
      const target = field instanceof HTMLElement ? field : errorRef.current;
      target?.focus();
    },
    [state.error, state.field]
  );

  const invalid = (field: string) => state.field === field;
  const describedBy = (field: string) =>
    invalid(field) ? FORM_ERROR_ID : undefined;

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit} ref={formRef}>
      <DialogHeader>
        <DialogTitle>{editing ? "Edit athlete" : "Add athlete"}</DialogTitle>
        <DialogDescription>
          Scorers pick from active athletes when they start a session in
          QuiverScore.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="athlete-id-no">ID No.</FieldLabel>
            <Input
              aria-describedby={describedBy("idNo")}
              aria-invalid={invalid("idNo")}
              autoComplete="off"
              defaultValue={athlete?.id_no}
              id="athlete-id-no"
              maxLength={40}
              name="idNo"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="athlete-aai-no">AAI No.</FieldLabel>
            <Input
              aria-describedby={describedBy("aaiNo")}
              aria-invalid={invalid("aaiNo")}
              autoComplete="off"
              defaultValue={athlete?.aai_no ?? ""}
              id="athlete-aai-no"
              maxLength={40}
              name="aaiNo"
            />
            <FieldDescription>Optional.</FieldDescription>
          </Field>
          <Field className="col-span-2">
            <FieldLabel htmlFor="athlete-full-name">Name</FieldLabel>
            <Input
              aria-describedby={describedBy("fullName")}
              aria-invalid={invalid("fullName")}
              autoComplete="off"
              defaultValue={athlete?.full_name}
              id="athlete-full-name"
              maxLength={120}
              name="fullName"
              required
            />
          </Field>
          <SelectField
            defaultValue={athlete?.gender}
            describedBy={describedBy("gender")}
            id="athlete-gender"
            invalid={invalid("gender")}
            items={GENDER_ITEMS}
            label="Gender"
            name="gender"
          />
          <SelectField
            defaultValue={athlete ? String(athlete.category_id) : undefined}
            describedBy={describedBy("categoryId")}
            id="athlete-category"
            invalid={invalid("categoryId")}
            items={toOptions(
              lookups.categories,
              (row) => row.name,
              athlete?.category_id
            )}
            label="Category"
            name="categoryId"
          />
          <SelectField
            defaultValue={athlete ? String(athlete.event_id) : undefined}
            describedBy={describedBy("eventId")}
            id="athlete-event"
            invalid={invalid("eventId")}
            items={toOptions(
              lookups.events,
              (row) => row.name,
              athlete?.event_id
            )}
            label="Event"
            name="eventId"
          />
          <SelectField
            defaultValue={athlete ? String(athlete.distance_id) : undefined}
            describedBy={describedBy("distanceId")}
            id="athlete-distance"
            invalid={invalid("distanceId")}
            items={toOptions(
              lookups.distances,
              (row) => `${row.meters} m`,
              athlete?.distance_id
            )}
            label="Distance"
            name="distanceId"
          />
          <SelectField
            defaultValue={athlete ? String(athlete.target_face_id) : undefined}
            describedBy={describedBy("targetFaceId")}
            id="athlete-target-face"
            invalid={invalid("targetFaceId")}
            items={toOptions(
              lookups.targetFaces,
              (row) => row.name,
              athlete?.target_face_id
            )}
            label="Target face"
            name="targetFaceId"
          />
          {state.error ? (
            <FieldError
              className="col-span-2"
              id={FORM_ERROR_ID}
              ref={errorRef}
              tabIndex={-1}
            >
              {state.error}
            </FieldError>
          ) : null}
        </div>
      </FieldGroup>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <Button disabled={isPending} type="submit">
          {isPending ? "Saving…" : "Save athlete"}
        </Button>
      </DialogFooter>
    </form>
  );
};

export const AthleteFormDialog = ({
  athlete,
  lookups,
  onOpenChange,
  open,
}: {
  athlete: AthleteRow | undefined;
  lookups: Lookups;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) => (
  <Dialog onOpenChange={onOpenChange} open={open}>
    <DialogContent className="max-w-xl">
      <AthleteForm
        athlete={athlete}
        key={athlete?.id ?? "new"}
        lookups={lookups}
        onSaved={() => onOpenChange(false)}
      />
    </DialogContent>
  </Dialog>
);
