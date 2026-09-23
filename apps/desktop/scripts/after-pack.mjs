import { access, cp } from "node:fs/promises";
import path from "node:path";

const exists = async (target) => {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
};

/**
 * electron-builder unconditionally strips `node_modules` from `extraResources`,
 * which would ship the standalone server without its dependencies. Copy the
 * bundled modules into the packaged resources once packing is done.
 */
export default async function afterPack(context) {
  const desktopRoot = context.packager.info.projectDir;
  const resourcesDir = context.packager.getResourcesDir(context.appOutDir);

  const standaloneModules = path.join(
    desktopRoot,
    "..",
    "web",
    ".next",
    "standalone",
    "node_modules"
  );
  if (!(await exists(standaloneModules))) {
    throw new Error(
      "Missing apps/web/.next/standalone/node_modules — run `bun run dist:prepare` before packaging."
    );
  }
  await cp(
    standaloneModules,
    path.join(resourcesDir, "standalone", "node_modules"),
    { dereference: true, recursive: true }
  );
}
