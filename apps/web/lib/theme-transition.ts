const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

const prefersReducedMotion = () =>
  "matchMedia" in globalThis && globalThis.matchMedia(REDUCED_MOTION).matches;

const getViewTransition = () => {
  if (!("document" in globalThis)) {
    return null;
  }

  const browserDocument = globalThis.document;

  if (!("startViewTransition" in browserDocument)) {
    return null;
  }

  return browserDocument.startViewTransition.bind(browserDocument);
};

/**
 * The theme wipe is tagged so its CSS cannot leak onto route transitions, which
 * run their own animation through the same `root` pseudo-elements.
 */
const runThemeTransition = (updateTheme: () => void) => {
  const startViewTransition = getViewTransition();

  if (startViewTransition === null || prefersReducedMotion()) {
    updateTheme();
    return;
  }

  startViewTransition({ types: ["theme"], update: updateTheme });
};

export { runThemeTransition };
