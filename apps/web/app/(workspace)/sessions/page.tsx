import { Skeleton } from "@workspace/ui/components/skeleton";
import type { Metadata } from "next";
import { Suspense } from "react";

import { SessionsPage } from "@/components/sessions/sessions-page";

export const metadata: Metadata = {
  title: "Sessions",
};

const SessionsSkeleton = () => (
  <div aria-busy="true" className="flex flex-col gap-6">
    <Skeleton className="h-16 w-80" />
    <Skeleton className="h-8 w-full" />
    <Skeleton className="h-96 w-full" />
  </div>
);

// Filters live in the query string, which a prerendered shell cannot read.
const Page = () => (
  <Suspense fallback={<SessionsSkeleton />}>
    <SessionsPage />
  </Suspense>
);

export default Page;
