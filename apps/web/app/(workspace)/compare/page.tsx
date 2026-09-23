import { Skeleton } from "@workspace/ui/components/skeleton";
import type { Metadata } from "next";
import { Suspense } from "react";

import { ComparePage } from "@/components/compare/compare-page";

export const metadata: Metadata = {
  title: "Compare",
};

const CompareSkeleton = () => (
  <div aria-busy="true" className="flex flex-col gap-6">
    <Skeleton className="h-16 w-80" />
    <Skeleton className="h-8 w-full" />
    <Skeleton className="h-96 w-full" />
  </div>
);

// The comparison lives in the query string, which a prerendered shell
// cannot read.
const Page = () => (
  <Suspense fallback={<CompareSkeleton />}>
    <ComparePage />
  </Suspense>
);

export default Page;
