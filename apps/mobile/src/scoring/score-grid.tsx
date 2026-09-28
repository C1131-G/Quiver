import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import type { EndRow } from "@workspace/shared/scorecard";
import { ChevronRight } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { withUniwind } from "uniwind";

import { Sheet } from "@/components/sheet";
import { Text, TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";

import { endWindow } from "./end-window";
import { zoneOf } from "./zones";

const ChevronIcon = withUniwind(ChevronRight);

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, EndRow>();

const ArrowCell = ({ value }: { value: string | null }) => {
  if (value === null) {
    return (
      <View className="border-border aspect-square w-full max-w-9 border border-dashed" />
    );
  }
  const zone = zoneOf(value);
  return (
    <View
      className={cn(
        "aspect-square w-full max-w-9 items-center justify-center",
        zone.background,
        zone.edge
      )}
    >
      <TextClassContext value={zone.text}>
        <Text variant="cell">{value}</Text>
      </TextClassContext>
    </View>
  );
};

const CountCell = ({ row, value }: { row: EndRow; value: number }) =>
  row.shot > 0 ? <Text variant="muted">{value}</Text> : null;

const TotalCell = ({ row, value }: { row: EndRow; value: number }) =>
  row.shot > 0 ? <Text variant="cell">{value}</Text> : null;

/** Header and body cells share a width per column, so they line up. */
const widthOf = (columnId: string) => {
  if (columnId === "endNo") {
    return "w-6";
  }
  if (columnId.startsWith("arrow-")) {
    return "flex-1 items-center";
  }
  if (columnId === "tenPlusXCount") {
    return "w-7 items-center";
  }
  if (columnId === "xCount") {
    return "w-5 items-center";
  }
  if (columnId === "endTotal") {
    return "w-8 items-end";
  }
  return "w-10 items-end";
};

/** End, one column per arrow, the end's golds, then end and running totals. */
const columnsFor = (arrowsPerEnd: number) =>
  helper.columns([
    helper.accessor("endNo", {
      cell: ({ getValue }) => <Text variant="muted">{getValue()}</Text>,
      header: "End",
    }),
    ...Array.from({ length: arrowsPerEnd }, (_arrow, index) =>
      helper.display({
        cell: ({ row }) => (
          <ArrowCell value={row.original.values[index] ?? null} />
        ),
        header: String(index + 1),
        id: `arrow-${index + 1}`,
      })
    ),
    helper.accessor("tenPlusXCount", {
      cell: ({ getValue, row }) => (
        <CountCell row={row.original} value={getValue()} />
      ),
      header: "10+X",
    }),
    helper.accessor("xCount", {
      cell: ({ getValue, row }) => (
        <CountCell row={row.original} value={getValue()} />
      ),
      header: "X",
    }),
    helper.accessor("endTotal", {
      cell: ({ getValue, row }) => (
        <TotalCell row={row.original} value={getValue()} />
      ),
      header: "End",
    }),
    helper.accessor("roundTotal", {
      cell: ({ getValue, row }) => (
        <TotalCell row={row.original} value={getValue()} />
      ),
      header: "Total",
    }),
  ]);

/** One line standing in for ends not on screen; opens the full scorecard. */
const HiddenEnds = ({
  onPress,
  rows,
}: {
  onPress: () => void;
  rows: readonly EndRow[];
}) => {
  const [first] = rows;
  const last = rows.at(-1);
  if (!first || !last) {
    return null;
  }
  const shotRows = rows.filter((row) => row.shot > 0);
  let golds = 0;
  for (const row of shotRows) {
    golds += row.tenPlusXCount;
  }
  const range =
    first.endNo === last.endNo
      ? `End ${first.endNo}`
      : `Ends ${first.endNo}–${last.endNo}`;
  const summary =
    shotRows.length === 0
      ? "to shoot"
      : `${shotRows.reduce((sum, row) => sum + row.endTotal, 0)} pts · ${golds}× 10+X`;
  return (
    <Pressable
      aria-label={`${range}, ${summary}. Show all ends`}
      className="border-border active:bg-muted flex-row items-center justify-between border-b px-2 py-2"
      onPress={onPress}
      role="button"
    >
      <Text variant="small">{range}</Text>
      <View className="flex-row items-center gap-1">
        <Text variant="muted">{summary}</Text>
        <ChevronIcon colorClassName="accent-muted-foreground" size={16} />
      </View>
    </Pressable>
  );
};

const useScoreTable = (arrowsPerEnd: number, rows: EndRow[]) => {
  const columns = useMemo(() => columnsFor(arrowsPerEnd), [arrowsPerEnd]);
  return useTable({ columns, data: rows, features });
};

type ScoreTable = ReturnType<typeof useScoreTable>;

const HeaderRow = ({ table }: { table: ScoreTable }) =>
  table.getHeaderGroups().map((group) => (
    <View
      className="border-border bg-muted flex-row items-center gap-0.5 border-b px-2 py-1"
      key={group.id}
      role="row"
    >
      {group.headers.map((header) => (
        <View
          className={widthOf(header.column.id)}
          key={header.id}
          role="columnheader"
        >
          <Text variant="stat">
            <table.FlexRender header={header} />
          </Text>
        </View>
      ))}
    </View>
  ));

const BodyRows = ({
  onSelectEnd,
  rows,
  table,
  targetEndNo,
}: {
  onSelectEnd: (endNo: number) => void;
  rows: ReturnType<ScoreTable["getRowModel"]>["rows"];
  table: ScoreTable;
  targetEndNo: number | null;
}) =>
  rows.map((row) => {
    const { endNo } = row.original;
    const isTarget = endNo === targetEndNo;
    return (
      <Pressable
        aria-label={`End ${endNo}`}
        aria-selected={isTarget}
        className={cn(
          "border-border flex-row items-center gap-0.5 border-b px-2 py-1",
          isTarget ? "bg-primary/10" : "active:bg-muted"
        )}
        key={row.id}
        onPress={() => onSelectEnd(endNo)}
        role="row"
      >
        {row.getAllCells().map((cell) => (
          <View className={widthOf(cell.column.id)} key={cell.id} role="cell">
            <table.FlexRender cell={cell} />
          </View>
        ))}
      </Pressable>
    );
  });

/**
 * The round's scorecard, windowed so it never scrolls: the ends around the
 * one being scored, with a summary line for the rest. Tapping an end points
 * the keypad at it; the summary opens every end in a sheet.
 */
export const ScoreGrid = ({
  arrowsPerEnd,
  onSelectEnd,
  rows,
  targetEndNo,
  windowSize,
}: {
  arrowsPerEnd: number;
  onSelectEnd: (endNo: number) => void;
  rows: EndRow[];
  targetEndNo: number | null;
  windowSize: number;
}) => {
  const table = useScoreTable(arrowsPerEnd, rows);
  const [allOpen, setAllOpen] = useState(false);
  const { end, start } = endWindow(rows, targetEndNo, windowSize);
  const allRows = table.getRowModel().rows;
  const openAll = () => setAllOpen(true);

  return (
    <View
      aria-label="Scorecard"
      className="border-foreground/10 bg-card border"
      role="table"
    >
      <HeaderRow table={table} />
      {start > 0 ? (
        <HiddenEnds onPress={openAll} rows={rows.slice(0, start)} />
      ) : null}
      <BodyRows
        onSelectEnd={onSelectEnd}
        rows={allRows.slice(start, end)}
        table={table}
        targetEndNo={targetEndNo}
      />
      {end < rows.length ? (
        <HiddenEnds onPress={openAll} rows={rows.slice(end)} />
      ) : null}
      <Sheet onClose={() => setAllOpen(false)} open={allOpen} title="All ends">
        <ScrollView
          contentContainerClassName="p-3"
          contentInsetAdjustmentBehavior="automatic"
        >
          <View className="border-foreground/10 bg-card border">
            <HeaderRow table={table} />
            <BodyRows
              onSelectEnd={(endNo) => {
                onSelectEnd(endNo);
                setAllOpen(false);
              }}
              rows={allRows}
              table={table}
              targetEndNo={targetEndNo}
            />
          </View>
        </ScrollView>
      </Sheet>
    </View>
  );
};
