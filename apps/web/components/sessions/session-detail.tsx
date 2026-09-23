"use client";

import {
  ArrowLeftIcon,
  ClipboardTextIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import Link from "next/link";
import { useMemo, useState } from "react";
import { z } from "zod";

import { ExportButton } from "@/components/export/export-button";
import { PageHeader } from "@/components/page-header";
import type { Stat } from "@/components/stat-grid";
import { StatGrid } from "@/components/stat-grid";
import {
  formatAverage,
  formatDateTime,
  formatDayDate,
  formatPercent,
  formatSessionTime,
} from "@/lib/format";

import { ArrowValue } from "./arrow-value";
import { exportSession } from "./export-session";
import { ScoreEditorPanel } from "./score-editor-panel";
import { SESSION_TYPE_LABELS, VENUE_LABELS } from "./session-labels";
import { scoreEnds } from "./session-score";
import { RoundScorecard } from "./session-scorecard";
import { SessionStatusBadge } from "./session-status-badge";
import type { ArrowCorrection, SessionDetail as Session } from "./use-sessions";
import { useCorrections, useSession } from "./use-sessions";

const sessionTotals = (session: Session): Stat[] => {
  let arrows = 0;
  let points = 0;
  let tenPlusX = 0;
  let xCount = 0;
  let misses = 0;
  for (const round of session.rounds) {
    for (const end of round.ends) {
      for (const arrow of end.arrows) {
        arrows += 1;
        points += arrow.points ?? 0;
        tenPlusX += arrow.is_ten_plus_x ? 1 : 0;
        xCount += arrow.is_x ? 1 : 0;
        misses += arrow.value === "M" ? 1 : 0;
      }
    }
  }
  return [
    { label: "Score", value: `${points} / ${arrows * 10}` },
    {
      label: "Average per arrow",
      value: formatAverage(arrows ? points / arrows : null),
    },
    {
      label: "10 + X",
      value: `${tenPlusX} (${formatPercent(tenPlusX, arrows)})`,
    },
    { label: "X", value: `${xCount} (${formatPercent(xCount, arrows)})` },
    { label: "Misses", value: String(misses) },
  ];
};

const BackToSessions = () => (
  <Button
    className="mb-4 -ml-2"
    nativeButton={false}
    render={<Link href="/sessions" />}
    variant="ghost"
  >
    <ArrowLeftIcon aria-hidden="true" data-icon="inline-start" />
    Sessions
  </Button>
);

/** What happened to the arrow: changed, added or removed. */
const ChangeCell = ({ correction }: { correction: ArrowCorrection }) => {
  const { new_value: next, old_value: previous } = correction;
  if (previous === null && next !== null) {
    return (
      <span className="flex items-center gap-2">
        Added
        <ArrowValue className="size-6" value={next} />
      </span>
    );
  }
  if (previous !== null && next === null) {
    return (
      <span className="flex items-center gap-2">
        <ArrowValue className="size-6" value={previous} />
        Removed
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2">
      <ArrowValue className="size-6" value={previous ?? ""} />
      <span className="sr-only">changed to</span>
      <span aria-hidden="true">→</span>
      <ArrowValue className="size-6" value={next ?? ""} />
    </span>
  );
};

const CorrectionHistory = ({
  corrections,
}: {
  corrections: ArrowCorrection[];
}) => (
  <Card>
    <CardHeader>
      <CardTitle>Correction history</CardTitle>
    </CardHeader>
    <CardContent>
      {corrections.length === 0 ? (
        <p className="text-muted-foreground">
          No scores in this session have been edited.
        </p>
      ) : (
        <div className="tabular-nums">
          <Table aria-label="Correction history">
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Arrow</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {corrections.map((correction) => (
                <TableRow key={correction.id}>
                  <TableCell>
                    {formatDateTime(correction.corrected_at)}
                  </TableCell>
                  <TableCell>
                    Round {correction.round_no}, end {correction.end_no}, arrow{" "}
                    {correction.arrow_no}
                  </TableCell>
                  <TableCell>
                    <ChangeCell correction={correction} />
                  </TableCell>
                  <TableCell className="max-w-sm whitespace-normal">
                    <span className="text-pretty">
                      {correction.reason ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {correction.corrector?.full_name ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </CardContent>
  </Card>
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

export const SessionDetailSkeleton = () => (
  <div aria-busy="true" className="flex flex-col gap-6">
    <Skeleton className="h-8 w-28" />
    <Skeleton className="h-16 w-96" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-96 w-full" />
  </div>
);

const describe = (session: Session) =>
  [
    `${formatDayDate(session.session_date)}, ${formatSessionTime(session.started_at)}`,
    session.title,
    SESSION_TYPE_LABELS[session.session_type],
    VENUE_LABELS[session.venue],
    `${session.category?.name ?? ""} ${session.event?.name ?? ""}`.trim(),
    session.scorer ? `Scored by ${session.scorer.full_name}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

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

const SessionView = ({ sessionId }: { sessionId: string }) => {
  const session = useSession(sessionId);
  const corrections = useCorrections(sessionId);
  const [editing, setEditing] = useState(false);
  const correctedArrowIds = useMemo(
    () =>
      new Set(
        (corrections.data ?? []).flatMap((correction) =>
          correction.arrow_id ? [correction.arrow_id] : []
        )
      ),
    [corrections.data]
  );

  if (session.isPending) {
    return <SessionDetailSkeleton />;
  }
  if (session.error) {
    return (
      <p className="text-destructive text-sm" role="alert">
        {session.error.message}
      </p>
    );
  }
  if (!session.data) {
    return <SessionNotFound />;
  }
  const { data } = session;

  return (
    <div>
      <BackToSessions />
      <PageHeader
        action={
          <>
            <SessionStatusBadge status={data.status} />
            {editing ? null : (
              <Button
                disabled={data.rounds.length === 0}
                onClick={() => setEditing(true)}
                variant="outline"
              >
                <PencilSimpleIcon aria-hidden="true" data-icon="inline-start" />
                Edit scores
              </Button>
            )}
            <ExportButton
              disabled={!corrections.data}
              onExport={() => exportSession(data, corrections.data ?? [])}
            />
          </>
        }
        description={describe(data)}
        title={data.athlete?.full_name ?? "Session"}
      />
      <StatGrid stats={sessionTotals(data)} />
      <div className="flex flex-col gap-6">
        {editing ? (
          <ScoreEditorPanel onDone={() => setEditing(false)} session={data} />
        ) : (
          <Scorecards correctedArrowIds={correctedArrowIds} session={data} />
        )}
        {data.rounds.length === 0 ? (
          <p className="text-muted-foreground">
            No rounds have been scored yet.
          </p>
        ) : null}
        {corrections.data ? (
          <CorrectionHistory corrections={corrections.data} />
        ) : null}
      </div>
      {data.notes ? (
        <p className="text-muted-foreground mt-6 max-w-prose text-pretty">
          <Badge className="mr-2" variant="outline">
            Notes
          </Badge>
          {data.notes}
        </p>
      ) : null}
    </div>
  );
};

const sessionIdSchema = z.uuid();

/** Any id that is not a UUID can only be a broken link. */
export const SessionDetail = ({ sessionId }: { sessionId: string }) =>
  sessionIdSchema.safeParse(sessionId).success ? (
    <SessionView sessionId={sessionId} />
  ) : (
    <SessionNotFound />
  );
