import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { SectionErrorBoundary } from "@/components/section-error-boundary";
import {
  TemplatesPage,
  TemplatesPageSkeleton,
} from "@/components/templates/templates-page";

export const metadata: Metadata = {
  title: "Schedule",
};

const ScheduleContent = async () => {
  // The "schedule a session" dialog defaults its date field to today, so
  // this can't be prerendered as a static shell — wait for a real request.
  await connection();
  return <TemplatesPage />;
};

// Nothing here is stable across requests, so the whole body — including the
// header — waits inside the boundary and shows a matching skeleton.
const Page = () => (
  <SectionErrorBoundary title="The schedule could not be shown">
    <Suspense fallback={<TemplatesPageSkeleton />}>
      <ScheduleContent />
    </Suspense>
  </SectionErrorBoundary>
);

export default Page;
