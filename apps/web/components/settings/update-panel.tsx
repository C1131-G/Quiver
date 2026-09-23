"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";

import { useAppUpdate } from "@/lib/use-app-update";
import type { UpdateStatus } from "@/types/electron";

const STATUS_LABEL = {
  checking: "Checking for updates…",
  downloading: "Downloading update…",
  error: "Could not check for updates.",
  idle: "You're on the latest version.",
  ready: "Update downloaded — ready to install.",
} satisfies Record<UpdateStatus["state"], string>;

/**
 * Manual counterpart to the desktop app's background update check (which
 * runs on a timer and silently auto-downloads). Lets the user trigger that
 * same check on demand and see its result. Renders nothing in a browser.
 */
export const UpdatePanel = () => {
  const { available, check, install, status } = useAppUpdate();

  if (!available) {
    return null;
  }

  const busy = status.state === "checking" || status.state === "downloading";
  const message =
    status.state === "error" ? status.message : STATUS_LABEL[status.state];
  const version =
    status.state === "downloading" || status.state === "ready"
      ? status.version
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Updates</CardTitle>
        <CardDescription>
          Quiver Dashboard checks for new releases in the background. Check now
          to look immediately instead of waiting.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p
              className={cn(
                "text-sm break-words",
                status.state === "error" && "text-destructive"
              )}
              {...(status.state === "error" ? { role: "alert" } : {})}
            >
              {message}
              {version ? ` (${version})` : ""}
            </p>
            {status.state === "downloading" && status.percent !== undefined ? (
              <p className="text-muted-foreground text-sm">{status.percent}%</p>
            ) : null}
          </div>
          {status.state === "ready" ? (
            <Button className="shrink-0" onClick={() => install()}>
              Restart and install
            </Button>
          ) : (
            <Button
              className="shrink-0"
              disabled={busy}
              onClick={() => check()}
              variant="outline"
            >
              {busy ? "Checking…" : "Check for updates"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
