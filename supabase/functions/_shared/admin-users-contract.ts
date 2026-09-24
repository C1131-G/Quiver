// The admin-users request, shared by the Edge Function (which validates it)
// and the desktop app (which sends it), so the two cannot drift. Deno maps
// "zod" through admin-users/deno.json; the web app resolves the workspace's.

import { z } from "zod";

const loginId = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9][a-z0-9._-]{2,31}$/u,
    "Login ID must be 3–32 characters: letters, numbers, dot, dash or underscore."
  );
const password = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.");
const fullName = z.string().trim().min(1, "Name is required.").max(120);
const userId = z.uuid();

export const createSchema = z.object({
  action: z.literal("create"),
  fullName,
  loginId,
  password,
  role: z.enum(["admin", "scorer"]),
});
export const updateSchema = z.object({
  action: z.literal("update"),
  fullName,
  userId,
});
export const setActiveSchema = z.object({
  action: z.literal("setActive"),
  isActive: z.boolean(),
  userId,
});
export const resetPasswordSchema = z.object({
  action: z.literal("resetPassword"),
  password,
  userId,
});
export const adminUsersRequestSchema = z.discriminatedUnion("action", [
  createSchema,
  updateSchema,
  setActiveSchema,
  resetPasswordSchema,
]);

/** What the app sends, before the function trims and lower-cases it. */
export type AdminUsersRequest = z.input<typeof adminUsersRequestSchema>;
