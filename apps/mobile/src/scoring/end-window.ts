interface WindowRow {
  endNo: number;
  shot: number;
}

/**
 * Which ends fit on screen: `size` of them, ending at the end being scored
 * so the ends just shot stay in view. Returns the [start, end) row indexes.
 */
export const endWindow = (
  rows: readonly WindowRow[],
  anchorEndNo: number | null,
  size: number
) => {
  if (rows.length <= size) {
    return { end: rows.length, start: 0 };
  }
  let anchor = rows.findIndex((row) => row.endNo === anchorEndNo);
  if (anchor === -1) {
    // The last end shot, so a finished round shows how it ended.
    anchor = 0;
    for (const [index, row] of rows.entries()) {
      if (row.shot > 0) {
        anchor = index;
      }
    }
  }
  const start = Math.min(Math.max(anchor - size + 1, 0), rows.length - size);
  return { end: start + size, start };
};
