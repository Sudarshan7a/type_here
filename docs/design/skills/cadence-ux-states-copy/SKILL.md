---
name: cadence-ux-states-copy
description: Use when designing Cadence user flows, onboarding, settings UX, empty/loading/error/offline states, toasts, confirmations, and any user-facing text. Enforces the voice rules, vocabulary table and state completeness checklist.
---

# Cadence UX, states & copy

Read: `docs/spec/12-ux-flows-states-and-microcopy.md`, `03-information-architecture-and-sitemap.md`.

## Rules
1. Every data view ships **Skeleton, Empty, Error, Offline, Partial** states (12 §3). Empty states explain the area + offer the one action that fills it.
2. Errors: what happened + how to fix + keep the user's work. No "Oops", no apologies, no exclamation marks, no vague "Something went wrong".
3. Buttons: verb + object, sentence case (`Start drill`, `Save theme`). Same name through the whole flow (button "Save" → toast "Saved").
4. Use the vocabulary table (12 §8): WPM/Net WPM, Accuracy, Consistency/Rhythm, Costly pair, Coach, Level/Drill/Test, Delete.
5. Prefer undo toasts over confirm dialogs; destructive actions use typed/hold confirmation with a non-hold fallback.
6. No dark patterns: no streak-loss shaming, no forced tours, no modal on first load, no login wall before value.
7. Keyboard-first: define shortcuts, focus restoration, Esc behaviour for each new surface.
8. Include units and one-decimal percentages; reading level ≤ grade 8; never lorem ipsum.

## Workflow
List the flow steps → enumerate states → write copy using 12 §9 patterns → check keyboard + screen-reader announcements → hand to `cadence-design-system`/`cadence-motion` for visuals.
