import { createTransaction } from "@tanstack/react-db";
import { lastShot, nextArrowNo } from "@workspace/shared/scorecard";
import { randomUUID } from "expo-crypto";

import type { Arrow, Athlete, SessionType, Venue } from "@/db/rows";
import type { ScorerDb } from "@/db/scorer-db";
import { queueForServer } from "@/sync/outbox";

/**
 * Every change a scorer makes, written to the phone first and queued for
 * the server. Each action is one transaction across the collections it
 * touches, so a session never exists without its rounds, or an arrow
 * without its end.
 */
export const writeLocally = async (db: ScorerDb, change: () => void) => {
  const transaction = createTransaction({
    autoCommit: false,
    mutationFn: async ({ transaction: pending }) => {
      // The outbox is saved first. If the app dies before the rows are, the
      // sync finds an entry whose row the phone never kept, and skips it.
      await db.outbox.utils.acceptMutations(pending);
      await Promise.all([
        db.sessions.utils.acceptMutations(pending),
        db.rounds.utils.acceptMutations(pending),
        db.ends.utils.acceptMutations(pending),
        db.arrows.utils.acceptMutations(pending),
      ]);
    },
  });
  transaction.mutate(change);
  const changed = [...transaction.mutations];
  transaction.mutate(() => queueForServer(db, changed));
  // Both settle with a failure; awaiting both leaves neither unhandled.
  await Promise.all([transaction.commit(), transaction.isPersisted.promise]);
};

export interface RoundDraft {
  arrowsPerEnd: number;
  distanceId: number;
  plannedEnds: number;
  targetFaceId: number;
}

export interface NewSession {
  athlete: Athlete;
  rounds: readonly RoundDraft[];
  scorerId: string;
  sessionDate: string;
  sessionType: SessionType;
  /** The scheduled session it was started from, if any. */
  templateId: string | null;
  title: string;
  venue: Venue;
}

const insertSession = (
  db: ScorerDb,
  draft: NewSession,
  sessionId: string,
  now: string
) => {
  const title = draft.title.trim();
  db.sessions.insert({
    athlete_id: draft.athlete.id,
    // The athlete's category and event when the session was shot.
    category_id: draft.athlete.category_id,
    completed_at: null,
    event_id: draft.athlete.event_id,
    id: sessionId,
    scorer_id: draft.scorerId,
    session_date: draft.sessionDate,
    session_type: draft.sessionType,
    started_at: now,
    status: "in_progress",
    template_id: draft.templateId,
    title: title === "" ? null : title,
    updated_at: now,
    venue: draft.venue,
  });
  db.rounds.insert(
    draft.rounds.map((round, index) => ({
      arrows_per_end: round.arrowsPerEnd,
      distance_id: round.distanceId,
      id: randomUUID(),
      planned_ends: round.plannedEnds,
      round_no: index + 1,
      session_id: sessionId,
      target_face_id: round.targetFaceId,
    }))
  );
};

/**
 * Creates sessions and their rounds in one transaction, so a scheduled
 * session starts for every chosen athlete or none. Returns the new ids in
 * the order given.
 */
export const startSessions = async (
  db: ScorerDb,
  drafts: readonly NewSession[]
) => {
  const now = new Date().toISOString();
  const started = drafts.map((draft) => ({ draft, id: randomUUID() }));
  await writeLocally(db, () => {
    for (const { draft, id } of started) {
      insertSession(db, draft, id, now);
    }
  });
  return started.map(({ id }) => id);
};

export interface EndRef {
  endNo: number;
  roundId: string;
}

/**
 * The end and its arrows as the collections hold them right now, pending
 * writes included. Reading here rather than from the last render means two
 * quick taps can never give two arrows the same number.
 */
const readEnd = (db: ScorerDb, { endNo, roundId }: EndRef) => {
  const end = [...db.ends.values()].find(
    (row) => row.round_id === roundId && row.end_no === endNo
  );
  const arrows: (Arrow & { arrowNo: number })[] = [];
  if (end) {
    for (const arrow of db.arrows.values()) {
      if (arrow.end_id === end.id) {
        arrows.push({ ...arrow, arrowNo: arrow.arrow_no });
      }
    }
  }
  return { arrows, end };
};

/**
 * Adds an arrow to the end, creating the end on its first arrow. Returns
 * false when the end is already full.
 */
export const scoreArrow = async (
  db: ScorerDb,
  ref: EndRef & { arrowsPerEnd: number },
  value: string
) => {
  const { arrows, end } = readEnd(db, ref);
  const arrowNo = nextArrowNo(arrows, ref.arrowsPerEnd);
  if (arrowNo === null) {
    return false;
  }
  const endId = end?.id ?? randomUUID();
  await writeLocally(db, () => {
    if (!end) {
      db.ends.insert({ end_no: ref.endNo, id: endId, round_id: ref.roundId });
    }
    db.arrows.insert({
      arrow_no: arrowNo,
      end_id: endId,
      id: randomUUID(),
      updated_at: new Date().toISOString(),
      value,
    });
  });
  return true;
};

/** Removes the arrow shot last in the end, whatever its score. */
export const deleteLastArrow = async (db: ScorerDb, ref: EndRef) => {
  const last = lastShot(readEnd(db, ref).arrows);
  if (!last) {
    return false;
  }
  await writeLocally(db, () => {
    db.arrows.delete(last.id);
  });
  return true;
};

/** Clears every arrow in the end; the end itself stays, ready to reshoot. */
export const clearEnd = async (db: ScorerDb, ref: EndRef) => {
  const { arrows } = readEnd(db, ref);
  if (arrows.length === 0) {
    return false;
  }
  await writeLocally(db, () => {
    db.arrows.delete(arrows.map(({ id }) => id));
  });
  return true;
};
