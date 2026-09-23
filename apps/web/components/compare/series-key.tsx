import type { SERIES_COLORS } from "./selection";

/**
 * A short line in the series colour, matching the line chart's marks. Each
 * mode draws its own step of the palette.
 */
export const SeriesKey = ({
  color,
}: {
  color: (typeof SERIES_COLORS)[number];
}) => (
  <svg
    aria-hidden="true"
    className="h-0.5 w-3 shrink-0"
    preserveAspectRatio="none"
    viewBox="0 0 12 2"
  >
    <rect className="dark:hidden" fill={color.light} height="2" width="12" />
    <rect
      className="hidden dark:block"
      fill={color.dark}
      height="2"
      width="12"
    />
  </svg>
);
