import type {
  FunctionsFetchError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { z } from "zod";

import { createClient } from "./client";

const GENERIC_ERROR = "Something went wrong. Try again.";

const errorBodySchema = z.object({ error: z.string() });

const readErrorMessage = async (
  error: FunctionsHttpError | FunctionsRelayError | FunctionsFetchError
) => {
  if (!(error instanceof FunctionsHttpError)) {
    return GENERIC_ERROR;
  }
  try {
    const parsed = errorBodySchema.safeParse(await error.context.json());
    return parsed.success ? parsed.data.error : GENERIC_ERROR;
  } catch {
    // Non-JSON error body.
    return GENERIC_ERROR;
  }
};

/**
 * Calls an Edge Function with the signed-in admin's session. The response is
 * parsed against `schema` at this boundary; on failure the function's own
 * error message is thrown, so dialogs can show it verbatim.
 */
export const invokeFunction = async <TBody extends object, TResult>(
  name: string,
  body: TBody,
  schema: z.ZodType<TResult>
): Promise<TResult> => {
  const { data, error } = await createClient().functions.invoke(name, {
    body,
  });
  if (error) {
    throw new Error(await readErrorMessage(error));
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new Error(GENERIC_ERROR);
  }
  return parsed.data;
};
