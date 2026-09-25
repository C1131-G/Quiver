import { cva, type VariantProps } from "class-variance-authority";
import { Platform, TextInput } from "react-native";

import { cn } from "@/lib/utils";

const inputVariants = cva(
  cn(
    "text-foreground flex w-full min-w-0 flex-row items-center text-base leading-5",
    Platform.select({
      web: cn(
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground transition-[color,box-shadow] outline-none md:text-sm",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"
      ),
    })
  ),
  {
    defaultVariants: { variant: "default" },
    variants: {
      variant: {
        // A capsule, filled search field, as iOS renders a search bar: no
        // border, a muted fill instead, and generous horizontal padding.
        search: cn(
          "bg-muted h-11 rounded-full px-4",
          Platform.select({
            web: "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          })
        ),
        default: cn(
          "dark:bg-input/30 border-input bg-background h-10 rounded-md border px-3 py-1 sm:h-9",
          Platform.select({
            web: "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          })
        ),
      },
    },
  }
);

type InputProps = React.ComponentProps<typeof TextInput> &
  React.RefAttributes<TextInput> &
  VariantProps<typeof inputVariants>;

function Input({ className, variant, ...props }: InputProps) {
  return (
    <TextInput
      className={cn(
        inputVariants({ variant }),
        props.editable === false &&
          cn(
            "opacity-50",
            Platform.select({
              web: "disabled:pointer-events-none disabled:cursor-not-allowed",
            })
          ),
        className
      )}
      placeholderTextColorClassName="accent-muted-foreground/50"
      {...props}
    />
  );
}

export { Input };
