import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Only sources are tests. Without this, `tsc` output in dist/ (which
    // contains compiled copies of the tests) is discovered a second time and
    // stale duplicates can mask a source failure (found in the Session 3
    // pre-flight check).
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**"],
      thresholds: { lines: 85, branches: 85, functions: 85, statements: 85 },
    },
  },
});
