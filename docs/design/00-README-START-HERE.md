# Cadence — Typing Platform Spec Pack (START HERE)

> "Cadence" is a **working codename**. Rename freely; every file refers to it as `Cadence`.
> Audience: an AI coding agent (OpenCode) and the human (Sudarshan) steering it.
> Goal: a typing platform that is **harder, more honest and more useful for real-world + programmer typing** than Monkeytype / Keybr / TypingClub, built to an **award-level** (Awwwards/CSSDA-class) craft bar.

## How an AI agent must use this pack
1. Read `AGENTS.md`-style rules in `15-agent-rules-and-build-plan.md` first.
2. Build **in the phase order** from `15`. Never skip to polish before the engine is correct.
3. Every UI task: read `08` (language) → `09` (tokens) → `10` (components) → `11` (motion) → `12` (UX states) → `13` (quality gate).
4. Every feature task: find it in `05`, copy its **Acceptance Criteria** into the PR/commit message, and satisfy all of them.
5. If a spec file conflicts with another: the **lower file number wins on product intent**, the **higher number wins on implementation detail**.
6. Do not invent new colours, fonts, radii, durations or easing curves. Use tokens only (`09`, `11`).

## File index
| # | File | What it answers |
|---|------|-----------------|
| 01 | product-vision-and-positioning | Who it's for, promise, principles, non-goals, differentiators |
| 02 | competitor-research-and-gaps | What existing sites do, where they fail, what we steal/avoid |
| 03 | information-architecture-and-sitemap | Every page, URL, nav, hierarchy, permissions |
| 04 | pages-and-layouts | Wireframes + layout rules per page, per breakpoint |
| 05 | features-spec | Every feature with acceptance criteria, priority (P0/P1/P2) |
| 06 | typing-engine-spec | Input handling, metrics maths, caret, layouts, anti-cheat |
| 07 | adaptive-learning-and-curriculum | Levels, key unlocks, bigrams, code curriculum, number systems |
| 08 | design-language | Brand, mood, shape, imagery, voice, signature moment |
| 09 | design-system-tokens | Colour, type, spacing, radius, elevation, themes (copy-paste CSS) |
| 10 | ui-components-and-layouts | Component library, keyboard visual, charts, grid rules |
| 11 | animation-and-motion-spec | Every animation, duration, easing, trigger, budget |
| 12 | ux-flows-states-and-microcopy | Flows, empty/error/loading states, copy rules |
| 13 | accessibility-performance-quality-gate | A11y, perf budgets, award-criteria checklist |
| 14 | tech-stack-data-model-api | Stack, folders, DB schema, API, sync, security |
| 15 | agent-rules-and-build-plan | AGENTS.md, phased roadmap, definition of done |
| 16 | skills-and-expertise-map | Top skills (agent + human), learning order, 7-day sprint |
| skills/ | 7 SKILL.md files | Drop into OpenCode skills dir so the agent loads them on demand |

## One-paragraph product summary
Cadence is a typing trainer + test platform where **the hero of the homepage is a live typing test** (no marketing wall). It teaches **real-world typing** (mixed case, punctuation, numbers, symbols, no-autocorrect, transcription) and **programmer typing** (language-agnostic symbol/number/bracket/naming-style drills + real code), with an **adaptive engine** that models keys *and key-pairs*, and an **analytics suite** that shows *why* you are slow (finger load, transition cost, error taxonomy, rhythm), not just *what* your WPM is.

## Research basis
Competitor pages and feature lists were reviewed (Monkeytype docs/READMEs, Keybr and its adaptive algorithm descriptions, TypeQuicker comparison, typing.io, SpeedCoder, Keystrike, typing-site alternatives lists, Awwwards/CSSDA judging guides). Links are in `02`. Where something is an **opinion/recommendation** rather than a verified fact, it is labelled `[Recommendation]`.
