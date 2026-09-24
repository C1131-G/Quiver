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

import { readText, useAccountForm } from "./use-account-form";
import type { AppRole } from "./use-scorers";

const ROLE_ITEMS: { label: string; value: AppRole }[] = [
  { label: "Scorer (mobile app)", value: "scorer" },
  { label: "Admin (desktop app)", value: "admin" },
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

const CreateUserForm = ({ onSaved }: { onSaved: () => void }) => {
  const { error, isPending, onSubmit } = useAccountForm(
    toCreateRequest,
    onSaved
  );
  return (
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
        {error ? <FieldError>{error}</FieldError> : null}
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
