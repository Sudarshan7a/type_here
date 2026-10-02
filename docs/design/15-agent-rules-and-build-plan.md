# 15 — Agent Rules (AGENTS.md) & Phased Build Plan

## A. `AGENTS.md` (copy this block to repo root)
```markdown
# AGENTS.md — Cadence

## Mission
Build Cadence, an award-level typing trainer/test platform. The full spec lives in `docs/spec/`. Read `docs/spec/00-README-START-HERE.md` first.

## Non-negotiables
1. TypeScript strict. No `any` without a justified comment.
2. The typing path (input → engine → paint) never goes through React state per keystroke. Engine lives in `packages/engine`, framework-agnostic, deterministic, unit-tested.
3. Use design tokens only (docs/spec/09). No raw hex/px/ms/easing values in components.
4. Every screen implements loading, empty, error, offline and partial states (docs/spec/12 §3).
5. Motion follows docs/spec/11: transform/opacity only, tokenised durations, reduced-motion variants.
6. Accessibility is a release gate: keyboard, screen reader, contrast, reduced motion (docs/spec/13).
7. No placeholder/lorem copy. Follow voice rules (docs/spec/12 §8).
8. Do not add dependencies without stating why and checking bundle impact (`/` JS budget ≤170KB gz).
9. Do not invent features. If something isn't in docs/spec/05, ask or add a note in `docs/spec/CHANGELOG-SPEC.md`.
10. Licensing: only permissive-licensed content; record attribution.

## Workflow
- Plan first: list files to change + acceptance criteria copied from docs/spec/05.
- Small PRs: one feature ID per PR (e.g., F-TEST-4).
- Write tests with the code. Run `pnpm lint && pnpm test && pnpm e2e` before declaring done.
- For UI work: load skills `cadence-design-system`, `cadence-motion`, `cadence-ux-states-copy`, `cadence-quality-gate`.
- For engine/stat work: load `cadence-typing-engine` and `cadence-adaptive-learning`.
- For content/code-lab work: load `cadence-code-content`.
- After finishing, report: what changed, AC checklist ✔/✘, perf numbers, a11y results, screenshots (dark+light).

## Definition of Done
All AC met · tests green · Lighthouse ≥95 · axe clean · tokens-only · all states present · reduced-motion tested · dark+light screenshots attached · docs updated.
```

## B. Phased build plan (agent executes in order; each phase ends in a demoable build)
### Phase 0 — Foundation (1–2 days)
Monorepo (pnpm/Turbo), Next app, TS strict, ESLint/Prettier/stylelint, Tailwind v4 + `tokens.css` (09), theme bootstrap script (no flash), fonts, CI (lint/test/e2e/Lighthouse), Storybook, token lint rule, AGENTS.md + skills installed.
**Exit:** blank themed shell with Night Ink/Daylight switch, CI green.

### Phase 1 — Engine & Test screen (P0 core)
`packages/engine` (input normaliser, text model, metrics v1, seeded PRNG, layouts QWERTY), TypingField + Caret + ModeBar + LiveStats, error modes, restart flow, local persistence of tests.
**Exit:** `/` plays a flawless 30s test; perf test passes (key→paint < 16ms); unit/property tests green.

### Phase 2 — Results, Replay, Coach (P0)
ResultSheet + choreography (11 §4), charts, Cadence Ribbon (live+result), event log compression, replay player, key/pair stats, coach v1 (rules-based).
**Exit:** every result shows 1–3 explainable recommendations; replay reproduces text.

### Phase 3 — Settings, Themes, Layouts, Sound (P0/P1)
Settings tabs + presets + live preview, 40 themes + validator + builder, fonts, caret options, sound packs, layouts (Dvorak/Colemak/Colemak-DH/Workman/AZERTY/QWERTZ + custom import), accessibility settings.
**Exit:** theme switch uses View Transition reveal; all themes pass validator.

### Phase 4 — Learning (P0)
VirtualKeyboard, HandsGuide, curriculum Tracks A–D, adaptive generators (07 §2–4), Learn map, Lesson player, stars/XP, placement test.
**Exit:** a beginner can complete Foundations; per-layout level generation validated.

### Phase 5 — Practice & Code Lab (differentiator)
Practice hub drills; Programmer Core Track E (symbols, brackets, numbers/bases, naming styles, operators, whitespace); Code Runner settings; Symbol/Code WPM; language packs L1–L3 for JS/TS, Python, Java, SQL, Shell, C/C++.
**Exit:** Code Lab shows per-symbol heatmap + costly symbol transitions; auto-pair off default.

### Phase 6 — Real-World & Stats Lab
Transcribe, Email, Credentials, Data entry, Fatigue run; Stats dashboard tabs (Overview/Keys/Pairs/Errors/Rhythm/Fingers/Time), export/import.
**Exit:** all charts have data-table alt; export round-trips.

### Phase 7 — Accounts, Sync, Leaderboards, Challenges, Profile
Auth, sync outbox, server run validation, leaderboards, daily challenge, public profiles, share cards.

### Phase 8 — Race (P1 ghost, P2 live)
Ghost race; then WebSocket rooms with authoritative server.

### Phase 9 — Polish for awards
Motion pass (11 §14), content pass (copy, Method page, case study), perf squeeze, a11y audit, device lab, mobile excellence pass, OG images, press kit, launch checklist (13 §7).

## C. Task template for the agent
```
Task: <F-ID title>
Read: docs/spec/05 §<id>, relevant files (06/07/10/11/12)
AC: <copy>
Plan: <files, tests>
Implement → Test → Self-review against 13 §5 → Screenshots (dark/light, desktop/mobile) → Report
```

## D. Prompts to give OpenCode (starter set)
1. "Read docs/spec/00 and 15. Run Phase 0 exactly. Stop after CI is green and show me the folder tree."
2. "Implement Phase 1: packages/engine per docs/spec/06 with tests first, then the TypingField per docs/spec/10 §3. Prove key→paint < 16ms with a Playwright trace."
3. "Build the ResultSheet choreography per docs/spec/11 §4 and CadenceRibbon per 10 §9. Provide reduced-motion variant and screenshots."
4. "Generate the Programmer Core Track E content generators per docs/spec/07 §5 with unit tests for bracket balance, base conversion validity and style conversion."
5. "Run the quality gate in docs/spec/13 §5 on the Learn page; fix every failure."

## E. Risk register
| Risk | Mitigation |
|---|---|
| Engine latency/jank | engine outside React; canvas/DOM direct updates; perf CI |
| Scope creep | strict P0/P1/P2; phase exits; spec changelog |
| Content licensing | permissive-only pipeline, attribution field, spot-checks |
| Cheating/leaderboards | server-side replay validation, soft flags, delay public boards until Phase 7 |
| "Generic AI look" | 08 §11 differentiation check each screen; human review of hero + results |
| Mobile typing quirks | mobile mode flag + separate buckets; test on real devices |
| Over-engineering motion | 11 budgets + CI long-task gate |
