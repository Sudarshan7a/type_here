import { fileURLToPath } from "node:url";

import { defineConfig } from "@playwright/test";

/**
 * The standard suite runs against the dev server and the production preview.
 * The parity suite (ENG-PARITY-01/02) runs against its own server, which
 * serves the engine's COMPILED output so the browser executes the same
 * modules Node executes.
 *
 * Chromium-only: Playwright's Firefox and WebKit downloads have failed in
 * this environment (cdn.playwright.dev timeouts). Re-enable after
 * `pnpm --dir e2e exec playwright install firefox webkit`; parity across
 * engines is the natural next step once that works.
 */
const HERE = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  testDir: ".",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://localhost:5173",
  },
  webServer: [
    {
      command: "pnpm --dir ../apps/web dev",
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "pnpm --dir ../apps/web preview",
      port: 4173,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "node parity/serve.mjs",
      port: 5176,
      cwd: HERE,
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
      testIgnore: /security-headers\.spec\.ts|parity\/parity\.spec\.ts/,
    },
    {
      name: "chromium-preview",
      use: { browserName: "chromium", baseURL: "http://localhost:4173" },
      testMatch: /security-headers\.spec\.ts/,
    },
    {
      name: "parity",
      use: { browserName: "chromium", baseURL: "http://localhost:5176" },
      testMatch: /parity\/parity\.spec\.ts/,
    },
  ],
});
