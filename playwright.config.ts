import { defineConfig, devices } from "@playwright/test";

const backendPort = 3100;
const frontendPort = 3173;
const backendUrl = `http://127.0.0.1:${backendPort}`;
const frontendUrl = `http://127.0.0.1:${frontendPort}`;
const databaseUrl = ".tmp/e2e/sqlite.db";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 7_500 },
  use: {
    baseURL: frontendUrl,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: [
        "rm -rf .tmp/e2e",
        "mkdir -p .tmp/e2e",
        `E2E_DB_PATH=\"$PWD/${databaseUrl}\"`,
        "cd apps/backend",
        "DATABASE_URL=\"$E2E_DB_PATH\" bun run src/db/migrate.ts",
        "DATABASE_URL=\"$E2E_DB_PATH\" bun run src/db/seed.ts",
        "cd ../..",
        `DATABASE_URL=\"$E2E_DB_PATH\" PORT=${backendPort} HOST=127.0.0.1 CORS_ORIGIN=${frontendUrl},http://localhost:${frontendPort} corepack pnpm --filter @product-repos/backend dev`,
      ].join(" && "),
      url: `${backendUrl}/health`,
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: `API_URL=${backendUrl} corepack pnpm --filter inventory exec react-router dev --host 127.0.0.1 --port ${frontendPort}`,
      url: frontendUrl,
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
});
