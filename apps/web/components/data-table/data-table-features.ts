import type { RowData } from "@tanstack/react-table";
import {
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
} from "@tanstack/react-table";

/**
 * Sorting and pagination are the only table features the admin lists need;
 * registering them explicitly keeps unused v9 features out of the bundle.
 * Each feature is listed before its dependent row-model slot, which the v9
 * feature registry requires for clear inference and diagnostics.
 */
// oxlint-disable-next-line eslint/sort-keys -- v9 requires prerequisite features before their dependent slots
export const dataTableFeatures = tableFeatures({
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    text: sortFn_text,
  },
});

export type DataTableFeatures = typeof dataTableFeatures;

export const createDataTableColumnHelper = <TData extends RowData>() =>
  createColumnHelper<DataTableFeatures, TData>();
