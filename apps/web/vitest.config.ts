import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts?(x)"],
    coverage: {
      provider: "v8",
      // Unit tests run in node and cover the pure logic (input adapter,
      // passage data, header config). The React components are DOM-bound and
      // are covered by the Playwright suite in CI (e2e/manual-engine-test.spec.ts),
      // which types through a real browser and asserts real engine output —
      // a node-environment coverage number for them would be theatre, not
      // evidence, so they are excluded here rather than counted at 0%.
      include: ["src/input-adapter.ts", "src/passages.ts", "src/ResultsPanel.tsx"],
      exclude: ["src/main.tsx", "src/ManualTestApp.tsx", "src/styles.css"],
      thresholds: { lines: 60, branches: 60, functions: 60, statements: 60 },
    },
  },
});
