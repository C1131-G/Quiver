import { cn } from "@workspace/ui/lib/utils";

// World Archery ring colours, so a scorecard reads like the target face.
const RING_CLASSES = {
  black: "bg-neutral-900 text-white ring-1 ring-neutral-600 ring-inset",
  blue: "bg-sky-500 text-white",
  gold: "bg-yellow-300 text-yellow-950",
  miss: "bg-muted text-muted-foreground",
  red: "bg-red-500 text-white",
  white: "bg-white text-neutral-900 ring-1 ring-neutral-300 ring-inset",
} as const;

const ringOf = (value: string): keyof typeof RING_CLASSES => {
  if (value === "M") {
    return "miss";
  }
  const points = value === "X" ? 10 : Number(value);
  if (points >= 9) {
    return "gold";
  }
  if (points >= 7) {
    return "red";
  }
  if (points >= 5) {
    return "blue";
  }
  if (points >= 3) {
    return "black";
  }
  return "white";
};

export const ArrowValue = ({
  className,
  value,
}: {
  className?: string;
  value: string;
}) => (
  <span
    className={cn(
      "inline-flex size-8 items-center justify-center text-xs font-semibold tabular-nums",
      RING_CLASSES[ringOf(value)],
      className
    )}
  >
    {value}
  </span>
);
