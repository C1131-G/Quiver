import type { AthleteRow, Lookups } from "@/components/athletes/use-athletes";
import type { Filters } from "@/components/filters/filters";
import { fetchPerformance } from "@/components/performance/use-performance";
import {
  arrowDetailsQuery,
  sessionSummariesQuery,
} from "@/components/sessions/session-list-query";
import { downloadWorkbook } from "@/lib/export/workbook";
import { toIsoDate } from "@/lib/format";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import {
  arrowDetailSchema,
  parseTableRows,
  sessionSummarySchema,
} from "@/lib/supabase/table-rows";

import {
  arrowsSheet,
  filtersSheet,
  sessionsSheet,
  summarySheet,
  weeklySheet,
} from "./sheets";

/**
 * Everything the filters select, in one workbook: the performance summary,
 * the weekly view, every session and every arrow, plus the filters used.
 */
export const exportFilteredWorkbook = async ({
  athletes,
  filename,
  filters,
  lookups,
}: {
  athletes: AthleteRow[] | undefined;
  filename: string;
  filters: Filters;
  lookups: Lookups | undefined;
}) => {
  const [summary, weekly, sessionRows, arrowRows] = await Promise.all([
    fetchPerformance(filters, false),
    fetchPerformance(filters, true),
    fetchAllRows((start, end) =>
      sessionSummariesQuery(filters).range(start, end)
    ),
    fetchAllRows((start, end) => arrowDetailsQuery(filters).range(start, end)),
  ]);
  const sessions = parseTableRows(
    sessionSummarySchema,
    sessionRows,
    "Could not load sessions."
  );
  const arrows = parseTableRows(
    arrowDetailSchema,
    arrowRows,
    "Could not load arrows."
  );
  if (arrows.length === 0) {
    throw new Error("Nothing to export: no arrows match these filters.");
  }
  await downloadWorkbook(`${filename}-${toIsoDate(new Date())}`, [
    summarySheet(summary),
    weeklySheet(weekly),
    sessionsSheet(sessions),
    arrowsSheet(arrows),
    filtersSheet(filters, lookups, athletes),
  ]);
};
