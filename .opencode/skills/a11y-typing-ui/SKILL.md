---
name: a11y-typing-ui
description: Accessibility rules specific to a typing trainer (focus handling, screen-reader announcements, no-timer practice, non-color cues, reduced motion, keyboard-only navigation, heatmap alternatives). Use when building or reviewing any page, component, or flow.
license: MIT
compatibility: opencode
metadata:
  project: realtype
  spec: A11Y-01..A11Y-06, CUS-03
---

## Targets
- WCAG 2.2 AA for all non-test UI. Typing surface: adequate contrast, text scalable to 200%, no reliance on color alone.
- Motion: follow `typing-motion-tokens` (2.2.2 required; 2.3.3 goal).

## Typing surface
- Use a real focusable input (textarea or visually hidden input) as the key sink; the visible text is decorative to assistive tech.
- Give the input an accessible name and short instructions ("Type the text shown. Press Tab to restart.").
- **Never** announce per-keystroke changes. Announce results once at finish via `aria-live="polite"` (e.g., "Finished. 62 words per minute, 96 percent accuracy.").
- Provide a **no-timer practice** mode and adjustable targets; slow input is never penalized in practice mode.
- Support sticky keys and single-handed use; do not require chords in core flows.
- Focus: predictable initial focus (typing surface on `/`), visible focus ring everywhere, never trapped; Esc leaves the typing surface.

## Keyboard-only
- Every action reachable by keyboard: restart (Tab), menu (Esc), mode switch, results actions. Document shortcuts on `/help`.
- Shortcuts must not conflict with typing; only active when the typing surface is not focused or with modifiers.

## Color and shape
- Incorrect/extra/missed use distinct non-color cues (underline, strike, outline).
- Charts and heatmaps: color-blind-safe palettes + a data-table alternative + text summary of top insights.

## Targets and layout
- Interactive targets ≥ 24×24 CSS px (WCAG 2.2). Layout works at 200% zoom and 320 px width without horizontal scrolling (except code/data regions).
- Dyslexia-friendly font option, adjustable spacing, high-contrast theme.

## Forms and messages
- Labels for every input; error text associated via `aria-describedby`; do not rely on placeholder as label.
- Toasts use `role="status"`; blocking errors use `role="alert"`. Never show modals during typing.

## Verify
1. Automated: axe-core (Playwright) on every page in every theme.
2. Manual: keyboard-only pass; screen reader pass (NVDA/VoiceOver) on `/`, results, level map.
3. Emulate reduced motion and forced colors.
4. Zoom 200% and text-spacing override.

## Done checklist
- [ ] axe clean (or documented exceptions)
- [ ] Keyboard-only flow works end to end
- [ ] No per-keystroke announcements
- [ ] No-timer mode present
- [ ] Non-color cues and table alternatives present
