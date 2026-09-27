---
description: Build, inspect bundle size against budgets, and review typing-path performance
agent: build
---
Build output and sizes:

!`pnpm build`

Compare against budgets (test page JS ≤ ~200 KB gzip; Motion via `m` + `LazyMotion`; editor and parsers lazy-loaded). List the biggest contributors and propose fixes. Then review the keystroke path for per-keystroke React updates, layout reads, and long tasks, using skills `typing-caret-rendering` and `typing-engine-core`. Do not change code until I approve the plan.
