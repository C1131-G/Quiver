"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
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
import { toast } from "sonner";

import type { AthleteRow, Gender, Lookups } from "./use-athletes";
import { useSaveAthlete, useSetAthleteActive } from "./use-athletes";

const GENDER_ITEMS: { label: string; value: Gender }[] = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
];

interface Option {
  label: string;
  value: string;
}

/** Inactive options stay selectable only when the athlete already uses them. */
const toOptions = <T extends { id: number; is_active: boolean }>(
  rows: T[],
  label: (row: T) => string,
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
  id,
  items,
  label,
  name,
}: {
  defaultValue?: string;
  id: string;
  items: Option[];
  label: string;
  name: string;
}) => (
  <Field>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <Select defaultValue={defaultValue} items={items} name={name} required>
      <SelectTrigger className="w-full" id={id}>
        <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </Field>
);

const readText = (form: FormData, name: string) =>
  String(form.get(name) ?? "").trim();
const readId = (form: FormData, name: string) => Number(form.get(name));

interface DialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export const AthleteFormDialog = ({
  athlete,
  lookups,
  onOpenChange,
  open,
}: DialogProps & { athlete: AthleteRow | null; lookups: Lookups }) => {
  const mutation = useSaveAthlete();
  const editing = athlete !== null;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const gender = readText(form, "gender") === "female" ? "female" : "male";
    mutation.mutate(
      {
        id: athlete?.id ?? null,
        input: {
          aai_no: readText(form, "aaiNo") || null,
          category_id: readId(form, "categoryId"),
          distance_id: readId(form, "distanceId"),
          event_id: readId(form, "eventId"),
          full_name: readText(form, "fullName"),
          gender,
          id_no: readText(form, "idNo"),
          target_face_id: readId(form, "targetFaceId"),
        },
      },
      {
        onSuccess: () => {
          toast.success(editing ? "Athlete updated." : "Athlete added.");
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog
      onOpenChange={(next) => {
        mutation.reset();
        onOpenChange(next);
      }}
      open={open}
    >
      <DialogContent className="max-w-xl">
        <form
          className="flex flex-col gap-6"
          key={athlete?.id ?? "new"}
          onSubmit={onSubmit}
        >
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit athlete" : "Add athlete"}
            </DialogTitle>
            <DialogDescription>
              Scorers pick from active athletes when they start a session on the
              mobile app.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="athlete-id-no">ID No.</FieldLabel>
                <Input
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
                id="athlete-gender"
                items={GENDER_ITEMS}
                label="Gender"
                name="gender"
              />
              <SelectField
                defaultValue={athlete ? String(athlete.category_id) : undefined}
                id="athlete-category"
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
                id="athlete-event"
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
                id="athlete-distance"
                items={toOptions(
                  lookups.distances,
                  (row) => `${row.meters} m`,
                  athlete?.distance_id
                )}
                label="Distance"
                name="distanceId"
              />
              <SelectField
                defaultValue={
                  athlete ? String(athlete.target_face_id) : undefined
                }
                id="athlete-target-face"
                items={toOptions(
                  lookups.targetFaces,
                  (row) => row.name,
                  athlete?.target_face_id
                )}
                label="Target face"
                name="targetFaceId"
              />
              {mutation.error ? (
                <FieldError className="col-span-2">
                  {mutation.error.message}
                </FieldError>
              ) : null}
            </div>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button disabled={mutation.isPending} type="submit">
              {mutation.isPending ? "Saving…" : "Save athlete"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const AthleteActiveDialog = ({
  athlete,
  onOpenChange,
  open,
}: DialogProps & { athlete: AthleteRow | null }) => {
  const mutation = useSetAthleteActive();
  const deactivating = athlete?.is_active ?? true;

  const confirm = () => {
    if (!athlete) {
      return;
    }
    mutation.mutate(
      { id: athlete.id, isActive: !deactivating },
      {
        onSuccess: () => {
          toast.success(
            deactivating ? "Athlete deactivated." : "Athlete reactivated."
          );
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <AlertDialog
      onOpenChange={(next) => {
        mutation.reset();
        onOpenChange(next);
      }}
      open={open}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {deactivating ? "Deactivate" : "Reactivate"} {athlete?.full_name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {deactivating
              ? "Scorers can no longer pick this athlete for new sessions. All of their recorded sessions stay in the dashboard."
              : "Scorers can pick this athlete for new sessions again."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {mutation.error ? (
          <FieldError>{mutation.error.message}</FieldError>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={mutation.isPending}
            onClick={confirm}
            variant={deactivating ? "destructive" : "default"}
          >
            {deactivating ? "Deactivate" : "Reactivate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
