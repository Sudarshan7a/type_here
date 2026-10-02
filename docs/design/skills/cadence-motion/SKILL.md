---
name: cadence-motion
description: Use when adding or editing animation in Cadence — caret, result-reveal choreography, Cadence Ribbon, virtual keyboard key presses, page/theme transitions, micro-interactions, sound-linked visuals. Enforces motion tokens, performance budgets and reduced-motion variants.
---

# Cadence motion

Source: `docs/spec/11-animation-and-motion-spec.md` (use its tables as exact specs).

## Principles
- Motion answers an action; while typing only the caret and character colour change. One orchestrated moment per screen (result reveal ≈900ms).
- Animate `transform` and `opacity` only on hot nodes; never width/height/top/left/box-shadow. `will-change` only on caret, ribbon layer, active key.
- Use duration/easing tokens (fast 90, base 160, slow 280, slower 480; out/in-out/ui-spring/caret). No magic numbers.
- Libraries: Motion for UI/layout, GSAP only on marketing/Method routes (dynamic import), View Transitions API for route/theme changes, Canvas+rAF for ribbon/heatmaps.

## Rules
1. Every animation has a `prefers-reduced-motion` variant AND respects the in-app Motion setting (Full/Reduced/Off). No flashing >3 Hz.
2. Exit animations faster than enter. Errors don't shake the text. No confetti; PB moment = line sweep + badge pop.
3. Audio + visual key feedback fire in the same `keydown` frame; never delay audio for animation.
4. Verify at 60fps with 4× CPU throttle; zero CLS; no long task >50ms during typing.

## Workflow
Implement from the spec row → add reduced-motion branch → record a Performance trace → add Playwright check for long tasks → attach short GIF/screenshots → run `cadence-quality-gate` (motion checklist 11 §14).
