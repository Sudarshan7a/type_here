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
| DONE-VERIFIED | 15 |
| IN PROGRESS | 19 |
| NOT STARTED | 181 |
| LAUNCH-GATED | 0 |
| BLOCKED-EXTERNAL | 0 |
| DEFERRED-BY-HUMAN | 0 |
| REJECTED-BY-ANTI-GOAL | 1 |
| **Total** | **216** |

| rows carrying a launch flag | 45 |
| rows with no flag | 171 |

Progress is reported as:

    MVP x/97 | V1 x/74 | V2 x/12 | LATER x/13 | UNTAGGED x/20 | LAUNCH-GATED n | BLOCKED-EXTERNAL n | REJECTED n | overall x/216

**`UNTAGGED` is not optional prose — it is 20 rows.** It was missing from this
format until Session 6, and the effect was that every report printed denominators
summing to 196 next to `overall x/216`. The buckets are: the 17 `NFR-*` rows, whose
table in `docs/spec/master-spec-v1.md` §8 has **no tag column at all**, and the
three rows the spec tags literally `[Policy]` (`INT-10`, `BIZ-06`, `RET-21`). A
ledger with no untagged rows must still print the slot if the rows exist, which is
what `pnpm check:ledger` now enforces against this file and `BUILD-LOG.md`.

A row reaches `DONE-VERIFIED` only with test-first evidence and a green gate. A row
is `LAUNCH-GATED` only once it has been **built and tested with its flag both ON and
OFF** and the flag is OFF — so those two states are distinct on purpose.

---

## ENG — Typing engine (master spec §5.1)

| ID | name | tag | depends-on | status | flag | test IDs | evidence | notes |
|---|---|---|---|---|---|---|---|---|
| ENG-01 | Keystroke capture, high-res timestamps, order preserved | MVP | — | DONE-VERIFIED | — | ENG-FIXTURE-E01/E02/E03, ENG-STATE-PROP-01, apps/web/tests/input-adapter.test.ts | LAB PROXY | keydown+keyup both captured; overlapping keys kept in order (proven by the E01/E02/E03 fixtures, not by A01 — A01 builds synthetic keyups). **Known defect found by the attack pass:** `input-adapter.ts` writes marker timestamps as absolute `performance.now()` while events are origin-relative, and no test asserts any marker `t`. Benign today (the engine only tests marker *presence*) but a live trap for the pause logic ENG-04 depends on |
| ENG-02 | Feedback within one frame; no network during a test | MVP | — | DONE-VERIFIED | — | spike S1, e2e/typing-surface.spec.ts AC1/AC2, e2e/latency-surface.spec.ts, e2e/no-network.spec.ts | LAB PROXY | **Session 7: the product surface now exists, so this is measurable in the real app for the first time** — but it is not yet measured. The keystroke path writes character states, the caret transform and the live figures through refs inside one `requestAnimationFrame`; React state changes only on start/pause/finish; character offsets are measured once per text and on resize, never per keystroke, so there is no forced layout in the keystroke path. Spike p95 is still 15.2 ms, only 5% under the 16 ms budget. **Still open:**
measuring input-to-paint in this surface (NFR-01), and the no-network-during-a-test assertion. **Loop WAVE 0.1 (PR #15):** the first half is now measured — `e2e/latency-surface.spec.ts` drives the real surface, n=320, p50 ~6ms, p95 14.1–14.9ms local and green on the CI runner, 0 long tasks >50ms, mutant-proven (25ms spin per keystroke → p95 26.2 FAIL, reverted PASS). Suite pinned to 1 worker so ambient load cannot fail the gate. **Still open:** the no-network-during-a-test assertion. **Loop closeout (PR #17 + #18, spec-checker verified):** assertion landed — `e2e/no-network.spec.ts` (zero HTTP requests + zero websockets, first keystroke through finish + 1s settle, mutant-proven with an injected POST, reverted green; repo-wide grep confirms zero fetch/XHR/WebSocket/beacon in `apps/web/src`). Latency attribution corrected to the typing window (PR #18: longtask buffer resets after caret-ready, boot work out of scope, assertion still zero, mutant-proven with a 60ms app-keydown burn → 320 long tasks FAIL). Spec-checker: no missing/divergent AC on main; DoD holds as LAB PROXY, Chromium-only. Firefox/WebKit + REAL-DEVICE follow-ups live on NFR-01. Row DONE-VERIFIED. |
| ENG-03 | Char states + error modes free/must-correct/stop-on-error | MVP | ENG-01 | DONE-VERIFIED | — | ENG-FIXTURE-D01, D02, D03, D04 | LAB PROXY | free + must-correct land. **D02 stop-on-error shipped in Session 5 (full fixture). Session 6: the `errorMode` enum blocker is RESOLVED — CONTRACT_VERSION 1.2.0 → 1.3.0 with `no-backspace` (D03) and `word-locked` (D04), approved by STEER-1. D03's and D04's *fixtures* are now constructible and are the next work. D04 word-locked engine behaviour landed in Session 6 (6 unit tests): a wrong char inside a word is kept and visible, Backspace still works, and the caret is held at the word boundary until the word is correct. Telemetry's hand-copied ERROR_MODES/SETTING_VALUES drift is now a test failure, not a runtime surprise. **Session 7: the character-state derivation landed** — `deriveCharStates` in packages/engine returns one of untyped/correct/incorrect/extra/missed per visible character, and the surface paints from it rather than comparing characters itself, so the view cannot disagree with the engine that scored the test. "Missed" is only knowable once the attempt is over; mid-test an unreached character is `untyped`, because calling it missed would be a false statement about a test still running. 12 tests, including one that pins the number of characters painted correct to the engine's own `correctCharsInFinalText`. **Still open:** D03's and D04's fixtures. **Loop WAVE 0.2 (PR #14):** landed — `packages/engine/fixtures/d03.ts` (no-backspace ignored, final `the xat sat`, KSPC exactly 1.00) + `d04.ts` (word-locked boundary hold, `the cat sat` after correction) with hand-computed expectations, pin/degenerate tests, engine 137/137, mutant-proven, `src/` untouched. Follow-up landed (PR #19): d02/d03/d04 in both parity lists (`parity.spec.ts` / `page.html`), parity 2/2 green, mutant-proven (d04 removed browser-side only → PARITY-01 FAILS); stale D03 enum comment fixed. Spec-checker: all five modes + char states DONE, §6 numbers independently recomputed to match, no divergences, DoD holds. Row DONE-VERIFIED. |
| ENG-04 | Start on first keystroke; timer from timestamps | MVP | ENG-01 | DONE-VERIFIED | — | ENG-STATE-01..07, ENG-STATE-PROP-01 | LAB PROXY | scored duration excludes pauses exactly; backgrounding cannot inflate speed (1000-sequence property test) |
| ENG-05 | One shared metrics library, client + server | MVP | — | DONE-VERIFIED | — | ENG-FIXTURE-A01/B01/C01/F01/G01, ENG-PARITY-01/02 | LAB PROXY | golden vectors; Node/Chromium agree to 1e-9 |
| ENG-06 | Layout-aware input; dead keys; Caps/Shift; IME limits | MVP | ENG-01 | DONE-VERIFIED | — | ENG-LAYOUT-MAPS, ENG-FIXTURE-E-CAPS, E-DEADKEY, E-DUALKEY, ENG-PARITY-03 | LAB PROXY | 6 layouts derived from physical key positions and verified (same-finger 14.8–16.0%). **Loop WAVE 0.3 (PRs #21/#22, spec-checker verified):** E-CAPS (case-error subtype, `code` attribution), E-DEADKEY (one char, combined span), E-EMOJI (grapheme unit via Intl.Segmenter), IME guard (partials never score, CONTRACT 1.4.0), E-DUALKEY (`fingerTagForEvents`, 42-cell PARITY-03), 12 verified AltGr productions (rest stay `unknown`, documented). All hand-computed, mutant-proven, no existing number moved, CI green. Dispositions: (1) W1 metrics-denominator anomaly (UTF-16 vs grapheme — spec §6.1 says "characters" without defining the unit; engine compares graphemes) is an OWNED metrics-slice follow-up (denominators + modelVersion bump + `/how-we-calculate`), not a blocker — passages are ASCII-only so impact is nil today; (2) 42-cell matrix + map pins count as the six-layout suites; (3) MVP scope is `colemak-dh` (plain Colemak out of scope per LAYOUT-VERIFICATION — owner to confirm, item filed). Row DONE-VERIFIED as LAB PROXY. |
| ENG-07 | Ignore `isTrusted=false`; block paste/drop/autofill | MVP | — | IN PROGRESS | — | ENG-FIXTURE-E-PASTE, INT-FIXTURE-001/002 | LAB PROXY | **Loop WAVE 0.4 (PRs #25/#26, security-auditor PASS-WITH-NOTES, spec-checker reviewed):** client half CLOSED — paste + drop prevented at DOM (drop was missing), both + autofill-no-hook pinned by `e2e/input-block.spec.ts` (mutant-proven, TDD red→green). Backstop helpers DONE — `plausibility.ts` (windowMeans/flagSustainedFloor/singleOutliers/flagPasteBurst, pure + threshold-injected, opaque codes only), INT-FIXTURE-001/002 + E-PASTE hand-computed, 18/18 green, zero policy literals in src, no modelVersion bump. Stays IN PROGRESS: no route consumes the helpers yet — server consumption (pre-filtered scoring presses → calibrated floors → opaque flags) rides WAVE-1 INT-01/03 with the auditor's wiring constraints (never promote test `[proposal]` numbers, rotate floors, log outputs only). |
| ENG-08 | Replay from log, speed control, error markers | MVP | ENG-01, ENG-05 | DONE-VERIFIED | — | tools/fixture-recorder, e2e/replay-viewer.spec.ts | LAB PROXY | **Loop WAVE 0.5 (PRs #28/#29, spec-checker verified):** `framesForLog` folds text-affecting events via the same applyPress the surface/metrics use (t/text/states/caret/keysDown/errorIndices + corrupted mark); in-panel viewer under the finished panel (refs-painted, no per-frame setState, 0.5/1/2/4× display-only, scrub, worded error summary, corrupted/unavailable notes); last finished log retained in memory only. Tests: 25 engine (incl. 16-fixture final-text-exact loop per M1-10) + 5 SSR + 7 e2e (play/pause/restart/speed/errors/keyboard/eviction/reduced-motion/no-overlay), all mutant-proven, CI green. Scope ruling ADR-009: MVP is in-panel-only; `/replay/:id` + persisted history wait on M2-01 routing. Heatmap correctly V1-absent. Row DONE-VERIFIED as LAB PROXY. |
| ENG-09 | Track typed vs auto-inserted; auto-indent/auto-pair toggles | MVP | ENG-01 | IN PROGRESS | — | ENG-FIXTURE-E-AUTOINSERT | LAB PROXY | **A real defect found and fixed in Session 7.** The input filter routed auto events into their own bucket, but the compute path replayed only the scoring presses — so an auto-paired bracket landed in NEITHER the produced text NOR the metrics, and every character after it would have been scored against the wrong target position. `filterEvents` now returns `textAffecting` (presses + auto, in capture order) and both compute paths replay that, so they cannot drift apart again. Regression test: `eng-live-summary.test.ts` "auto-inserted characters reach the produced text at all". **Loop WAVE 0.6 (PR #31, spec-checker reviewed):** ENG-FIXTURE-E-AUTOINSERT landed (auto bracket in text, out of every typed count — KSPC 0.75 pin, hand-computed, recompute bit-exact, mutant-proven); toggles landed (default off, localStorage guest-first, carried into log settings, honest prose-does-nothing note, claims-ban pinned). Stays IN PROGRESS with two owned deferrals: (1) `partial` third state — spec says off/on/partial but no passage defines partial behavior outside code modes, and design-doc 06 specifies off|on; disposition: boolean now, schema-enum migration when code modes land (tracked on PRG-11); (2) app-side `auto:true` production — no code passages exist in the MVP, so no producer can exist yet (tracked on PRG-11/PRG-15). |
| ENG-10 | Disable smart quotes/dash/autocorrect/capitalization | MVP | — | DONE-VERIFIED | — | eng-raw-chars.test.ts, e2e/raw-chars.spec.ts | LAB PROXY | **Loop WAVE 0.7 (PR #33, spec-checker verified):** no transformation exists anywhere in the scoring path (grep-verified) — engine compares produced keys with strict equality, pinned by 5 unit tests (straight quotes/dashes/capitals/apostrophes verbatim; curly/em-dash/lowered are errors, never folded); browser delivery pinned by 2 e2e tests (100% on apostrophe+capitals; straight-quote-for-apostrophe finishes and replays verbatim with position-7 error). Both mutants killed (engine case-fold, adapter quote-rewrite). Dispositions: (1) MVP scope is engine strict-equality + desktop-div surface — the M1-04 real-input sink with disable-attributes is the follow-up that activates autocapitalize/autocomplete/autocorrect markup (invalid div attributes, deliberately absent, not forgotten); (2) mobile-OS transforms deferred to ENG-13 per M1-04:522. Test-hygiene note: spellCheck={false} is a DOM property invisible to SSR scans — pinned by live-DOM e2e, not markup. Row DONE-VERIFIED as LAB PROXY. |
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
| PRG-04 | Safety: display-only, sanitized, never execute | MVP | PRG-01 | DONE-VERIFIED | — | — | LAB PROXY | Sanitizer `sanitizeSnippet` in `packages/engine/src/sanitize.ts` + renderer-ban scan (`dangerouslySetInnerHTML` grep). 7/7 mutants killed. Export via engine index. PR #42 |
| PRG-05 | Positioning: no ability/hiring claims in copy | MVP | — | DONE-VERIFIED | — | — | LAB PROXY | ESLint rule `copy-claims/no-outcome-promises` + corpus test over string tables & copy.ts. 41 rule tests, every banned pattern exercised, 3 allowlist entries pinned. Non-vacuous: violating .tsx fails `pnpm lint`. PR #41 |
| PRG-10 | Symbol Gym: categories, chords, symbol of the day | MVP | PRG-01, PRG-03 | NOT STARTED | — | — | — | |
| PRG-11 | Bracket Balance: nesting ladder, open→close latency | MVP | PRG-01 | NOT STARTED | — | TOK-FIXTURE-002, LVL-FIXTURE-006 | — | Owns ENG-09's two deferred halves: the first app-side `auto:true` producer (auto-pair overtype per M5-04.5) and the `partial` behavior + schema-enum migration (master-spec says off/on/partial; ENG-09 shipped boolean off/on with design-doc 06 agreeing). |
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
| CNT-07 | Do NOT import Monkeytype (GPL-3.0) word lists/quotes | MVP policy | — | DONE-VERIFIED | — | — | LAB PROXY | Content-corpus licence gate `scripts/check-content-licenses.mjs` scans all corpus files, parses per-file register tables, 20 unit tests + real-corpus integration. 746 items, 53 register rows, all pass. PR #43 |
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
| INT-10 | No public leaderboards until INT-05…INT-08 are live | Policy | INT-05..08 | IN PROGRESS | — | scripts/check-policies.test.mjs | LAB PROXY | **ENFORCED BY A GATE (Session 7), not by review.** `scripts/check-policies.mjs` fails the build if CMP-01/CMP-02 lose their OFF launch flag, if either is worked on while INT-05…INT-08 are not DONE-VERIFIED, or if a leaderboard/ranking/race source file appears without stating its own INT-10 gate in its header. Most of the 18 tests assert the FAILING direction, and all three policies were proven to exit 1 on the real repository with an injected violation. Stays IN PROGRESS rather than DONE-VERIFIED because the honest label for "a gate exists and works on known violations" is not "the policy has been verified" — the first real leaderboard code is what tests it |

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
| CUS-01 | Instant start; no ads/popups/modals on the typing surface | MVP | — | IN PROGRESS | — | e2e/typing-surface.spec.ts AC4/AC6 (positive-form), apps/web/tests/typing-surface.test.tsx (positive-form), scripts/check-policies.mjs CUS-01 rule | LAB PROXY | **DEMOTED from DONE-VERIFIED in Session 9** on evidence, not on the feature. Owner-proxy review 1 (docs/proxy/REVIEW-1.md, H1) rendered `<div class="promo-banner" aria-modal="true">Congrats! Sign up to save your streak.</div>` into the typing surface and **AC6 passed**: the no-popup assertion matched nine hardcoded selectors (`dialog`, `[role=dialog]`, `[role=alert]`, `[role=alertdialog]`, `[popover]`, `.modal`, `.popup`, `.toast`, `.tooltip`) and `aria-modal` was not among them. A blocklist is a list of names someone already thought of; AGENTS.md rule 1 does not care what the thing is called. The FEATURE was never in doubt and is verified independently in positive form (REVIEW-1.md §4 found no overlay on the shipped surface at 1440px or 360px, idle, mid-test or on results). The VERIFICATION was insufficient, and a DONE-VERIFIED row must rest on evidence that establishes its requirement. Three positive-form layers now replace it — the policy gate above (static, over apps/web/src/), AC6 (live computed styles, so a runtime overlay with no dialog semantics at all is still caught) and the SSR test (so a portal cannot slip past markup that never contained it). All three proven red on the `promo-banner` mutation. Status returns to DONE-VERIFIED only when the owner has looked at the surface and confirmed rule 1 holds in practice. |
| CUS-02 | Themes, fonts (incl. dyslexia-friendly), caret style, focus mode | MVP | — | DONE-VERIFIED | — | e2e/typing-surface-design.spec.ts DESIGN, apps/web/tests/design-tokens.test.ts, docs/visual-evidence/, e2e/appearance.spec.ts | LAB PROXY | **Session 8: the theme system exists** (tokens, both palettes, raw-colour ban, 7 screenshots). **Loop WAVE 0.9 (PR #35, a11y-auditor + ui-reviewer approved):** theme switcher (Daylight/Night Ink, `data-theme` only with stored choice, OS-light default preserved, one-frame flash for stored-vs-OS mismatch recorded as accepted debt — CSP forbids a pre-paint script); Atkinson Hyperlegible latin-400 as UI-only face (OFL verified, FONT-04, typing stays JetBrains Mono, bundle 187.5KB); focus mode (user toggle only, hide/dim-only, replay usable inside, `--focus-dim` 0.9 with all dimmed pairs ≥4.5:1 computed live, forced-colors override, 24px targets, h1 kept in a11y tree, describedby wiring, focus rescue); caret style shipped via STEER-6. Review findings (contrast/forced-colors/targets/honest-defaults) fixed + re-audited APPROVE. Screen-reader manual pass rides A11Y-01's human action. Row DONE-VERIFIED as LAB PROXY. |
| CUS-03 | Full keyboard navigation + shortcuts | MVP | — | DONE-VERIFIED | — | e2e/keyboard-flow.spec.ts (3 tests), SSR shortcuts pin, replay keyboard coverage | LAB PROXY | **Loop WAVE 0.10 (PR #37, a11y-auditor PASS-WITH-NOTES, spec-checker verified):** full keyboard-only flow proven (Tab-to-field → typed test → Esc-leave-to-BODY → Tab-to-Restart → Enter → retype); shortcuts disclosure documents only proven bindings (native details, 24px target); replay scrub keyboard-covered incl. Home/End/ArrowLeft. Esc reading settled: no menu exists — Esc-to-blur matches the promised "leave this area" word for word. Screen-reader narration rides A11Y-01's human pass. Row DONE-VERIFIED as LAB PROXY. |
| CUS-04 | On-screen keyboard overlay, theme builder, sound packs, command palette | V1 | CUS-02 | NOT STARTED | — | — | — | |

## A11Y — Accessibility (master spec §5.11)

| ID | name | tag | depends-on | status | flag | test IDs | evidence | notes |
|---|---|---|---|---|---|---|---|---|
| A11Y-01 | WCAG 2.2 AA for non-test UI; 200% text; reduced motion | MVP | — | IN PROGRESS | — | e2e/typing-surface.spec.ts AC2/AC6, apps/web/tests/typing-surface.test.tsx | LAB PROXY | duplicated by NFR-11. The typing surface ships accessibility with the feature rather than after it: every character state carries a non-colour cue (wavy underline / double underline / strikethrough / weight), asserted on the COMPUTED style so it cannot quietly regress to colour-only; the caret transition sits inside `prefers-reduced-motion: no-preference`, asserted in BOTH directions because an unstyled page also reports 0s; the key sink carries the string table's accessible name and instructions; exactly one `aria-live="polite"` region, which fires once at finish and never per keystroke; targets are at least 24x24 CSS px; there is a `forced-colors` block. **Loop WAVE 0.11 (PR #39, a11y-auditor PASS-WITH-NOTES):** machine sweep `e2e/a11y-sweep.spec.ts` (18 tests, CI green) covers every screen — 200%-zoom equivalent, 1.4.12 spacing override, forced-colors full pass, motion both directions incl. blink, ~20-pair/theme contrast sweep, all-targets ≥24, replay non-color cues — and fixed 4 real violations (replay wrap, scrub target, spacing click-shift, button motion under reduce). Stays IN PROGRESS: the screen-reader pass is human-only (item filed). |
| A11Y-02 | No-timer practice, adjustable targets | MVP | — | NOT STARTED | — | — | — | fixes PP-20 |
| A11Y-03 | Screen-reader guided mode + audio cues | V1 | A11Y-01 | NOT STARTED | — | — | — | |
| A11Y-04 | One-handed learning tracks | V1 | LOC-01 | NOT STARTED | — | — | — | |
| A11Y-05 | High-contrast + colourblind-safe palettes **including heatmaps** | V1 | ANA-02 | NOT STARTED | — | — | — | never colour-only state cues |
| A11Y-06 | Audio feedback + captions | V2 | — | NOT STARTED | — | — | — | |

## LOC — Layouts and languages (master spec §5.12)

| ID | name | tag | depends-on | status | flag | test IDs | evidence | notes |
|---|---|---|---|---|---|---|---|---|
| LOC-01 | Layouts: QWERTY US/UK, Dvorak, Colemak-DH, AZERTY, QWERTZ | MVP | ENG-06 | IN PROGRESS | — | ENG-LAYOUT-MAPS, T0-GEN-008/009/010 | LAB PROXY | **Loop WAVE 0.3 (PR #23, spec-checker verified):** WIRED — layout selector (first-run guess + always-visible override, localStorage, remount-on-change), coercion removed (settings.layout carries the declared layout), composition lifecycle + static IME notice (never over the surface, AC6 green), 23 unit + 3 e2e tests, full e2e 36/36 reproduced by integrator, bundle 165.5KB. Stays IN PROGRESS by rule: the loop's evidence labels require REAL-DEVICE CONFIRMED to close LOC-01 wiring — hardware sheet (2 OSes), live-driver AltGr check, and real-IME behavior are filed human actions. Telemetry `layout_changed` deferred to WAVE 0.15 (no web client yet). |
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
| BIZ-06 | No dark patterns | Policy | — | IN PROGRESS | — | scripts/check-policies.test.mjs, apps/web/tests/copy-tables.test.ts | LAB PROXY | **PARTIALLY ENFORCED BY A GATE (Session 7).** Previously DEMOTED from DONE-VERIFIED because the row was "trivially true" — no billing exists, so nothing could violate it. A gate that only ever passes proves nothing, so the gate now scans all 95 shipped source files for the two things that can violate this today: a monetisation surface (checkout/billing/paywall/upgrade-wall/subscribe by path) and guilt-based or hidden-renewal copy (phrase-level, so it does not fire on legitimate vocabulary like "streak"). `copy-tables.test.ts` additionally holds the UI copy against the string table, whose `notification.bannedExample.*` rows mark the forbidden phrasings. **Still review-enforced:** the rest — hidden trials, surprise renewals and cancel flows inside a billing flow that does not exist yet — cannot be checked until OPS-09 lands, and then this row must be re-verified by a human reading the flow |

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
| RET-21 | Ethics checklist enforced in review for every engagement feature | Policy | — | IN PROGRESS | — | scripts/check-policies.test.mjs | LAB PROXY | **POLICY, ENFORCED BY REVIEW — with the review made checkable (Session 7).** The rule is the six-question checklist in `docs/spec/retention-and-mastery-playbook.md` §12 (line 472), and it is a property of a human decision, not of the code: no static check can decide whether a streak design encourages good behaviour or causes anxiety. What the gate does is make the review non-skippable — any RET row moving past NOT STARTED requires a written record at `docs/ethics/<ID>.md`, and the build fails without it. So the enforcement is a process gate whose artefact is the review itself. **No RET row has started, so no record exists yet; the first engagement feature to be built is what will exercise this** |

## NFR — Non-functional requirements (master spec §8, untagged in source)

| ID | name / target | tag | depends-on | status | flag | test IDs | evidence | notes |
|---|---|---|---|---|---|---|---|---|
| NFR-01 | Input latency p95 ≤ 16 ms, measured in CI | UNTAGGED | ENG-02 | IN PROGRESS | — | spike S1 | LAB PROXY | lab p95 15.2 ms — only 5% under budget. REAL-DEVICE still required. **Loop WAVE 0.1 (PR #15):** real-surface harness now in CI (`e2e/latency-surface.spec.ts`, n=320, p95 14.1–14.9ms, green on CI hardware). Firefox/WebKit projects and REAL-DEVICE confirmation still pending — evidence stays LAB PROXY. Stays IN PROGRESS: the loop's evidence rules require REAL-DEVICE CONFIRMED (human on real hardware) to close this row; human action filed in HUMAN-ACTIONS.md. |
| NFR-02 | Typing page interactive ≤ 1.5 s; test JS ≤ ~200 KB gzip; parsers lazy | UNTAGGED | — | IN PROGRESS | — | `pnpm check:bundle` | LAB PROXY | 71.1 KB gzip of 200 KB, gate proven non-vacuous after Session 4 found two blind spots |
| NFR-03 | Offline safety: core tests run if backend down; queue + sync | UNTAGGED | MOB-02 | NOT STARTED | — | ENG-FIXTURE-OFFLINE-01 | — | |
| NFR-04 | API: submit p95 ≤ 500 ms; V1 leaderboard read ≤ 200 ms | UNTAGGED | INT-01 | NOT STARTED | — | — | — | |
| NFR-05 | V1 realtime: race message p95 ≤ 100 ms same region | UNTAGGED | CMP-02 | NOT STARTED | OFF | — | — | needs real-time infra (18.6) |
| NFR-06 | 99.9% monthly availability for API after MVP | UNTAGGED | — | NOT STARTED | — | — | — | |
| NFR-07 | Scale: MVP ~10k MAU; design 100k DAU × 5 tests/day | UNTAGGED | — | NOT STARTED | — | — | — | |
| NFR-08 | Security: OWASP ASVS L1→L2, strict CSP, rate limit, dep scanning | UNTAGGED | INT-04 | IN PROGRESS | — | apps/api security tests | LAB PROXY | helmet CSP + rate limiting + redaction land. ASVS L1→L2 audit not done |
| NFR-09 | Privacy: GDPR + India DPDP; minimisation; opt-in research; no trackers in test flow | UNTAGGED | USR-04 | IN PROGRESS | — | telemetry canary | LAB PROXY | scrubbing proven; the DPDP/GDPR posture itself is unverified |
| NFR-10 | Compatibility: latest 2 of Chrome/Edge/Firefox/Safari; iOS | UNTAGGED | — | NOT STARTED | — | — | — | Firefox/WebKit e2e still commented out |
| NFR-11 | Accessibility: WCAG 2.2 AA (non-test UI) | UNTAGGED | A11Y-01 | IN PROGRESS | — | e2e/a11y-sweep.spec.ts | LAB PROXY | duplicate of A11Y-01; tracks it. Machine sweep green (PR #39); screen-reader human pass still open. |
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
