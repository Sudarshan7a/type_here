import { defineConfig } from "@playwright/test";

/**
 * M0-10: Chromium-only smoke. The full matrix (Chromium, Firefox, WebKit),
 * the latency harness, and axe checks are added with the real typing surface
 * (M2, per the typing-e2e-testing skill).
 *
 * A5: the security-headers spec runs against the PREVIEW server (port 4173),
 * which serves the built app with the production headers from vercel.json.
 * Requires `pnpm build` before `pnpm e2e` (CI builds first).
 */
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
  ],
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
      testIgnore: /security-headers\.spec\.ts/,
    },
    {
      name: "chromium-preview",
      use: { browserName: "chromium", baseURL: "http://localhost:4173" },
      testMatch: /security-headers\.spec\.ts/,
    },
  ],
});
