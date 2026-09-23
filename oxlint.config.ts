import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import next from "ultracite/oxlint/next";
import vitest from "ultracite/oxlint/vitest";
import nextJsPlugins from "ultracite/oxlint/next/js-plugins";
import shadcn from "ultracite/oxlint/shadcn";
import antiSlop from "ultracite/oxlint/anti-slop";
import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";

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
  ignorePatterns: core.ignorePatterns,
  jsPlugins: [...jsPlugins.jsPlugins, ...shadcn.jsPlugins],
  settings: jsPluginSettings,
});
