"use client";

import { ClipboardTextIcon } from "@phosphor-icons/react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import Link from "next/link";

import { useAthletes, useLookups } from "@/components/athletes/use-athletes";
import { ExportButton } from "@/components/export/export-button";
import { exportFilteredWorkbook } from "@/components/export/export-filtered";
import { FilterBar } from "@/components/filters/filter-bar";
import { DEFAULT_RANGE, isFiltered } from "@/components/filters/filters";
import {
  resetFilters,
  setFilters,
  updateSearchParams,
  useFilters,
} from "@/components/filters/use-filters";
import { PageHeader } from "@/components/page-header";
import { formatAverage, formatDate, formatInteger } from "@/lib/format";

import { SESSION_TYPE_LABELS, VENUE_LABELS } from "./session-labels";
import { SessionStatusBadge } from "./session-status-badge";
import { sessionHref } from "./sessions-href";
import type { SessionSummary } from "./use-sessions";
import { SESSIONS_PAGE_SIZE, useSessions } from "./use-sessions";

const PAGE_PATTERN = /^[1-9]\d{0,5}$/u;

/** The URL page is 1-based for people; queries are 0-based. */
const readPage = (value: string | null) =>
  value && PAGE_PATTERN.test(value) ? Number(value) - 1 : 0;

const SessionRow = ({ session }: { session: SessionSummary }) => {
  if (!session.id || !session.session_date) {
    return null;
  }
  const corrections = session.correction_count ?? 0;
  return (
    <TableRow>
      <TableCell>
        <Link
          className="font-medium underline-offset-4 hover:underline"
          href={sessionHref(session.id)}
        >
          {formatDate(session.session_date)}
        </Link>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{session.athlete_name}</span>
          <span className="text-muted-foreground font-mono">
            {session.id_no}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span>
            {session.session_type
              ? SESSION_TYPE_LABELS[session.session_type]
              : "—"}
          </span>
          <span className="text-muted-foreground">
            {[session.title, session.venue ? VENUE_LABELS[session.venue] : null]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
      </TableCell>
      <TableCell className="whitespace-normal">
        {session.formats || "—"}
      </TableCell>
      <TableCell className="text-right">
        {formatInteger(session.total_points)}
        <span className="text-muted-foreground">
          {" "}
          / {formatInteger(session.max_points)}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <span className="font-semibold">
          {formatAverage(session.avg_arrow)}
        </span>
      </TableCell>
      <TableCell className="text-right">
        {formatInteger(session.ten_plus_x_count)}
      </TableCell>
      <TableCell className="text-right">
        {formatInteger(session.x_count)}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          {session.status ? (
            <SessionStatusBadge status={session.status} />
          ) : null}
          {corrections > 0 ? (
            <Badge variant="secondary">
              {corrections} {corrections === 1 ? "correction" : "corrections"}
            </Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell>{session.scorer_name ?? "—"}</TableCell>
    </TableRow>
  );
};

const SessionsTable = ({ rows }: { rows: SessionSummary[] }) => (
  <div className="border tabular-nums">
    <Table aria-label="Sessions">
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Athlete</TableHead>
          <TableHead>Session</TableHead>
          <TableHead>Format</TableHead>
          <TableHead className="text-right">Score</TableHead>
          <TableHead className="text-right">Avg / arrow</TableHead>
          <TableHead className="text-right">10 + X</TableHead>
          <TableHead className="text-right">X</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Scorer</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((session) => (
          <SessionRow key={session.id} session={session} />
        ))}
      </TableBody>
    </Table>
  </div>
);

const SessionsEmpty = ({ filtered }: { filtered: boolean }) => (
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <ClipboardTextIcon aria-hidden="true" />
      </EmptyMedia>
      <EmptyTitle>
        {filtered ? "No matching sessions" : "No sessions yet"}
      </EmptyTitle>
      <EmptyDescription>
        {filtered
          ? "Widen the date range or clear a filter."
          : "Sessions appear here once scorers start scoring on the mobile app."}
      </EmptyDescription>
    </EmptyHeader>
  </Empty>
);

const goToPage = (next: number) =>
  updateSearchParams({ page: next === 0 ? null : String(next + 1) });

const Pagination = ({ page, total }: { page: number; total: number }) => {
  const pageCount = Math.max(1, Math.ceil(total / SESSIONS_PAGE_SIZE));
  return (
    <nav
      aria-label="Sessions pages"
      className="mt-3 flex items-center justify-between gap-2"
    >
      <p className="text-muted-foreground text-xs tabular-nums">
        Page {page + 1} of {pageCount} · {formatInteger(total)} sessions
      </p>
      <div className="flex gap-2">
        <Button
          disabled={page === 0}
          onClick={() => goToPage(page - 1)}
          size="sm"
          variant="outline"
        >
          Previous
        </Button>
        <Button
          disabled={page + 1 >= pageCount}
          onClick={() => goToPage(page + 1)}
          size="sm"
          variant="outline"
        >
          Next
        </Button>
      </div>
    </nav>
  );
};

export const SessionsPage = () => {
  const { filters, searchParams } = useFilters();
  const page = readPage(searchParams.get("page"));
  const sessions = useSessions(filters, page);
  const athletes = useAthletes();
  const lookups = useLookups();

  return (
    <div>
      <PageHeader
        action={
          <ExportButton
            onExport={() =>
              exportFilteredWorkbook({
                athletes: athletes.data,
                filename: "quiver-sessions",
                filters,
                lookups: lookups.data,
              })
            }
          />
        }
        description="Every scored session, newest first. Open one to see its scorecard and correct arrows."
        title="Sessions"
      />
      <FilterBar
        athletes={athletes.data}
        filters={filters}
        lookups={lookups.data}
        onChange={setFilters}
        onReset={resetFilters}
      />
      {sessions.error ? (
        <p className="text-destructive text-sm" role="alert">
          {sessions.error.message}
        </p>
      ) : null}
      {sessions.isPending ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}
      {sessions.data && sessions.data.rows.length === 0 ? (
        <SessionsEmpty
          filtered={
            filters.range !== "all" ||
            isFiltered({ ...filters, range: DEFAULT_RANGE })
          }
        />
      ) : null}
      {sessions.data && sessions.data.rows.length > 0 ? (
        <div aria-busy={sessions.isFetching}>
          <SessionsTable rows={sessions.data.rows} />
          <Pagination page={page} total={sessions.data.total} />
        </div>
      ) : null}
    </div>
  );
};
