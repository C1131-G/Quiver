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

import type { AthleteRow } from "./use-athletes";
import { useSetAthleteActive } from "./use-athletes";

/** Confirms deactivating or reactivating an athlete. */
export const AthleteActiveDialog = ({
  athlete,
  onOpenChange,
  open,
}: {
  athlete: AthleteRow | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) => {
  const mutation = useSetAthleteActive();
  const deactivating = athlete?.is_active ?? true;

  const confirm = () => {
    if (!athlete || mutation.isPending) {
      return;
    }
    // The status badge in the list shows the result; no toast needed.
    mutation.mutate(
      { id: athlete.id, isActive: !deactivating },
      { onSuccess: () => onOpenChange(false) }
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
