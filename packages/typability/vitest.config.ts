import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Sources only, for the same reason as every other package: `tsc` output in
    // dist/ holds a second compiled copy of every test file.
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // `src/**` EXCEPT the barrel. `src/index.ts` is 60 lines of re-exports and
      // no logic; instrumenting it reports 0% and would push the package total
      // below the gate for a file that cannot contain an untested branch. Every
      // module it re-exports is measured on its own.
      include: ["src/**"],
      exclude: ["src/index.ts"],
      // Same gate as engine/schemas/generators (AGENTS.md "coverage gates"). This
      // package is pure functions with no I/O, so anything below this is an
      // untested branch in a model that decides what a user is shown.
      thresholds: { lines: 85, branches: 85, functions: 85, statements: 85 },
    },
  },
});
