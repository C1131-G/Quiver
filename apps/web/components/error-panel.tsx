"use client";

import { ArrowClockwiseIcon, WarningIcon } from "@phosphor-icons/react";
import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";

/** What a failed section shows: what happened and a way to try again. */
export const ErrorPanel = ({
  onRetry,
  title,
}: {
  onRetry: () => void;
  title: string;
}) => (
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <WarningIcon aria-hidden="true" />
      </EmptyMedia>
      <EmptyTitle>{title}</EmptyTitle>
      <EmptyDescription>
        Something went wrong while showing this. Your data is safe; try again,
        and if it keeps happening, restart the app.
      </EmptyDescription>
    </EmptyHeader>
    <EmptyContent>
      <Button onClick={onRetry} variant="outline">
        <ArrowClockwiseIcon aria-hidden="true" data-icon="inline-start" />
        Try again
      </Button>
    </EmptyContent>
  </Empty>
);
