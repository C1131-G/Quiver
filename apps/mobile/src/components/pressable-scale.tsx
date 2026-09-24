import { useState } from "react";
import type { PressableProps } from "react-native";
import { Pressable } from "react-native";
import type { CSSStyle } from "react-native-reanimated";
import {
  createAnimatedComponent,
  useReducedMotion,
} from "react-native-reanimated";

const AnimatedPressable = createAnimatedComponent(Pressable);

/**
 * Quiver Dashboard's press feedback (packages/ui button: scale 0.96 over
 * 150ms, ease-out), as a Reanimated CSS transition so a release mid-press
 * springs back from where it is.
 */
const REST: CSSStyle = {
  transform: [{ scale: 1 }],
  transitionDuration: 150,
  transitionProperty: "transform",
  transitionTimingFunction: "ease-out",
};
const PRESSED: CSSStyle = { transform: [{ scale: 0.96 }] };

type PressableScaleProps = Omit<PressableProps, "style"> & {
  /** Switches the scale off where the motion would distract. */
  static?: boolean;
};

/** A Pressable that shrinks slightly under the finger. */
export const PressableScale = ({
  onPressIn,
  onPressOut,
  static: isStatic = false,
  ...props
}: PressableScaleProps) => {
  const reducedMotion = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const scales = !isStatic && !reducedMotion;

  return (
    <AnimatedPressable
      {...props}
      onPressIn={(event) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}
      // oxlint-disable-next-line shadcn/no-inline-styles -- Reanimated reads transitions from the animated component's own style; a class never reaches it
      style={[REST, scales && pressed && PRESSED]}
    />
  );
};
