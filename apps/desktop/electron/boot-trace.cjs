const { performance } = require("node:perf_hooks");

/**
 * Set QUIVER_BOOT_TRACE=1 to print milliseconds-since-process-start for each
 * startup milestone, so time-to-first-paint regressions show up early.
 */
const bootMark = (label) => {
  if (process.env.QUIVER_BOOT_TRACE === "1") {
    console.error(`[boot-trace] ${label}: ${Math.round(performance.now())}ms`);
  }
};

module.exports = { bootMark };
