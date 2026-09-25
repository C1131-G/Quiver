"use client";

import type { AdminUsersRequest } from "@contracts/admin-users-contract";
import { adminUsersResponseSchema } from "@contracts/admin-users-contract";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { invokeFunction } from "@/lib/supabase/functions";
import { loadError } from "@/lib/supabase/load-error";
import { parseTableRows, profileSchema } from "@/lib/supabase/table-rows";
import type { Profile } from "@/lib/supabase/table-rows";

export type { AppRole, Profile } from "@/lib/supabase/table-rows";

export const accountKeys = {
  all: ["profiles"] as const,
};

/** Admins read every profile through RLS; writes go through admin-users. */
export const accountsQuery = () =>
  queryOptions({
    queryFn: async () => {
      const { data: profiles, error } = await createClient()
        .from("profiles")
        .select("*")
        .order("full_name");
      if (error) {
        throw loadError("Could not load users.", error);
      }
      return parseTableRows(profileSchema, profiles, "Could not load users.");
    },
    queryKey: accountKeys.all,
  });

export const useAccounts = () => useQuery(accountsQuery());

/**
 * Folds a validated changed profile into the cached list without refetching.
 * Pure so the merge order is unit-testable; the list stays ordered by name
 * the way the query orders it.
 */
export const upsertAccountProfile = (
  previous: Profile[] | undefined,
  profile: Profile
): Profile[] | undefined => {
  if (!previous) {
    return previous;
  }
  const merged = previous.some((row) => row.id === profile.id)
    ? previous.map((row) => (row.id === profile.id ? profile : row))
    : [...previous, profile];
  return merged.toSorted((rowA, rowB) =>
    rowA.full_name.localeCompare(rowB.full_name)
  );
};

export const useAdminUsersMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: AdminUsersRequest) =>
      invokeFunction("admin-users", request, adminUsersResponseSchema),
    // The response carries the changed profile, so patch the exact cached
    // list instead of refetching. A password reset changes no list data.
    onSuccess: (response) => {
      if ("profile" in response) {
        queryClient.setQueryData<Profile[]>(accountKeys.all, (previous) =>
          upsertAccountProfile(previous, response.profile)
        );
      }
    },
  });
};
