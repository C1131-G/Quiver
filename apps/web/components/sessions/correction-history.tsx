import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import { formatDateTime } from "@/lib/format";

import { ArrowValue } from "./arrow-value";
import type { ArrowCorrection } from "./use-sessions";

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

export const CorrectionHistory = ({
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
          <Table>
            <TableCaption className="sr-only">Correction history</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">When</TableHead>
                <TableHead scope="col">Arrow</TableHead>
                <TableHead scope="col">Change</TableHead>
                <TableHead scope="col">Reason</TableHead>
                <TableHead scope="col">By</TableHead>
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
