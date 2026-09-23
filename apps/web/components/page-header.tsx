import type { ReactNode } from "react";

/** The one page heading per route, with the page's primary action. */
export const PageHeader = ({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description: string;
  title: string;
}) => (
  <header className="mb-6 flex items-end justify-between gap-4">
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-balance">
        {title}
      </h1>
      <p className="text-muted-foreground mt-2 text-pretty">{description}</p>
    </div>
    {action ? (
      <div className="flex shrink-0 items-center gap-2">{action}</div>
    ) : null}
  </header>
);
