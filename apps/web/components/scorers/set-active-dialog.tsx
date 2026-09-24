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
  user: Profile | null;
}) => {
  const mutation = useAdminUsersMutation();
  const deactivating = user?.is_active ?? true;

  const confirm = () => {
    if (!user || mutation.isPending) {
      return;
    }
    // The status badge in the list shows the result; no toast needed.
    mutation.mutate(
      { action: "setActive", isActive: !deactivating, userId: user.id },
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
            {deactivating ? "Deactivate" : "Reactivate"} {user?.full_name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {deactivating
              ? "They lose access immediately and can't sign in again until you reactivate the account. Their recorded scores are kept."
              : "They can sign in again with their current password."}
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
