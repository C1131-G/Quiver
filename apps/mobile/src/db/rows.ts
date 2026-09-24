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
>;

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
