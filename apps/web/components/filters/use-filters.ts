"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

import type { Filters } from "./filters";
import { DEFAULT_FILTERS, FILTER_KEYS, parseFilters } from "./filters";

/** Query-string changes; a null value removes the key. */
export type SearchParamPatch = Record<string, string | null>;

/**
 * Writes to the query string without a server round trip. Next.js keeps
 * useSearchParams in sync with the History API.
 */
export const updateSearchParams = (patch: SearchParamPatch) => {
  const next = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
  }
  const query = next.toString();
  window.history.replaceState(
    null,
    "",
    query ? `?${query}` : window.location.pathname
  );
};

/** Applies filter changes, dropping defaults and returning to page one. */
export const setFilters = (patch: Partial<Filters>) => {
  const changes = Object.fromEntries(
    FILTER_KEYS.flatMap((key) => {
      const value = patch[key];
      if (value === undefined) {
        return [];
      }
      return [[key, value === DEFAULT_FILTERS[key] ? null : value]];
    })
  );
  updateSearchParams({ ...changes, page: null });
};

export const resetFilters = () => setFilters(DEFAULT_FILTERS);

/** Dashboard and session filters, stored in the URL so drill-downs link. */
export const useFilters = () => {
  const searchParams = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  return { filters, searchParams };
};
