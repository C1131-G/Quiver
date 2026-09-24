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
import type { KeyboardEvent } from "react";

import { ArrowValue } from "./arrow-value";
import type { Cell, GridRow } from "./score-editor";
import { cellKey } from "./score-editor";

const EmptyArrow = () => (
  <span
    aria-hidden="true"
    className="border-border size-8 border border-dashed"
  />
);

/**
 * One round as an editable grid: every planned end, every arrow slot. The
 * selected slot is outlined; changed slots carry a marker.
 */
export const EditableRound = ({
  changedKeys,
  format,
  onCellKey,
  onSelect,
  roundId,
  roundNo,
  rows,
  selected,
}: {
  changedKeys: ReadonlySet<string>;
  format: string;
  onCellKey: (event: KeyboardEvent<HTMLButtonElement>, cell: Cell) => void;
  onSelect: (cell: Cell) => void;
  roundId: string;
  roundNo: number;
  rows: GridRow[];
  selected: Cell | undefined;
}) => {
  const selectedKey = selected ? cellKey(selected) : undefined;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Round {roundNo} · {format}
        </CardTitle>
        <CardDescription>
          Select an arrow, then use the keypad or type X, M, 1 to 9, or 0 for
          10.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="tabular-nums">
          <Table aria-label={`Round ${roundNo} scores, editable`}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">End</TableHead>
                <TableHead>Arrows</TableHead>
                <TableHead className="w-16 text-right">End</TableHead>
                <TableHead className="w-16 text-right">Dist</TableHead>
                <TableHead className="w-16 text-right">Total</TableHead>
                <TableHead className="w-16 text-right">10 + X</TableHead>
                <TableHead className="w-12 text-right">X</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.endNo}>
                  <TableCell>{row.endNo}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {row.values.map((value, index) => {
                        const cell = {
                          arrowNo: index + 1,
                          endNo: row.endNo,
                          roundId,
                        };
                        const key = cellKey(cell);
                        const isSelected = key === selectedKey;
                        const changed = changedKeys.has(key);
                        return (
                          <Button
                            aria-current={isSelected ? "true" : undefined}
                            aria-label={`End ${row.endNo}, arrow ${index + 1}: ${value ?? "empty"}${changed ? ", changed" : ""}`}
                            className="relative"
                            data-cell={key}
                            key={key}
                            onClick={() => onSelect(cell)}
                            onFocus={() => onSelect(cell)}
                            onKeyDown={(event) => onCellKey(event, cell)}
                            size="icon"
                            static
                            variant={isSelected ? "outline" : "ghost"}
                          >
                            {value ? (
                              <ArrowValue value={value} />
                            ) : (
                              <EmptyArrow />
                            )}
                            {changed ? (
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
                    {row.shot > 0 ? row.endTotal : "—"}
                  </TableCell>
                  <TableCell className="text-right">{row.distance}</TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold">{row.total}</span>
                  </TableCell>
                  <TableCell className="text-right">{row.tenPlusX}</TableCell>
                  <TableCell className="text-right">{row.xCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
