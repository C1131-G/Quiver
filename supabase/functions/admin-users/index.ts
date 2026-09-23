// Admin-only account management for the desktop app.
//
// Creating, deactivating and resetting accounts needs the service role,
// which must never ship inside the desktop installer. The app calls this
// function with the admin's session instead; it verifies the caller is an
// admin, then uses the admin client here on the server.

import { withSupabase } from "npm:@supabase/server@1.8.0";
import { z } from "npm:zod@4.5.4";

// Must match NEXT_PUBLIC_LOGIN_USERNAME_DOMAIN in the apps.
const LOGIN_EMAIL_DOMAIN =
  Deno.env.get("LOGIN_USERNAME_DOMAIN") ?? "quiver.local";

// Banned users cannot sign in or refresh a session; "none" lifts the ban.
const DEACTIVATED_BAN = "876000h";

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

const createSchema = z.object({
  action: z.literal("create"),
  fullName,
  loginId,
  password,
  role: z.enum(["admin", "scorer"]),
});
const updateSchema = z.object({
  action: z.literal("update"),
  fullName,
  userId,
});
const setActiveSchema = z.object({
  action: z.literal("setActive"),
  isActive: z.boolean(),
  userId,
});
const resetPasswordSchema = z.object({
  action: z.literal("resetPassword"),
  password,
  userId,
});
const requestSchema = z.discriminatedUnion("action", [
  createSchema,
  updateSchema,
  setActiveSchema,
  resetPasswordSchema,
]);

// app_metadata is only writable by the service role, so the role in a
// verified JWT is trustworthy. user_metadata never is.
const callerClaimsSchema = z.object({
  app_metadata: z.object({ role: z.string().optional() }).optional(),
});

type Handler = Parameters<typeof withSupabase>[1];
type AdminClient = Parameters<Handler>[1]["supabaseAdmin"];

const fail = (status: number, error: string) =>
  Response.json({ error }, { status });

const createAccount = async (
  admin: AdminClient,
  input: z.infer<typeof createSchema>
) => {
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      app_metadata: { role: input.role },
      email: `${input.loginId}@${LOGIN_EMAIL_DOMAIN}`,
      email_confirm: true,
      password: input.password,
    });
  if (createError || !created.user) {
    return createError?.code === "email_exists"
      ? fail(409, "That login ID is already taken.")
      : fail(500, "Could not create the account.");
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .insert({
      full_name: input.fullName,
      id: created.user.id,
      login_id: input.loginId,
      role: input.role,
    })
    .select()
    .single();
  if (profileError) {
    // Keep auth and profiles in step: no login without a profile.
    await admin.auth.admin.deleteUser(created.user.id);
    return fail(500, "Could not create the account profile.");
  }
  return Response.json({ profile }, { status: 201 });
};

const renameAccount = async (
  admin: AdminClient,
  input: z.infer<typeof updateSchema>
) => {
  const { data: profile, error } = await admin
    .from("profiles")
    .update({ full_name: input.fullName })
    .eq("id", input.userId)
    .select()
    .single();
  return error ? fail(404, "Account not found.") : Response.json({ profile });
};

const setAccountActive = async (
  admin: AdminClient,
  input: z.infer<typeof setActiveSchema>,
  callerId: string | undefined
) => {
  if (input.userId === callerId && !input.isActive) {
    return fail(400, "You can't deactivate your own account.");
  }
  const { error: banError } = await admin.auth.admin.updateUserById(
    input.userId,
    { ban_duration: input.isActive ? "none" : DEACTIVATED_BAN }
  );
  if (banError) {
    return fail(404, "Account not found.");
  }
  const { data: profile, error } = await admin
    .from("profiles")
    .update({ is_active: input.isActive })
    .eq("id", input.userId)
    .select()
    .single();
  return error
    ? fail(500, "Could not update the account.")
    : Response.json({ profile });
};

const resetAccountPassword = async (
  admin: AdminClient,
  input: z.infer<typeof resetPasswordSchema>
) => {
  const { error } = await admin.auth.admin.updateUserById(input.userId, {
    password: input.password,
  });
  return error ? fail(404, "Account not found.") : Response.json({ ok: true });
};

const readRequest = async (req: Request) => {
  try {
    return requestSchema.safeParse(await req.json());
  } catch {
    return null;
  }
};

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const claims = callerClaimsSchema.safeParse(ctx.jwtClaims);
    if (!claims.success || claims.data.app_metadata?.role !== "admin") {
      return fail(403, "Only an admin can manage accounts.");
    }

    const parsed = await readRequest(req);
    if (!parsed) {
      return fail(400, "Request body must be JSON.");
    }
    if (!parsed.success) {
      return fail(400, parsed.error.issues[0]?.message ?? "Invalid request.");
    }

    const admin = ctx.supabaseAdmin;
    const input = parsed.data;
    switch (input.action) {
      case "create": {
        return createAccount(admin, input);
      }
      case "update": {
        return renameAccount(admin, input);
      }
      case "setActive": {
        return setAccountActive(admin, input, ctx.userClaims?.id);
      }
      case "resetPassword": {
        return resetAccountPassword(admin, input);
      }
      default: {
        return fail(400, "Unknown action.");
      }
    }
  }),
};
