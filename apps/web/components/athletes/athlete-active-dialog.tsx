"use client";

import { ConfirmActiveDialog } from "@/components/confirm-active-dialog";

import type { AthleteRow } from "./use-athletes";
import { useSetAthleteActive } from "./use-athletes";

/** Confirms deactivating or reactivating an athlete. */
export const AthleteActiveDialog = ({
  athlete,
  onOpenChange,
  open,
}: {
  athlete: AthleteRow | undefined;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) => {
  const mutation = useSetAthleteActive();
  const deactivating = athlete?.is_active ?? true;

  return (
    <ConfirmActiveDialog
      deactivating={deactivating}
      description={
        deactivating
          ? "Scorers can no longer pick this athlete for new sessions. All of their recorded sessions stay in the dashboard."
          : "Scorers can pick this athlete for new sessions again."
      }
      error={mutation.error?.message}
      name={athlete?.full_name}
      onConfirm={() => {
        if (!athlete || mutation.isPending) {
          return;
        }
        // The status badge in the list shows the result; no toast needed.
        mutation.mutate(
          { id: athlete.id, isActive: !deactivating },
          { onSuccess: () => onOpenChange(false) }
        );
      }}
      onOpenChange={(next) => {
        mutation.reset();
        onOpenChange(next);
      }}
      open={open}
      pending={mutation.isPending}
    />
  );
};
