import type { AthleteRow, Lookups } from "@/components/athletes/use-athletes";
import type { Filters } from "@/components/filters/filters";
import {
  ALL,
  RANGE_PRESETS,
  resolveDateRange,
} from "@/components/filters/filters";
import type { PerformanceRow } from "@/components/performance/use-performance";
import {
  SESSION_TYPE_LABELS,
  VENUE_LABELS,
} from "@/components/sessions/session-labels";
import type { SessionSummary } from "@/components/sessions/use-sessions";
import type { SheetSpec } from "@/lib/export/workbook";
import {
  AVERAGE_FORMAT,
  DATE_FORMAT,
  excelDate,
  PERCENT_FORMAT,
} from "@/lib/export/workbook";
import type { ArrowDetail } from "@/lib/supabase/table-rows";

const ratio = (part: number | null, whole: number | null) =>
  whole ? (part ?? 0) / whole : null;

const performanceColumns: SheetSpec<PerformanceRow>["columns"] = [
  { header: "ID No.", value: (row) => row.id_no },
  { header: "Athlete", value: (row) => row.athlete_name, width: 24 },
  { header: "Gender", value: (row) => row.gender },
  { header: "Category", value: (row) => row.category_name },
  { header: "Event", value: (row) => row.event_name },
  { header: "Distance (m)", value: (row) => row.meters },
  { header: "Target face", value: (row) => row.target_face_name, width: 18 },
  { header: "Sessions", value: (row) => row.sessions },
  { header: "Arrows", value: (row) => row.arrows },
  { header: "Total points", value: (row) => row.total_points },
  {
    header: "Avg / arrow",
    numFmt: AVERAGE_FORMAT,
    value: (row) => row.avg_arrow,
  },
  {
    header: "Best session avg",
    numFmt: AVERAGE_FORMAT,
    value: (row) => row.best_session_avg,
  },
  { header: "X", value: (row) => row.x_count },
  { header: "10 + X", value: (row) => row.ten_plus_x_count },
  { header: "Misses", value: (row) => row.miss_count },
  {
    header: "10 + X rate",
    numFmt: PERCENT_FORMAT,
    value: (row) => ratio(row.ten_plus_x_count, row.arrows),
  },
  {
    header: "X rate",
    numFmt: PERCENT_FORMAT,
    value: (row) => ratio(row.x_count, row.arrows),
  },
  {
    header: "Last shot",
    numFmt: DATE_FORMAT,
    value: (row) => excelDate(row.last_session_date),
  },
];

export const summarySheet = (
  rows: PerformanceRow[]
): SheetSpec<PerformanceRow> => ({
  columns: performanceColumns,
  name: "Summary",
  rows,
});

export const weeklySheet = (
  rows: PerformanceRow[]
): SheetSpec<PerformanceRow> => ({
  columns: [
    {
      header: "Week of",
      numFmt: DATE_FORMAT,
      value: (row) => excelDate(row.week_start),
    },
    ...performanceColumns.filter((column) => column.header !== "Last shot"),
  ],
  name: "Weekly",
  rows,
});

export const sessionsSheet = (
  rows: SessionSummary[]
): SheetSpec<SessionSummary> => ({
  columns: [
    {
      header: "Date",
      numFmt: DATE_FORMAT,
      value: (row) => excelDate(row.session_date),
    },
    { header: "ID No.", value: (row) => row.id_no },
    { header: "Athlete", value: (row) => row.athlete_name, width: 24 },
    { header: "Gender", value: (row) => row.gender },
    { header: "Category", value: (row) => row.category_name },
    { header: "Event", value: (row) => row.event_name },
    {
      header: "Type",
      value: (row) =>
        row.session_type ? SESSION_TYPE_LABELS[row.session_type] : null,
    },
    {
      header: "Venue",
      value: (row) => (row.venue ? VENUE_LABELS[row.venue] : null),
    },
    { header: "Title", value: (row) => row.title, width: 24 },
    { header: "Formats", value: (row) => row.formats, width: 28 },
    { header: "Rounds", value: (row) => row.rounds },
    { header: "Arrows", value: (row) => row.arrows },
    { header: "Score", value: (row) => row.total_points },
    { header: "Max score", value: (row) => row.max_points },
    {
      header: "Avg / arrow",
      numFmt: AVERAGE_FORMAT,
      value: (row) => row.avg_arrow,
    },
    { header: "X", value: (row) => row.x_count },
    { header: "10 + X", value: (row) => row.ten_plus_x_count },
    { header: "Misses", value: (row) => row.miss_count },
    { header: "Corrections", value: (row) => row.correction_count },
    { header: "Status", value: (row) => row.status },
    { header: "Scorer", value: (row) => row.scorer_name, width: 20 },
    { header: "Session ID", value: (row) => row.id, width: 38 },
  ],
  name: "Sessions",
  rows,
});

export const arrowsSheet = (rows: ArrowDetail[]): SheetSpec<ArrowDetail> => ({
  columns: [
    {
      header: "Date",
      numFmt: DATE_FORMAT,
      value: (row) => excelDate(row.session_date),
    },
    { header: "ID No.", value: (row) => row.id_no },
    { header: "Athlete", value: (row) => row.athlete_name, width: 24 },
    {
      header: "Type",
      value: (row) =>
        row.session_type ? SESSION_TYPE_LABELS[row.session_type] : null,
    },
    {
      header: "Venue",
      value: (row) => (row.venue ? VENUE_LABELS[row.venue] : null),
    },
    { header: "Round", value: (row) => row.round_no },
    { header: "Distance (m)", value: (row) => row.meters },
    { header: "Target face", value: (row) => row.target_face_name, width: 18 },
    { header: "End", value: (row) => row.end_no },
    { header: "Arrow", value: (row) => row.arrow_no },
    { header: "Score", value: (row) => row.value },
    { header: "Points", value: (row) => row.points },
    { header: "Session ID", value: (row) => row.session_id, width: 38 },
  ],
  name: "Arrows",
  rows,
});

interface FilterLine {
  label: string;
  value: string;
}

const nameOf = <T extends { id: number }>(
  rows: T[] | undefined,
  id: string,
  label: (row: T) => string
) => {
  if (id === ALL) {
    return "All";
  }
  const row = rows?.find((candidate) => String(candidate.id) === id);
  return row ? label(row) : id;
};

/** The filters behind an export, so the file explains itself. */
export const filtersSheet = (
  filters: Filters,
  lookups: Lookups | undefined,
  athletes: AthleteRow[] | undefined
): SheetSpec<FilterLine> => {
  const { from, to } = resolveDateRange(filters);
  const range = RANGE_PRESETS.find((preset) => preset.value === filters.range);
  const athlete = athletes?.find((row) => row.id === filters.athlete);
  const rows: FilterLine[] = [
    { label: "Date range", value: range?.label ?? filters.range },
    { label: "From", value: from ?? "Any" },
    { label: "To", value: to ?? "Any" },
    {
      label: "Athlete",
      value: athlete ? `${athlete.full_name} (${athlete.id_no})` : "All",
    },
    {
      label: "Category",
      value: nameOf(lookups?.categories, filters.category, (row) => row.name),
    },
    {
      label: "Event",
      value: nameOf(lookups?.events, filters.event, (row) => row.name),
    },
    {
      label: "Distance",
      value: nameOf(
        lookups?.distances,
        filters.distance,
        (row) => `${row.meters} m`
      ),
    },
    {
      label: "Target face",
      value: nameOf(lookups?.targetFaces, filters.face, (row) => row.name),
    },
    {
      label: "Session type",
      value: filters.type === ALL ? "All" : SESSION_TYPE_LABELS[filters.type],
    },
    {
      label: "Venue",
      value: filters.venue === ALL ? "All" : VENUE_LABELS[filters.venue],
    },
    { label: "Gender", value: filters.gender === ALL ? "All" : filters.gender },
    { label: "Exported", value: new Date().toLocaleString() },
  ];
  return {
    columns: [
      { header: "Filter", value: (row) => row.label, width: 16 },
      { header: "Value", value: (row) => row.value, width: 36 },
    ],
    name: "Filters",
    rows,
  };
};
