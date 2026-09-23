import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";
import next from "ultracite/oxlint/next";
import nextJsPlugins from "ultracite/oxlint/next/js-plugins";
import react from "ultracite/oxlint/react";
import shadcn from "ultracite/oxlint/shadcn";
import vitest from "ultracite/oxlint/vitest";

const jsPlugins = selectJsPlugins(["react-doctor"]);

export default defineConfig({
  extends: [
    core,
    react,
    next,
    vitest,
    nextJsPlugins,
    shadcn,
    antiSlop,
    jsPlugins,
  ],
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
    // Vendored shadcn primitives, kept as generated (as in AthleteHub).
    "packages/ui/src/components/**",
  ],
  jsPlugins: [...jsPlugins.jsPlugins, ...shadcn.jsPlugins],
  settings: jsPluginSettings,
});
