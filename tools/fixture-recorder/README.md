# RealType fixture recorder (tools/fixture-recorder)

A dev tool for recording REAL typing fixtures on real keyboards. Never shipped
to production, never imported by apps/ or packages/, excluded from coverage
gates and the production build. The engine's realistic-timing tests need these
recordings — synthetic events cannot reproduce human timing, OS key repeat,
or real rollover.

## The 10-minute procedure

1. `pnpm install` (once per clone), then: `pnpm --dir tools/fixture-recorder dev`
2. Open the printed URL (default http://localhost:5174).
3. Pick the scenario (R01-R11), pick your keyboard layout, and type a short
   keyboard-model note (e.g. "laptop", "65% external").
4. Click **Start capture**, then click into the capture box and type the
   prompted text exactly, following the scenario's instruction.
5. Click **Export JSON** — you get `fixture-<scenario>-<layout>-<yyyymmdd>.json`
   saved locally. Nothing is uploaded anywhere (the page CSP forbids
   connections outright).
6. Repeat for every scenario, then for every other keyboard/layout you have
   (~15 min per layout).
7. Put the exported files in the repo (they are checked in as test fixtures).

## Warnings

- **Type only the prompted text.** Never type passwords, names, addresses, or
  any personal content. The file records every keystroke with millisecond
  timing.
- A red "WebSocket connection failed" console error from the dev server is the
  Vite HMR socket being blocked by the page CSP — that is expected; the
  recorder itself makes zero requests.
- R11 (accented characters) applies only if your layout has dead keys.

## Intake rule (important)

Expected metric values for recorded logs are computed **by a human, by hand or
in a spreadsheet — never by the engine**. The engine's correctness is judged
against these fixtures; deriving the expectations from the engine itself would
be circular and would silently pass any bug. See the Chapter 4 arithmetic
protocol in the Session 2 execution prompt (Section 4).
