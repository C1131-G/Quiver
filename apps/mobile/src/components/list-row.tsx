import { ChevronRight } from "lucide-react-native";
import { withUniwind } from "uniwind";

import { PressableScale } from "@/components/pressable-scale";
import { cn } from "@/lib/utils";

const ChevronIcon = withUniwind(ChevronRight);

/**
 * A tappable row on a card surface, as Quiver Dashboard's cards: square,
 * a hairline edge and bg-card to lift it off the page. Rows that open a
 * screen end in a chevron.
 */
export const ListRow = ({
  children,
  className,
  opens = true,
  ...props
}: Omit<React.ComponentProps<typeof PressableScale>, "children"> & {
  children: React.ReactNode;
  className?: string;
  /** Shows the chevron that says the row opens another screen. */
  opens?: boolean;
}) => (
  <PressableScale
    className={cn(
      "border-foreground/10 bg-card active:bg-muted min-h-16 flex-row items-center gap-3 border px-4 py-3",
      className
    )}
    role="button"
    {...props}
  >
    {children}
    {opens ? (
      <ChevronIcon colorClassName="accent-muted-foreground" size={20} />
    ) : null}
  </PressableScale>
);
