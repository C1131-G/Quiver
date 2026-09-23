import type { Metadata } from "next";
import { Suspense } from "react";

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

// The id is only known per request, so it resolves inside Suspense and the
// rest of the page stays in the static shell.
const Page = ({ params }: PageProps<"/sessions/[sessionId]">) => (
  <Suspense fallback={<SessionDetailSkeleton />}>
    <SessionContent params={params} />
  </Suspense>
);

export default Page;
