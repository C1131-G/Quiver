interface SavedArrow {
  arrow_no: number;
  updated_at: string;
}

/**
 * The arrow entered most recently, by when it was saved; the later arrow
 * number breaks a tie between two saved in the same millisecond.
 */
export const latestArrow = <TArrow extends SavedArrow>(
  arrows: Iterable<TArrow>
) => {
  let latest: TArrow | null = null;
  for (const arrow of arrows) {
    if (
      latest === null ||
      arrow.updated_at > latest.updated_at ||
      (arrow.updated_at === latest.updated_at &&
        arrow.arrow_no > latest.arrow_no)
    ) {
      latest = arrow;
    }
  }
  return latest;
};
