# MASTER BUILD CONTRACT — The One File an AI Agent Reads First

**What this file is:** not another vision document. This is a **contract**: a specific, ordered, checkable sequence of instructions that references every other file already produced in this project, resolves the conflicts between them, and gives an AI coding agent (or a human) exactly what to do, in what order, with exact stop conditions. If a prior file said "X" and a later correction said "not X," this file states the corrected, current truth and cites why.

**How to use this file:** read this file completely before touching any other file in the project. It tells you which file to open next, for which task, and what NOT to trust in it.

---

## PART 1 — CORRECTIONS TO APPLY BEFORE USING ANY OTHER FILE

**Do not use the following content as-is. Apply these corrections first, or you will build on confirmed errors.**

| File | What it says | What is actually true | Source of correction |
|---|---|---|---|
| `content-quotes-verified-public-domain.md` | `QUOTE-PD-001` = "Fish and visitors stink **after** three days." | Corrected text: **"Fish and Visitors stink in three days."** Also: this proverb predates Franklin by 150+ years (traced to 1578); note it as "printed by Franklin," not "written by Franklin." | `audit-content-library-sourcing-recheck.md` §1–2, §6 |
| Same file | `QUOTE-PD-003` = "A penny saved is a penny earned," marked `reviewed`. | Downgrade status to `draft`, confidence: low. Exact wording/attribution unconfirmed by an independent source. | `audit-content-library-sourcing-recheck.md` §4 |
| `content-quotes-verified-public-domain-batch2.md` | All 10 Marcus Aurelius lines marked `reviewed`. | Downgrade to `draft` — not yet individually re-verified against a primary/scholarly source. Treat as unconfirmed until re-checked with the same rigor the Franklin re-check used. | `audit-content-library-sourcing-recheck.md` §5–6 |
| `content-quotes-verified-public-domain-batch3.md` | Epictetus lines. | No correction needed — this file already self-flagged as `confidence: moderate, pending scan verification` before the audit even ran. Leave as-is. | Audit §5 (confirms this file's own honesty already matched the finding) |
| `content-classic-mode-word-list.md` (the original, partial-corpus version) | Derived from 78 of 300 passages. | **Superseded entirely** by `content-classic-mode-word-list-full-corpus.md` (derived from all 300). Do not use the partial-corpus file for anything except historical comparison. | Stated explicitly in the full-corpus file itself |
| `content-code-snippets-javascript.md` | Contains `CODE-JS-P01/P02/P03`, three "pending" real-repo snippets. | These remain **blocked, marked DO NOT SHIP** — still true, unchanged. Use `content-code-snippets-javascript-original.md` (34 real, original snippets) and `content-code-snippet-specifications.md` (58 specs for Python/Java/more JS) for actual usable content instead. | Original file's own labeling, never resolved |
| Every numeric threshold across every deep-dive chapter (Chapters 4, 8, 9, 10) and every level file | Presented as specific numbers (45ms floor, k=15 shrinkage, 0.55 SFR, etc.) | **Every single one is a `[proposal]` for calibration, not a fact.** Do not treat any threshold as final. Build the calibration mechanism (already specified in each chapter) alongside the feature, not after. | Stated in each source chapter; restated here because it is the single most commonly mis-read type of content in this project |

**Rule going forward:** any time you (the agent) are about to use a fact from any file in this project that makes an external factual claim (a historical quote, a license, a real citation), and that fact has NOT been through the audit process demonstrated in `audit-content-library-sourcing-recheck.md`, treat it as **unverified by default**, not true by default. This is now the standing verification bar for this project.

---

## PART 2 — THE ACTUAL BUILD ORDER (numbered, sequential, with stop conditions)

**Do not skip steps. Do not start step N+1 before step N's stop condition is met.**

### STEP 0 — Read these five files only, in this order, before writing anything
1. `WEEK-0-2-PLAN.md` — your operating rules (bounded-autonomy, one task per run, PR-only)
2. `AGENTS.md` (inside the starter kit) — non-negotiable rules
3. This file (`MASTER-BUILD-CONTRACT.md`) — the corrections above and the order below
4. `typing-website-master-spec-v1.md` §3.2 only (MVP scope) — do not read the whole spec yet
5. `typing-website-implementation-guide.md` Chapter 3 (M0) only

**Stop condition for Step 0:** you can state, in your own words, the corrections in Part 1 above and the non-negotiable rules from `AGENTS.md`, without re-reading them.

### STEP 1 — Repository and environment (M0-01 through M0-12)
**Read:** Implementation Guide Chapter 3, task by task, as you reach each one. Do not read ahead.
**Do:** create the repo, folder structure, CI, staging/production shells, install and vet the OpenCode kit skills.
**Stop condition:** a deliberately-failing test blocks a pull request; the health endpoint responds on both environments; error-tracking scrubbing test passes (type a fake keystroke log into a test error and confirm it's redacted).
**Do NOT yet:** write any typing-engine code, touch any content file, or design any screen.

### STEP 2 — The typing engine, against Chapter 4's exact fixtures (M1)
**Read:** `chapter-4-deep-dive-typing-engine-part1.md` and `part2.md`, one worked example at a time.
**Do:** build the 40 named test scenarios from Chapter 4 §4.13 as real, automated tests, BEFORE writing the engine logic that must pass them. Hand-verify at least the five test vectors in `typing-metrics-spec` SKILL.md yourself, on paper, before trusting any test that claims to check them.
**Stop condition:** all 40 fixtures pass in both the browser and Node runtimes with identical output (Chapter 4 §4.13 checklist, all boxes checked). The key-repeat filtering test (`ENG-FIXTURE-G01`) passes — this is flagged as **critical severity** in the source chapter; do not proceed past this step if it fails.
**Do NOT yet:** connect the engine to any UI, start the content pipeline, or touch the weakness model.

### STEP 3 — Content pipeline scaffolding (uses the corrected content from Part 1 above)
**Read:** `content-00-master-plan-and-license-register.md`, then `content-license-register.md` AND `content-register-update-batch2.md` together (the second supersedes/adds to the first — merge them).
**Do:**
1. Build the license-register enforcement gate FIRST (an item without a register entry cannot publish) — this is infrastructure, build it before loading any content.
2. Load the 300 prose passages (`content-prose-batch-01.md` through `-05.md`).
3. Load the 300 quotes, **applying the Part 1 corrections above** — do not load `QUOTE-PD-001` in its original wording; use the corrected version.
4. Load `content-classic-mode-word-list-full-corpus.md` (NOT the superseded partial version).
5. Load the 34 original JS snippets (`content-code-snippets-javascript-original.md`) and generate Python/Java equivalents from the 58 specs in `content-code-snippet-specifications.md`.
6. Load the 105 composition prompts and ~140 UI strings.
**Stop condition:** the register contains an entry for every loaded item; the pipeline rejects a test item that lacks a license field; a spot-check of 10 random loaded prose passages matches the source files exactly (character-for-character); `QUOTE-PD-001` in the live database reads "in three days," not "after three days" (a direct, checkable regression test for the correction in Part 1).
**Do NOT yet:** build the typing surface UI, the weakness model, or any level content beyond what's needed for Tiers 1–6.

### STEP 4 — Typing surface, results, backend (M2–M3)
**Read:** Implementation Guide Chapters 7–8, `typing-caret-rendering` and `typing-design-tokens` skills, `content-ui-copy-string-tables.md` for every piece of visible text (do not write new UI copy ad hoc — use the string table; if a needed string is missing, add it to the table file first, then use it).
**Stop condition:** the full latency/accessibility/matrix checklist from Implementation Guide §7.2 and §8 passes; the integrity checks (`integrity-anti-cheat` skill) reject a forged/replayed submission in a real test, not just a described one.
**Do NOT yet:** build the weakness model, drills, or the programmer track.

### STEP 5 — Weakness model and drill loop (M4)
**Read:** `chapter-8-deep-dive-weakness-model-part1.md` and `part2.md` in full before writing any scoring logic.
**Do:** implement the 25 named test scenarios from Chapter 8 §8.8 as real tests before the scoring logic. Pay specific attention to `WM-FIXTURE-007` (the double-counting bug the chapter itself found and fixed) — verify your implementation does NOT reintroduce it.
**Stop condition:** all 25 fixtures pass; a synthetic 10-test history produces the exact hand-computed recommendation from `WM-INTEGRATION-001`.
**Do NOT yet:** build the programmer track.

### STEP 6 — Programmer track (M5–M6), including the NEW Tier 0
**Read, in this order:**
1. `levels-03-tier-0-finger-placement-foundations.md` (concept + QWERTY-US map)
2. `levels-04-tier-0-per-layout-finger-maps.md` (four more layouts)
3. `levels-05-tier-0-generator-parameters.md` (exact drill parameters — this is the file to implement against, not the two above, which are reference/rationale)
4. `levels-01-vocabulary-and-generation-parameters.md` (Tiers 1–6)
5. `levels-02-boss-and-challenge-content.md` (all boss content)
6. `chapter-9-deep-dive-token-engine-part1.md` and `part2.md`
**Do:** implement Tier 0 (Levels 0.1–0.5) BEFORE Tier 1 — this is a genuine, corrected sequencing fix from earlier in this project (Tier 0 did not exist until it was identified as a real gap; it must now come first in the actual build order, not be treated as optional bonus content).
**Stop condition:** all 20 test scenarios from Chapter 9 §9.6 pass, INCLUDING the three cross-file consistency tests (`CONSISTENCY-001/002/003`) that verify the boss content quoted in the deep-dive chapter is byte-for-byte identical to the content in `levels-02`. Plus: all 10 Tier 0 generator tests from `levels-05` §8 pass.
**Validation gate reminder (unchanged, still applies):** do NOT build Tiers 7–12 or Levels 31–60 as live features. The reference material for these exists but is explicitly not a build commitment until real user demand is confirmed.

### STEP 7 — Integrity, retention, polish (remaining M-series milestones)
**Read:** `chapter-10-deep-dive-integrity-scoring-part1.md` and `part2.md`, `typing-website-retention-and-mastery-playbook.md`, `typing-website-award-playbook.md`.
**Stop condition:** the full 20-test integrity catalog from Chapter 10 §10.9 passes, including the explicitly-accepted gap test (`INT-FIXTURE-006`, the sophisticated-bot scenario) — this test should PASS by correctly demonstrating the known limitation, not by someone "fixing" it into a false sense of完备ness.

### STEP 8 — Second-reviewer human pass (cannot be automated, still required)
**This step has no code deliverable.** A real human must review a sample of the 300 prose passages, 300 quotes, and code content per the QA process in `content-brief-and-audit.md`. **This has not happened at any point in this project and blocks any content from moving past `draft` status.**

### STEP 9 — Real users (cannot be automated, still required)
**Read:** `WEEK-0-2-PLAN.md` in full, `typing-website-six-pillar-proof-plan.md`.
**This is not a "step 9" in the sense of coming after the code is done** — per the Week 0–2 plan, this runs IN PARALLEL with Steps 1–7, not after them. It is listed last here only because this file is organized by "what to read," and the interview/waitlist/usability-test work has no corresponding code artifact to sequence against.

---

## PART 3 — HARD STOP CONDITIONS (apply at every step, not just the one they're listed under)

Stop and ask a human, regardless of which step you are on, if:
1. You are about to change a metric formula, a privacy behavior, or an integrity threshold — these require explicit human approval every time, per `WEEK-0-2-PLAN.md`.
2. You find another discrepancy between two files in this project like the Franklin quote error — do not silently pick one; flag it the way `audit-content-library-sourcing-recheck.md` did, with a specific finding and a specific correction, not a vague "some sources conflict."
3. A test you are asked to make pass would only pass by weakening the test itself, rather than fixing the code.
4. You are asked to build Tiers 7–12, Levels 31–60, or any V1/V2 feature before its stated validation gate is met.
5. Your usage budget for the current bounded run is exhausted.

## PART 4 — What "the best typing website" actually means, operationally (the only usable definition)

Per the Six-Pillar Proof Plan, "best" is not a feeling — it is measured against pre-registered thresholds:
- **Pillar 1 (works):** a randomized in-product study shows a real, non-zero, confidence-interval-supported improvement from the diagnose-drill loop vs. matched random practice.
- **Pillar 2 (retention):** D1/D7/D30 practice-return rates and a Sean Ellis PMF score ≥ 40% in at least one user segment.
- **Pillar 3 (quality):** the specific test catalogs in Chapters 4/8/9/10 all pass, on real infrastructure, not just described.
- **Pillar 4 (content/design):** SUS ≥ 75 at beta, ≥ 80 before any award submission.
- **Pillar 5 (trust):** zero privacy incidents; integrity false-positive rate under a set ceiling; the Franklin-quote-style correction process demonstrated in this project's own audit becomes a standing practice, not a one-time event.
- **Pillar 6 (reach):** the "100 list" actually has names on it and actual conversations have happened.

**None of these are met yet. All of them are the actual finish line — not any document, including this one.**

---

*This file supersedes no other file's content — it only sequences and corrects. When in doubt about which file is authoritative for a specific fact, this file's Part 1 table is the final word; for build order, Part 2 is the final word.*
