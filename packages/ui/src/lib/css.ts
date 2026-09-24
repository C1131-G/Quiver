import type * as React from "react";

/**
 * Inline CSS custom properties (`--token: value`) for a style prop.
 * React's CSSProperties type has no index signature for custom properties,
 * so the single assertion covering that interop gap lives here instead of
 * at every call site.
 */
export const cssVars = (
  vars: Record<string, string | number | undefined>,
  style?: React.CSSProperties
): React.CSSProperties =>
  // SAFETY: React.CSSProperties has no index signature for `--*` custom
  // properties, so the object carrying them needs one assertion at this
  // single choke point; every value stays a string, number, or undefined.
  ({ ...style, ...vars }) as React.CSSProperties;
