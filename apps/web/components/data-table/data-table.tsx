"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsDownUpIcon,
} from "@phosphor-icons/react";
import type { ColumnDef, RowData, SortingState } from "@tanstack/react-table";
import { useTable } from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import type { ReactNode } from "react";

import { IconSwap } from "@/components/icon-swap";

import type { DataTableFeatures } from "./data-table-features";
import { dataTableFeatures } from "./data-table-features";

const DEFAULT_PAGE_SIZE = 20;
const NO_SORTING: SortingState = [];

const SortGlyph = ({ direction }: { direction: false | "asc" | "desc" }) => {
  if (direction === "asc") {
    return <ArrowUpIcon aria-hidden="true" />;
  }
  if (direction === "desc") {
    return <ArrowDownIcon aria-hidden="true" />;
  }
  return <ArrowsDownUpIcon aria-hidden="true" className="opacity-40" />;
};

const SortIcon = ({ direction }: { direction: false | "asc" | "desc" }) => (
  <IconSwap iconKey={direction || "none"}>
    <SortGlyph direction={direction} />
  </IconSwap>
);

interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData, unknown>[];
  data: TData[];
  empty: ReactNode;
  getRowId: (row: TData) => string;
  initialSorting?: SortingState;
  label: string;
  pageSize?: number;
}

export const DataTable = <TData extends RowData>({
  columns,
  data,
  empty,
  getRowId,
  initialSorting = NO_SORTING,
  label,
  pageSize = DEFAULT_PAGE_SIZE,
}: DataTableProps<TData>) => {
  const table = useTable({
    columns,
    data,
    enableSortingRemoval: false,
    features: dataTableFeatures,
    getRowId,
    initialState: {
      pagination: { pageIndex: 0, pageSize },
      sorting: initialSorting,
    },
  });

  if (data.length === 0) {
    return empty;
  }

  const { pageIndex } = table.state.pagination;
  const pageCount = table.getPageCount();

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden border">
        <Table aria-label={label}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const direction = header.column.getIsSorted();
                  let ariaSort: "ascending" | "descending" | "none" = "none";
                  if (direction === "asc") {
                    ariaSort = "ascending";
                  } else if (direction === "desc") {
                    ariaSort = "descending";
                  }
                  return (
                    <TableHead
                      aria-sort={canSort ? ariaSort : undefined}
                      key={header.id}
                    >
                      {!header.isPlaceholder && canSort ? (
                        <Button
                          className="-ml-2"
                          onClick={header.column.getToggleSortingHandler()}
                          size="sm"
                          variant="ghost"
                        >
                          <table.FlexRender header={header} />
                          <SortIcon direction={direction} />
                        </Button>
                      ) : null}
                      {!header.isPlaceholder && !canSort ? (
                        <table.FlexRender header={header} />
                      ) : null}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {pageCount > 1 ? (
        <nav
          aria-label={`${label} pages`}
          className="flex items-center justify-between gap-2"
        >
          <p className="text-muted-foreground text-xs tabular-nums">
            Page {pageIndex + 1} of {pageCount} · {data.length} total
          </p>
          <div className="flex gap-2">
            <Button
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              size="sm"
              variant="outline"
            >
              Previous
            </Button>
            <Button
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              size="sm"
              variant="outline"
            >
              Next
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  );
};
