---
name: cadence-typing-engine
description: Use when building or changing Cadence's typing engine — input capture, text model, WPM/accuracy/consistency maths, keyboard layouts, caret/render performance, replay, event logs, or leaderboard anti-cheat. Enforces framework-agnostic deterministic design and sub-16ms key-to-paint.
---

# Cadence typing engine

Source of truth: `docs/spec/06-typing-engine-spec.md` (read it fully before coding). Related: 05 (F-TEST, F-RES), 14 §6.

## Hard rules
1. Engine lives in `packages/engine`; **no React/DOM imports**. DOM events are normalised by a thin adapter.
2. Never trigger a React state update per keystroke. Renderer reads engine state in `requestAnimationFrame` and writes class names/transforms directly (or draws to canvas).
3. Capture with a hidden, always-focused input; use `keydown/keyup` for timing and `beforeinput` for intent. Use `performance.now()`.
4. **`event.code` → finger/transition analysis; `event.key` → character correctness.** Ignore `repeat` for scoring (log it).
5. Block paste/drop/autocorrect/autocomplete/spellcheck. Handle IME via composition events; flag mobile.
6. Case-sensitive by default. NFC-normalise; use `Intl.Segmenter` for grapheme units.
7. Net WPM = (correct-in-final-text chars / 5) / minutes. Accuracy counts every wrong keystroke even if corrected. Version formulas via `metricsVersion`.
8. Everything must be reproducible from `{seed, textHash, events}` — replay must reproduce the final state exactly.
9. Auto-pair is OFF by default in code modes (flag results `ide-like` if on).

## Workflow
1. Write failing unit tests (golden vectors for metrics, backspace/extra/skip cases, layout mapping, transition classifier, PRNG determinism).
2. Implement the smallest engine change. Add property tests (fast-check): no NaN/negative WPM, accuracy ∈ [0,1].
3. Perf: Playwright trace at 15 keys/s for 120s — no long task >50ms; key→paint p95 <16ms.
4. Update docs/spec if behaviour changes (CHANGELOG-SPEC.md).

## Pitfalls to avoid
- Measuring DOM per keystroke (use cached glyph rects). - Using `key` for physical analysis. - Treating Caps Lock/dead keys as errors without a banner. - Live WPM updating faster than ~10 Hz. - Storing raw events uncompressed (delta + varint + gzip).
