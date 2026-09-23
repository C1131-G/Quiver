"use client";

import { MicrosoftExcelLogoIcon } from "@phosphor-icons/react";
import { Button } from "@workspace/ui/components/button";
import { useState } from "react";
import { toast } from "sonner";

/** Runs an export and reports how it went; one export at a time. */
export const ExportButton = ({
  disabled = false,
  label = "Export to Excel",
  onExport,
}: {
  disabled?: boolean;
  label?: string;
  onExport: () => Promise<void>;
}) => {
  const [pending, setPending] = useState(false);

  const run = async () => {
    setPending(true);
    try {
      await onExport();
      toast.success("Export ready. Choose where to save it.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not export. Try again."
      );
    }
    setPending(false);
  };

  return (
    <Button disabled={disabled || pending} onClick={run} variant="outline">
      <MicrosoftExcelLogoIcon aria-hidden="true" data-icon="inline-start" />
      {pending ? "Exporting…" : label}
    </Button>
  );
};
