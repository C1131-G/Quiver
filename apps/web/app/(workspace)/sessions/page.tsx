import type { Metadata } from "next";
import { Suspense } from "react";

import { ExportButtonSkeleton } from "@/components/export/export-button";
import { FilteredExportButton } from "@/components/export/filtered-export-button";
import { PageHeader } from "@/components/page-header";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import {
  SessionsPage,
  SessionsPageSkeleton,
} from "@/components/sessions/sessions-page";

export const metadata: Metadata = {
  title: "Sessions",
};

// The title paints in the static shell; filters live in the query string,
// which only resolves per request, so the body and export wait inside Suspense.
const Page = () => (
  <div>
    <PageHeader
      action={
        <SectionErrorBoundary title="Export could not be shown">
          <Suspense fallback={<ExportButtonSkeleton />}>
            <FilteredExportButton filename="quiver-sessions" />
          </Suspense>
        </SectionErrorBoundary>
      }
      description="Every scored session, newest first. Open one to see its scorecard and correct arrows."
      title="Sessions"
    />
    <SectionErrorBoundary title="Sessions could not be shown">
      <Suspense fallback={<SessionsPageSkeleton />}>
        <SessionsPage />
      </Suspense>
    </SectionErrorBoundary>
  </div>
);

export default Page;
