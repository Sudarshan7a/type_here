import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Session 5 found a real flake: `pnpm test` runs seven vitest instances at
    // once, and on a loaded machine the api package's startup (transform +
    // v8 coverage instrumentation + buildApp) exceeded vitest's 5s DEFAULT
    // testTimeout, failing both api test files at ~6.6s. The same tests pass 4/4
    // in isolation, and buildApp() measures 283ms cold, so this was the harness
    // limit rather than the code.
    //
    // This raises the harness ceiling only. It does not weaken any assertion,
    // and it does not touch NFR-04 (result-submit p95 <= 500ms), which is a
    // request-latency requirement measured in Phase 4, not a startup budget.
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      include: ["src/index.ts"], // server.ts is the listen() entry point, exercised by e2e/deploy checks
      thresholds: { lines: 70, branches: 70, functions: 70, statements: 70 },
    },
  },
});
