import { eq, useLiveQuery } from "@tanstack/react-db";
import type { RoundScore, ScoredEnd } from "@workspace/shared/scorecard";
import { nextEndToScore, scoreRound } from "@workspace/shared/scorecard";
import { useMemo } from "react";

import type { Arrow, End, Round } from "@/db/rows";
import { useScorerDb } from "@/db/scorer-db-context";

export interface RoundCard {
  distanceMeters: number | null;
  ends: Map<number, { arrows: Arrow[]; end: End }>;
  faceName: string;
  lowestScore: number;
  nextEndNo: number | null;
  round: Round;
  score: RoundScore;
}

const EMPTY: never[] = [];

/** Arrows grouped under their end, per round, as the scorecard needs them. */
const groupByRound = (ends: readonly End[], arrows: readonly Arrow[]) => {
  const arrowsByEnd = new Map<string, Arrow[]>();
  for (const arrow of arrows) {
    const list = arrowsByEnd.get(arrow.end_id) ?? [];
    list.push(arrow);
    arrowsByEnd.set(arrow.end_id, list);
  }
  const byRound = new Map<string, Map<number, { arrows: Arrow[]; end: End }>>();
  for (const end of ends) {
    const roundEnds = byRound.get(end.round_id) ?? new Map();
    roundEnds.set(end.end_no, { arrows: arrowsByEnd.get(end.id) ?? [], end });
    byRound.set(end.round_id, roundEnds);
  }
  return byRound;
};

const toScoredEnds = (
  ends: Map<number, { arrows: Arrow[]; end: End }>
): ScoredEnd[] =>
  [...ends.values()].map(({ arrows, end }) => ({
    arrows: arrows.map((arrow) => ({
      arrowNo: arrow.arrow_no,
      value: arrow.value,
    })),
    endNo: end.end_no,
  }));

/**
 * Everything the scoring screen shows for one session, straight from the
 * phone's database: the session, its athlete, and each round scored with
 * the session total carried from round to round.
 */
export const useScorecard = (sessionId: string) => {
  const { db } = useScorerDb();

  const { data: header } = useLiveQuery({
    query: (q) =>
      q
        .from({ session: db.sessions })
        .leftJoin({ athlete: db.athletes }, ({ athlete, session }) =>
          eq(athlete.id, session.athlete_id)
        )
        .where(({ session }) => eq(session.id, sessionId))
        .select(({ athlete, session }) => ({
          athleteName: athlete?.full_name,
          id: session.id,
          sessionDate: session.session_date,
          status: session.status,
          title: session.title,
        }))
        .findOne(),
    queryKey: ["scorecard", "session", sessionId],
  });

  const { data: rounds } = useLiveQuery({
    query: (q) =>
      q
        .from({ round: db.rounds })
        .where(({ round }) => eq(round.session_id, sessionId))
        .orderBy(({ round }) => round.round_no, "asc"),
    queryKey: ["scorecard", "rounds", sessionId],
  });

  const { data: ends } = useLiveQuery({
    query: (q) =>
      q
        .from({ end: db.ends })
        .innerJoin({ round: db.rounds }, ({ end, round }) =>
          eq(end.round_id, round.id)
        )
        .where(({ round }) => eq(round.session_id, sessionId))
        .select(({ end }) => ({ ...end })),
    queryKey: ["scorecard", "ends", sessionId],
  });

  const { data: arrows } = useLiveQuery({
    query: (q) =>
      q
        .from({ arrow: db.arrows })
        .innerJoin({ end: db.ends }, ({ arrow, end }) =>
          eq(arrow.end_id, end.id)
        )
        .innerJoin({ round: db.rounds }, ({ end, round }) =>
          eq(end.round_id, round.id)
        )
        .where(({ round }) => eq(round.session_id, sessionId))
        .select(({ arrow }) => ({ ...arrow })),
    queryKey: ["scorecard", "arrows", sessionId],
  });

  const { data: distances } = useLiveQuery({
    query: (q) => q.from({ distance: db.distances }),
    queryKey: ["lookups", "distances"],
  });
  const { data: faces } = useLiveQuery({
    query: (q) => q.from({ face: db.targetFaces }),
    queryKey: ["lookups", "target-faces"],
  });

  const cards = useMemo(() => {
    const byRound = groupByRound(ends ?? EMPTY, arrows ?? EMPTY);
    const meters = new Map((distances ?? EMPTY).map((d) => [d.id, d.meters]));
    const faceById = new Map((faces ?? EMPTY).map((f) => [f.id, f]));
    const result: RoundCard[] = [];
    let totalBefore = 0;
    for (const round of rounds ?? EMPTY) {
      const roundEnds = byRound.get(round.id) ?? new Map();
      const plan = {
        arrowsPerEnd: round.arrows_per_end,
        plannedEnds: round.planned_ends,
      };
      const scored = toScoredEnds(roundEnds);
      const score = scoreRound(plan, scored, totalBefore);
      totalBefore = score.total;
      const face = faceById.get(round.target_face_id);
      result.push({
        distanceMeters: meters.get(round.distance_id) ?? null,
        ends: roundEnds,
        faceName: face?.name ?? "",
        lowestScore: face?.lowest_score ?? 1,
        nextEndNo: nextEndToScore(plan, scored),
        round,
        score,
      });
    }
    return result;
  }, [arrows, distances, ends, faces, rounds]);

  return { cards, session: header };
};
