import type { Filters } from "@/components/filters/filters";
import { filtersToQuery } from "@/components/filters/filters";

/**
 * A drill-down link into the sessions list: the current filters narrowed by
 * `narrow` (an athlete, a round format, a week).
 */
export const sessionsHref = (filters: Filters, narrow: Partial<Filters>) => ({
  pathname: "/sessions" as const,
  query: filtersToQuery({ ...filters, ...narrow }),
});

export const sessionHref = (sessionId: string) =>
  `/sessions/${sessionId}` as const;
