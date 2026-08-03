import { defineConfig } from "@playwright/test";
import { APP_BASE_URL, FRONTEND_ORIGIN } from "./tests/e2e/calorie-tracker.fixture-data";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.acceptance.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  outputDir: "test-results/e2e",
  globalSetup: "./tests/e2e/calorie-tracker.global-setup.ts",
  reporter: [["list"]],
  use: {
    baseURL: APP_BASE_URL,
    locale: "nl-NL",
    timezoneId: "Europe/Amsterdam",
    colorScheme: "light",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: {
    command: "bun run tests/e2e/calorie-tracker.fixture.ts",
    url: `${FRONTEND_ORIGIN}/calory-tracker/login`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "mobile-chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "desktop-chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 1440, height: 1024 },
      },
    },
  ],
});
