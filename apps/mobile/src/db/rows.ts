import type { Database } from "@workspace/shared/database.types";

/**
 * Rows as QuiverScore keeps them on the phone: the database's own columns,
 * so syncing is a straight copy. Only the columns the app uses are kept.
 */

type Tables = Database["public"]["Tables"];
type Row<T extends keyof Tables> = Tables[T]["Row"];

export type SessionType = Database["public"]["Enums"]["session_type"];
export type Venue = Database["public"]["Enums"]["venue"];

export type Athlete = Pick<
  Row<"athletes">,
  | "category_id"
  | "distance_id"
  | "event_id"
  | "full_name"
  | "id"
  | "id_no"
  | "target_face_id"
>;

export type Category = Pick<
  Row<"categories">,
  "id" | "is_active" | "name" | "sort_order"
>;
export type ArcheryEvent = Pick<
  Row<"events">,
  "id" | "is_active" | "name" | "sort_order"
>;
export type Distance = Pick<Row<"distances">, "id" | "is_active" | "meters">;
export type TargetFace = Pick<
  Row<"target_faces">,
  "id" | "is_active" | "lowest_score" | "name" | "sort_order"
>;

export type Session = Pick<
  Row<"sessions">,
  | "athlete_id"
  | "category_id"
  | "completed_at"
  | "event_id"
  | "id"
  | "scorer_id"
  | "session_date"
  | "session_type"
  | "started_at"
  | "status"
  | "title"
  | "updated_at"
  | "venue"
> &
  // Added once phones already held sessions, so older rows lack it. Stored
  // rows are kept rather than rebuilt: a schema bump would clear them.
  Partial<Pick<Row<"sessions">, "template_id">>;

type TemplateRound = Row<"session_template_rounds">;

/**
 * A session an admin scheduled on Quiver Dashboard, kept as one row with
 * its rounds and athletes. A round with no distance or face uses each
 * athlete's own.
 */
export type SessionTemplate = Pick<
  Row<"session_templates">,
  "id" | "session_date" | "session_type" | "title" | "venue"
> & {
  athlete_ids: string[];
  rounds: Pick<
    TemplateRound,
    | "arrows_per_end"
    | "distance_id"
    | "planned_ends"
    | "round_no"
    | "target_face_id"
  >[];
};

export type Round = Pick<
  Row<"rounds">,
  | "arrows_per_end"
  | "distance_id"
  | "id"
  | "planned_ends"
  | "round_no"
  | "session_id"
  | "target_face_id"
>;

export type End = Pick<Row<"ends">, "end_no" | "id" | "round_id">;

export type Arrow = Pick<
  Row<"arrows">,
  "arrow_no" | "end_id" | "id" | "updated_at" | "value"
>;

/** The tables a scorer writes, in the order parents must reach the server. */
export const SYNCED_TABLES = ["sessions", "rounds", "ends", "arrows"] as const;
export type SyncedTable = (typeof SYNCED_TABLES)[number];

export interface SyncedRows {
  arrows: Arrow;
  ends: End;
  rounds: Round;
  sessions: Session;
}

/**
 * A row changed on the phone that the server has not seen yet. It names
 * the row, not the change: when sent, a row still on the phone is upserted
 * and a missing one deleted, so repeats and retries are harmless.
 */
export interface OutboxEntry {
  /** The end the change belongs to, so pending work can be counted in ends. */
  end_id: string | null;
  /** `<table>:<row id>`, so a row changed twice is sent once. */
  id: string;
  queued_at: string;
  /** Changes on every write; an entry is cleared only if it was not rewritten while being sent. */
  rev: string;
  row_id: string;
  session_id: string;
  table: SyncedTable;
}

/**
 * A session this phone has started sending. Marked before the first try,
 * so a send whose reply was lost still counts: the server may have it.
 */
export interface SentSession {
  /** The session's id. */
  id: string;
  sent_at: string;
}

/** A session the server refused. Its changes stay on the phone, unsent. */
export interface SyncIssue {
  code: string;
  failed_at: string;
  /** The session's id. */
  id: string;
  message: string;
}
