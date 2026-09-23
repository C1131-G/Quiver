import { z } from "zod";

import { addDays, toIsoDate } from "@/lib/format";
import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];

export const ALL = "all";

const rangeSchema = z.enum(["7d", "4w", "12w", "year", "all", "custom"]);
type RangePreset = z.infer<typeof rangeSchema>;

export const RANGE_PRESETS: {
  days: number | null;
  label: string;
  value: RangePreset;
}[] = [
  { days: 7, label: "Last 7 days", value: "7d" },
  { days: 28, label: "Last 4 weeks", value: "4w" },
  { days: 84, label: "Last 12 weeks", value: "12w" },
  { days: null, label: "This year", value: "year" },
  { days: null, label: "All time", value: "all" },
  { days: null, label: "Custom range", value: "custom" },
];

export const DEFAULT_RANGE: RangePreset = "4w";

const isoDate = z.iso.date();
const lookupId = z.string().regex(/^\d{1,5}$/u);
const genderSchema = z.enum(["male", "female"] satisfies Enums["gender"][]);
const typeSchema = z.enum([
  "training",
  "competition",
] satisfies Enums["session_type"][]);
const venueSchema = z.enum(["indoor", "outdoor"] satisfies Enums["venue"][]);

type All = typeof ALL;

export interface Filters {
  athlete: string;
  category: string;
  distance: string;
  event: string;
  face: string;
  from: string;
  gender: Enums["gender"] | All;
  range: RangePreset;
  to: string;
  type: Enums["session_type"] | All;
  venue: Enums["venue"] | All;
}

export const DEFAULT_FILTERS: Filters = {
  athlete: ALL,
  category: ALL,
  distance: ALL,
  event: ALL,
  face: ALL,
  from: "",
  gender: ALL,
  range: DEFAULT_RANGE,
  to: "",
  type: ALL,
  venue: ALL,
};

export const FILTER_KEYS = [
  "athlete",
  "category",
  "distance",
  "event",
  "face",
  "from",
  "gender",
  "range",
  "to",
  "type",
  "venue",
] as const satisfies readonly (keyof Filters)[];

const parseOr = <T, F>(
  schema: z.ZodType<T>,
  value: string | null,
  fallback: F
) => {
  const result = schema.safeParse(value);
  return result.success ? result.data : fallback;
};

/**
 * Every value comes from the URL, so anything malformed falls back to its
 * default ("all") instead of reaching a query.
 */
export const parseFilters = (params: {
  get: (key: string) => string | null;
}): Filters => ({
  athlete: parseOr(z.uuid(), params.get("athlete"), ALL),
  category: parseOr(lookupId, params.get("category"), ALL),
  distance: parseOr(lookupId, params.get("distance"), ALL),
  event: parseOr(lookupId, params.get("event"), ALL),
  face: parseOr(lookupId, params.get("face"), ALL),
  from: parseOr(isoDate, params.get("from"), ""),
  gender: parseOr(genderSchema, params.get("gender"), ALL),
  range: parseOr(rangeSchema, params.get("range"), DEFAULT_RANGE),
  to: parseOr(isoDate, params.get("to"), ""),
  type: parseOr(typeSchema, params.get("type"), ALL),
  venue: parseOr(venueSchema, params.get("venue"), ALL),
});

/** Only non-default values go in the URL, so links stay short. */
export const filtersToQuery = (filters: Partial<Filters>) => {
  const query: Record<string, string> = {};
  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (value !== undefined && value !== DEFAULT_FILTERS[key]) {
      query[key] = value;
    }
  }
  return query;
};

export const isFiltered = (filters: Filters) =>
  FILTER_KEYS.some((key) => filters[key] !== DEFAULT_FILTERS[key]);

/** Null bounds are open-ended. */
export interface DateRange {
  from: string | null;
  to: string | null;
}

/** The inclusive date window a range preset covers, relative to today. */
export const resolveDateRange = (
  filters: Filters,
  today = toIsoDate(new Date())
): DateRange => {
  if (filters.range === "custom") {
    return { from: filters.from || null, to: filters.to || null };
  }
  if (filters.range === "all") {
    return { from: null, to: null };
  }
  if (filters.range === "year") {
    return { from: `${today.slice(0, 4)}-01-01`, to: today };
  }
  const preset = RANGE_PRESETS.find((item) => item.value === filters.range);
  return { from: addDays(today, 1 - (preset?.days ?? 1)), to: today };
};

const pickId = (value: string) => (value === ALL ? undefined : [Number(value)]);

export const toPerformanceArgs = (filters: Filters, byWeek: boolean) => {
  const { from, to } = resolveDateRange(filters);
  const { athlete, gender, type, venue } = filters;
  return {
    p_athlete_ids: athlete === ALL ? undefined : [athlete],
    p_by_week: byWeek,
    p_category_ids: pickId(filters.category),
    p_distance_ids: pickId(filters.distance),
    p_event_ids: pickId(filters.event),
    p_from: from ?? undefined,
    p_genders: gender === ALL ? undefined : [gender],
    p_session_types: type === ALL ? undefined : [type],
    p_target_face_ids: pickId(filters.face),
    p_to: to ?? undefined,
    p_venues: venue === ALL ? undefined : [venue],
  };
};
