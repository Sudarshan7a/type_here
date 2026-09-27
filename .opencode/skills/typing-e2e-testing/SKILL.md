---
name: typing-e2e-testing
description: How to test the typing app end to end (Playwright with synthetic keystrokes, deterministic seeds, latency harness, accessibility checks, reduced-motion and theme matrices, real-keyboard manual matrix). Use when writing or fixing e2e, visual, performance, or accessibility tests.
license: MIT
compatibility: opencode
metadata:
  project: realtype
  spec: NFR-01, NFR-12
---

## Test layers
1. **Unit/property (engine):** golden vectors + invariants (see `typing-engine-core`, `typing-metrics-spec`).
2. **Component:** character states, caret movement, results rendering.
3. **E2E (Playwright):** full flows: first visit → test → results → weak spots → drill → retest; programmer path; export/delete; offline behavior.
4. **Non-functional:** latency harness, bundle budgets, axe, visual regression, reduced motion.

## Deterministic tests
- Seed content: tests load a fixed text via a seed/query param or test fixture endpoint. Never depend on random content.
- Use `page.keyboard.type(text, { delay })` and `page.keyboard.press`. For timing-sensitive assertions, control time (Playwright's clock API where the app allows) rather than sleeping.
- Add `data-testid` on the typing surface, caret, results headline, weak-spots card, practice button.
- Assert on outcomes (final DOM states, metrics within tolerance), not on pixel-perfect timing.

## Latency harness (target p95 ≤ 16 ms; proposed)
- Instrument with `performance.mark` around keydown handling and the next `requestAnimationFrame`.
- Run 300+ keystrokes across Chromium/Firefox/WebKit; report p50/p95; **fail CI if p95 exceeds the budget on the reference runner** (allow a documented margin for CI variance).
- Also capture long tasks (> 50 ms) from the trace.

## Matrices
- Browsers: Chromium, Firefox, WebKit (Playwright); manual on real Windows/macOS/Linux keyboards for layouts (QWERTY US/UK, Dvorak, Colemak, AZERTY, QWERTZ) because synthetic events do not exercise real hardware/IME behavior.
- Themes: light/dark + presets. Reduced motion: emulate `prefers-reduced-motion: reduce`. Forced colors on key pages.
- Viewports: 320, 768, 1280+ and 200% zoom.

## Accessibility in e2e
- Run axe on each page/theme; fail on serious/critical violations.
- Keyboard-only flow test (no mouse) for the core loop.

## Privacy and integrity tests
- Assert analytics payloads contain no typed text or logs.
- Forged/replayed submissions are rejected.

## Flake policy
Quarantine within 24 h, fix root cause within a week. Never "fix" with arbitrary sleeps.

## Done checklist
- [ ] Deterministic seeds/fixtures
- [ ] Core loop e2e green on 3 browsers
- [ ] Latency and bundle budgets enforced in CI
- [ ] axe + reduced-motion checks included
