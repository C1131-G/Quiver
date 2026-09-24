import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import type { Session } from "@/db/rows";

// The same variants as Quiver Dashboard's SessionStatusBadge.
const STATUS_BADGES = {
  cancelled: { label: "Cancelled", variant: "secondary" },
  completed: { label: "Submitted", variant: "outline" },
  in_progress: { label: "In progress", variant: "default" },
} as const satisfies Record<
  Session["status"],
  { label: string; variant: "default" | "outline" | "secondary" }
>;

export const SessionStatusBadge = ({
  status,
}: {
  status: Session["status"];
}) => {
  const { label, variant } = STATUS_BADGES[status];
  return (
    <Badge variant={variant}>
      <Text>{label}</Text>
    </Badge>
  );
};
