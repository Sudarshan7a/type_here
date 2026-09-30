import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts?(x)"],
    coverage: {
      provider: "v8",
      include: ["src/**"],
      // main.tsx is the DOM entry point; exercised by e2e, not unit tests.
      exclude: ["src/main.tsx"],
      thresholds: { lines: 60, branches: 60, functions: 60, statements: 60 },
    },
  },
});
