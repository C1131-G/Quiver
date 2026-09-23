import { access, cp, mkdir } from "node:fs/promises";
import path from "node:path";

const webRoot = path.resolve(import.meta.dirname, "..", "..", "web");
const standaloneDir = path.join(webRoot, ".next", "standalone");
// Tracing from the monorepo root nests the app under its workspace path.
const standaloneAppDir = path.join(standaloneDir, "apps", "web");

const exists = async (target) => {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
};

/**
 * `output: "standalone"` deliberately omits the static assets and public files
 * so they can be served from a CDN. Electron serves them from the same process,
 * so copy them into the bundle after every build.
 */
const prepareStandalone = async () => {
  if (!(await exists(path.join(standaloneAppDir, "server.js")))) {
    throw new Error(
      "No standalone build found. Build apps/web before preparing it."
    );
  }

  await mkdir(path.join(standaloneAppDir, ".next"), { recursive: true });
  await cp(
    path.join(webRoot, ".next", "static"),
    path.join(standaloneAppDir, ".next", "static"),
    { recursive: true }
  );

  if (await exists(path.join(webRoot, "public"))) {
    await cp(
      path.join(webRoot, "public"),
      path.join(standaloneAppDir, "public"),
      { recursive: true }
    );
  }
};

await prepareStandalone();
