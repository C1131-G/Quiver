"use client";

import "@workspace/ui/globals.css";
import { ErrorPanel } from "@/components/error-panel";

/**
 * The last resort when the root layout itself fails. It replaces the whole
 * document, so it brings its own html, body and styles.
 */
const GlobalError = ({ retry }: { error: Error; retry: () => void }) => (
  <html lang="en">
    <body className="bg-background text-foreground grid min-h-dvh place-items-center font-sans antialiased">
      <title>Quiver Dashboard</title>
      <ErrorPanel onRetry={retry} title="Quiver Dashboard could not start" />
    </body>
  </html>
);

export default GlobalError;
