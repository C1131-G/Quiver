import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/workspace/workspace-shell";

const WorkspaceLayout = ({ children }: { children: ReactNode }) => (
  <WorkspaceShell>{children}</WorkspaceShell>
);

export default WorkspaceLayout;
