import { defineConfig, devices } from "@playwright/test";

/**
 * Chromium-only in this environment: Playwright's Firefox and WebKit
 * downloads failed earlier (cdn.playwright.dev timeouts). Re-enable after
 * `pnpm --dir spikes/s4-tokenizer exec playwright install firefox webkit`.
 */
export default defineConfig({
  testDir: ".",
  testMatch: ["*.spec.ts"],
  timeout: 120_000,
  workers: 1,
  reporter: [["list"]],
  use: { headless: true },
  webServer: {
    command: "node server.mjs",
    port: 5175,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    // { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
