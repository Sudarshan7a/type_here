import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts?(x)"],
    coverage: {
      provider: "v8",
      // The denominator is the pure logic only: the input adapter, the passage
      // data and the copy bindings. Those can be exercised honestly in node, and
      // the number means something.
      //
      // TypingSurface.tsx and App.tsx are deliberately NOT in the denominator.
      // Their behaviour is event handlers and layout, and node cannot drive
      // either: most of their lines would show 0% no matter how many tests were
      // written, which is the "theatre, not evidence" case. What they do get is
      // real coverage from two places that can actually exercise them —
      // tests/typing-surface.test.tsx server-renders the markup (accessible name,
      // live-region politeness, no interrupting chrome, char states), and
      // e2e/typing-surface.spec.ts drives a real browser through the six STEER-2
      // acceptance criteria. Counting them at 0% here would understate the suite;
      // counting them by pretending node reached them would overstate it.
      include: ["src/input-adapter.ts", "src/passages.ts", "src/copy.ts"],
      exclude: ["src/main.tsx", "src/styles.css", "src/TypingSurface.tsx", "src/App.tsx"],
      thresholds: { lines: 60, branches: 60, functions: 60, statements: 60 },
    },
  },
});
