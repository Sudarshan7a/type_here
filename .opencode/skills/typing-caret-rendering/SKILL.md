---
name: typing-caret-rendering
description: How to render the typing surface (text, character states, caret, line reveal) with no per-keystroke React re-render and minimal layout work. Use when building or changing the typing text component, caret, scrolling, or character feedback.
license: MIT
compatibility: opencode
metadata:
  project: realtype
  spec: ENG-02, ENG-09, CUS-01, PRG-15
---

## Goals
Input-to-paint should feel instant. Nielsen's threshold for feeling like direct manipulation is about 0.1 s; our proposed engineering target is p95 ≤ 16 ms on a desktop reference. Nothing animated may delay a keystroke's visible result.

## Structure
- Split text into lines/words/chars once per text (memoized). Render **only the visible window** (about 3 lines) plus a small buffer.
- Each character is a `<span data-state="pending|correct|incorrect|extra|missed">`. State changes set an attribute (via ref/batched DOM write), not React state.
- One absolutely positioned **caret element**. Move it with `transform: translate3d(x, y, 0)`. Never animate `left/top/width/height`.
- Pre-measure character offsets per line after layout and on resize (`ResizeObserver`); cache them. Do **not** call `getBoundingClientRect()` inside the keystroke path.
- Batch DOM writes in one `requestAnimationFrame`; avoid interleaving reads and writes (layout thrash).

## Motion rules (see `typing-motion-tokens`)
- Character state feedback is a **color/underline change with no motion**.
- "Smooth caret" is optional (default off under reduced motion): `transition: transform 80ms var(--ease-out)`. It must never lag behind typing; if the caret is more than one character behind, snap.
- Line advance: instant, or ≤ 150 ms translate of the text container. Never block input.

## Accessibility
- Never rely on color alone: incorrect = underline or glyph style plus color; extra/missed have distinct shapes.
- The visible text is decorative to assistive tech; give the input an accessible name and instructions, and announce **results** (not keystrokes) via `aria-live="polite"` after finish.
- Respect zoom to 200% and user font-size changes; recompute caret position on resize.

## Code mode (IDE-realism)
- Monospace font with consistent advance width. Ligatures are a user setting, default off in test mode.
- Indentation guides optional. Auto-indent and auto-pair are toggles; auto-inserted chars are excluded from typed counts.
- Syntax highlighting is a toggle (train with and without). Highlighting must not change layout metrics.

## Tests
- Playwright: type a 300-char text; assert final DOM states, caret position, and no long tasks (> 50 ms) in the trace.
- Unit: offset cache invalidates on resize/font change.
- Visual: one screenshot per theme covering all character states.

## Done checklist
- [ ] No React state updates in the keystroke path
- [ ] Only `transform`/`opacity` animate
- [ ] Offsets cached; no layout reads on keystroke
- [ ] Non-color cues for all states
- [ ] Works at 200% zoom and with reduced motion
