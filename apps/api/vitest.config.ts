import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/index.ts"], // server.ts is the listen() entry point, exercised by e2e/deploy checks
      thresholds: { lines: 70, branches: 70, functions: 70, statements: 70 },
    },
  },
});
