# FILE INVENTORY — Every File in This Project, What to Expect From Each

**Purpose:** the complete, current catalog of every file produced across this project. For each file: what it is, what an AI agent should extract from it, and its status (current / superseded / reference-only). **Read `MASTER-BUILD-CONTRACT.md` first** — it contains corrections that override some content described below.

**Status legend:**
- 🟢 **CURRENT** — use as-is
- 🟡 **REFERENCE-ONLY** — real content, but explicitly not a build commitment (Tier 0 extras, Tiers 7-12 gap notes)
- 🔴 **SUPERSEDED** — do not use; a newer file replaces it (kept only for historical comparison)
- ⚠️ **NEEDS CORRECTION** — usable, but only after applying a fix listed in `MASTER-BUILD-CONTRACT.md` Part 1

---

## GROUP 0 — Read First (Orientation and Rules)

| File | What it is | What to extract | Status |
|---|---|---|---|
| `MASTER-BUILD-CONTRACT.md` | The corrections-and-sequencing master file | Every correction in Part 1; the 9-step build order in Part 2; the hard stop conditions in Part 3 | 🟢 Read this before anything else |
| `START-HERE-handoff-guide.md` | How to hand this project to an IDE AI safely | Which files to give the AI vs. withhold; the review loop (plan → build → verify → read diff → commit); realistic expectations | 🟢 |
| `WEEK-0-2-PLAN.md` | The first 14 days, two parallel tracks (validation + engine build) | Bounded-autonomy rules for continuous AI operation; the exact Day 1-14 task table; Day-14 go/no-go thresholds; first 3 prompts to use | 🟢 |
| `00-chapter-index.md` | Map of every chapter across all documents, in build order | Which chapters are fully deep-dived (`[DEEP]`) vs. only summarized (`[GUIDE]`) vs. not written (`[TODO]`) | 🟢 (superseded in detail by this file, kept for the deep-dive/summary distinction it draws) |

---

## GROUP 1 — Product Definition (What to Build)

| File | What it is | What to extract | Status |
|---|---|---|---|
| `typing-websites-analysis.md` | Comparison of existing typing sites (Monkeytype, Keybr, TypingClub, etc.) | Competitor feature list, complaints, what to match vs. beat | 🟢 Background research, still valid |
| `typing-website-audit-report.md` | Self-critique of the first draft spec (v0.1/v0.2) against real evidence | The corrections that were made from v0.1→v1.0 (rWPM overreach, licensing blind spots, monetization optimism) | 🟢 Historical record of why the spec looks the way it does |
| `typing-website-master-spec-v1.md` | **The core product requirements document** | Every requirement ID (ENG-, LRN-, PRG-, ANA-, etc.), the MVP scope (§3.2), the metrics spec (§6), the programmer track design (§7), architecture (§9) | 🟢 **The primary spec — read §3.2 (MVP scope) first, then read other sections on demand by requirement ID, never all at once** |
| `typing-website-requirements.md` | Original v0.1 draft spec | Nothing — fully replaced | 🔴 SUPERSEDED by master-spec-v1.md |
| `typing-website-programmer-track.md` | Original v0.2 addendum | Nothing — fully replaced | 🔴 SUPERSEDED by master-spec-v1.md §7 |

---

## GROUP 2 — How to Build It (Process and Steps)

| File | What it is | What to extract | Status |
|---|---|---|---|
| `typing-website-implementation-guide.md` | Step-by-step build manual, milestones M0-M8 + V1/V2 | Task IDs (M0-01, M1-03, etc.), the "Do/How/Check" format per task, the Definition of Done, the master checklists at the end | 🟢 **Read one chapter/milestone at a time, never the whole file at once** |
| `typing-website-opencode-build-playbook.md` | OpenCode-specific tooling: skills, animation, UI/UX research, flows | Which third-party skills to install, the motion-token rules, the user-flow state diagrams, the milestone-to-OpenCode-prompt mapping | 🟢 |
| `typing-website-award-playbook.md` | Craft/performance targets to reach "award-winning" quality | Core Web Vitals targets, SUS score targets, the award-readiness checklist, the launch/growth playbook (Monkeytype's growth history, Show HN advice) | 🟢 |
| `typing-website-retention-and-mastery-playbook.md` | Habit design, gamification ethics, training-session structure | The session blueprint (warm-up/focus/push/real-world/retest), the weekly-goal streak design, the gamification ethics checklist, MST-/RET- requirement IDs | 🟢 |
| `typing-website-six-pillar-proof-plan.md` | How to actually prove the product works and grows | The efficacy study protocol (sample-size math), the PMF survey method, the AI-code-review checklist, the manual outreach ("100 list") method | 🟢 |

---

## GROUP 3 — The OpenCode Kit (Give This Whole Zip to the AI's Working Directory)

| File | What it is | What to extract | Status |
|---|---|---|---|
| `realtype-opencode-starter-kit.zip` | The actual `.opencode/` folder, `AGENTS.md`, config, and copies of the spec/guide/playbooks | Unzip into the repo root. Contains: `AGENTS.md` (always-loaded rules), 13 project skills (typing-engine-core, typing-metrics-spec, typing-caret-rendering, typing-design-tokens, typing-motion-tokens, a11y-typing-ui, token-drill-generators, integrity-anti-cheat, keystroke-privacy, typing-e2e-testing, award-readiness-review, habit-gamification-rules, efficacy-and-experiments), 4 review subagents, 8 slash commands, `opencode.jsonc` config with safe permission defaults | 🟢 **This is infrastructure, not reading material — install it, don't summarize it** |
| `realtype-templates-pack.zip` | 13 fill-in-the-blank templates for research and process | Decision log, weekly scorecard, research interview guides, outreach "100 list" template, PMF survey script, efficacy study protocol template, AI PR review checklist, content brief, design brief, privacy data map, integrity test plan | 🟢 **These are for YOU (the human) to fill in — not for the AI to generate content into automatically** |

---

## GROUP 4 — Deep-Dive Chapters (Worked Examples, Exact Numbers, Named Tests)

Each of these exists because the summary-level spec was not concrete enough to implement correctly without ambiguity. Each ends with a numbered test catalog.

| File | What it covers | What to extract | Status |
|---|---|---|---|
| `chapter-4-deep-dive-typing-engine-part1.md` | Typing engine: worked WPM/accuracy/rollover math, edge cases E1-E10 | Worked Examples A-G with exact numbers; the 10 named edge-case decisions (clock-start timing, Caps Lock handling, key-repeat filtering) | 🟢 Read before writing ANY engine code |
| `chapter-4-deep-dive-typing-engine-part2.md` | State machine table, error-alignment algorithm, aggregation math, 40-test catalog | The full state-transition table; the transposition/omission/insertion classification rules; the bigram-aggregation outlier-exclusion worked example; all 40 `ENG-*` test names | 🟢 Implement all 40 tests before the engine is "done" |
| `chapter-8-deep-dive-weakness-model-part1.md` | Severity scoring math, shrinkage for small samples, recency decay | The full worked severity formula (0.5×slowness + 0.5×error, frequency-weighted); the shrinkage formula for thin data; the exponential decay formula for old samples | 🟢 Read before writing ANY weakness-scoring code |
| `chapter-8-deep-dive-weakness-model-part2.md` | Next-Best-Drill algorithm, plateau detection, 25-test catalog | **Contains a found-and-fixed double-counting bug (§8.6.1) — verify your implementation doesn't reintroduce it**; the noise-vs-trend plateau formula; all 25 `WM-*` test names | 🟢 |
| `chapter-9-deep-dive-token-engine-part1.md` | Token-to-keystroke mapping, ambiguous tokenization cases | The keystroke→token attribution algorithm; 4 named ambiguous cases (number-in-string, keyword-vs-identifier, symbol-in-comment, chord-internal-errors) with resolved precedence rules | 🟢 Read before building the programmer-track tokenizer |
| `chapter-9-deep-dive-token-engine-part2.md` | Level pass-criteria worked against REAL boss content, switch-cost math, 20-test catalog | The exact "best 3 of 5" interpretation (resolves a real ambiguity); the median-based switch-cost aggregation rule; 5 explicitly-listed gaps this chapter closed in the earlier spec | 🟢 **Cross-references `levels-02` — the two files must stay in sync (see `CONSISTENCY-001/002/003` tests)** |
| `chapter-10-deep-dive-integrity-scoring-part1.md` | Anti-cheat checks 1-5 (physical floor, outlier IKI, rollover, bigram-dependence, variance) worked with real numbers | Exact thresholds (45ms floor, 15/35ms outlier floors) with justified safety margins against real elite-typist data | 🟢 |
| `chapter-10-deep-dive-integrity-scoring-part2.md` | Risk-score combination, false-positive math, session security, 20-test catalog, **and the project's final honest gap summary** | The weighted risk-combination formula; the explicitly-accepted "sophisticated bot" detection gap (`INT-FIXTURE-006`); the account-history mitigation rule; the closing "what's still remaining" section | 🟢 Also functions as this project's own honesty check — read the closing section |

---

## GROUP 5 — Content Library (Actual Practice Material)

### Prose (300 passages — target met)
| File | Domain | Count | Status |
|---|---|---|---|
| `content-prose-batch-01.md` | Everyday/personal | 60 | 🟢 |
| `content-prose-batch-02.md` | Workplace/professional | 60 | 🟢 |
| `content-prose-batch-03.md` | Technical/instructional | 60 | 🟢 |
| `content-prose-batch-04.md` | Relationships/social | 60 | 🟢 |
| `content-prose-batch-05.md` | News/explanatory + travel | 60 | 🟢 |

### Quotes (300 lines — target met, with one correction)
| File | Type | Count | Status |
|---|---|---|---|
| `content-quotes-original.md` | Original, Batch 1 | 90 | 🟢 |
| `content-quotes-original-batch2.md` | Original, Batch 2 | 90 | 🟢 |
| `content-quotes-original-batch3.md` | Original, Batch 3 | 60 | 🟢 |
| `content-quotes-verified-public-domain.md` | Franklin, Aesop | 42 | ⚠️ **`QUOTE-PD-001` needs the wording fix in `MASTER-BUILD-CONTRACT.md` Part 1; `QUOTE-PD-003` needs a confidence downgrade** |
| `content-quotes-verified-public-domain-batch2.md` | Marcus Aurelius | 10 | ⚠️ **Downgrade all 10 to `draft` pending re-verification, per the audit** |
| `content-quotes-verified-public-domain-batch3.md` | Epictetus | 10 | 🟡 Already self-flagged as `confidence: moderate` — no new correction needed, but do not treat as fully verified |
| `audit-content-library-sourcing-recheck.md` | The re-verification audit itself | The confirmed error, the downgrade, the methodology gap it revealed | 🟢 **Read this before trusting any verified-public-domain quote file** |

### Word list
| File | Status |
|---|---|
| `content-classic-mode-word-list.md` | 🔴 SUPERSEDED — derived from only 78 of 300 passages |
| `content-classic-mode-word-list-full-corpus.md` | 🟢 CURRENT — derived from all 300 passages, 1,721 unique words |

### Code
| File | What it is | Status |
|---|---|---|
| `content-code-snippets-javascript.md` | 1 original utility + 3 real-repo-license-confirmed-but-content-pending placeholders | ⚠️ Only `CODE-JS-001` is usable; the 3 `-P0x` entries remain `DO NOT SHIP` |
| `content-code-snippets-javascript-original.md` | 34 real, original, functional JS/TS/JSX snippets across utilities, algorithms, web patterns, React | 🟢 CURRENT — this is the usable JS content |
| `content-code-snippet-specifications.md` | 58 language-agnostic behavioral specs (what each snippet should do), usable to generate JS, Python, and Java code | 🟢 **Use this to generate the actual Python and Java literal code — that step has not been done yet, only specified** |

### Other content
| File | Status |
|---|---|
| `content-composition-draft-sprint-prompts.md` | 🟢 105 original writer-mode prompts |
| `content-ui-copy-string-tables.md` | 🟢 ~140 real UI strings across 12 screens |
| `content-00-master-plan-and-license-register.md` | 🟢 The sourcing policy and register schema — read this to understand WHY the content is sourced the way it is |
| `content-license-register.md` | 🟢 Base register |
| `content-register-update-batch2.md` | 🟢 Appends to the base register — merge both when building the real database register |

---

## GROUP 6 — Programmer Track: Levels and Tiers

| File | Covers | Status |
|---|---|---|
| `levels-01-vocabulary-and-generation-parameters.md` | Tiers 1-6 (Levels 1-30): vocabulary banks, generation parameters, worked sample outputs | 🟢 CURRENT — the build target for the MVP programmer track |
| `levels-02-boss-and-challenge-content.md` | All 6 boss levels' actual content, daily-challenge rotation | 🟢 CURRENT — **must stay byte-for-byte identical to what Chapter 9 Part 2 quotes from it** |
| `levels-03-tier-0-finger-placement-foundations.md` | NEW Tier 0 concept: single-key → pair → cluster progression for symbol keys, QWERTY-US finger map | 🟡 REFERENCE — real design, not yet a build commitment status-wise, but **the build contract now places it FIRST in the actual programmer-track build order** |
| `levels-04-tier-0-per-layout-finger-maps.md` | Tier 0 finger maps for UK QWERTY, AZERTY, QWERTZ, Dvorak, Colemak-DH | 🟡 REFERENCE — same status as above |
| `levels-05-tier-0-generator-parameters.md` | Exact Tier 0 generator parameters: key ordering, repetition counts, thresholds, per-layout adjustments | 🟢 **This is the file to implement Tier 0 against** — the other two Tier 0 files are rationale/reference, this one is the spec |

**Explicitly NOT built (by design, per the validation gate):** Tiers 7-12, Levels 31-60. No file exists for these. Do not build them until user demand is confirmed.

---

## GROUP 7 — This Response's Files

| File | What it is |
|---|---|
| `FILE-INVENTORY.md` | This file |
| `BUILD-ROADMAP-START-TO-END.md` | The companion file — exact phased plan with features, deliverables, and exit criteria per phase |

---

## Quick answer: "which files do I actually hand the AI, and in what form?"

1. **Give the AI:** the two zip files (unzipped into the repo), `typing-website-master-spec-v1.md`, `typing-website-implementation-guide.md`, `MASTER-BUILD-CONTRACT.md`, all Group 4 deep-dive chapters, all Group 5/6 content files (with Part 1 corrections applied first), `WEEK-0-2-PLAN.md`, `BUILD-ROADMAP-START-TO-END.md`.
2. **Do NOT give the AI as ground truth:** the two 🔴 SUPERSEDED files, or the uncorrected quote lines — either fix them first or tell the AI to apply `MASTER-BUILD-CONTRACT.md`'s corrections before ingesting.
3. **Keep for yourself, not the AI's context:** the templates pack (you fill these in as a human), the six-pillar proof plan's interview scripts (you conduct these, not the AI).
