---
name: cadence-design-system
description: Use for any Cadence UI work — pages, components, themes, typography, spacing, colour, layout. Enforces the Night Ink/Daylight token system, the keycap-and-ribbon design language, accessibility contrast rules and anti-generic design checks.
---

# Cadence design system

Read: `docs/spec/08-design-language.md`, `09-design-system-tokens.md`, `10-ui-components-and-layouts.md`, `04-pages-and-layouts.md` (the page you're building).

## Rules
1. **Tokens only.** No raw hex/px/ms/easing in components (lint enforces). Add tokens only by updating 09 + `tokens.css` + theme validator.
2. Fonts: Bricolage Grotesque (display), Geist (UI), JetBrains Mono (typing, ligatures off). Tabular numerals on all numbers. Body line length ≤68ch. Sentence case; no ALL-CAPS tracked labels; no single-word accent in headlines.
3. Radii hierarchy (8/10/16/24/pill), tone+hairline surfaces; shadows only for floating layers. Keycap bevel only on primary buttons and virtual keys.
4. One signal colour dominant per screen; errors are never colour-only (underline + wash).
5. Every screen has **one memorable element**; everything else quiet. Avoid: gradient washes, identical shadowed card walls, cream+terracotta, neon-on-black, `→` on every link, numbered markers on non-sequences.
6. Build dark + light together; verify in Night Ink, Daylight and one high-contrast theme. Use container queries for components.
7. Use Radix/React Aria primitives; all components keyboard-operable with visible focus (`--focus-ring`).

## Workflow
Plan (4–6 named colours from tokens, type roles, layout ASCII) → check against the differentiation self-check (08 §11) → build → screenshot dark+light at 360/768/1440 → fix → run `cadence-quality-gate`.
