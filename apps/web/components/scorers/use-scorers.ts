"use client";

import type { AdminUsersRequest } from "@contracts/admin-users-contract";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { z } from "zod";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { invokeFunction } from "@/lib/supabase/functions";
import { loadError } from "@/lib/supabase/load-error";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export const accountKeys = {
  all: ["profiles"] as const,
};

/** Admins read every profile through RLS; writes go through admin-users. */
export const accountsQuery = () =>
  queryOptions({
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("profiles")
        .select("*")
        .order("full_name");
      if (error) {
        throw loadError("Could not load users.", error);
      }
      return data;
    },
    queryKey: accountKeys.all,
  });

export const useAccounts = () => useQuery(accountsQuery());

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
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  });
};
