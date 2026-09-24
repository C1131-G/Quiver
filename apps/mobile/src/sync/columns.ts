import type {
  Arrow,
  End,
  Round,
  Session,
  SyncedRows,
  SyncedTable,
} from "@/db/rows";

/**
 * Only the table's own columns. Rows read from a collection also carry
 * TanStack DB's virtual fields, and rows from the server any embedded
 * children; neither belongs in the row itself.
 */
export const columnsOf = {
  arrows: (row: Arrow): Arrow => ({
    arrow_no: row.arrow_no,
    end_id: row.end_id,
    id: row.id,
    updated_at: row.updated_at,
    value: row.value,
  }),
  ends: (row: End): End => ({
    end_no: row.end_no,
    id: row.id,
    round_id: row.round_id,
  }),
  rounds: (row: Round): Round => ({
    arrows_per_end: row.arrows_per_end,
    distance_id: row.distance_id,
    id: row.id,
    planned_ends: row.planned_ends,
    round_no: row.round_no,
    session_id: row.session_id,
    target_face_id: row.target_face_id,
  }),
  sessions: (row: Session): Session => ({
    athlete_id: row.athlete_id,
    category_id: row.category_id,
    completed_at: row.completed_at,
    event_id: row.event_id,
    id: row.id,
    scorer_id: row.scorer_id,
    session_date: row.session_date,
    session_type: row.session_type,
    started_at: row.started_at,
    status: row.status,
    template_id: row.template_id ?? null,
    title: row.title,
    updated_at: row.updated_at,
    venue: row.venue,
  }),
} satisfies { [T in SyncedTable]: (row: SyncedRows[T]) => SyncedRows[T] };
