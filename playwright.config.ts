import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ||
        "postgresql://evanwang@localhost:5432/bookclub_hub_test",
      // Shrink live-poll intervals (use-live-query.ts) so the live-updates
      // specs observe cross-member polling without waiting out production
      // cadences (60s -> 9s etc.). NOTE: with reuseExistingServer, a server
      // started without this var makes live-updates.spec.ts time out --
      // kill the stale server first.
      NEXT_PUBLIC_LIVE_INTERVAL_SCALE: "0.15",
    },
  },
});
