"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { invokeFunction } from "@/lib/supabase/functions";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type AppRole = Database["public"]["Enums"]["app_role"];

const USERS_KEY = ["profiles"] as const;

/** Admins read every profile through RLS; writes go through admin-users. */
export const useAccounts = () =>
  useQuery({
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("profiles")
        .select("*")
        .order("full_name");
      if (error) {
        throw new Error("Could not load users.");
      }
      return data;
    },
    queryKey: USERS_KEY,
  });

type AdminUsersRequest =
  | {
      action: "create";
      fullName: string;
      loginId: string;
      password: string;
      role: AppRole;
    }
  | { action: "update"; fullName: string; userId: string }
  | { action: "setActive"; isActive: boolean; userId: string }
  | { action: "resetPassword"; password: string; userId: string };

// The function answers with the changed profile, or { ok: true } for a
// password reset. Callers only need success; the list refetches.
const adminUsersResponseSchema = z.union([
  z.object({ profile: z.object({ id: z.uuid() }).loose() }),
  z.object({ ok: z.literal(true) }),
]);

export const useAdminUsersMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: AdminUsersRequest) =>
      invokeFunction("admin-users", request, adminUsersResponseSchema),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
};
