---
name: typing-engine-core
description: Rules for building the typing engine (keystroke capture, timestamps, error modes, state machine, focus/visibility handling, layout-aware input). Use whenever touching packages/engine, input handlers, or the typing test lifecycle.
license: MIT
compatibility: opencode
metadata:
  project: realtype
  spec: ENG-01..ENG-13
---

## Purpose
Keep the engine correct, fast, testable, and independent of React. Spec: ENG-01…ENG-13 in `docs/spec/master-spec-v1.md`.

## Architecture rules
- The engine is a pure TypeScript package (`packages/engine`). No React, no direct DOM access in core logic. A thin DOM adapter attaches listeners.
- It is shared by client and server. The server recomputes results from the raw event log (INT-01), so the engine must run in Node with no browser globals.
- **Never `setState` per keystroke.** Engine state lives outside React (external store/refs). The UI subscribes with selectors and updates the DOM via refs/motion values.

## Input capture
- Record `keydown` and `keyup` with `event.timeStamp` or `performance.now()`. Never `Date.now()`, never `setInterval` for timing.
- Log shape: `{ t, code, key, type: "down" | "up", mods, auto?: boolean }`. Keep order; support overlapping keys (rollover).
- Use `event.code` for physical position and `event.key` for the produced character. Handle dead keys, Caps Lock, Shift.
- IME/composition: do not count composition events as normal keystrokes. Document unsupported IME cases; do not silently mis-score.
- The typing input element must set `autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false"`. Disable smart quotes/dash replacement.
- Verified sessions: ignore `event.isTrusted === false`; block paste/drop/autofill.

## Time and lifecycle
- Start on first keystroke. End on timer/word count/final char, computing elapsed time from timestamps.
- Hidden tabs throttle timers: use `visibilitychange`; pause practice tests and invalidate verified tests. Elapsed time must never be inflatable by backgrounding.
- No network calls during a test. Results queue offline.

## State machine (test lifecycle)
`idle → ready → running → (paused) → finished → submitting → submitted | failed-offline`
Also `invalid` (focus lost in verified mode, untrusted input). Every transition is a pure function `(state, event) → state` with unit tests.

## Error modes
Implement `free` (backspace allowed), `must-correct`, `stop-on-error` for MVP. `no-backspace` and `word-locked` are V1. Each mode has unit tests.

## Typed vs auto-inserted
Track auto-inserted characters (auto-indent, autopair) separately. Metrics must be computable with or without them.

## Tests (required with every change)
- Golden vectors from recorded fixtures (`packages/engine/fixtures/*.json`): same log → same metrics in Node and browser.
- Property tests: random keystroke streams → invariants (time monotonic, 0 ≤ accuracy ≤ 100, replay reproduces final text).
- Layout matrix: QWERTY (US/UK), Dvorak, Colemak, AZERTY, QWERTZ.

## Done checklist
- [ ] No React imports in `packages/engine`
- [ ] Timing uses timestamps only
- [ ] Replay of the log reproduces the final text exactly
- [ ] Hidden-tab test proves speed cannot be inflated
- [ ] Unit + property tests pass; typecheck clean
