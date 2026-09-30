import { defineConfig, devices } from "@playwright/test";

/**
 * S1/S6 run Chromium-only in this environment: Playwright's Firefox and
 * WebKit downloads repeatedly failed (cdn.playwright.dev timeouts). When the
 * downloads succeed — `pnpm --dir spikes/s1-latency exec playwright install
 * firefox webkit` — re-enable the two commented projects below and re-run.
 * Results are labelled LAB PROXY (Chromium only) until then.
 */
export default defineConfig({
  testDir: ".",
  testMatch: ["bench.spec.ts"],
  timeout: 120000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    headless: true,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    // { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
