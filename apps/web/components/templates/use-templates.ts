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

type Functions = Database["public"]["Functions"];
type TemplateRound =
  Database["public"]["Tables"]["session_template_rounds"]["Row"];

/** A round as the dashboard edits it; a null distance or face is the athlete's own. */
export type TemplateRoundInput = Pick<
  TemplateRound,
  "arrows_per_end" | "distance_id" | "planned_ends" | "target_face_id"
>;

export interface TemplateInput {
  athleteIds: string[];
  rounds: TemplateRoundInput[];
  sessionDate: string;
  sessionType: Functions["save_session_template"]["Args"]["p_session_type"];
  title: string;
  venue: Functions["save_session_template"]["Args"]["p_venue"];
}

export const templateKeys = {
  all: ["session-templates"] as const,
};

const TEMPLATE_SELECT = `
  id, title, session_date, session_type, venue,
  rounds:session_template_rounds(round_no, distance_id, target_face_id, arrows_per_end, planned_ends),
  athletes:session_template_athletes(athlete_id),
  sessions(athlete_id, status)
`;

const fetchTemplates = async () => {
  const { data, error } = await createClient()
    .from("session_templates")
    .select(TEMPLATE_SELECT)
    .order("session_date", { ascending: false })
    .order("title");
  if (error) {
    throw loadError("Could not load scheduled sessions.", error);
  }
  return data.map((template) => ({
    ...template,
    rounds: template.rounds.toSorted(
      (roundA, roundB) => roundA.round_no - roundB.round_no
    ),
  }));
};

export type TemplateRow = Awaited<ReturnType<typeof fetchTemplates>>[number];

export const templatesQuery = () =>
  queryOptions({ queryFn: fetchTemplates, queryKey: templateKeys.all });

export const useTemplates = () => useQuery(templatesQuery());

/** Athletes on the plan who have a session from it that was not cancelled. */
export const startedAthletes = (template: TemplateRow) =>
  new Set(
    template.sessions.flatMap((session) =>
      session.status === "cancelled" ? [] : [session.athlete_id]
    )
  );

export const useSaveTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string | null;
      input: TemplateInput;
    }) => {
      const { error } = await createClient().rpc("save_session_template", {
        p_athlete_ids: input.athleteIds,
        p_id: id ?? crypto.randomUUID(),
        p_rounds: input.rounds,
        p_session_date: input.sessionDate,
        p_session_type: input.sessionType,
        p_title: input.title,
        p_venue: input.venue,
      });
      if (error) {
        throw new Error("Could not save the scheduled session. Try again.");
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: templateKeys.all }),
  });
};

export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createClient()
        .from("session_templates")
        .delete()
        .eq("id", id);
      if (error) {
        throw new Error("Could not remove the scheduled session.");
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: templateKeys.all }),
  });
};
