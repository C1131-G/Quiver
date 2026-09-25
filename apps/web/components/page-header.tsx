import type { ReactNode } from "react";
import { ViewTransition } from "react";

/** The one page heading per route, with the page's primary action. */
export const PageHeader = ({
  action,
  description,
  title,
  titleTransitionName,
}: {
  action?: ReactNode;
  description: string;
  title: string;
  /** Shares an identity with a list row's title, so opening the page
   * from that row morphs into this heading instead of a plain nav. */
  titleTransitionName?: string;
}) => (
  <header className="mb-6 flex items-end justify-between gap-4">
    <div>
      {titleTransitionName ? (
        <ViewTransition name={titleTransitionName}>
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            {title}
          </h1>
        </ViewTransition>
      ) : (
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          {title}
        </h1>
      )}
      <p className="text-muted-foreground mt-2 text-pretty">{description}</p>
    </div>
    {action ? (
      <div className="flex shrink-0 items-center gap-2">{action}</div>
    ) : null}
  </header>
);
