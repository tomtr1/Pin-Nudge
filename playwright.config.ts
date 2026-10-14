import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a production build (`next start`) in local
 * demo mode, so they need no external services. Build first:
 *   npm run build && npm run test:e2e
 */
const PORT = Number(process.env.E2E_PORT ?? 3200);
const dataDir = `.data/e2e-${process.env.E2E_RUN_ID ?? Date.now()}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1, // tests share the single local demo account
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    acceptDownloads: true,
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      PINNUDGE_DATA_MODE: "local",
      PINNUDGE_ALLOW_LOCAL_MODE_IN_PRODUCTION: "true",
      PINNUDGE_INSECURE_LOCAL_COOKIE: "true",
      PINNUDGE_LOCAL_DATA_DIR: dataDir,
      AI_PROVIDER: "demo",
      STRIPE_SECRET_KEY: "",
    },
  },
});
