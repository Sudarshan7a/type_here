---
name: typing-design-tokens
description: Design tokens, theming rules, typography, component inventory, and state conventions for the typing app UI. Use when creating or restyling any component, adding a theme, or choosing colors, spacing, or type.
license: MIT
compatibility: opencode
metadata:
  project: realtype
  spec: CUS-01, CUS-02, A11Y-01
---

## Principles
- Type first: minimal chrome, calm surfaces, the text is the hero. Chrome fades while typing (focus mode).
- Tokens over hard-coded values. No raw hex/px in components; use CSS variables (Tailwind maps to them).
- Themes are data: `data-theme="dark|light|<preset>"` swaps variables only.

## Token set (CSS variables)
- Surface: `--bg`, `--surface`, `--surface-2`, `--border`
- Text: `--text`, `--text-dim`, `--text-faint`
- Accent: `--accent`, `--accent-contrast`
- Typing states: `--char-pending`, `--char-correct`, `--char-incorrect`, `--char-extra`, `--char-missed`, `--caret`
- Feedback: `--success`, `--warning`, `--danger`, `--info`
- Shape/space: `--radius-sm|md|lg`, spacing scale 4/8/12/16/24/32/48/64, `--focus-ring` (2 px, offset 2 px)
- Type: `--font-typing` (monospace stack, user-selectable), `--font-ui` (system UI stack), scale 12/14/16/20/24/32/48

## Contrast and states (accessibility)
- Text contrast ≥ 4.5:1 (large text and UI components ≥ 3:1) in **every** theme. Verify each preset; do not assume.
- Never color-only: `incorrect` adds underline/strike; `extra` uses a distinct style; `missed` uses outline.
- Interactive targets ≥ 24×24 CSS px; visible focus ring on all interactive elements; focus never obscured by sticky UI.
- Heatmaps use a color-blind-safe scale and always have a table alternative.

## Themes (MVP)
Light, Dark, plus 2–3 presets. Default follows `prefers-color-scheme`. Persist the choice locally first. A theme builder is V1.

## Component inventory (build in this order)
1. `TypingSurface` (text, caret, char states) — see `typing-caret-rendering`
2. `ModeBar` (time/words/quote/custom, content type), `StatsLive` (optional)
3. `ResultsHeader`, `SpeedGraph`, `WeakSpotsCard`, `PracticeButton`
4. `KeyboardHeatmap` (SVG), `BigramTable`, `TokenClassPanel`
5. `LevelMap` (tiers, nodes, stars, boss), `LevelDrill`
6. `Dashboard` cards (Today plan, Trend, Goal/ETA, Streak)
7. Primitives: Button, IconButton, Tabs, Toggle, Select, Tooltip, Toast, Skeleton, EmptyState, Dialog (never during typing)

Every component defines these states: default, hover, focus-visible, active, disabled, loading, empty, error.

## UX writing
- Plain, calm, adult tone. No hype, no guilt ("You missed your streak!" is banned).
- Never promise speed gains, better programming ability, or hireability. Say "diagnose", "practice", "progress".
- Error copy says what happened and what to do next.

## Done checklist
- [ ] Only tokens used (grep for hex/px literals)
- [ ] Contrast verified in all themes
- [ ] All states implemented, including empty/error/loading
- [ ] Non-color cues present
