import { Platform, Pressable, TextInput, View } from "react-native";

import { cn } from "@/lib/utils";

/**
 * Quiver Dashboard's InputGroup (packages/ui): one bordered field holding a
 * borderless input and addons, such as the password's show/hide button.
 */
function InputGroup({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      className={cn(
        "border-input bg-background dark:bg-input/30 h-10 w-full min-w-0 flex-row items-center border sm:h-9",
        className
      )}
      {...props}
    />
  );
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<typeof TextInput> & React.RefAttributes<TextInput>) {
  return (
    <TextInput
      className={cn(
        "text-foreground h-full min-w-0 flex-1 px-3 py-1 text-base leading-5",
        props.editable === false && "opacity-50",
        Platform.select({
          web: "placeholder:text-muted-foreground outline-none md:text-sm",
          native: "placeholder:text-muted-foreground/50",
        }),
        className
      )}
      {...props}
    />
  );
}

/** A square button at the end of the field, as tall as the field. */
function InputGroupButton({
  className,
  ...props
}: React.ComponentProps<typeof Pressable>) {
  return (
    <Pressable
      className={cn(
        "active:bg-muted dark:active:bg-input/50 aspect-square h-full items-center justify-center",
        props.disabled && "opacity-50",
        className
      )}
      role="button"
      {...props}
    />
  );
}

export { InputGroup, InputGroupButton, InputGroupInput };
