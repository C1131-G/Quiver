import { Skeleton } from "@workspace/ui/components/skeleton";
import type { Metadata } from "next";
import { Suspense } from "react";

import { PerformancePage } from "@/components/performance/performance-page";

export const metadata: Metadata = {
  title: "Performance",
};

const PerformanceSkeleton = () => (
  <div aria-busy="true" className="flex flex-col gap-6">
    <Skeleton className="h-16 w-80" />
    <Skeleton className="h-8 w-full" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-96 w-full" />
  </div>
);

// Filters live in the query string, which a prerendered shell cannot read.
const DashboardPage = () => (
  <Suspense fallback={<PerformanceSkeleton />}>
    <PerformancePage />
  </Suspense>
);

export default DashboardPage;
