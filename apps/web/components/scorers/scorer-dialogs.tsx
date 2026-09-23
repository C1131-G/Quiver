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

import type { AppRole, Profile } from "./use-scorers";
import { useAdminUsersMutation } from "./use-scorers";

const ROLE_ITEMS: { label: string; value: AppRole }[] = [
  { label: "Scorer (mobile app)", value: "scorer" },
  { label: "Admin (desktop app)", value: "admin" },
];

const readText = (form: FormData, name: string) =>
  String(form.get(name) ?? "").trim();

interface DialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export const CreateUserDialog = ({ onOpenChange, open }: DialogProps) => {
  const mutation = useAdminUsersMutation();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const role = readText(form, "role") === "admin" ? "admin" : "scorer";
    mutation.mutate(
      {
        action: "create",
        fullName: readText(form, "fullName"),
        loginId: readText(form, "loginId").toLowerCase(),
        password: String(form.get("password") ?? ""),
        role,
      },
      {
        onSuccess: () => {
          toast.success("Account created.");
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
      <DialogContent>
        <form className="flex flex-col gap-6" onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Add scorer</DialogTitle>
            <DialogDescription>
              Scorers sign in on the mobile app only. Share the login ID and
              password with them directly.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="user-full-name">Full name</FieldLabel>
              <Input
                autoComplete="off"
                id="user-full-name"
                maxLength={120}
                name="fullName"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="user-login-id">Login ID</FieldLabel>
              <Input
                autoCapitalize="none"
                autoComplete="off"
                id="user-login-id"
                maxLength={32}
                minLength={3}
                name="loginId"
                pattern="[A-Za-z0-9][A-Za-z0-9._\-]{2,31}"
                required
                spellCheck={false}
              />
              <FieldDescription>
                3–32 characters: letters, numbers, dot, dash or underscore.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="user-role">Role</FieldLabel>
              <Select defaultValue="scorer" items={ROLE_ITEMS} name="role">
                <SelectTrigger className="w-full" id="user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="user-password">Password</FieldLabel>
              <Input
                autoComplete="new-password"
                id="user-password"
                maxLength={72}
                minLength={8}
                name="password"
                required
                type="password"
              />
              <FieldDescription>At least 8 characters.</FieldDescription>
            </Field>
            {mutation.error ? (
              <FieldError>{mutation.error.message}</FieldError>
            ) : null}
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button disabled={mutation.isPending} type="submit">
              {mutation.isPending ? "Creating…" : "Create account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface UserDialogProps extends DialogProps {
  user: Profile | null;
}

export const EditUserDialog = ({
  onOpenChange,
  open,
  user,
}: UserDialogProps) => {
  const mutation = useAdminUsersMutation();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      return;
    }
    const form = new FormData(event.currentTarget);
    mutation.mutate(
      {
        action: "update",
        fullName: readText(form, "fullName"),
        userId: user.id,
      },
      {
        onSuccess: () => {
          toast.success("Name updated.");
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
      <DialogContent>
        <form className="flex flex-col gap-6" onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Edit account</DialogTitle>
            <DialogDescription>
              The login ID ({user?.login_id}) can’t be changed.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-full-name">Full name</FieldLabel>
              <Input
                defaultValue={user?.full_name}
                id="edit-full-name"
                key={user?.id}
                maxLength={120}
                name="fullName"
                required
              />
            </Field>
            {mutation.error ? (
              <FieldError>{mutation.error.message}</FieldError>
            ) : null}
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button disabled={mutation.isPending} type="submit">
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const ResetPasswordDialog = ({
  onOpenChange,
  open,
  user,
}: UserDialogProps) => {
  const mutation = useAdminUsersMutation();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      return;
    }
    const form = new FormData(event.currentTarget);
    mutation.mutate(
      {
        action: "resetPassword",
        password: String(form.get("password") ?? ""),
        userId: user.id,
      },
      {
        onSuccess: () => {
          toast.success(`Password reset for ${user.login_id}.`);
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
      <DialogContent>
        <form className="flex flex-col gap-6" onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Set a new password for {user?.full_name} ({user?.login_id}). Their
              old password stops working immediately.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="reset-password">New password</FieldLabel>
              <Input
                autoComplete="new-password"
                id="reset-password"
                key={user?.id}
                maxLength={72}
                minLength={8}
                name="password"
                required
                type="password"
              />
              <FieldDescription>At least 8 characters.</FieldDescription>
            </Field>
            {mutation.error ? (
              <FieldError>{mutation.error.message}</FieldError>
            ) : null}
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button disabled={mutation.isPending} type="submit">
              {mutation.isPending ? "Resetting…" : "Reset password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const SetActiveDialog = ({
  onOpenChange,
  open,
  user,
}: UserDialogProps) => {
  const mutation = useAdminUsersMutation();
  const deactivating = user?.is_active ?? true;

  const confirm = () => {
    if (!user) {
      return;
    }
    mutation.mutate(
      { action: "setActive", isActive: !deactivating, userId: user.id },
      {
        onSuccess: () => {
          toast.success(
            deactivating ? "Account deactivated." : "Account reactivated."
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
            {deactivating ? "Deactivate" : "Reactivate"} {user?.full_name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {deactivating
              ? "They are signed out and can't sign in again until you reactivate the account. Their recorded scores are kept."
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
