import { DEFAULT_USERNAME_EMAIL_DOMAIN } from "@workspace/shared/accounts";
import { z } from "zod";

// A secret key bypasses RLS; it must never ship inside the app.
const SECRET_KEY_PREFIX = "sb_secret_";

const supabaseEnvSchema = z.object({
  loginDomain: z.string().trim().min(1).default(DEFAULT_USERNAME_EMAIL_DOMAIN),
  publishableKey: z
    .string()
    .trim()
    .min(1)
    .refine((key) => !key.startsWith(SECRET_KEY_PREFIX), {
      message: "Use the publishable key, never the secret key.",
    }),
  url: z.url({ protocol: /^https?$/u }),
});

/**
 * `EXPO_PUBLIC_` values are inlined into the bundle at build time, and each
 * must be read by its full name for that to happen. Missing or malformed
 * values count as "not configured", which the sign-in screen reports.
 */
const parsed = supabaseEnvSchema.safeParse({
  loginDomain: process.env.EXPO_PUBLIC_LOGIN_USERNAME_DOMAIN,
  publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
});

export const supabaseEnv = parsed.success ? parsed.data : null;
