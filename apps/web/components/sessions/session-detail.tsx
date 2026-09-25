"use client";

import {
  ArrowLeftIcon,
  ClipboardTextIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { Skeleton } from "@workspace/ui/components/skeleton";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { ExportButton } from "@/components/export/export-button";
import { PageHeader } from "@/components/page-header";
import { StatGrid } from "@/components/stat-grid";

import { CorrectionHistory } from "./correction-history";
import { exportSession } from "./export-session";
import { ScoreEditorPanel } from "./score-editor-panel";
import { scoreEnds } from "./session-score";
import { RoundScorecard } from "./session-scorecard";
import { SessionStatusBadge } from "./session-status-badge";
import { describeSession, sessionTotals } from "./session-summary";
import type { SessionDetail as Session } from "./use-sessions";
import { useCorrections, useSession } from "./use-sessions";

const BackToSessions = () => (
  <Button
    className="mb-4 -ml-2"
    nativeButton={false}
    render={<Link href="/sessions" transitionTypes={["nav-back"]} />}
    variant="ghost"
  >
    <ArrowLeftIcon aria-hidden="true" data-icon="inline-start" />
    Sessions
  </Button>
);

const SessionNotFound = () => (
  <div>
    <BackToSessions />
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ClipboardTextIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>Session not found</EmptyTitle>
        <EmptyDescription>
          It may have been deleted, or the link is incomplete.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  </div>
);

/** Each round's scorecard, with the session total carried across rounds. */
const Scorecards = ({
  correctedArrowIds,
  session,
}: {
  correctedArrowIds: Set<string>;
  session: Session;
}) => {
  let totalBefore = 0;
  return session.rounds.map((round) => {
    const before = totalBefore;
    totalBefore += scoreEnds(round.ends).at(-1)?.running ?? 0;
    return (
      <RoundScorecard
        correctedArrowIds={correctedArrowIds}
        key={round.id}
        round={round}
        totalBefore={before}
      />
    );
  });
};

const SessionContent = ({
  refreshError,
  session,
  sessionId,
}: {
  refreshError: Error | null;
  session: Session;
  sessionId: string;
}) => {
  const corrections = useCorrections(sessionId);
  const [editing, setEditing] = useState(false);
  const athleteName = session.athlete?.full_name ?? "Session";
  // Metadata can only say "Session": the name is read in the browser, so the
  // tab title is synced here. Next resets it on the next navigation.
  useEffect(() => {
    document.title = `${athleteName} — Quiver Dashboard`;
  }, [athleteName]);
  const correctedArrowIds = useMemo(
    () =>
      new Set(
        (corrections.data ?? []).flatMap((correction) =>
          correction.arrow_id ? [correction.arrow_id] : []
        )
      ),
    [corrections.data]
  );

  return (
    <div>
      <BackToSessions />
      <PageHeader
        action={
          <>
            <SessionStatusBadge status={session.status} />
            {editing ? null : (
              <Button
                disabled={session.rounds.length === 0}
                onClick={() => setEditing(true)}
                variant="outline"
              >
                <PencilSimpleIcon aria-hidden="true" data-icon="inline-start" />
                Edit scores
              </Button>
            )}
            <ExportButton
              disabled={!corrections.data}
              onExport={() => exportSession(session, corrections.data ?? [])}
            />
          </>
        }
        description={describeSession(session)}
        title={athleteName}
        titleTransitionName={`session-title-${sessionId}`}
      />
      {/* A failed refresh keeps the last good scores (and any edit) on screen. */}
      {refreshError ? (
        <p className="text-destructive mb-4 text-sm" role="alert">
          Could not refresh this session. Showing the last loaded scores.
        </p>
      ) : null}
      <StatGrid stats={sessionTotals(session)} />
      <div className="flex flex-col gap-6">
        {editing ? (
          <ScoreEditorPanel
            onDone={() => setEditing(false)}
            session={session}
          />
        ) : (
          <Scorecards correctedArrowIds={correctedArrowIds} session={session} />
        )}
        {session.rounds.length === 0 ? (
          <p className="text-muted-foreground">
            No rounds have been scored yet.
          </p>
        ) : null}
        {corrections.data ? (
          <CorrectionHistory corrections={corrections.data} />
        ) : null}
      </div>
      {session.notes ? (
        <p className="text-muted-foreground mt-6 max-w-prose text-pretty">
          <Badge className="mr-2" variant="outline">
            Notes
          </Badge>
          {session.notes}
        </p>
      ) : null}
    </div>
  );
};

export const SessionDetailSkeleton = () => (
  <div aria-busy="true" className="flex flex-col gap-6">
    <Skeleton className="h-8 w-28" />
    <Skeleton className="h-16 w-96" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-96 w-full" />
  </div>
);

const SessionView = ({ sessionId }: { sessionId: string }) => {
  const { data: session, error, isPending } = useSession(sessionId);

  // Data first: a failed background refetch must not unmount what is shown.
  if (session) {
    return (
      <SessionContent
        refreshError={error}
        session={session}
        sessionId={sessionId}
      />
    );
  }
  if (error) {
    return (
      <p className="text-destructive text-sm" role="alert">
        {error.message}
      </p>
    );
  }
  if (isPending) {
    return <SessionDetailSkeleton />;
  }
  return <SessionNotFound />;
};

const sessionIdSchema = z.uuid();

/** Any id that is not a UUID can only be a broken link. */
export const SessionDetail = ({ sessionId }: { sessionId: string }) =>
  sessionIdSchema.safeParse(sessionId).success ? (
    <SessionView sessionId={sessionId} />
  ) : (
    <SessionNotFound />
  );
