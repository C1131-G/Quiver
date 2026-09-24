import { cva, type VariantProps } from "class-variance-authority";
import { View } from "react-native";

import { TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/** Quiver Dashboard's Badge (packages/ui): a small square label. */
const badgeVariants = cva(
  "h-6 shrink-0 flex-row items-center justify-center gap-1 border border-transparent px-2",
  {
    defaultVariants: { variant: "default" },
    variants: {
      variant: {
        default: "bg-primary",
        destructive: "bg-destructive/10 dark:bg-destructive/20",
        outline: "border-border",
        secondary: "bg-secondary",
      },
    },
  }
);

const badgeTextVariants = cva("text-xs font-medium", {
  defaultVariants: { variant: "default" },
  variants: {
    variant: {
      default: "text-primary-foreground",
      destructive: "text-destructive",
      outline: "text-foreground",
      secondary: "text-secondary-foreground",
    },
  },
});

type BadgeProps = React.ComponentProps<typeof View> &
  VariantProps<typeof badgeVariants>;

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <TextClassContext value={badgeTextVariants({ variant })}>
    <View className={cn(badgeVariants({ variant }), className)} {...props} />
  </TextClassContext>
);
