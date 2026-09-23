import { ChartBarIcon } from "@phosphor-icons/react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";

export const PerformanceEmpty = () => (
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <ChartBarIcon aria-hidden="true" />
      </EmptyMedia>
      <EmptyTitle>No arrows in this selection</EmptyTitle>
      <EmptyDescription>
        Widen the date range or clear a filter to see scored sessions.
      </EmptyDescription>
    </EmptyHeader>
  </Empty>
);
