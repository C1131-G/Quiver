"use client";

import { ConfirmActiveDialog } from "@/components/confirm-active-dialog";

import type { Profile } from "./use-scorers";
import { useAdminUsersMutation } from "./use-scorers";

/** Confirms deactivating or reactivating an account. */
export const SetActiveDialog = ({
  onOpenChange,
  open,
  user,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  user: Profile | undefined;
}) => {
  const mutation = useAdminUsersMutation();
  const deactivating = user?.is_active ?? true;

  return (
    <ConfirmActiveDialog
      deactivating={deactivating}
      description={
        deactivating
          ? "They lose access immediately and can't sign in again until you reactivate the account. Their recorded scores are kept."
          : "They can sign in again with their current password."
      }
      error={mutation.error?.message}
      name={user?.full_name}
      onConfirm={() => {
        if (!user || mutation.isPending) {
          return;
        }
        // The status badge in the list shows the result; no toast needed.
        mutation.mutate(
          { action: "setActive", isActive: !deactivating, userId: user.id },
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
