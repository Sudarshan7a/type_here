# FEATURE LEDGER

**Source of truth for "what remains."** Seeded from `docs/spec/master-spec-v1.md`,
`docs/spec/retention-and-mastery-playbook.md` and `docs/spec/implementation-guide.md`,
plus the test IDs named by the roadmap and `docs/MASTER-BUILD-CONTRACT.md`.

**Scope:** the whole feature set — MVP, V1, V2 and LATER (ADR-003). The roadmap's
Phases 1–8 are the first part of the work, not the end of it.

**Statuses:** `NOT STARTED` · `IN PROGRESS` · `DONE-VERIFIED` · `LAUNCH-GATED`
(built, tested flag ON and OFF, flag is OFF) · `BLOCKED-EXTERNAL` (built against
mocks, needs a human) · `DEFERRED-BY-HUMAN` (only a RESPONSE/STEER file) ·
`REJECTED-BY-ANTI-GOAL` (never built, flagged or not).

**Flag column:** a launch flag's name. `OFF` means the feature is gated behind
ADR-005 and only a `RESPONSE` or `STEER` file can enable it. `—` means no flag.

**Evidence label:** `LAB PROXY` (synthetic/headless) or `REAL-DEVICE CONFIRMED`
(human on real hardware). Blank means nothing is built yet.

| Total requirement rows | 216 |
|---|---|
| Seeded from | master-spec §5 (163), master-spec §8 NFR (17), retention §10 (36) |
| Named test IDs tracked | 114 (ENG 41, WM 25, INT 20, LVL 8, TOK 7, T0-GEN 10, CONSISTENCY 3) |

## Counts (computed from this file, not from any other document)

**By tag.** Tag families are folded for counting: `MVP`+`MVP policy`+`MVP-lite` → MVP; `V1`+`V1 test` → V1; `V2`+`V2 pilot`+`V2 validate` → V2; `UNTAGGED`+`Policy` → UNTAGGED.

| Tag | Rows |
|---|---|
| MVP | 97 |
| V1 | 74 |
| V2 | 12 |
| LATER | 13 |
| UNTAGGED (17 NFR + 3 policies) | 20 |
| **Total** | **216** |

**By status.**

| Status | Rows |
|---|---|
| DONE-VERIFIED | 5 |
| IN PROGRESS | 19 |
| NOT STARTED | 191 |
| LAUNCH-GATED | 0 |
| BLOCKED-EXTERNAL | 0 |
| DEFERRED-BY-HUMAN | 0 |
| REJECTED-BY-ANTI-GOAL | 1 |
| **Total** | **216** |

| rows carrying a launch flag | 45 |
| rows with no flag | 171 |

Progress is reported as:

    MVP x/97 | V1 x/74 | V2 x/12 | LATER x/13 | LAUNCH-GATED n | BLOCKED-EXTERNAL n | REJECTED n | overall x/216

A row reaches `DONE-VERIFIED` only with test-first evidence and a green gate. A row
is `LAUNCH-GATED` only once it has been **built and tested with its flag both ON and
OFF** and the flag is OFF — so those two states are distinct on purpose.

---

## ENG — Typing engine (master spec §5.1)

| ID | name | tag | depends-on | status | flag | test IDs | evidence | notes |
|---|---|---|---|---|---|---|---|---|
| ENG-01 | Keystroke capture, high-res timestamps, order preserved | MVP | — | DONE-VERIFIED | — | ENG-FIXTURE-E01/E02/E03, ENG-STATE-PROP-01, apps/web/tests/input-adapter.test.ts | LAB PROXY | keydown+keyup both captured; overlapping keys kept in order (proven by the E01/E02/E03 fixtures, not by A01 — A01 builds synthetic keyups). **Known defect found by the attack pass:** `input-adapter.ts` writes marker timestamps as absolute `performance.now()` while events are origin-relative, and no test asserts any marker `t`. Benign today (the engine only tests marker *presence*) but a live trap for the pause logic ENG-04 depends on |
| ENG-02 | Feedback within one frame; no network during a test | MVP | — | IN PROGRESS | — | spike S1 | LAB PROXY | spike p95 15.2 ms (only 5% under the 16 ms budget); the product surface does not exist yet, so this is not verified in the real app |
| ENG-03 | Char states + error modes free/must-correct/stop-on-error | MVP | ENG-01 | IN PROGRESS | — | ENG-FIXTURE-D01, D02, D03, D04 | LAB PROXY | free + must-correct land. **D02 stop-on-error shipped in Session 5 (full fixture). D03 no-backspace: engine behaviour implemented and unit-tested (Backspace ignored before `totalAttempts`, so KSPC is unaffected), but its FIXTURE needs the `errorMode` enum widened — EXTERNAL DECISION REQUIRED. D04 word-locked: engine not started** |
| ENG-04 | Start on first keystroke; timer from timestamps | MVP | ENG-01 | DONE-VERIFIED | — | ENG-STATE-01..07, ENG-STATE-PROP-01 | LAB PROXY | scored duration excludes pauses exactly; backgrounding cannot inflate speed (1000-sequence property test) |
| ENG-05 | One shared metrics library, client + server | MVP | — | DONE-VERIFIED | — | ENG-FIXTURE-A01/B01/C01/F01/G01, ENG-PARITY-01/02 | LAB PROXY | golden vectors; Node/Chromium agree to 1e-9 |
| ENG-06 | Layout-aware input; dead keys; Caps/Shift; IME limits | MVP | ENG-01 | IN PROGRESS | — | ENG-LAYOUT-MAPS, ENG-FIXTURE-E-CAPS, E-DEADKEY, E-DUALKEY, ENG-PARITY-03 | LAB PROXY | 6 layouts derived from physical key positions and verified (same-finger 14.8–16.0%). Caps/dead-key/dual-key attribution **not built** |
| ENG-07 | Ignore `isTrusted=false`; block paste/drop/autofill | MVP | — | IN PROGRESS | — | ENG-FIXTURE-E-PASTE | LAB PROXY | client-side paste blocked. **Server plausibility backstop not built** (needs the API) |
| ENG-08 | Replay from log, speed control, error markers | MVP | ENG-01, ENG-05 | IN PROGRESS | — | tools/fixture-recorder | LAB PROXY | offline recorder works; no replay **viewer** in the app yet |
| ENG-09 | Track typed vs auto-inserted; auto-indent/auto-pair toggles | MVP | ENG-01 | NOT STARTED | — | ENG-FIXTURE-E-AUTOINSERT | — | |
| ENG-10 | Disable smart quotes/dash/autocorrect/capitalization | MVP | — | NOT STARTED | — | — | — | raw characters must be preserved |
| ENG-11 | Editing-key realism (Ctrl+Backspace, Ctrl+Arrows) | V1 | ENG-03 | NOT STARTED | — | — | — | |
| ENG-12 | Ghost caret (vs PB, friend, replay) | V1 | ENG-08 | NOT STARTED | — | — | — | overlaps CMP-03 / RET-17 |
| ENG-13 | Mobile soft-keyboard mode (separate metrics + boards) | V1 | — | NOT STARTED | OFF | — | — | **CONFLICT:** separate boards must not bypass INT-10 / CMP-01 verified-only rules |

## MOD — Test modes (master spec §5.2)

| ID | name | tag | depends-on | status | flag | test IDs | evidence | notes |
|---|---|---|---|---|---|---|---|---|
| MOD-01 | Classic: time/words/quotes/custom text | MVP | — | NOT STARTED | — | — | — | quotes come from the 300-quote corpus |
| MOD-02 | Real-World Prose: case, punctuation, digits, names, URLs | MVP | CNT-01, CNT-02 | NOT STARTED | — | — | — | default home mode; PII/secret scan required on content |
| MOD-03 | Code: structured snippets, listed language set | MVP | CNT-04 | NOT STARTED | — | — | — | **BROKEN XREF:** cites "(PRG-09)" which does not exist; nearest real ID is PRG-15 |
| MOD-04 | Numbers & Symbols: digit rows, numpad, symbol rows | MVP | CNT-05 | NOT STARTED | — | — | — | |
| MOD-05 | Baseline tests: general 3 min + programmer 10 min | MVP | ENG-05 | NOT STARTED | — | — | — | feeds placement + efficacy |
| MOD-06 | Composition: prompt-based writing | V1 | ENG-05 | NOT STARTED | — | — | — | text NOT stored unless opted in |
| MOD-07 | Endurance 5/10/30 min, fatigue curve | V1 | — | NOT STARTED | — | — | — | |
| MOD-08 | Split-pane copying | V1 | — | NOT STARTED | — | — | — | |
| MOD-09 | Presets (save/share modes + settings) | V1 | — | NOT STARTED | — | — | — | |
| MOD-10 | Dictation / transcription | V2 | — | NOT STARTED | — | — | — | **CONFLICT:** master spec V2, impl guide §15.1 does not list it |
| MOD-11 | Exam simulator (rule packs) | LATER | LOC-05 | NOT STARTED | OFF | — | — | **CONFLICT (tag + anti-goal):** LATER vs impl-guide V2; exam rules imply single-attempt pass gates, which is a forbidden anti-goal. Build flag-OFF and never gate *RealType* progress on it |

## LRN — Learning and adaptive practice (master spec §5.3)

| ID | name | tag | depends-on | status | flag | test IDs | evidence | notes |
|---|---|---|---|---|---|---|---|---|
| LRN-01 | Placement test ≤ 3 min with skip-ahead | MVP | ENG-05 | NOT STARTED | — | — | — | adults must not be forced through beginner drills |
| LRN-02 | Adaptive engine: per-key/bigram proficiency, weak-coverage sentences | MVP | CNT-03, ANA-02 | NOT STARTED | — | WM-FIXTURE-001, WM-SEVERITY-002/003/004 | — | extended by MST-02 |
| LRN-03 | Gradual unlocking, max 2 new items at once | MVP | ANA-04 | NOT STARTED | — | — | — | separate averages per content type |
| LRN-04 | Flexible mastery: best 3 of 5, "almost there", no-timer | MVP | — | NOT STARTED | — | LVL-FIXTURE-001, LVL-FIXTURE-002 | — | **forbidden:** no single-attempt gating. extended by MST-06 |
| LRN-05 | Learn from errors: confusions, typo arrows, one-click drill | MVP | ANA-02 | NOT STARTED | — | — | — | |
| LRN-06 | Goals: target + weekly commitment + ETA | MVP | ANA-07 | NOT STARTED | — | — | — | never promise outcomes. extended by RET-03/04 |
| LRN-07 | Beginner course, adult tone, games optional | V1 | LRN-03 | NOT STARTED | — | — | — | no forced kid-themed games |
| LRN-08 | Targeted drills: same-finger, hand-alternation, row jumps, shift | V1 | LRN-02 | NOT STARTED | — | — | — | |
| LRN-09 | Burst and rhythm training | V1 | — | NOT STARTED | — | — | — | |
| LRN-10 | Plateau detection with reasoned suggestions | V1 | ANA-04 | NOT STARTED | — | WM-FIXTURE-009, WM-FIXTURE-010, WM-FIXTURE-016 | — | extended by MST-10 |
| LRN-11 | Daily plan generator 10/20/30 min | V1 | MST-01 | NOT STARTED | — | — | — | |
| LRN-12 | Spaced repetition for weak items | V1 | ANA-02 | NOT STARTED | — | — | — | |
| LRN-13 | Rollover Lab (experimental) | V2 | ENG-01 | NOT STARTED | OFF | ENG-FIXTURE-E01/E02/E03 | — | **DUPLICATE of MST-13** (same feature, two IDs). Marked `[H]` unproven |
| LRN-14 | AI coach grounded in own stats | LATER | — | NOT STARTED | OFF | — | — | **CONFLICT:** LATER vs impl-guide V2. no medical claims |

## PRG — Programmer track (master spec §5.4, design §7)

| ID | name | tag | depends-on | status | flag | test IDs | evidence | notes |
|---|---|---|---|---|---|---|---|---|
| PRG-01 | Token-aware engine (Tree-sitter WASM / lexer) | MVP | ENG-01, ENG-05 | IN PROGRESS | — | TOK-FIXTURE-001..007 | LAB PROXY | real Tree-sitter WASM reproduces chapter 9 §9.2.1's token map |
| PRG-02 | Language packs (initial set) | MVP | CNT-04 | NOT STARTED | — | TOK-FIXTURE-004 | — | ADR-007: build the **listed** set — JS/TS/JSX, Python, Java, SQL, HTML/CSS (6), not "3–5" |
| PRG-03 | Layout-aware symbol maps, Shift/AltGr, OS profiles | MVP | LOC-01 | NOT STARTED | — | T0-GEN-008, T0-GEN-009 | — | AltGr chars currently return `unknown` (human action) |
| PRG-04 | Safety: display-only, sanitized, never execute | MVP | PRG-01 | IN PROGRESS | — | — | LAB PROXY | **absolute prohibition.** DEMOTED from DONE-VERIFIED: it held only because no snippet renderer exists yet (grep for `sanitiz`/`dangerouslySetInnerHTML`/`eval`/`new Function` in `apps/` finds nothing). The row's own note said 'safety audit at Phase 6 exit' — a *pending* audit cannot be a verified row. Must be re-verified when the renderer lands |
| PRG-05 | Positioning: no ability/hiring claims in copy | MVP | — | NOT STARTED | — | — | — | **absolute prohibition.** DEMOTED from DONE-VERIFIED: the attack pass found **no enforcement of any kind** — no lint rule, no test, no gate. `eslint.config.mjs` has exactly one custom rule (`no-restricted-properties` on `Date.now`). Needs a copy-claims check before it can be verified |
| PRG-10 | Symbol Gym: categories, chords, symbol of the day | MVP | PRG-01, PRG-03 | NOT STARTED | — | — | — | |
| PRG-11 | Bracket Balance: nesting ladder, open→close latency | MVP | PRG-01 | NOT STARTED | — | TOK-FIXTURE-002, LVL-FIXTURE-006 | — | |
| PRG-12 | Strings & Escapes | MVP | PRG-01 | NOT STARTED | — | TOK-FIXTURE-003 | — | |
| PRG-13 | Numbers + Number Systems & IDs | MVP | CNT-05 | NOT STARTED | — | — | — | synthetic UUID/SHA/IP/ISO/semver only; **no real secrets** |
| PRG-14 | Naming Style Switcher + switch-cost metric | MVP | PRG-01 | NOT STARTED | — | TOK-FIXTURE-007, LVL-FIXTURE-007, LVL-FIXTURE-008 | — | 120 phrases × 7 styles = 840 cases |
| PRG-15 | IDE-Realism view (multi-line, highlighting, guides) | MVP | ENG-09, ENG-10 | NOT STARTED | — | — | — | the ID MOD-03 actually meant when it cited "PRG-09" |
| PRG-16 | Recall Mode: show → hide → type from memory | MVP-lite | PRG-02, CNT-04 | NOT STARTED | — | — | — | **CONFLICT:** `[MVP-lite → V1]`; V1 adds spaced scheduling (MST-12) |
| PRG-17 | Programmer Baseline (10 min) + 30-day retest | MVP | MOD-05 | NOT STARTED | — | — | — | retest cadence is EXTERNAL DECISION REQUIRED (ADR-008) |
| PRG-18 | Levels 1–30: bosses, stars, placement, test-out | MVP | PRG-01 | NOT STARTED | — | LVL-FIXTURE-001..008, CONSISTENCY-001/002/003 | — | no single-attempt gating |
| PRG-19 | Levels 31–60, Terminal/Data-Format/Autocomplete modes, Stack Packs, Train on Your Own Code, Polyglot Relay, Error Fingerprints, Compile-Safe Rate, Dev Prose, Template Blitz, Layout Lab, Chord Trainer, Regex Gym, Convention Packs | V1 | PRG-18 | NOT STARTED | OFF | — | — | **ADR-005: was "do not build until validated" → now build flag-OFF.** Own-code drills must be local-only, secret-scanned, ephemeral |
| PRG-20 | Edit Tasks, Situational Shortcuts, Bug Hunt, Vim/Emacs Gym, Snippet Expansion, Style-Guide Drills, Config/DevOps, Encodings, Bit-Twiddle | V2 | ENG-11 | NOT STARTED | OFF | — | — | ADR-005. Edit Tasks need an angle beyond VimGolf |
| PRG-21 | Assessment Simulator, Layout Advisor, Ergonomic Load View, Community Packs, Pair Race/Relay, Language Leagues, Bootcamp mode, AI Symbol Coach | LATER | — | NOT STARTED | OFF | — | — | **CONFLICT:** LATER vs impl-guide V2. Assessment Simulator is practice-only, never gating |
| ~~PRG-09~~ | — | — | — | — | — | — | — | **DOES NOT EXIST.** MOD-03 cites it; PRG-06/07/08 also absent. Broken cross-reference — use PRG-15 |

## ANA — Analytics and insights (master spec §5.5)

| ID | name | tag | depends-on | status | flag | test IDs | evidence | notes |
|---|---|---|---|---|---|---|---|---|
| ANA-01 | Results screen | MVP | ENG-05 | NOT STARTED | — | — | — | numbers must match server recomputation (INT-01) |
| ANA-02 | Keyboard heatmaps + typo arrows | MVP | ENG-01 | NOT STARTED | — | — | — | must include Shift/AltGr layers; colourblind-safe (A11Y-05) |
| ANA-03 | Bigram/trigram table, same-hand vs alternate | MVP | ENG-05 | NOT STARTED | — | ENG-AGG-FIXTURE-02 | LAB PROXY | aggregation exists in the engine; the table view does not |
| ANA-04 | Trends per content type, PB history, noise band | MVP | ANA-01 | NOT STARTED | — | — | — | noise band exists so users do not over-read one test |
| ANA-05 | Token-class dashboard, SFR, symbol error rate, confusion matrix | MVP | PRG-01 | NOT STARTED | — | — | — | |
| ANA-06 | Level Ladder, skill radar, Next Best Drill | MVP | PRG-18 | NOT STARTED | — | WM-FIXTURE-007, WM-INTEGRATION-001 | — | PTI composite index explicitly dropped (§6.8) |
| ANA-07 | Goal ETA from trend | MVP | LRN-06 | NOT STARTED | — | — | — | |
| ANA-08 | Export CSV/JSON + full deletion | MVP | — | NOT STARTED | — | — | — | |
| ANA-09 | Efficacy instrumentation: day-0, day-30 matched retest, holdout | MVP | ANA-04, USR-04 | NOT STARTED | — | — | — | **requires explicit opt-in consent.** cadence per ADR-008 |
| ANA-10 | Error taxonomy (substitution/omission/insertion/transposition/…) | V1 | ENG-05 | NOT STARTED | — | ENG-FIXTURE-H01, I01, I02, I03 | LAB PROXY | classification exists in the engine |
| ANA-11 | IKI distribution, correction-time share, pause analysis | V1 | — | NOT STARTED | — | — | — | |
| ANA-12 | Percentiles vs similar-level cohort | V1 | INT-01 | NOT STARTED | OFF | — | — | must note sample bias; no fixed-board bias |
| ANA-13 | Weekly report | V1 | ANA-04 | NOT STARTED | — | — | — | extended by RET-12 |
| ANA-14 | Programmer extras: BrPL, indentation drift, switch cost, compile-safe rate | V1 | PRG-19 | NOT STARTED | OFF | — | — | depends on a flag-gated row |
| ANA-15 | Public read API, webhooks, badges | LATER | — | NOT STARTED | OFF | — | — | overlaps EXT-01 |

## CNT — Content system (master spec §5.6)

| ID | name | tag | depends-on | status | flag | test IDs | evidence | notes |
|---|---|---|---|---|---|---|---|---|
| CNT-01 | Corpus pipeline: license per item, dedupe, sensitive filter, tags | MVP | — | IN PROGRESS | — | — | LAB PROXY | **enforced license gate works** (Session 2: `pnpm check:licenses` + non-vacuous gate proofs). Corpus itself not loaded |
| CNT-02 | Typability score → difficulty band | MVP | CNT-01 | NOT STARTED | — | — | — | Stage A only: band shown, no score multiplication. Does not cover code/symbol text |
| CNT-03 | Weakness-targeted selection by retrieval | MVP | CNT-01, LRN-02 | NOT STARTED | — | — | — | |
| CNT-04 | Code snippet library, permissive licences only | MVP | CNT-01 | IN PROGRESS | — | CODE-JS-P01/P02/P03 (DO NOT SHIP) | LAB PROXY | 34 original JS snippets + 58 specs written. **P01/P02/P03 blocked** |
| CNT-05 | Seeded generators: numbers, IDs, naming, brackets, strings | MVP | CNT-01 | NOT STARTED | — | T0-GEN-001..010 | — | deterministic per seed; **no real data** |
| CNT-06 | Attribution page + takedown process | MVP | CNT-01 | NOT STARTED | — | — | — | |
| CNT-07 | Do NOT import Monkeytype (GPL-3.0) word lists/quotes | MVP policy | — | NOT STARTED | — | — | — | **absolute prohibition.** DEMOTED from DONE-VERIFIED: the row claimed it was 'enforced by the license gate'. **That is false.** `scripts/check-licenses.mjs` scans npm production deps in `apps/`+`packages/` only; it never reads `content/` or `docs/content-*.md`. It enforces D12 (dependency copyleft), a different rule. Needs a content-corpus licence gate |
| CNT-08 | Real-world business text (original or synthetic) | V1 | CNT-01 | NOT STARTED | — | — | — | PII/secret scan required |
| CNT-09 | User-submitted content + moderation queue | V1 | CNT-01, ADM-02 | NOT STARTED | — | — | — | private custom text stays local |
| CNT-10 | Freshness: track seen items, daily passage | V1 | CNT-01 | NOT STARTED | — | — | — | |
| CNT-11 | Domain packs (legal, medical, transcription) | LATER | CNT-01 | NOT STARTED | OFF | — | — | ADR-005 |

## INT — Integrity / anti-cheat (master spec §5.7, design §9.6)

| ID | name | tag | depends-on | status | flag | test IDs | evidence | notes |
|---|---|---|---|---|---|---|---|---|
| INT-01 | Server recomputes metrics; reject mismatches | MVP | ENG-05 | NOT STARTED | — | — | — | **never skipped or flagged away** (18.4) |
| INT-02 | Plausibility checks: key-rate floor, min IKI, impossible rollover, timing distribution | MVP | INT-01 | NOT STARTED | — | INT-FIXTURE-001..006, INT-CHECK-006/007 | — | flags, does not ban |
| INT-03 | Signed sessions: server seed/nonce/text hash, TTL, single use | MVP | INT-01 | NOT STARTED | — | — | — | **never skipped or flagged away** (18.4) |
| INT-04 | Rate limiting / abuse protection per IP/account/device | MVP | — | IN PROGRESS | — | apps/api/tests/security.test.ts | LAB PROXY | DEMOTED from DONE-VERIFIED: `@fastify/rate-limit` is `max: 100`, `timeWindow: 1 minute`, keyed by **IP only**. The spec asks per **IP/account/device**; account and device are absent. The row also claimed the 100/min default was 'proven by a 429 test' — that test passes `rateLimitMax: 3`, so it proves the limiter fires, not the default |
| INT-05 | Risk-scoring workers; flagged results held with visible "under review" | V1 | INT-01, INT-02 | NOT STARTED | — | INT-FIXTURE-005 | — | **gates public boards (INT-10)** |
| INT-06 | Verification re-test (fresh text) or video proof for top ranks | V1 | INT-05 | NOT STARTED | — | — | — | **gates public boards** |
| INT-07 | Public policy, categorised reasons, appeal form, false-positive rate | V1 | INT-05 | NOT STARTED | — | — | — | **gates public boards.** hold rather than instant-ban when unsure |
| INT-08 | Separate ranked (strict) from practice modes | V1 | INT-05 | NOT STARTED | — | — | — | **gates public boards** |
| INT-09 | Community reports, moderator replay review, ML on IKI | LATER | INT-05, ADM-02 | NOT STARTED | OFF | — | — | |
| INT-10 | No public leaderboards until INT-05…INT-08 are live | Policy | INT-05..08 | NOT STARTED | — | — | — | **absolute prohibition.** build-order constraint: INT-05..08 before CMP-01/CMP-02 |

## CMP — Competition and social (master spec §5.8, all V1+)

| ID | name | tag | depends-on | status | flag | test IDs | evidence | notes |
|---|---|---|---|---|---|---|---|---|
| CMP-01 | Leaderboards: daily/weekly/all-time, segmented, verified only | V1 | INT-05..08 | NOT STARTED | OFF | — | — | **INT-10 gate.** flag OFF; no trace in the typing flow while OFF |
| CMP-02 | Real-time races 2–5 players | V1 | INT-10, NFR-05 | NOT STARTED | OFF | — | — | **INT-10 gate.** this row is what first requires real-time infra (18.6) |
| CMP-03 | Ghost races (PB, friend, top replay) | V1 | ENG-08 | NOT STARTED | OFF | — | — | **DUPLICATE:** overlaps ENG-12 / RET-17 — three IDs, one capability |
| CMP-04 | Accuracy-aware racing + post-race coaching | V1 | CMP-02 | NOT STARTED | OFF | — | — | racing must not reward speed over accuracy (PP-09) |
| CMP-05 | Friends + challenge links (same text seed) | V1 | CMP-01 | NOT STARTED | OFF | — | — | |
| CMP-06 | Daily challenge (same text for all) | V1 | CMP-01 | NOT STARTED | OFF | — | — | |
| CMP-07 | Shareable result cards | V1 | CMP-01 | NOT STARTED | OFF | — | — | |
| CMP-08 | Leagues/clubs with skill brackets | V2 | INT-10 | NOT STARTED | OFF | — | — | **CONFLICT:** master spec V2 vs RET-15/16 V1 (same feature). Build once, flag OFF |
| CMP-09 | Tournaments with oversight | V2 | CMP-08 | NOT STARTED | OFF | — | — | |

## MOT — Motivation (master spec §5.9)

| ID | name | tag | depends-on | status | flag | test IDs | evidence | notes |
|---|---|---|---|---|---|---|---|---|
| MOT-01 | Streaks with grace/freeze; day counts at ≥ 5 focused minutes | MVP | — | REJECTED-BY-ANTI-GOAL | — | — | — | **ADR-006.** superseded by RET-05/06/07 (≥ 3 min, weekly-goal primary). As literally written it is a rigid single-attempt daily gate — a forbidden anti-goal. Not built in this form |
| MOT-02 | Session summary: improved / regressed / next | MVP | ANA-04 | NOT STARTED | — | — | — | extended by RET-10 |
| MOT-03 | No pay-to-win; paid items cosmetic only | MVP policy | — | NOT STARTED | — | — | — | **absolute prohibition.** DEMOTED from DONE-VERIFIED: vacuously true. No billing or monetisation code exists, and `BIZ-02`/`BIZ-03`/`OPS-09` are all NOT STARTED flag-OFF. 'Binding on BIZ-02/03' is enforced by nothing. Re-verify when billing lands |
| MOT-04 | XP/badges for improvement **quality**, not volume | V1 | ANA-04 | NOT STARTED | — | — | — | overlaps RET-14 |
| MOT-05 | Optional adult mini-games, off by default | LATER | — | NOT STARTED | OFF | — | — | off by default; never forced on adults |

## USR — Accounts, profile, privacy (master spec §5.10)

| ID | name | tag | depends-on | status | flag | test IDs | evidence | notes |
|---|---|---|---|---|---|---|---|---|
| USR-01 | Guest-first: full core use in local storage | MVP | — | NOT STARTED | — | — | — | non-blocking save prompt. extended by RET-02 |
| USR-02 | Sign-up/login (email, Google, GitHub), reset, sessions | MVP | — | NOT STARTED | — | — | — | OAuth providers = BLOCKED-EXTERNAL boundary (18.6) |
| USR-03 | Profile + privacy toggles | MVP | USR-02 | NOT STARTED | — | — | — | |
| USR-04 | Privacy controls: opt-in consent, export/delete, retention limits | MVP | ANA-08 | NOT STARTED | — | — | — | **never sell or share raw logs.** prerequisite for ANA-09 consent |
| USR-05 | Cross-device sync + conflict handling | V1 | USR-02 | NOT STARTED | — | — | — | |
| USR-06 | 18+ only at launch; age gate; no child-directed features | MVP | — | NOT STARTED | — | — | — | **absolute prohibition** on under-18 features. under-18s need verifiable parental consent + counsel |
| USR-07 | Organizations / classes | V2 | USR-02 | NOT STARTED | OFF | — | — | |

## CUS — UX customization (master spec §5.11)

| ID | name | tag | depends-on | status | flag | test IDs | evidence | notes |
|---|---|---|---|---|---|---|---|---|
| CUS-01 | Instant start; no ads/popups/modals on the typing surface | MVP | — | IN PROGRESS | — | — | — | **absolute prohibition.** DEMOTED from DONE-VERIFIED: the row cited `e2e/manual-engine-test.spec.ts`, which asserts nothing about popups, modals or ads (its 3 tests are typing/metrics). No such test exists. Needs a real test that the typing surface renders no overlay |
| CUS-02 | Themes, fonts (incl. dyslexia-friendly), caret style, focus mode | MVP | — | NOT STARTED | — | — | — | |
| CUS-03 | Full keyboard navigation + shortcuts | MVP | — | IN PROGRESS | — | e2e | LAB PROXY | Tab=restart works; Esc=menu not built. keyboard-only flow unverified |
| CUS-04 | On-screen keyboard overlay, theme builder, sound packs, command palette | V1 | CUS-02 | NOT STARTED | — | — | — | |

## A11Y — Accessibility (master spec §5.11)

| ID | name | tag | depends-on | status | flag | test IDs | evidence | notes |
|---|---|---|---|---|---|---|---|---|
| A11Y-01 | WCAG 2.2 AA for non-test UI; 200% text; reduced motion | MVP | — | NOT STARTED | — | — | — | duplicated by NFR-11 |
| A11Y-02 | No-timer practice, adjustable targets | MVP | — | NOT STARTED | — | — | — | fixes PP-20 |
| A11Y-03 | Screen-reader guided mode + audio cues | V1 | A11Y-01 | NOT STARTED | — | — | — | |
| A11Y-04 | One-handed learning tracks | V1 | LOC-01 | NOT STARTED | — | — | — | |
| A11Y-05 | High-contrast + colourblind-safe palettes **including heatmaps** | V1 | ANA-02 | NOT STARTED | — | — | — | never colour-only state cues |
| A11Y-06 | Audio feedback + captions | V2 | — | NOT STARTED | — | — | — | |

## LOC — Layouts and languages (master spec §5.12)

| ID | name | tag | depends-on | status | flag | test IDs | evidence | notes |
|---|---|---|---|---|---|---|---|---|
| LOC-01 | Layouts: QWERTY US/UK, Dvorak, Colemak-DH, AZERTY, QWERTZ | MVP | ENG-06 | IN PROGRESS | — | ENG-LAYOUT-MAPS, T0-GEN-008/009/010 | LAB PROXY | all 6 maps derived from physical key positions and verified. **not yet wired into the app; no real-keyboard confirmation** |
| LOC-02 | Custom keymap import (JSON) + symbol layers | V1 | LOC-01 | NOT STARTED | — | — | — | |
| LOC-03 | Non-English content packs | V1 | CNT-01 | NOT STARTED | — | — | — | |
| LOC-04 | Locale number/date/currency formats | V1 | CNT-08 | NOT STARTED | — | — | — | |
| LOC-05 | Indic scripts, Inscript/Remington, exam rules | LATER | — | NOT STARTED | OFF | — | — | **CONFLICT:** LATER vs impl-guide V2. ADR-005 |

## MOB — Mobile and offline (master spec §5.13)

| ID | name | tag | depends-on | status | flag | test IDs | evidence | notes |
|---|---|---|---|---|---|---|---|---|
| MOB-01 | Responsive site; honest about physical keyboards | MVP | — | NOT STARTED | — | — | — | |
| MOB-02 | PWA: installable, offline practice, sync | V1 | NFR-03 | NOT STARTED | — | ENG-FIXTURE-OFFLINE-01 | — | |
| MOB-03 | Mobile thumb-typing, separate metrics + boards | V1 | ENG-13 | NOT STARTED | OFF | — | — | **DUPLICATE of ENG-13.** separate boards must not bypass INT-10 |
| MOB-04 | Native wrapper if demand exists | LATER | MOB-02 | NOT STARTED | OFF | — | — | ADR-005 |

## WEL — Wellbeing and ergonomics (master spec §5.14)

| ID | name | tag | depends-on | status | flag | test IDs | evidence | notes |
|---|---|---|---|---|---|---|---|---|
| WEL-01 | Break reminders + session guidance | V1 | OPS-08 | NOT STARTED | — | — | — | opt-in; **no medical claims** |
| WEL-02 | Fatigue detection | V1 | — | NOT STARTED | — | — | — | **DUPLICATE of MST-15** |
| WEL-03 | Ergonomics tips | V1 | — | NOT STARTED | — | — | — | **no medical claims** |
| WEL-04 | Healthy-competition guardrails (daily race caps) | V2 | CMP-01 | NOT STARTED | OFF | — | — | |

## BIZ — Business (master spec §5.15)

| ID | name | tag | depends-on | status | flag | test IDs | evidence | notes |
|---|---|---|---|---|---|---|---|---|
| BIZ-01 | Free core; no interstitial ads or upsell popups | MVP | — | NOT STARTED | — | — | — | **absolute prohibition.** DEMOTED from DONE-VERIFIED: vacuously true — nothing is monetised. The 'LAB PROXY' label was a category error; there was no lab. Re-verify when billing lands |
| BIZ-02 | Supporters (donation/one-time/recurring), cosmetic perks | V1 | OPS-09 | NOT STARTED | OFF | — | — | ADR-005. payments = BLOCKED-EXTERNAL boundary |
| BIZ-03 | Pro tier (deep analytics, cloud replays, own-code drills) | V1 test | OPS-09 | NOT STARTED | OFF | — | — | **CONFLICT:** paid deep analytics can read as selling competitive advantage, contradicting MOT-03. HARD RULE: a paid tier must never affect ranking or comparison |
| BIZ-04 | Teams/coach dashboards, pilot with 1–2 bootcamps | V2 pilot | USR-07 | NOT STARTED | OFF | — | — | **CONFLICT:** V2 pilot vs impl-guide V1-15. impl guide writes "privacy rules for minors/adults" which contradicts USR-06 (18+ only) |
| BIZ-05 | Verified certificates/assessments | V2 validate | INT-06 | NOT STARTED | OFF | — | — | **highest outcome-claim risk.** spec says "decide only after data". Claims prohibition stays attached |
| BIZ-06 | No dark patterns | Policy | — | NOT STARTED | — | — | — | **absolute prohibition.** DEMOTED from DONE-VERIFIED: the row itself conceded it is 'trivially true' because no billing exists. Trivially true is not verified. Re-verify when OPS-09 lands |

## OPS — Operations, legal, support (master spec §5.16)

| ID | name | tag | depends-on | status | flag | test IDs | evidence | notes |
|---|---|---|---|---|---|---|---|---|
| OPS-01 | Onboarding: goal, level, layout, languages; skippable | MVP | — | NOT STARTED | — | — | — | produces a starting plan |
| OPS-02 | Legal: Terms, Privacy, Cookies, DMCA, content licences | MVP | — | NOT STARTED | — | — | — | drafts stay `DRAFT COMPLETE` + EXTERNAL LEGAL REVIEW REQUIRED |
| OPS-03 | Marketing/SEO pages, docs, "How we calculate" | MVP-lite | OPS-06 | NOT STARTED | — | — | — | **CONFLICT:** `[MVP-lite]` vs `[MVP-lite → V1]` inside one document |
| OPS-04 | In-app feedback, public roadmap, changelog | MVP | — | NOT STARTED | — | — | — | |
| OPS-05 | Backups with tested restore; retention job expiring raw logs | MVP | NFR-17 | NOT STARTED | — | — | — | must be tested with a fake clock |
| OPS-06 | Metric-model versioning: stamp every result, recalc policy, changelog | MVP | ENG-05 | IN PROGRESS | — | e2e/manual-engine-test.spec.ts, e2e/parity/parity.spec.ts | LAB PROXY | DEMOTED from DONE-VERIFIED: `ENGINE_MODEL_VERSION 1.0.0` is really stamped and really asserted, but the spec asks for **three** things and only one exists — the **recalculation policy** and the **public changelog** are missing. Also contradicted NFR-15 (`How we calculate` + changelog) marked NOT STARTED in this same file |
| OPS-07 | Physical keyboard/OS quirks; ANSI vs ISO; Mac vs Win; auto-detect + override | MVP | LOC-01 | NOT STARTED | — | — | — | |
| OPS-08 | Notifications with preferences and quiet hours | V1 | USR-02 | NOT STARTED | — | — | — | ≤ 1/day, opt-in, no guilt. extended by RET-11 |
| OPS-09 | Billing: cards + UPI, invoices/tax, refunds, dunning, regional pricing | V1 | BIZ-02 | NOT STARTED | OFF | — | — | **BLOCKED-EXTERNAL at the boundary** (18.6). never execute a real charge |
| OPS-10 | Support desk, help centre, community, moderation policy | V1 | OPS-04 | NOT STARTED | — | — | — | |
| OPS-11 | Account security: 2FA, device/session list, recovery | V1 | USR-02 | NOT STARTED | — | — | — | |
| OPS-12 | Status page + incident runbook | V1 | — | NOT STARTED | — | — | — | |
| OPS-13 | Privacy-friendly analytics; no third-party trackers in the test flow | MVP | NFR-09 | DONE-VERIFIED | — | packages/telemetry 97 tests, canary | LAB PROXY | **absolute prohibition.** 22-event allowlist, compile-time + runtime rejection, `CANARY_TYPED_TEXT_9F3A` proven absent across the canary suite. **Correction:** the row claimed 'all six paths'; the canary file has more `it()` blocks than that. Also: `@realtype/telemetry` is imported by nothing in `apps/` yet, so 'no third-party trackers in the test flow' currently holds by total absence — the package is not wired in yet |
| OPS-14 | Accessibility statement + periodic audits | V1 | A11Y-01 | NOT STARTED | — | — | — | |

## ADM — Admin and experimentation (master spec §5.17)

| ID | name | tag | depends-on | status | flag | test IDs | evidence | notes |
|---|---|---|---|---|---|---|---|---|
| ADM-01 | Admin console: content CRUD, flags, user lookup, result review, feedback | MVP-lite | OPS-13 | NOT STARTED | — | — | — | roles + audit log; no raw logs by default |
| ADM-02 | Moderation tools, audit log | V1 | ADM-01 | NOT STARTED | — | — | — | |
| ADM-03 | Experimentation framework + guardrail metrics | V1 | ANA-09 | NOT STARTED | — | — | — | **CONFLICT (resolved):** master spec V1 vs retention §10.3 "move a minimal version to MVP" vs impl-guide M4-14. MVP placement required because RET-20 [MVP] depends on it. **Experiments must be tied to ANA-09 opt-in consent or they are hidden trials** |
| ADM-04 | Content ops workflow (review → QA → publish) | V1 | CNT-01 | NOT STARTED | — | — | — | |

## EXT — Integrations (master spec §5.18, all LATER)

| ID | name | tag | depends-on | status | flag | test IDs | evidence | notes |
|---|---|---|---|---|---|---|---|---|
| EXT-01 | Public API with personal keys; Discord bot | LATER | INT-01 | NOT STARTED | OFF | — | — | **CONFLICT:** §5.18 "all LATER" vs impl-guide V2 |
| EXT-02 | Opt-in browser extension, local-only aggregates, **no content capture** | LATER | — | NOT STARTED | OFF | — | — | **absolute prohibition:** no content capture. CONFLICT: LATER vs impl-guide V2 |
| EXT-03 | IDE plugins (local-only) | LATER | PRG-01 | NOT STARTED | OFF | — | — | CONFLICT: LATER vs impl-guide V2 |
| EXT-04 | Embeddable widgets | LATER | ANA-15 | NOT STARTED | OFF | — | — | |

## MST — Mastery and training (retention playbook §10.1)

| ID | name | tag | depends-on | status | flag | test IDs | evidence | notes |
|---|---|---|---|---|---|---|---|---|
| MST-01 | Session blueprint engine (5/15/30 min: warm-up→focus→push→real-world→retest) | MVP | ANA-02, LRN-02 | NOT STARTED | — | — | — | plan shown up front, shortenable to 5 min, ends with summary |
| MST-02 | Hardest-transition selection → focus sets from natural words | MVP | LRN-02 | NOT STARTED | — | WM-INTEGRATION-001 | — | extends LRN-02 |
| MST-03 | Focus/Push alternation with different scoring rules | MVP | MST-01 | NOT STARTED | — | — | — | |
| MST-04 | Drill difficulty targeting (~85–95% band), Gentler/Sharper | MVP | MST-01 | NOT STARTED | — | — | — | `[H]` hypothesis. safety valve after two low-accuracy sets |
| MST-05 | Feedback cards: improved / regressed / next, noise band | MVP | ANA-04 | NOT STARTED | — | — | — | extends ANA-04 |
| MST-06 | Anti-gaming mastery rules (best 3 of 5 on varied text) | MVP | LRN-04 | NOT STARTED | — | LVL-FIXTURE-001 | — | extends LRN-04. never gate all progress behind one item |
| MST-07 | Consistency/rhythm trainer, optional beat cue | V1 | ENG-01 | NOT STARTED | OFF | — | — | `[H]` unproven — ship as an experiment |
| MST-08 | Preview-span probe and trainer | V1 | — | NOT STARTED | OFF | — | — | `[H]` experiment ER-9 |
| MST-09 | Hand-alternation drills personalised to the user | V1 | ANA-03 | NOT STARTED | — | — | — | |
| MST-10 | Plateau detection with reasoned interventions | V1 | ANA-04 | NOT STARTED | — | WM-FIXTURE-010, WM-FIXTURE-016 | — | extends LRN-10. must not false-flag a genuinely improving user |
| MST-11 | Draft Sprint for writers (no backspace, blur mode, word goals) | V1 | MOD-06 | NOT STARTED | — | — | — | text NOT stored by default |
| MST-12 | Spaced review scheduling for recall items | V1 | PRG-16 | NOT STARTED | — | — | — | extends PRG-16 |
| MST-13 | Rollover Lab | V2 | ENG-01 | NOT STARTED | OFF | ENG-FIXTURE-E01/E02/E03 | — | **DUPLICATE of LRN-13.** `[H]` unproven |
| MST-14 | Evening→morning retest option | V1 | ANA-09 | NOT STARTED | OFF | — | — | `[H]` experiment ER-10. **no claims until measured** |
| MST-15 | Fatigue guard: suggest stopping on sharp degradation | V1 | WEL-02 | NOT STARTED | — | — | — | **DUPLICATE of WEL-02** |

## RET — Retention and habit (retention playbook §10.2)

| ID | name | tag | depends-on | status | flag | test IDs | evidence | notes |
|---|---|---|---|---|---|---|---|---|
| RET-01 | First-session win: 60 s test → 3 weak spots → 2 min drill → retest | MVP | ANA-02, MST-02 | NOT STARTED | — | — | — | the differentiator; Phase 5 exit criterion |
| RET-02 | Deferred sign-up (non-blocking, after first result) | MVP | USR-01 | NOT STARTED | — | — | — | extends USR-01 |
| RET-03 | Goal presets (speed, symbol errors, words/day) + ETA | MVP | LRN-06 | NOT STARTED | — | — | — | extends LRN-06 |
| RET-04 | If-then practice plan with optional cue | MVP | OPS-08 | NOT STARTED | — | — | — | reminders are the V1 part |
| RET-05 | Minimum viable session: ≥ 3 focused minutes counts | MVP | — | NOT STARTED | — | — | — | **ADR-006:** 3 min, superseding MOT-01's 5 |
| RET-06 | Weekly-goal streak as primary; optional daily streak | MVP | RET-05 | NOT STARTED | — | — | — | primary streak; no shame |
| RET-07 | Earned freezes + pause mode | MVP | RET-06 | NOT STARTED | — | — | — | earned by practice, **never by purchase** |
| RET-08 | Today card + tomorrow's plan | MVP | MST-01 | NOT STARTED | — | — | — | |
| RET-09 | Non-gamified mode toggle | MVP | — | NOT STARTED | — | — | — | a supported product state, not a punishment |
| RET-10 | Session summary with personal records | MVP | MOT-02 | NOT STARTED | — | — | — | extends MOT-02 |
| RET-11 | Notification system (≤ 1/day, quiet hours, no guilt) | V1 | OPS-08 | NOT STARTED | — | — | — | extends OPS-08 |
| RET-12 | Weekly review | V1 | ANA-13 | NOT STARTED | — | — | — | extends ANA-13 |
| RET-13 | Welcome-back flow for lapsed users (2–3 / 7 / 30+ days) | V1 | RET-05 | NOT STARTED | — | — | — | **no streak shaming** |
| RET-14 | Competence XP, weekly quests, daily challenge | V1 | MOT-04 | NOT STARTED | — | — | — | XP tied to competence, diminishing for raw minutes |
| RET-15 | Clubs with shared weekly goals | V1 | USR-03 | NOT STARTED | OFF | — | — | **CONFLICT with CMP-08 [V2]** — same feature, build once |
| RET-16 | Skill-bracket leagues (opt-out), percentile views, verified only | V1 | INT-10, INT-01 | NOT STARTED | OFF | — | — | **CONFLICT with CMP-08 [V2].** verified results only |
| RET-17 | Ghost races vs your past self | V1 | CMP-03 | NOT STARTED | OFF | — | — | **DUPLICATE:** CMP-03 / ENG-12 / RET-17 |
| RET-18 | Cosmetic unlocks earned by consistency | V1 | MOT-03 | NOT STARTED | — | — | — | cosmetic only, never competitive advantage |
| RET-19 | Coach/teacher plans and cohort challenges | V2 | BIZ-04 | NOT STARTED | OFF | — | — | **TENSION with USR-06** (18+ only) via student personas |
| RET-20 | Retention + guardrail instrumentation (events, cohorts, assignment) | MVP | ANA-09, ADM-03 | NOT STARTED | — | — | — | must not become engagement analytics on keystroke content |
| RET-21 | Ethics checklist enforced in review for every engagement feature | Policy | — | NOT STARTED | — | — | — | **absolute gate on all RET rows** |

## NFR — Non-functional requirements (master spec §8, untagged in source)

| ID | name / target | tag | depends-on | status | flag | test IDs | evidence | notes |
|---|---|---|---|---|---|---|---|---|
| NFR-01 | Input latency p95 ≤ 16 ms, measured in CI | UNTAGGED | ENG-02 | IN PROGRESS | — | spike S1 | LAB PROXY | lab p95 15.2 ms — only 5% under budget. REAL-DEVICE still required |
| NFR-02 | Typing page interactive ≤ 1.5 s; test JS ≤ ~200 KB gzip; parsers lazy | UNTAGGED | — | IN PROGRESS | — | `pnpm check:bundle` | LAB PROXY | 71.1 KB gzip of 200 KB, gate proven non-vacuous after Session 4 found two blind spots |
| NFR-03 | Offline safety: core tests run if backend down; queue + sync | UNTAGGED | MOB-02 | NOT STARTED | — | ENG-FIXTURE-OFFLINE-01 | — | |
| NFR-04 | API: submit p95 ≤ 500 ms; V1 leaderboard read ≤ 200 ms | UNTAGGED | INT-01 | NOT STARTED | — | — | — | |
| NFR-05 | V1 realtime: race message p95 ≤ 100 ms same region | UNTAGGED | CMP-02 | NOT STARTED | OFF | — | — | needs real-time infra (18.6) |
| NFR-06 | 99.9% monthly availability for API after MVP | UNTAGGED | — | NOT STARTED | — | — | — | |
| NFR-07 | Scale: MVP ~10k MAU; design 100k DAU × 5 tests/day | UNTAGGED | — | NOT STARTED | — | — | — | |
| NFR-08 | Security: OWASP ASVS L1→L2, strict CSP, rate limit, dep scanning | UNTAGGED | INT-04 | IN PROGRESS | — | apps/api security tests | LAB PROXY | helmet CSP + rate limiting + redaction land. ASVS L1→L2 audit not done |
| NFR-09 | Privacy: GDPR + India DPDP; minimisation; opt-in research; no trackers in test flow | UNTAGGED | USR-04 | IN PROGRESS | — | telemetry canary | LAB PROXY | scrubbing proven; the DPDP/GDPR posture itself is unverified |
| NFR-10 | Compatibility: latest 2 of Chrome/Edge/Firefox/Safari; iOS | UNTAGGED | — | NOT STARTED | — | — | — | Firefox/WebKit e2e still commented out |
| NFR-11 | Accessibility: WCAG 2.2 AA (non-test UI) | UNTAGGED | A11Y-01 | NOT STARTED | — | — | — | duplicate of A11Y-01 |
| NFR-12 | Testing: golden, property, Playwright e2e, latency harness; V1 load tests | UNTAGGED | — | IN PROGRESS | — | 114 named test IDs | LAB PROXY | harness strong; 114 named IDs tracked, many not yet written |
| NFR-13 | Observability: structured logs, metrics, error tracking, dashboards | UNTAGGED | OPS-13 | NOT STARTED | — | — | — | real error tracking is an external account |
| NFR-14 | i18n: externalised strings; RTL-ready | UNTAGGED | LOC-03 | NOT STARTED | — | — | — | |
| NFR-15 | Docs: "How we calculate", privacy, anti-cheat policy, changelog | UNTAGGED | OPS-06 | NOT STARTED | — | — | — | |
| NFR-16 | Bundle budget enforced in CI | UNTAGGED | NFR-02 | DONE-VERIFIED | — | `pnpm check:bundle` | LAB PROXY | gate measures the whole `dist/`, source maps excluded, so it caught a CSS data-URI and a `public/` asset that the previous whole-JS-only version missed. **Correction:** 'proven on 4 vectors' was manual probing in Session 4, not an automated proof — there is no `check-bundle-size.test.mjs`, unlike `check-licenses.test.mjs`. A non-vacuity test is owed |
| NFR-17 | Data integrity: versioned schemas + migrations; tested backups | UNTAGGED | OPS-05 | NOT STARTED | — | — | — | |

---

## Data-integrity warnings (do not merge these namespaces)

1. **`PRG-09` does not exist.** `MOD-03` cites it for IDE-realism options. `PRG-06`, `PRG-07`, `PRG-08` are also absent. The real row is `PRG-15`. This is a broken cross-reference in the spec, not a missing feature.
2. **Two unrelated "E" numbering systems.** Chapter 4 §4.9 defines Named Edge Cases `E1`–`E10` (decisions required). §4.13 defines fixtures `ENG-FIXTURE-E01`–`E09` (rollover ratios) plus `E-CAPS`, `E-DEADKEY`, `E-EMOJI`, `E-PASTE`, `E-DUALKEY`. They are cross-referenced but not the same scheme. Never merge them in the tracker.
3. **`WM-FIXTURE-009a`/`-009b` do not exist in the source.** Session 3 constructed them fresh after the chapter's plateau example failed arithmetic verification; the canonical ID is `WM-FIXTURE-009-plateau-detection-noise-vs-trend`. See `docs/CHAPTER-ARITHMETIC-CORRECTIONS.md` item 5.
4. **Duplicate requirements exist under multiple IDs.** `LRN-13`/`MST-13` (Rollover Lab) · `ENG-13`/`MOB-03` (mobile) · `CMP-03`/`RET-17`/`ENG-12` (ghost) · `WEL-02`/`MST-15` (fatigue) · `CMP-08`/`RET-15`/`RET-16` (leagues). Each is tracked once; the other IDs point at the same row rather than double-counting it.
5. **Extension pairs are intentional.** `MST-02`/LRN-02, `MST-05`/ANA-04, `MST-06`/LRN-04, `MST-10`/LRN-10, `MST-12`/PRG-16, `RET-02`/USR-01, `RET-11`/OPS-08, `RET-12`/ANA-13 — the retention playbook says "extends X". Both IDs are tracked; one feature.

## Anti-goal rejections

`MOT-01` is the only row marked `REJECTED-BY-ANTI-GOAL` (ADR-006): a rigid ≥5-minute daily streak is single-attempt progress gating, which Section 18.5 forbids. Its intent survives in RET-05/06/07.

## Unresolved external decisions

| Item | Status | Where |
|---|---|---|
| Retest cadence — day 0/30 vs 0/30/60 vs 0/14/30 | `EXTERNAL DECISION REQUIRED` | ADR-008; implemented as a config value, default day 0/30 |
