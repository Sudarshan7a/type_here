# BUILD ROADMAP — Start to End, Phase by Phase, Feature by Feature

**What this file is:** the actual project plan. Not a reading list (`FILE-INVENTORY.md` is that) and not a corrections document (`MASTER-BUILD-CONTRACT.md` is that) — this is the sequence of **what gets built, when, and how you know it's done**, from an empty repository to a live, validated product.

**How to use it:** work through the phases in order. Each phase lists its features, its file references, and its exit criteria. Do not enter a phase until the previous phase's exit criteria are met. Phases 0 and 1 run partially in parallel (see Phase 0).

---

## PHASE 0 — Validate + Set Up (Weeks 0–2, two parallel tracks)

**Track A (you, human):** recruit 12-15 interview participants; run problem interviews; launch a 3-concept waitlist test; run a 5-person clickable-prototype usability test; do a competitor hands-on audit.
**Track B (AI, bounded runs):** scaffold the repository; set up CI; deploy staging/production shells; install and vet the OpenCode kit; run 6 technical spikes (input latency, timing capture, engine parity, token parsing, bundle size, hidden-tab behavior).

**Features shipped this phase:** none (this is infrastructure and evidence, not product).

**Files to use:** `WEEK-0-2-PLAN.md` (the full day-by-day table), `typing-website-implementation-guide.md` Chapters 1-2 (R0), Chapter 3 (M0).

**Exit criteria (all must be true before Phase 1 begins):**
- [ ] 10+ interviews completed and synthesized into a one-page summary
- [ ] Waitlist test run with a recorded conversion rate per concept
- [ ] Prototype test: 4 of 5 participants complete the first-session flow unaided
- [ ] All 6 technical spikes report pass/fail with evidence
- [ ] Repository has branch protection, CI gates (lint/typecheck/test/build/bundle-size/dependency-license-audit), staging + production shells deployed
- [ ] Error-tracking scrubbing verified (a fake keystroke log in a test error is redacted)
- [ ] A written go/no-go decision memo exists, referencing the evidence above

**If the exit criteria are not met:** do not proceed to Phase 1. Either extend Phase 0, pivot the concept, or stop.

---

## PHASE 1 — Core Engine and Metrics (Weeks 2–3)

**Features shipped this phase:** none user-facing — this is the foundation everything else sits on.

**What gets built:**
1. The data contracts (event, log, text, settings, result summary, session) per `typing-website-implementation-guide.md` M1-01.
2. The 25+ fixture library, hand-computed, per `chapter-4-deep-dive-typing-engine-part1.md` (Worked Examples A-G plus the 10 edge cases).
3. The text model, input adapter, log recorder, state machine, error modes, typed-vs-auto-inserted tracking.
4. The full metrics library (WPM variants, accuracy variants, KSPC, rollover, consistency, burst, IKI).
5. Replay and the browser/Node parity harness.

**Files to use:** `chapter-4-deep-dive-typing-engine-part1.md`, `chapter-4-deep-dive-typing-engine-part2.md` (all 40 named tests), `typing-engine-core` and `typing-metrics-spec` skills from the kit.

**Exit criteria:**
- [ ] All 40 `ENG-*` test scenarios pass
- [ ] `ENG-PARITY-01` passes for every single fixture (browser = Node, no exceptions)
- [ ] `ENG-FIXTURE-G01` (key-repeat filtering) passes — flagged critical severity, do not proceed without it
- [ ] The engine contract document exists, with every Edge Case (E1-E10) decision written down explicitly
- [ ] Property tests (`ENG-STATE-PROP-01`, `ENG-ALIGN-PROP-01`, `ENG-AGG-PROP-01`) each run 1,000+ iterations with zero failures

---

## PHASE 2 — Content Pipeline (Weeks 2–4, overlaps Phase 1)

**Features shipped this phase:** the content database and license-enforcement gate (backend only, not yet visible to users).

**What gets built:**
1. The license register as a real, enforced database gate — an item without a license entry cannot publish.
2. Ingestion of all 300 prose passages, all 300 quotes (**with the corrections from `MASTER-BUILD-CONTRACT.md` Part 1 applied**), the full-corpus word list, the 34 original JS snippets, Python/Java snippets generated from the 58 specs, the 105 composition prompts.
3. The difficulty-band scoring pipeline (typability score → Easy/Typical/Hard).
4. The weakness-targeted content selector (retrieval-based, per the master spec's content-selection section).

**Files to use:** `content-00-master-plan-and-license-register.md`, all prose/quote/word-list/code/composition/UI-copy content files, `token-drill-generators` skill.

**Exit criteria:**
- [ ] Every loaded content item has a register entry with license, source, and status fields populated
- [ ] `QUOTE-PD-001` reads "in three days," not "after three days" (a direct regression check for the applied correction)
- [ ] A 10-item random spot-check of loaded prose matches the source files character-for-character
- [ ] The pipeline rejects a test item lacking a license field
- [ ] Python and Java code content exists for at least 30 of the 58 specs

---

## PHASE 3 — Typing Surface and Themes (Weeks 3–4)

**Features shipped this phase (the first user-visible release, likely internal/staging only):**
1. The home/test screen: mode bar (Classic, Real-World, Numbers & Symbols), duration picker, the typing surface itself.
2. Character-state rendering (pending/correct/incorrect/extra/missed) with non-color cues.
3. Caret rendering (transform-only movement, cached offsets).
4. Themes (light/dark + 2-3 presets), fonts, focus mode.
5. Settings screen (error mode, layout, accessibility options).
6. Five keyboard layouts wired up (QWERTY-US/UK, Dvorak, Colemak-DH, AZERTY, QWERTZ).

**Files to use:** `typing-website-implementation-guide.md` Chapter 7 (M2), `typing-caret-rendering`, `typing-design-tokens`, `typing-motion-tokens`, `a11y-typing-ui` skills, `content-ui-copy-string-tables.md` for all visible text.

**Exit criteria:**
- [ ] Input-to-paint latency p95 within budget (from Phase 0's Spike S1 baseline), verified in CI
- [ ] Accessibility scan clean on all pages/themes; keyboard-only flow works end to end
- [ ] All five layouts tested on real hardware, matching the layout tables in `levels-04-tier-0-per-layout-finger-maps.md`
- [ ] Reduced-motion path tested and verified
- [ ] `/anim-audit` and `/a11y` commands (from the kit) return no blockers

---

## PHASE 4 — Results, Accounts, Integrity (Weeks 5–6)

**Features shipped this phase:**
1. Results screen: headline metrics, difficulty band, per-second graph, "What to fix" card, comparisons.
2. Guest-first local history; optional sign-up (email, Google, GitHub) with deferred prompting.
3. Signed test sessions, server-side metric recomputation, the 5 plausibility checks from Chapter 10.
4. Data export and account deletion.
5. Basic admin console (content review queue, feature flags).

**Files to use:** `chapter-10-deep-dive-integrity-scoring-part1.md` and `part2.md` (all 20 tests), `integrity-anti-cheat` and `keystroke-privacy` skills, `typing-website-implementation-guide.md` Chapter 8 (M3).

**Exit criteria:**
- [ ] All 20 `INT-*` test scenarios pass, including `INT-FIXTURE-006` (the sophisticated-bot gap — this should PASS by correctly demonstrating the accepted limitation, not by anyone quietly raising thresholds to hide it)
- [ ] A forged/replayed result submission is rejected in a real end-to-end test
- [ ] Export and delete are tested and verified to actually remove data
- [ ] Privacy canary test passes (no typed content reaches analytics or error tracking)

---

## PHASE 5 — Weakness Model and Drill Loop (Weeks 7–9)

**Features shipped this phase (this is the product's core differentiator going live):**
1. Per-key/per-bigram aggregation with shrinkage and recency weighting.
2. The weakness profile, keyboard heatmap with typo arrows, transition table.
3. The drill engine: Focus/Push blocks, difficulty targeting, "what improved/what didn't" feedback.
4. Baseline and retest flow (day-0, day-14, day-30).
5. Goals, if-then plans, the Today card.
6. Plateau detection with the four-scenario intervention menu.
7. Efficacy instrumentation: baseline/retest pairing, randomized holdout assignment (opt-in).

**Files to use:** `chapter-8-deep-dive-weakness-model-part1.md` and `part2.md` (all 25 tests), `typing-website-retention-and-mastery-playbook.md`, `efficacy-and-experiments` and `habit-gamification-rules` skills.

**Exit criteria:**
- [ ] All 25 `WM-*` test scenarios pass, including the double-counting fix verification (`WM-FIXTURE-007`)
- [ ] A synthetic 10-test history produces the exact hand-computed drill recommendation (`WM-INTEGRATION-001`)
- [ ] The first-session win flow (test → weak spots → drill → retest → delta) is usability-tested with 5 real people, 4 of 5 completing unaided
- [ ] Non-gamified mode hides all XP/streak/celebration elements everywhere, verified by a full-app audit
- [ ] Efficacy consent flow exists, is opt-in, and the holdout-assignment mechanism logs exposures correctly

---

## PHASE 6 — Programmer Track, Starting with Tier 0 (Weeks 9–12)

**Features shipped this phase:**
1. **Tier 0 (Levels 0.1-0.5) — built FIRST, before Tier 1**, correcting the original sequencing gap identified mid-project.
2. Tiers 1-6 (Levels 1-30): token engine, Symbol Gym, Bracket Balance, Strings & Escapes, Numbers, Number Systems & IDs, Naming Style Switcher.
3. All 6 boss levels with their real content.
4. The programmer baseline test and Code Skill Profile.
5. Token-class analytics: Symbol Fluency Ratio, symbol error rate, confusion matrix, bracket pair latency.
6. Layout-aware symbol drilling for all five MVP layouts.

**Files to use, in this order:** `levels-05-tier-0-generator-parameters.md` (implement against this), `levels-03` and `levels-04` (rationale/reference), `levels-01-vocabulary-and-generation-parameters.md`, `levels-02-boss-and-challenge-content.md`, `chapter-9-deep-dive-token-engine-part1.md` and `part2.md` (all 20 tests).

**Exit criteria:**
- [ ] All 10 `T0-GEN-*` tests pass (Tier 0 generator determinism, per-layout injection)
- [ ] All 20 `TOK-*`/`LVL-*` tests pass, including the 3 cross-file consistency tests confirming boss content matches exactly between the deep-dive chapter and the boss-content file
- [ ] A user can complete Tier 0 → Tier 1 Level 1 without encountering a symbol they weren't drilled on first
- [ ] Safety/positioning audit passed: no code execution paths exist anywhere; no marketing copy claims improved programming ability
- [ ] Usability test with 5-8 programmers: could they use the baseline, pass Level 1, and understand the analytics
- [ ] **Explicit non-action confirmed:** Tiers 7-12 and Levels 31-60 remain unbuilt, per the validation gate

---

## PHASE 7 — Polish, Legal, Award-Readiness (Weeks 13–14)

**Features shipped this phase:**
1. Full accessibility audit and fixes (automated + manual keyboard/screen-reader passes).
2. Performance budget verification (Core Web Vitals at p75, real-user monitoring live).
3. Legal pages (Terms, Privacy, Cookie notice, DMCA) drafted and reviewed by a professional.
4. Support/feedback infrastructure, "How we calculate" page.
5. Security hardening pass and a backup-restore drill.
6. Pre-beta usability testing (12+ participants, SUS score).
7. Award-readiness review against the Design/Usability/Creativity/Content/Developer rubric.

**Files to use:** `typing-website-implementation-guide.md` Chapter 12 (M7), `typing-website-award-playbook.md`, `award-readiness-review` skill.

**Exit criteria:**
- [ ] No accessibility blockers remain
- [ ] LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 at p75 (lab and field)
- [ ] Legal pages published and professionally reviewed
- [ ] SUS ≥ 75
- [ ] `/award-audit` returns a scored table with no blockers
- [ ] Backup restore tested successfully once

---

## PHASE 8 — Beta and Learning Loop (Weeks 15–16, then ongoing)

**Features shipped this phase:** the product goes live to real users, in three waves (~10, then ~30, then ~60 people).

**What happens:**
1. Instrumentation verified in production (every event fires correctly, no typed content leaks).
2. The efficacy pipeline runs for real: baseline captures, day-30 retests, holdout enrollment.
3. Weekly rituals begin: metrics review, user conversations, fixes, release notes.
4. First day-30 efficacy cohort analyzed and reported (even if small and only directional).
5. V1 scope is decided using real evidence, not assumption.

**Files to use:** `typing-website-implementation-guide.md` Chapter 13 (M8), `typing-website-six-pillar-proof-plan.md` (the full efficacy protocol and PMF survey).

**Exit criteria (these are the actual finish line for "is this the best typing website"):**
- [ ] First-session win rate meets or exceeds the beta target
- [ ] D1/D7/D30 practice-return rates measured with real cohorts
- [ ] Sean Ellis PMF survey run with 40+ valid responses; ≥ 40% "very disappointed" in at least one segment
- [ ] First efficacy readout published internally, with honest confidence intervals, even if the result is null
- [ ] Zero privacy incidents; integrity false-positive rate measured and under the set ceiling
- [ ] A V1 roadmap exists, backed by real usage data, not the original assumptions

---

## PHASE 9+ — V1 and Beyond (Only After Phase 8's Evidence Supports It)

**Do not plan this phase in detail until Phase 8 produces real data.** The V1 feature list (integrity layer/leaderboards, real-time races, composition mode, notifications, Stack Packs, clubs/leagues, monetization tests) is already fully specified in `typing-website-implementation-guide.md` Chapter 14 — but the ORDER in which to build them should be re-prioritized based on what Phase 8 actually shows people want, not the default order in that chapter.

---

## The one-page version of this whole roadmap

```
Phase 0  (Wk 0-2)    Validate + set up            -> go/no-go decision
Phase 1  (Wk 2-3)    Typing engine                -> 40 tests pass, parity confirmed
Phase 2  (Wk 2-4)    Content pipeline             -> 300 prose + 300 quotes loaded, corrections applied
Phase 3  (Wk 3-4)    Typing surface + themes      -> latency + a11y verified
Phase 4  (Wk 5-6)    Results + accounts + integrity -> 20 integrity tests pass
Phase 5  (Wk 7-9)    Weakness model + drills      -> 25 tests pass, first-session win usability-tested
Phase 6  (Wk 9-12)   Programmer track + Tier 0    -> 30 tests pass, safety audit passed
Phase 7  (Wk 13-14)  Polish + legal + awards      -> SUS >= 75, a11y clean, legal reviewed
Phase 8  (Wk 15-16+) Beta + real users            -> PMF measured, efficacy readout published
Phase 9+             V1, evidence-driven          -> re-prioritized from real data
```

**Total to a real, validated beta: roughly 16 weeks full-time (32-48 weeks part-time).** Every phase's exit criteria is a checklist with a real pass/fail answer, not a feeling. If a phase's criteria aren't met, the project does not advance, regardless of how much has been "built."
