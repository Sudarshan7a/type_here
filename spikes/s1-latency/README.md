# Spike S1 — Input latency

## Question

Can a minimal typing surface (windowed text, per-character spans updated by
attribute, a transform-moved caret with cached offsets, no per-keystroke React
state) deliver keydown-to-next-paint latency with p95 within the proposed 16 ms
budget?

## Method

- `target.html` — a static, build-free page: ~90 characters of text as
  per-character `<span>`s; a caret `<div>` moved **only** via `transform` using
  offsets cached at render time (no layout reads inside the keydown handler);
  the handler flips one span's `class` and writes the caret transform.
  `performance.mark("keydown_start")` on handler entry, one
  `requestAnimationFrame` → `performance.mark("next_paint")` per key.
- `bench.spec.ts` (Playwright) — 4 passes x 88 characters = **352 synthetic
  keystrokes** at 8 ms delay; keydown→next-paint durations read from the marks
  buffer; nearest-rank p50/p95/max; long tasks (>50 ms) captured via
  `PerformanceObserver`.
- Raw per-key durations are written to `results/bench-<project>.json`.

## Result

**PASS — LAB PROXY (Chromium only).** p95 = **15.2 ms** against the proposed
16 ms budget, with zero long tasks over 352 keystrokes. Headless synthetic
keystrokes are a lab proxy: **REAL-DEVICE PENDING** (the human runs
`manual.html` on a real keyboard and browser — see `HUMAN-ACTIONS.md`).
Firefox and WebKit runs are **PENDING**: Playwright's browser downloads failed
in this environment (cdn.playwright.dev timeouts); re-enable the two projects
in `playwright.config.ts` after `playwright install firefox webkit` succeeds.

## Evidence

`results/bench-chromium.json` (regenerated on every run):

| Metric | Value |
|---|---|
| Keystrokes measured | 352 |
| p50 keydown→paint | 8.3 ms |
| **p95 keydown→paint** | **15.2 ms** (budget 16 ms) |
| max | 17.8 ms |
| Long tasks > 50 ms | 0 |

The margin is thin (15.2 of 16 ms) on a shared Windows dev machine, which is
itself a finding: see Risks.

## Risks

- **Thin margin.** p95 15.2 ms against a 16 ms budget leaves ~5% headroom on
  this hardware. Real typing involves IME/keyboard-layout work, long words, and
  a real compositor; the honest read is "plausible, needs confirmation on real
  devices", not "solved". The budget itself is a *proposal* pending calibration
  (MASTER-BUILD-CONTRACT Part 1).
- The harness measures the spike's own minimal page, not the real typing
  surface that will also run rendering, weak-spot highlighting, and
  accessibility layers. Budget it in from the start.
- Headless Chromium does not exercise the same paint/scheduling path as a
  foreground browser window on real hardware.

## Recommendation

Proceed with the attribute-update + transform-caret architecture (it met the
budget on the lab proxy) and keep the latency harness in CI as a regression
gate. Have the human run `manual.html` on a real laptop for the real-device
number before the M0 exit criterion is marked met. Do not treat 16 ms as
proven.
