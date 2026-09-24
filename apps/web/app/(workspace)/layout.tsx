import type { ReactNode } from "react";

import { QueryProvider } from "@/components/query-provider";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

const WorkspaceLayout = ({ children }: { children: ReactNode }) => (
  <QueryProvider>
    <WorkspaceShell>{children}</WorkspaceShell>
  </QueryProvider>
);

export default WorkspaceLayout;
