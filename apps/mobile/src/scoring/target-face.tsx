import { useState } from "react";
import type { GestureResponderEvent, LayoutChangeEvent } from "react-native";
import { Pressable, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { withUniwind } from "uniwind";

import { cn } from "@/lib/utils";

import { ringsOf, valueAt } from "./target-geometry";

/** A circle filled from a theme colour: `colorClassName="accent-zone-red"`. */
const ZoneCircle = withUniwind(Circle);

/** Each scoring ring's fill, matching the keypad and scorecard colours. */
const fillOf = (ring: number) => {
  if (ring >= 9) {
    return "accent-zone-gold";
  }
  if (ring >= 7) {
    return "accent-zone-red";
  }
  if (ring >= 5) {
    return "accent-zone-blue";
  }
  return ring >= 3 ? "accent-zone-black" : "accent-zone-white";
};

/** The line between rings: light on the black rings, dark elsewhere. */
const lineOf = (ring: number) =>
  ring === 3 || ring === 4 ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.3)";

const HIT_MARK_RADIUS = 5;

/**
 * A target face to tap where the arrow landed. It fills the space it is
 * given as the largest circle that fits, so it never makes the screen
 * scroll, and scores the tap by its distance from the centre.
 */
export const TargetFace = ({
  disabled,
  lowestScore,
  onScore,
}: {
  disabled: boolean;
  lowestScore: number;
  onScore: (value: string) => void;
}) => {
  const [size, setSize] = useState(0);
  const [lastHit, setLastHit] = useState<{ x: number; y: number } | null>(null);
  const rings = ringsOf(lowestScore);
  const radius = size / 2;
  const ringWidth = radius / rings.length;

  const measure = ({ nativeEvent }: LayoutChangeEvent) => {
    const { height, width } = nativeEvent.layout;
    setSize(Math.floor(Math.min(height, width)));
  };

  const hit = ({ nativeEvent }: GestureResponderEvent) => {
    const x = nativeEvent.locationX;
    const y = nativeEvent.locationY;
    setLastHit({ x, y });
    onScore(valueAt(Math.hypot(x - radius, y - radius), radius, lowestScore));
  };

  return (
    <View
      className="min-h-40 flex-1 items-center justify-center"
      onLayout={measure}
    >
      {size > 0 ? (
        <Pressable
          aria-disabled={disabled}
          aria-label="Target face. Tap where the arrow landed."
          className={cn(disabled && "opacity-40")}
          disabled={disabled}
          onPress={hit}
          role="button"
        >
          <Svg height={size} pointerEvents="none" width={size}>
            {rings.map((ring, index) => (
              <ZoneCircle
                colorClassName={fillOf(ring)}
                cx={radius}
                cy={radius}
                fill="currentColor"
                key={ring}
                r={radius - index * ringWidth - 0.5}
                stroke={lineOf(ring)}
                strokeWidth={1}
              />
            ))}
            {/* The X: the inner half of the 10. */}
            <Circle
              cx={radius}
              cy={radius}
              fill="none"
              r={ringWidth / 2}
              stroke={lineOf(10)}
              strokeWidth={1}
            />
            {lastHit ? (
              <ZoneCircle
                colorClassName="accent-foreground"
                cx={lastHit.x}
                cy={lastHit.y}
                fill="currentColor"
                r={HIT_MARK_RADIUS}
                stroke="white"
                strokeWidth={1.5}
              />
            ) : null}
          </Svg>
        </Pressable>
      ) : null}
    </View>
  );
};
