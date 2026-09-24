import { Badge } from "@workspace/ui/components/badge";

import type { Database } from "@/lib/supabase/database.types";

type SessionStatus = Database["public"]["Enums"]["session_status"];

// Cancelled sessions are left out of session_summaries, so the dashboard
// only meets one when it reads a session directly.
export const SessionStatusBadge = ({ status }: { status: SessionStatus }) => {
  if (status === "completed") {
    return <Badge variant="outline">Completed</Badge>;
  }
  if (status === "cancelled") {
    return <Badge variant="secondary">Cancelled</Badge>;
  }
  return <Badge>In progress</Badge>;
};
