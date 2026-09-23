"use client";

import { ArrowLeftIcon, ClipboardTextIcon } from "@phosphor-icons/react";
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

import { PageHeader } from "@/components/page-header";
import type { Stat } from "@/components/stat-grid";
import { StatGrid } from "@/components/stat-grid";
import {
  formatAverage,
  formatDate,
  formatDateTime,
  formatPercent,
} from "@/lib/format";

import { ArrowValue } from "./arrow-value";
import type { CorrectionTarget } from "./correct-arrow-dialog";
import { CorrectArrowDialog } from "./correct-arrow-dialog";
import { SESSION_TYPE_LABELS, VENUE_LABELS } from "./session-labels";
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
          No arrows in this session have been corrected.
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
                    Round {correction.arrow.end.round.round_no}, end{" "}
                    {correction.arrow.end.end_no}, arrow{" "}
                    {correction.arrow.arrow_no}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <ArrowValue
                        className="size-6"
                        value={correction.old_value}
                      />
                      <span className="sr-only">changed to</span>
                      <span aria-hidden="true">→</span>
                      <ArrowValue
                        className="size-6"
                        value={correction.new_value}
                      />
                    </span>
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
    formatDate(session.session_date),
    session.title,
    SESSION_TYPE_LABELS[session.session_type],
    VENUE_LABELS[session.venue],
    `${session.category?.name ?? ""} ${session.event?.name ?? ""}`.trim(),
    session.scorer ? `Scored by ${session.scorer.full_name}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

const SessionView = ({ sessionId }: { sessionId: string }) => {
  const session = useSession(sessionId);
  const corrections = useCorrections(sessionId);
  // The target outlives the open state so a closing dialog keeps its text.
  const [target, setTarget] = useState<CorrectionTarget | null>(null);
  const [open, setOpen] = useState(false);
  const correctedArrowIds = useMemo(
    () =>
      new Set(
        (corrections.data ?? []).map((correction) => correction.arrow_id)
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
        action={<SessionStatusBadge status={data.status} />}
        description={describe(data)}
        title={data.athlete?.full_name ?? "Session"}
      />
      <StatGrid stats={sessionTotals(data)} />
      <div className="flex flex-col gap-6">
        {data.rounds.map((round) => (
          <RoundScorecard
            correctedArrowIds={correctedArrowIds}
            key={round.id}
            onCorrect={(next) => {
              setTarget(next);
              setOpen(true);
            }}
            round={round}
          />
        ))}
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
      <CorrectArrowDialog
        onOpenChange={setOpen}
        open={open}
        sessionId={sessionId}
        target={target}
      />
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
