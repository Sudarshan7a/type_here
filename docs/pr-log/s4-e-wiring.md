# pr-log: S4-E — engine wired into the web app (first hands-on artifact)

- **Task ID:** Session 4, Block E1/E2
- **Branch:** task/s4-e-wiring
- **Files touched:** `apps/web/src/{ManualTestApp.tsx, ResultsPanel.tsx, input-adapter.ts, passages.ts, styles.css, main.tsx}` (App.tsx removed), `apps/web/{index.html, package.json, vitest.config.ts}`, `apps/web/tests/{input-adapter.test.ts, ui.test.tsx}` (old app.test.tsx removed), `e2e/{manual-engine-test.spec.ts (new), smoke.spec.ts, playwright.config.ts}`
- **Tests added:** 5 adapter tests + 6 UI/data tests + **3 e2e tests that type through a real browser** and assert live engine output
- **Verification:** full local gates green (lint, format, typecheck, test, build, bundle 71.1 KB, e2e 7/7, license gate). Branch CI green.
- **What a human can now do (E2):** `pnpm --dir apps/web dev`, open the page, pick a prose passage, press Start, type it with a **real keyboard**, and see live metrics computed by `packages/engine` — net/raw/gross WPM, keystroke and final accuracy, KSPC, consistency, burst, mean key interval, rollover, plus the engine's model version. The "wrong keystroke" e2e proves the numbers move with real input rather than being display fixtures.
- **Default decisions relied on:**
  - Per-keystroke path touches the DOM through refs only; React state changes on start/finish (AGENTS.md rule 2). The caret moves by transform from cached offsets.
  - Web unit coverage now measures the pure logic (adapter, passages, ResultsPanel) and excludes the DOM-bound components, which are covered by Playwright instead — a node coverage number for DOM components would be theatre. The 60% gate is still enforced on what it measures.
  - `textHash` in this surface uses the same offline FNV-1a placeholder the recorder uses; real sha-256 arrives with the content pipeline.
  - Developer banner: this is a test surface, not the product flow; nothing is saved or sent.
- **Deferred (per E3, deliberately):** accounts, server submission, the weakness model, drills, and the full content pipeline. D04 (word-locked mode) is not representable in the current TypingSettings contract (errorMode has three values, none is word-lock) — logged as a contract gap, not silently invented.
