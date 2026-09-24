import type { Athlete, Session, SessionTemplate } from "@/db/rows";
import type { NewSession, RoundDraft } from "@/scoring/actions";

/** The template's rounds for one athlete; an empty distance or face is theirs. */
export const roundsFor = (
  template: SessionTemplate,
  athlete: Athlete
): RoundDraft[] =>
  template.rounds.map((round) => ({
    arrowsPerEnd: round.arrows_per_end,
    distanceId: round.distance_id ?? athlete.distance_id,
    plannedEnds: round.planned_ends,
    targetFaceId: round.target_face_id ?? athlete.target_face_id,
  }));

/** One new session per athlete, as the admin planned it. */
export const sessionsFromTemplate = (
  template: SessionTemplate,
  athletes: readonly Athlete[],
  scorerId: string
): NewSession[] =>
  athletes.map((athlete) => ({
    athlete,
    rounds: roundsFor(template, athlete),
    scorerId,
    sessionDate: template.session_date,
    sessionType: template.session_type,
    templateId: template.id,
    title: template.title,
    venue: template.venue,
  }));

/**
 * Athletes this phone already has a session for from the template. A
 * cancelled one does not count, so the athlete can start again.
 */
export const startedAthletes = (
  sessions: readonly (Pick<Session, "athlete_id" | "status"> & {
    template_id?: string | null | undefined;
  })[],
  templateId: string
) =>
  new Set(
    sessions.flatMap((session) =>
      session.template_id === templateId && session.status !== "cancelled"
        ? [session.athlete_id]
        : []
    )
  );
