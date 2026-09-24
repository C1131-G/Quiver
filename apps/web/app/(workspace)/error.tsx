"use client";

import { ErrorPanel } from "@/components/error-panel";

/**
 * Any page in the workspace that fails to render lands here, inside the
 * shell, so the sidebar still works and the admin can move on or retry.
 */
const WorkspaceError = ({ retry }: { error: Error; retry: () => void }) => (
  <ErrorPanel onRetry={retry} title="This page could not be shown" />
);

export default WorkspaceError;
