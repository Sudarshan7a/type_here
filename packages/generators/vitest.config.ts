import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Only sources are tests: `tsc` output in dist/ holds a second compiled copy of
    // every test file, and discovering those would let a stale build mask a
    // source failure.
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**"],
      // Same gate as engine/schemas (AGENTS.md "coverage gates"). This package is
      // pure functions, so anything below this is an untested branch.
      thresholds: { lines: 85, branches: 85, functions: 85, statements: 85 },
    },
  },
});
