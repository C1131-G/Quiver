import { Badge } from "@workspace/ui/components/badge";

import type { Database } from "@/lib/supabase/database.types";

export const SessionStatusBadge = ({
  status,
}: {
  status: Database["public"]["Enums"]["session_status"];
}) =>
  status === "completed" ? (
    <Badge variant="outline">Completed</Badge>
  ) : (
    <Badge>In progress</Badge>
  );
