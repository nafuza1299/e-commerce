import { defineConfig } from "@playwright/test";

/*
  Lives at the repo root because `npm run test:e2e` (root package.json) runs
  `playwright test` with the repo root as cwd, and Playwright looks for its
  config there by default — apps/web/e2e holds the specs, not the config.

  No API/DB mocking: like apps/api's own Vitest suite, this hits the real dev
  servers and the real seeded Postgres database rather than stubbing the system
  under test. `reuseExistingServer` means it's instant when `npm run dev` is
  already running (as it usually is during development) and self-starting
  otherwise.
*/
export default defineConfig({
  testDir: "apps/web/e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
