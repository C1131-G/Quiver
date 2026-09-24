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
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { readText, useAccountForm } from "./use-account-form";
import type { Profile } from "./use-scorers";

interface AccountDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  user: Profile | undefined;
}

const RenameForm = ({
  onSaved,
  user,
}: {
  onSaved: () => void;
  user: Profile;
}) => {
  const { error, field, isPending, onSubmit } = useAccountForm(
    (form) => ({
      action: "update",
      fullName: readText(form, "fullName"),
      userId: user.id,
    }),
    onSaved
  );
  const errorRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(
    // oxlint-disable-next-line prefer-arrow-callback -- named for stack traces and the effects skill
    function focusRenameError() {
      if (!error) {
        return;
      }
      const input =
        field === "fullName"
          ? formRef.current?.querySelector('[name="fullName"]')
          : null;
      const target = input instanceof HTMLElement ? input : errorRef.current;
      target?.focus();
    },
    [error, field]
  );
  const invalid = field === "fullName";
  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit} ref={formRef}>
      <DialogHeader>
        <DialogTitle>Edit account</DialogTitle>
        <DialogDescription>
          The login ID ({user.login_id}) can’t be changed.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="edit-full-name">Full name</FieldLabel>
          <Input
            aria-describedby={invalid ? "edit-account-error" : undefined}
            aria-invalid={invalid}
            defaultValue={user.full_name}
            id="edit-full-name"
            maxLength={120}
            name="fullName"
            required
          />
        </Field>
        {error ? (
          <FieldError id="edit-account-error" ref={errorRef} tabIndex={-1}>
            {error}
          </FieldError>
        ) : null}
      </FieldGroup>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <Button disabled={isPending} type="submit">
          {isPending ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
};

/** The new name shows in the list, so success needs no toast. */
export const EditUserDialog = ({
  onOpenChange,
  open,
  user,
}: AccountDialogProps) => (
  <Dialog onOpenChange={onOpenChange} open={open}>
    <DialogContent>
      {user ? (
        <RenameForm
          key={user.id}
          onSaved={() => onOpenChange(false)}
          user={user}
        />
      ) : null}
    </DialogContent>
  </Dialog>
);

const ResetPasswordForm = ({
  onSaved,
  user,
}: {
  onSaved: () => void;
  user: Profile;
}) => {
  const { error, field, isPending, onSubmit } = useAccountForm(
    (form) => ({
      action: "resetPassword",
      password: readText(form, "password"),
      userId: user.id,
    }),
    () => {
      // Nothing on screen changes, so say that it worked.
      toast.success(`Password reset for ${user.login_id}.`);
      onSaved();
    }
  );
  const errorRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(
    // oxlint-disable-next-line prefer-arrow-callback -- named for stack traces and the effects skill
    function focusResetError() {
      if (!error) {
        return;
      }
      const input =
        field === "password"
          ? formRef.current?.querySelector('[name="password"]')
          : null;
      const target = input instanceof HTMLElement ? input : errorRef.current;
      target?.focus();
    },
    [error, field]
  );
  const invalid = field === "password";
  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit} ref={formRef}>
      <DialogHeader>
        <DialogTitle>Reset password</DialogTitle>
        <DialogDescription>
          Set a new password for {user.full_name} ({user.login_id}). Their old
          password stops working immediately.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="reset-password">New password</FieldLabel>
          <Input
            aria-describedby={invalid ? "reset-password-error" : undefined}
            aria-invalid={invalid}
            autoComplete="new-password"
            id="reset-password"
            maxLength={72}
            minLength={8}
            name="password"
            required
            type="password"
          />
          <FieldDescription>At least 8 characters.</FieldDescription>
        </Field>
        {error ? (
          <FieldError id="reset-password-error" ref={errorRef} tabIndex={-1}>
            {error}
          </FieldError>
        ) : null}
      </FieldGroup>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <Button disabled={isPending} type="submit">
          {isPending ? "Resetting…" : "Reset password"}
        </Button>
      </DialogFooter>
    </form>
  );
};

export const ResetPasswordDialog = ({
  onOpenChange,
  open,
  user,
}: AccountDialogProps) => (
  <Dialog onOpenChange={onOpenChange} open={open}>
    <DialogContent>
      {user ? (
        <ResetPasswordForm
          key={user.id}
          onSaved={() => onOpenChange(false)}
          user={user}
        />
      ) : null}
    </DialogContent>
  </Dialog>
);
