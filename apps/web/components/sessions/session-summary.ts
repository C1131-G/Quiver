import type { Stat } from "@/components/stat-grid";
import {
  formatAverage,
  formatDayDate,
  formatPercent,
  formatSessionTime,
} from "@/lib/format";

import { SESSION_TYPE_LABELS, VENUE_LABELS } from "./session-labels";
import type { SessionDetail } from "./use-sessions";

/** The headline numbers for a whole session. */
export const sessionTotals = (session: SessionDetail): Stat[] => {
  let arrows = 0;
  let points = 0;
  let tenPlusX = 0;
  let xCount = 0;
  let misses = 0;
  for (const round of session.rounds) {
    for (const end of round.ends) {
      for (const arrow of end.arrows) {
        arrows += 1;
        points += arrow.points ?? 0;
        tenPlusX += arrow.is_ten_plus_x ? 1 : 0;
        xCount += arrow.is_x ? 1 : 0;
        misses += arrow.value === "M" ? 1 : 0;
      }
    }
  }
  return [
    { label: "Score", value: `${points} / ${arrows * 10}` },
    {
      label: "Average per arrow",
      value: formatAverage(arrows ? points / arrows : null),
    },
    {
      label: "10 + X",
      value: `${tenPlusX} (${formatPercent(tenPlusX, arrows)})`,
    },
    { label: "X", value: `${xCount} (${formatPercent(xCount, arrows)})` },
    { label: "Misses", value: String(misses) },
  ];
};

/** One line under the athlete's name: when, what, where and who scored. */
export const describeSession = (session: SessionDetail) =>
  [
    `${formatDayDate(session.session_date)}, ${formatSessionTime(session.started_at)}`,
    session.title,
    SESSION_TYPE_LABELS[session.session_type],
    VENUE_LABELS[session.venue],
    `${session.category?.name ?? ""} ${session.event?.name ?? ""}`.trim(),
    session.scorer ? `Scored by ${session.scorer.full_name}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
