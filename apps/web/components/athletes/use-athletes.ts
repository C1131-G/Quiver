"use client";

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { loadError } from "@/lib/supabase/load-error";

type Tables = Database["public"]["Tables"];
export type Gender = Database["public"]["Enums"]["gender"];
export type AthleteInput = Pick<
  Tables["athletes"]["Insert"],
  | "aai_no"
  | "category_id"
  | "distance_id"
  | "event_id"
  | "full_name"
  | "gender"
  | "id_no"
  | "target_face_id"
>;

export const athleteKeys = {
  all: ["athletes"] as const,
};

export const lookupKeys = {
  all: ["lookups"] as const,
};

const ATHLETE_SELECT =
  "*, category:categories(name), event:events(name), distance:distances(meters), target_face:target_faces(name)";

const fetchAthletes = async () => {
  const { data, error } = await createClient()
    .from("athletes")
    .select(ATHLETE_SELECT)
    .order("full_name");
  if (error) {
    throw loadError("Could not load athletes.", error);
  }
  return data;
};

export type AthleteRow = Awaited<ReturnType<typeof fetchAthletes>>[number];

export const athletesQuery = () =>
  queryOptions({ queryFn: fetchAthletes, queryKey: athleteKeys.all });

export const useAthletes = () => useQuery(athletesQuery());

const fetchLookups = async () => {
  const supabase = createClient();
  const [categories, events, distances, targetFaces] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("events").select("*").order("sort_order"),
    supabase.from("distances").select("*").order("meters"),
    supabase.from("target_faces").select("*").order("sort_order"),
  ]);
  const failed = [categories, events, distances, targetFaces].find(
    (result) => result.error
  )?.error;
  if (failed) {
    throw loadError(
      "Could not load categories, events, distances and faces.",
      failed
    );
  }
  return {
    categories: categories.data ?? [],
    distances: distances.data ?? [],
    events: events.data ?? [],
    targetFaces: targetFaces.data ?? [],
  };
};

export type Lookups = Awaited<ReturnType<typeof fetchLookups>>;

/** Lookups change rarely, so they stay fresh for the whole session. */
export const lookupsQuery = () =>
  queryOptions({
    queryFn: fetchLookups,
    queryKey: lookupKeys.all,
    staleTime: Number.POSITIVE_INFINITY,
  });

export const useLookups = () => useQuery(lookupsQuery());

const UNIQUE_VIOLATION = "23505";

const saveError = (error: { code?: string; message: string }) => {
  if (error.code === UNIQUE_VIOLATION) {
    return error.message.includes("aai_no")
      ? "Another athlete already has that AAI No."
      : "Another athlete already has that ID No.";
  }
  return "Could not save the athlete. Try again.";
};

export const useSaveAthlete = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string | null;
      input: AthleteInput;
    }) => {
      const supabase = createClient();
      const { error } = id
        ? await supabase.from("athletes").update(input).eq("id", id)
        : await supabase.from("athletes").insert(input);
      if (error) {
        throw new Error(saveError(error));
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: athleteKeys.all }),
  });
};

export const useSetAthleteActive = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await createClient()
        .from("athletes")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) {
        throw new Error("Could not update the athlete.");
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: athleteKeys.all }),
  });
};
