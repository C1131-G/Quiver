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

// Tests run on Bun's runner, imported from "bun:test", so the vitest preset's
// "import globals from vitest" rule would rewrite them to the wrong package.
// Oxlint applies an extended config's overrides after this file's, so the
// rule is switched off inside the preset itself.
const bunTests = {
  ...vitest,
  overrides: (vitest.overrides ?? []).map((override) => ({
    ...override,
    rules: {
      ...override.rules,
      "vitest/prefer-importing-vitest-globals": "off" as const,
    },
  })),
};

export default defineConfig({
  extends: [
    core,
    react,
    next,
    bunTests,
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
