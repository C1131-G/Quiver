import { z } from "zod";

// A secret key bypasses RLS; it must never reach the browser bundle.
const SECRET_KEY_PREFIX = "sb_secret_";

const supabaseEnvSchema = z.object({
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
 * `NEXT_PUBLIC_` values are inlined at build time, so the desktop installer
 * carries whatever apps/web/.env.local held when it was built. Each variable
 * is read by its full name, or the build cannot inline it. Missing or
 * malformed values count as "not configured", which the login page reports.
 */
const parsed = supabaseEnvSchema.safeParse({
  publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
});

export const supabaseEnv = parsed.success ? parsed.data : null;
