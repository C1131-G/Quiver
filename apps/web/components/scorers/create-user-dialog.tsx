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
import { useEffect, useRef } from "react";

import { readText, useAccountForm } from "./use-account-form";
import type { AppRole } from "./use-scorers";

const ROLE_ITEMS: { label: string; value: AppRole }[] = [
  { label: "Scorer (QuiverScore)", value: "scorer" },
  { label: "Admin (Quiver Dashboard)", value: "admin" },
];

const toCreateRequest = (form: FormData) => ({
  action: "create" as const,
  fullName: readText(form, "fullName"),
  loginId: readText(form, "loginId"),
  password: readText(form, "password"),
  // The schema rejects anything that is not a known role.
  role:
    readText(form, "role") === "admin"
      ? ("admin" as const)
      : ("scorer" as const),
});

const FORM_ERROR_ID = "create-user-error";

const CreateUserForm = ({ onSaved }: { onSaved: () => void }) => {
  const { error, field, isPending, onSubmit } = useAccountForm(
    toCreateRequest,
    onSaved
  );
  const errorRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(
    // oxlint-disable-next-line prefer-arrow-callback -- named for stack traces and the effects skill
    function focusCreateError() {
      if (!error) {
        return;
      }
      const input = field
        ? formRef.current?.querySelector(`[name="${CSS.escape(field)}"]`)
        : null;
      const target = input instanceof HTMLElement ? input : errorRef.current;
      target?.focus();
    },
    [error, field]
  );
  const invalid = (name: string) => field === name;
  const describedBy = (name: string) =>
    invalid(name) ? FORM_ERROR_ID : undefined;
  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit} ref={formRef}>
      <DialogHeader>
        <DialogTitle>Add scorer</DialogTitle>
        <DialogDescription>
          Scorers sign in on QuiverScore only. Share the login ID and password
          with them directly.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="user-full-name">Full name</FieldLabel>
          <Input
            aria-describedby={describedBy("fullName")}
            aria-invalid={invalid("fullName")}
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
            aria-describedby={describedBy("loginId")}
            aria-invalid={invalid("loginId")}
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
            <SelectTrigger
              aria-describedby={describedBy("role")}
              aria-invalid={invalid("role")}
              className="w-full"
              id="user-role"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_ITEMS.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="user-password">Password</FieldLabel>
          <Input
            aria-describedby={describedBy("password")}
            aria-invalid={invalid("password")}
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
        {error ? (
          <FieldError id={FORM_ERROR_ID} ref={errorRef} tabIndex={-1}>
            {error}
          </FieldError>
        ) : null}
      </FieldGroup>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <Button disabled={isPending} type="submit">
          {isPending ? "Creating…" : "Create account"}
        </Button>
      </DialogFooter>
    </form>
  );
};

/** New accounts appear in the list, so success needs no toast. */
export const CreateUserDialog = ({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) => (
  <Dialog onOpenChange={onOpenChange} open={open}>
    <DialogContent>
      <CreateUserForm onSaved={() => onOpenChange(false)} />
    </DialogContent>
  </Dialog>
);
