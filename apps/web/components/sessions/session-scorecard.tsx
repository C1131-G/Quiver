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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import { formatRoundFormat } from "@/lib/format";

import { ArrowValue } from "./arrow-value";
import { highToLow } from "./score-editor";
import { scoreEnds } from "./session-score";
import type { SessionRound } from "./use-sessions";

/**
 * One round as a range scorecard: each end's arrows from highest to lowest,
 * the end score, the running score for this distance ("Dist"), the running
 * score for the session ("Total"), and the 10 + X and X counts.
 */
export const RoundScorecard = ({
  correctedArrowIds,
  round,
  totalBefore,
}: {
  correctedArrowIds: Set<string>;
  round: SessionRound;
  totalBefore: number;
}) => {
  const face = round.target_face;
  const format = formatRoundFormat(
    round.distance?.meters ?? 0,
    face?.name ?? ""
  );
  const scoredEnds = scoreEnds(round.ends);
  const last = scoredEnds.at(-1);
  const tenPlusX = scoredEnds.reduce((sum, end) => sum + end.tenPlusX, 0);
  const xCount = scoredEnds.reduce((sum, end) => sum + end.xCount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Round {round.round_no} · {format}
        </CardTitle>
        <CardDescription>
          {round.ends.length} of {round.planned_ends} ends shot,{" "}
          {round.arrows_per_end} arrows per end.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="tabular-nums">
          <Table aria-label={`Round ${round.round_no} scorecard`}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">End</TableHead>
                <TableHead>Arrow values</TableHead>
                <TableHead className="w-16 text-right">End</TableHead>
                <TableHead className="w-16 text-right">Dist</TableHead>
                <TableHead className="w-16 text-right">Total</TableHead>
                <TableHead className="w-16 text-right">10 + X</TableHead>
                <TableHead className="w-12 text-right">X</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scoredEnds.map((scored) => (
                <TableRow key={scored.end.id}>
                  <TableCell>{scored.end.end_no}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {highToLow(scored.end.arrows).map((arrow) => (
                        <span className="relative" key={arrow.id}>
                          <ArrowValue value={arrow.value} />
                          {correctedArrowIds.has(arrow.id) ? (
                            <span className="bg-foreground absolute -top-0.5 -right-0.5 size-2">
                              <span className="sr-only">(corrected)</span>
                            </span>
                          ) : null}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{scored.points}</TableCell>
                  <TableCell className="text-right">{scored.running}</TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold">
                      {totalBefore + scored.running}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {scored.tenPlusX}
                  </TableCell>
                  <TableCell className="text-right">{scored.xCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            {last ? (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3}>
                    Round {round.round_no} total
                  </TableCell>
                  <TableCell className="text-right">{last.running}</TableCell>
                  <TableCell className="text-right">
                    {totalBefore + last.running}
                  </TableCell>
                  <TableCell className="text-right">{tenPlusX}</TableCell>
                  <TableCell className="text-right">{xCount}</TableCell>
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
