import type { Metadata } from "next";
import { Suspense } from "react";

import { ExportButtonSkeleton } from "@/components/export/export-button";
import { FilteredExportButton } from "@/components/export/filtered-export-button";
import { PageHeader } from "@/components/page-header";
import {
  PerformancePage,
  PerformancePageSkeleton,
} from "@/components/performance/performance-page";
import { SectionErrorBoundary } from "@/components/section-error-boundary";

export const metadata: Metadata = {
  title: "Performance",
};

// The title paints in the static shell; filters live in the query string,
// which only resolves per request, so the body and export wait inside Suspense.
const Page = () => (
  <div>
    <PageHeader
      action={
        <SectionErrorBoundary title="Export could not be shown">
          <Suspense fallback={<ExportButtonSkeleton />}>
            <FilteredExportButton filename="quiver-performance" />
          </Suspense>
        </SectionErrorBoundary>
      }
      description="Scores per athlete and round format. Select a name or a week to see its sessions."
      title="Performance"
    />
    <SectionErrorBoundary title="Performance could not be shown">
      <Suspense fallback={<PerformancePageSkeleton />}>
        <PerformancePage />
      </Suspense>
    </SectionErrorBoundary>
  </div>
);

export default Page;
