import type { SheetSpec } from "@/lib/export/workbook";
import { downloadWorkbook } from "@/lib/export/workbook";
import { formatDateTime } from "@/lib/format";

import { scoreEnds } from "./session-score";
import type { ArrowCorrection, SessionDetail } from "./use-sessions";

const MAX_ARROWS_PER_END = 6;
const ARROW_SLOTS = Array.from(
  { length: MAX_ARROWS_PER_END },
  (_, index) => index
);

const scorecardRows = (session: SessionDetail) =>
  session.rounds.flatMap((round) =>
    scoreEnds(round.ends).map((scored) => ({ round, ...scored }))
  );

type ScorecardRow = ReturnType<typeof scorecardRows>[number];

const scorecardSheet = (session: SessionDetail): SheetSpec<ScorecardRow> => ({
  columns: [
    { header: "Round", value: (row) => row.round.round_no },
    {
      header: "Distance (m)",
      value: (row) => row.round.distance?.meters ?? null,
    },
    {
      header: "Target face",
      value: (row) => row.round.target_face?.name ?? null,
      width: 18,
    },
    { header: "End", value: (row) => row.end.end_no },
    ...ARROW_SLOTS.map((slot) => ({
      header: `Arrow ${slot + 1}`,
      value: (row: ScorecardRow) => row.end.arrows[slot]?.value ?? null,
      width: 9,
    })),
    { header: "End total", value: (row) => row.points },
    { header: "Running total", value: (row) => row.running },
    { header: "10 + X", value: (row) => row.tenPlusX },
    { header: "X", value: (row) => row.xCount },
  ],
  name: "Scorecard",
  rows: scorecardRows(session),
});

const correctionsSheet = (
  corrections: ArrowCorrection[]
): SheetSpec<ArrowCorrection> => ({
  columns: [
    {
      header: "When",
      value: (row) => formatDateTime(row.corrected_at),
      width: 22,
    },
    { header: "Round", value: (row) => row.round_no },
    { header: "End", value: (row) => row.end_no },
    { header: "Arrow", value: (row) => row.arrow_no },
    { header: "From", value: (row) => row.old_value ?? "(added)" },
    { header: "To", value: (row) => row.new_value ?? "(removed)" },
    { header: "Reason", value: (row) => row.reason, width: 40 },
    {
      header: "By",
      value: (row) => row.corrector?.full_name ?? null,
      width: 20,
    },
  ],
  name: "Corrections",
  rows: corrections,
});

/** One session's scorecard and its correction history. */
export const exportSession = (
  session: SessionDetail,
  corrections: ArrowCorrection[]
) =>
  downloadWorkbook(
    `quiver-${session.athlete?.id_no ?? "session"}-${session.session_date}`,
    [scorecardSheet(session), correctionsSheet(corrections)]
  );
