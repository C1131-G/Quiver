import { rm } from "node:fs/promises";
import path from "node:path";

const desktopRoot = path.resolve(import.meta.dirname, "..");
const webRoot = path.resolve(desktopRoot, "..", "web");

/**
 * Build outputs that must not survive between packaging runs. Stale
 * `.next/standalone` trees are the usual cause of an installer shipping a
 * renderer that no longer matches the main process.
 */
const targets = [
  path.join(webRoot, ".next"),
  path.join(desktopRoot, "release"),
];

// The targets are independent trees, so they come down together.
await Promise.all(
  targets.map(async (target) => {
    await rm(target, { force: true, recursive: true });
    process.stdout.write(`removed ${path.relative(desktopRoot, target)}\n`);
  })
);
