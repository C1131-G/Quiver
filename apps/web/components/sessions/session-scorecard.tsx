"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import { formatRoundFormat } from "@/lib/format";

import { ArrowValue } from "./arrow-value";
import type { CorrectionTarget } from "./correct-arrow-dialog";
import { scoreEnds } from "./session-score";
import type { SessionRound } from "./use-sessions";

/** One round as a paper scorecard: arrows, end total, running total. */
export const RoundScorecard = ({
  correctedArrowIds,
  onCorrect,
  round,
}: {
  correctedArrowIds: Set<string>;
  onCorrect: (target: CorrectionTarget) => void;
  round: SessionRound;
}) => {
  const face = round.target_face;
  const format = formatRoundFormat(
    round.distance?.meters ?? 0,
    face?.name ?? ""
  );
  const scoredEnds = scoreEnds(round.ends);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Round {round.round_no} · {format}
        </CardTitle>
        <CardDescription>
          {round.ends.length} of {round.planned_ends} ends shot,{" "}
          {round.arrows_per_end} arrows per end. Select an arrow to correct it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="tabular-nums">
          <Table aria-label={`Round ${round.round_no} scorecard`}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">End</TableHead>
                <TableHead>Arrows</TableHead>
                <TableHead className="w-20 text-right">End</TableHead>
                <TableHead className="w-20 text-right">10 + X</TableHead>
                <TableHead className="w-16 text-right">X</TableHead>
                <TableHead className="w-24 text-right">Running</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scoredEnds.map(({ end, points, running, tenPlusX, xCount }) => (
                <TableRow key={end.id}>
                  <TableCell>{end.end_no}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {end.arrows.map((arrow) => {
                        const corrected = correctedArrowIds.has(arrow.id);
                        return (
                          <Button
                            aria-label={`End ${end.end_no}, arrow ${arrow.arrow_no}: ${arrow.value}${corrected ? ", corrected" : ""}. Correct this arrow`}
                            className="relative"
                            key={arrow.id}
                            onClick={() =>
                              onCorrect({
                                arrow,
                                endNo: end.end_no,
                                lowestScore: face?.lowest_score ?? 1,
                                roundNo: round.round_no,
                              })
                            }
                            size="icon"
                            title={
                              corrected ? "Corrected by an admin" : undefined
                            }
                            variant="ghost"
                          >
                            <ArrowValue value={arrow.value} />
                            {corrected ? (
                              <span
                                aria-hidden="true"
                                className="bg-foreground absolute -top-0.5 -right-0.5 size-2"
                              />
                            ) : null}
                          </Button>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-medium">{points}</span>
                  </TableCell>
                  <TableCell className="text-right">{tenPlusX}</TableCell>
                  <TableCell className="text-right">{xCount}</TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold">{running}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
