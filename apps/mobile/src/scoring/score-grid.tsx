import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import type { EndRow } from "@workspace/shared/scorecard";
import { useMemo } from "react";
import { Pressable, View } from "react-native";

import { Text, TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";

import { zoneOf } from "./zones";

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, EndRow>();

const ArrowCell = ({ value }: { value: string | null }) => {
  if (value === null) {
    return <View className="border-border h-9 w-9 border border-dashed" />;
  }
  const zone = zoneOf(value);
  return (
    <View
      className={cn(
        "h-9 w-9 items-center justify-center",
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

const NumberCell = ({ value }: { value: number }) => (
  <Text variant="cell">{value}</Text>
);

/** Header and body cells share a width per column, so they line up. */
const widthOf = (columnId: string) => {
  if (columnId === "endNo") {
    return "w-8";
  }
  if (columnId.startsWith("arrow-")) {
    return "w-9 items-center";
  }
  return "w-12 items-end";
};

/** Columns for a round: the end, one per arrow, then the end and running totals. */
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
    helper.accessor("endTotal", {
      cell: ({ getValue, row }) =>
        row.original.shot > 0 ? <NumberCell value={getValue()} /> : null,
      header: "End",
    }),
    helper.accessor("roundTotal", {
      cell: ({ getValue, row }) =>
        row.original.shot > 0 ? <NumberCell value={getValue()} /> : null,
      header: "Total",
    }),
  ]);

/**
 * The round's scorecard: every planned end, arrows in ring colours, with
 * running totals. Tapping an end points the keypad at it.
 */
export const ScoreGrid = ({
  arrowsPerEnd,
  onSelectEnd,
  rows,
  targetEndNo,
}: {
  arrowsPerEnd: number;
  onSelectEnd: (endNo: number) => void;
  rows: EndRow[];
  targetEndNo: number | null;
}) => {
  const columns = useMemo(() => columnsFor(arrowsPerEnd), [arrowsPerEnd]);
  const table = useTable({ columns, data: rows, features });

  return (
    <View
      aria-label="Scorecard"
      className="border-foreground/10 bg-card border"
      role="table"
    >
      {table.getHeaderGroups().map((group) => (
        <View
          className="border-border bg-muted flex-row items-center justify-between gap-1 border-b px-2 py-1"
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
      ))}
      {table.getRowModel().rows.map((row) => {
        const { endNo } = row.original;
        const isTarget = endNo === targetEndNo;
        return (
          <Pressable
            aria-label={`End ${endNo}`}
            aria-selected={isTarget}
            className={cn(
              "border-border flex-row items-center justify-between gap-1 px-2 py-1",
              row.index < rows.length - 1 && "border-b",
              isTarget ? "bg-primary/10" : "active:bg-muted"
            )}
            key={row.id}
            onPress={() => onSelectEnd(endNo)}
            role="row"
          >
            {row.getAllCells().map((cell) => (
              <View
                className={widthOf(cell.column.id)}
                key={cell.id}
                role="cell"
              >
                <table.FlexRender cell={cell} />
              </View>
            ))}
          </Pressable>
        );
      })}
    </View>
  );
};
