import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];

export const SESSION_TYPE_LABELS: Record<Enums["session_type"], string> = {
  competition: "Competition",
  training: "Training",
};

export const VENUE_LABELS: Record<Enums["venue"], string> = {
  indoor: "Indoor",
  outdoor: "Outdoor",
};
