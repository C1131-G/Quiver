import type { Metadata } from "next";
import { Suspense } from "react";

import { SectionErrorBoundary } from "@/components/section-error-boundary";
import {
  SessionDetail,
  SessionDetailSkeleton,
} from "@/components/sessions/session-detail";

export const metadata: Metadata = {
  title: "Session",
};

type Params = PageProps<"/sessions/[sessionId]">["params"];

const SessionContent = async ({ params }: { params: Params }) => {
  const { sessionId } = await params;
  return <SessionDetail sessionId={sessionId} />;
};

// The heading is the athlete's name, which is data, so the whole detail waits
// inside the boundary; the id only resolves per request.
const Page = ({ params }: PageProps<"/sessions/[sessionId]">) => (
  <SectionErrorBoundary title="This session could not be shown">
    <Suspense fallback={<SessionDetailSkeleton />}>
      <SessionContent params={params} />
    </Suspense>
  </SectionErrorBoundary>
);

export default Page;
