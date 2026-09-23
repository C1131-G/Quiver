import type { AthleteRow } from "@/components/athletes/use-athletes";

import type { Slots } from "./selection";
import { SERIES_COLORS, slotKey } from "./selection";

/** One compared athlete: who, and the colour its slot gives it. */
export interface Series {
  athleteId: string;
  color: (typeof SERIES_COLORS)[number];
  idNo: string;
  key: string;
  name: string;
}

export const buildSeries = (
  slots: Slots,
  athletes: AthleteRow[] | undefined
): Series[] =>
  slots.flatMap((athleteId, slot) => {
    const athlete = athletes?.find((row) => row.id === athleteId);
    const color = SERIES_COLORS[slot];
    if (!athleteId || !athlete || !color) {
      return [];
    }
    return [
      {
        athleteId,
        color,
        idNo: athlete.id_no,
        key: slotKey(slot),
        name: athlete.full_name,
      },
    ];
  });
