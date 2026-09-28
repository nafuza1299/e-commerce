import { configDefaults, defineConfig } from "vitest/config";

// apps/web/e2e holds Playwright specs (see playwright.config.ts), not Vitest
// ones — both tools default to picking up *.spec.ts, so without this exclude
// vitest tries to run Playwright's `test()` as its own and fails on the import.
export default defineConfig({
  test: { exclude: [...configDefaults.exclude, "apps/web/e2e/**"] },
});
