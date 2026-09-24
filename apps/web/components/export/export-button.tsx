"use client";

import { MicrosoftExcelLogoIcon } from "@phosphor-icons/react";
import { Button } from "@workspace/ui/components/button";
import { useTransition } from "react";
import { toast } from "sonner";

const DEFAULT_LABEL = "Export to Excel";

/** Runs an export and reports how it went; one export at a time. */
export const ExportButton = ({
  disabled = false,
  label = DEFAULT_LABEL,
  onExport,
}: {
  disabled?: boolean;
  label?: string;
  onExport: () => Promise<void>;
}) => {
  const [isPending, startTransition] = useTransition();

  const run = () => {
    if (isPending) {
      return;
    }
    startTransition(async () => {
      try {
        await onExport();
        // The save dialog opens outside the page, so say that it is ready.
        toast.success("Export ready. Choose where to save it.");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not export. Try again."
        );
      }
    });
  };

  return (
    <Button disabled={disabled || isPending} onClick={run} variant="outline">
      <MicrosoftExcelLogoIcon aria-hidden="true" data-icon="inline-start" />
      {isPending ? "Exporting…" : label}
    </Button>
  );
};

/** The same button, inert, while its data loads. */
export const ExportButtonSkeleton = ({
  label = DEFAULT_LABEL,
}: {
  label?: string;
}) => (
  <Button disabled variant="outline">
    <MicrosoftExcelLogoIcon aria-hidden="true" data-icon="inline-start" />
    {label}
  </Button>
);
