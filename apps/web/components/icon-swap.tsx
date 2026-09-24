"use client";

import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  MotionConfig,
} from "motion/react";
import type { ReactNode } from "react";

// better-ui contextual icon values: exact, not approximate (they win over the
// generic "never scale from 0" advice; 0.25 is not 0). A full transform string
// rather than the `scale` shorthand lets Motion hand it to the compositor.
const hidden = { filter: "blur(4px)", opacity: 0, transform: "scale(0.25)" };
const shown = { filter: "blur(0px)", opacity: 1, transform: "scale(1)" };
const spring = { bounce: 0, duration: 0.3, type: "spring" } as const;

/**
 * Cross-fades an icon when its state changes (sort direction, show/hide
 * password). `iconKey` identifies the state; changing it swaps the icon.
 * Nothing animates on first render, and reduced motion drops the scale.
 */
export const IconSwap = ({
  children,
  iconKey,
}: {
  children: ReactNode;
  iconKey: string;
}) => (
  <LazyMotion features={domAnimation} strict>
    <MotionConfig reducedMotion="user">
      <AnimatePresence initial={false} mode="popLayout">
        <m.span
          animate={shown}
          className="inline-flex"
          exit={hidden}
          initial={hidden}
          key={iconKey}
          transition={spring}
        >
          {children}
        </m.span>
      </AnimatePresence>
    </MotionConfig>
  </LazyMotion>
);
