"use client";

import { useAthletes, useLookups } from "@/components/athletes/use-athletes";
import { useFilters } from "@/components/filters/use-filters";

import { ExportButton } from "./export-button";
import { exportFilteredWorkbook } from "./export-filtered";

/**
 * Exports whatever the page's filters select. It reads the filters from the
 * URL itself, so a page can place it in its static header.
 */
export const FilteredExportButton = ({ filename }: { filename: string }) => {
  const { filters } = useFilters();
  const athletes = useAthletes();
  const lookups = useLookups();
  return (
    <ExportButton
      onExport={() =>
        exportFilteredWorkbook({
          athletes: athletes.data,
          filename,
          filters,
          lookups: lookups.data,
        })
      }
    />
  );
};
