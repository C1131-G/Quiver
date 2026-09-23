"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

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

const ATHLETES_KEY = ["athletes"] as const;
const LOOKUPS_KEY = ["lookups"] as const;

const ATHLETE_SELECT =
  "*, category:categories(name), event:events(name), distance:distances(meters), target_face:target_faces(name)";

const fetchAthletes = async () => {
  const { data, error } = await createClient()
    .from("athletes")
    .select(ATHLETE_SELECT)
    .order("full_name");
  if (error) {
    throw new Error("Could not load athletes.");
  }
  return data;
};

export type AthleteRow = Awaited<ReturnType<typeof fetchAthletes>>[number];

export const useAthletes = () =>
  useQuery({ queryFn: fetchAthletes, queryKey: ATHLETES_KEY });

const fetchLookups = async () => {
  const supabase = createClient();
  const [categories, events, distances, targetFaces] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("events").select("*").order("sort_order"),
    supabase.from("distances").select("*").order("meters"),
    supabase.from("target_faces").select("*").order("sort_order"),
  ]);
  const failed = [categories, events, distances, targetFaces].some(
    (result) => result.error
  );
  if (failed) {
    throw new Error("Could not load categories, events, distances and faces.");
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
export const useLookups = () =>
  useQuery({
    queryFn: fetchLookups,
    queryKey: LOOKUPS_KEY,
    staleTime: Number.POSITIVE_INFINITY,
  });

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ATHLETES_KEY }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ATHLETES_KEY }),
  });
};
