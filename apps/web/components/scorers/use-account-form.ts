"use client";

import type { AdminUsersRequest } from "@contracts/admin-users-contract";
import { adminUsersRequestSchema } from "@contracts/admin-users-contract";
import type { FormEvent } from "react";
import { startTransition, useActionState } from "react";

import { useAdminUsersMutation } from "./use-scorers";

interface FormState {
  error: string | undefined;
  field: string | undefined;
}

const NO_ERROR: FormState = { error: undefined, field: undefined };

/**
 * Submits an account form: checks it against the same schema the Edge
 * Function uses, sends it, and reports the first problem inline.
 */
export const useAccountForm = (
  toRequest: (form: FormData) => AdminUsersRequest,
  onSaved: () => void
) => {
  const mutation = useAdminUsersMutation();
  const [state, submit, isPending] = useActionState(
    async (_previous: FormState, form: FormData): Promise<FormState> => {
      const parsed = adminUsersRequestSchema.safeParse(toRequest(form));
      if (!parsed.success) {
        const [issue] = parsed.error.issues;
        return {
          error: issue?.message ?? "Check the form.",
          field:
            issue?.path[0] === undefined ? undefined : String(issue.path[0]),
        };
      }
      try {
        await mutation.mutateAsync(parsed.data);
      } catch (error) {
        return {
          error:
            error instanceof Error
              ? error.message
              : "Could not update the account.",
          field: undefined,
        };
      }
      onSaved();
      return NO_ERROR;
    },
    NO_ERROR
  );

  // Dispatched by hand: a <form action> would reset every field after an
  // error, losing what the admin typed.
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) {
      return;
    }
    const form = new FormData(event.currentTarget);
    startTransition(() => submit(form));
  };

  return { error: state.error, field: state.field, isPending, onSubmit };
};

export const readText = (form: FormData, name: string) =>
  String(form.get(name) ?? "");
