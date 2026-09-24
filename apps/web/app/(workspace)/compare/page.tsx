import type { Metadata } from "next";
import { Suspense } from "react";

import {
  CompareExportButton,
  ComparePage,
  ComparePageSkeleton,
} from "@/components/compare/compare-page";
import { ExportButtonSkeleton } from "@/components/export/export-button";
import { PageHeader } from "@/components/page-header";
import { SectionErrorBoundary } from "@/components/section-error-boundary";

export const metadata: Metadata = {
  title: "Compare",
};

// The title paints in the static shell; the athletes, format and filters live
// in the query string, so the body and export wait inside Suspense.
const Page = () => (
  <div>
    <PageHeader
      action={
        <Suspense fallback={<ExportButtonSkeleton />}>
          <CompareExportButton />
        </Suspense>
      }
      description="Put athletes side by side on the same round format: totals, the weekly trend and where their arrows land."
      title="Compare"
    />
    <SectionErrorBoundary title="The comparison could not be shown">
      <Suspense fallback={<ComparePageSkeleton />}>
        <ComparePage />
      </Suspense>
    </SectionErrorBoundary>
  </div>
);

export default Page;
