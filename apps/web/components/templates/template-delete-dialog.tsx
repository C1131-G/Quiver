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
import { FieldError } from "@workspace/ui/components/field";

import type { TemplateRow } from "./use-templates";
import { useDeleteTemplate } from "./use-templates";

/** Confirms removing a scheduled session; what it started stays. */
export const TemplateDeleteDialog = ({
  onOpenChange,
  open,
  template,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  template: TemplateRow | null;
}) => {
  const mutation = useDeleteTemplate();

  const confirm = () => {
    if (!template || mutation.isPending) {
      return;
    }
    // The row leaving the list shows the result; no toast needed.
    mutation.mutate(template.id, { onSuccess: () => onOpenChange(false) });
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
          <AlertDialogTitle>Remove {template?.title}?</AlertDialogTitle>
          <AlertDialogDescription>
            Scorers can no longer start sessions from it. Sessions already
            started stay, with all their scores.
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
            variant="destructive"
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
