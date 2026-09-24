import { defineConfig } from "@playwright/test";
import type { PlaywrightTestConfig } from "@playwright/test";

const PORT = 3210;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const config: PlaywrightTestConfig = {
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/u },
    {
      dependencies: ["setup"],
      name: "chromium",
      use: { storageState: "e2e/.auth/admin.json" },
    },
  ],
  reporter: "list",
  retries: process.env.CI ? 2 : 0,
  testDir: "./e2e",
  // `.e2e.ts` (not `.spec.ts`) so `bun test` keeps ignoring these files.
  testMatch: /.*\.e2e\.ts/u,
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    viewport: { height: 800, width: 1280 },
  },
  webServer: {
    command: "bun run preview:e2e",
    env: {
      EXPOSE_TESTING_API: "1",
      HOSTNAME: "127.0.0.1",
      PORT: "3210",
    },
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
};

if (process.env.CI) {
  config.workers = 1;
}

/**
 * Instant-navigation rig for the Quiver dashboard. The web server builds and
 * serves a production Next.js build with the testing API exposed, so the
 * locked `instant()` specs below run against prefetched App Shells rather
 * than dev-mode behavior. See instant-nav.rig.md for the full loop.
 */
export default defineConfig(config);
