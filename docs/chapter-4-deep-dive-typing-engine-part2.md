# Chapter 4 (Deep-Dive) — The Typing Engine, Part 2: State Machine, Alignment Algorithm, Aggregation, Test Catalog

**Continues from Part 1.** Read that first for the fixture numbering convention (`ENG-FIXTURE-XNN`) and the worked examples A–G referenced below.

---

## 4.10 The state machine, worked in full

The lifecycle is: `idle → ready → running → (paused) → finished → submitting → submitted | failedOffline`, plus `invalid`. Below is the **complete transition table** — every state crossed with every possible event, and the exact resulting state, written out so there is no ambiguity for an implementer.

| Current state | Event | Next state | Notes / side effects |
|---|---|---|---|
| idle | user focuses typing surface | ready | Caret becomes visible (static, not blinking, per motion tokens) |
| idle | any keystroke (shouldn't happen, but defensively) | idle | Ignored — no active test to receive input |
| ready | first accepted keystroke | running | Clock starts here (see Edge Case E1); chrome begins fading |
| ready | blur / tab hidden | idle | Nothing was scored yet; no special handling needed |
| ready | Esc | idle | User backed out intentionally |
| running | subsequent accepted keystroke | running | Normal typing continues |
| running | rejected keystroke (must-correct mode) | running | State unchanged; only the rejected-attempt counter increments |
| running | blur / tab hidden, **practice mode** | paused | Elapsed time freezes; a resume affordance appears |
| running | blur / tab hidden, **verified/ranked mode** | invalid | Session is marked non-verifiable; local result still computed and shown, but flagged |
| running | untrusted input event detected (verified mode) | invalid | Same as above — any `isTrusted: false` event ends verifiability immediately |
| running | end condition met (timer expires / word count reached / final character typed in fixed-text mode) | finished | Metrics computation begins immediately |
| running | paste/drop event detected | invalid (verified) or ignored-with-warning (practice) | See Edge Case E7 |
| paused | refocus / resume action | running | Clock resumes; the paused duration is excluded from elapsed time (see worked example below) |
| paused | user explicitly clicks "restart" | idle | Abandons the paused test entirely |
| paused | timeout (user never returns, e.g., after 10 minutes) | idle | Auto-abandon; do not let a paused test linger indefinitely in memory |
| finished | (automatic) metrics computed | submitting | No user action; this is an internal transition |
| submitting | server responds 200 OK with matching recomputation | submitted | Results page shows "verified" |
| submitting | server responds with a mismatch or rejection | submitted (marked unverified) | The LOCAL result is still shown to the user — never hide their own result from them — but flagged as not server-verified, and NOT eligible for leaderboards |
| submitting | network error / timeout | failedOffline | Result queued locally with the idempotency key |
| failedOffline | connectivity restored | submitting | Automatic retry using the same idempotency key (never re-submit as a "new" result) |
| failedOffline | user manually retries | submitting | Same idempotency key reused |
| submitted | user clicks "restart" / "next test" | idle | Full reset |
| invalid | user clicks "restart" | idle | The invalid test's partial data may still be shown locally as an unverified practice result if the user wants it, but it never contributes to verified stats |
| any state | app crash / page reload | idle (on reload) | In-progress test data is lost by design at MVP (no mid-test resume across page reloads); this is a documented limitation, not silently broken |

**Worked pause-time-exclusion example:** a practice-mode test starts (clock at 0ms), user types for 3000ms, then alt-tabs away at the 3000ms mark. They return and refocus at what would be wall-clock 13000ms (10 seconds later), then keep typing. The **scored elapsed time** must treat the resumption as if it happened at 3000ms, not 13000ms — i.e., the 10-second pause is subtracted entirely from the duration used in every speed formula. If the test finishes after another 2000ms of typing post-resume, the total **scored duration is 5000ms** (3000 + 2000), not 15000ms (3000 + 10000 + 2000). Getting this wrong (using wall-clock duration including the pause) would make every paused-and-resumed test look catastrophically slow, and is a very easy bug to introduce if the implementation naively does `endTimestamp - startTimestamp` without tracking pause intervals separately.

**Test names:**
- `ENG-STATE-01-full-happy-path` (idle→ready→running→finished→submitting→submitted)
- `ENG-STATE-02-pause-resume-time-exclusion` (the worked example above — assert scored duration = 5000ms exactly)
- `ENG-STATE-03-blur-invalidates-verified-mode`
- `ENG-STATE-04-blur-pauses-practice-mode`
- `ENG-STATE-05-offline-queue-and-retry-same-idempotency-key`
- `ENG-STATE-06-reject-does-not-change-state` (must-correct rejected keystroke stays in `running`)
- `ENG-STATE-07-abandon-paused-test-after-timeout`
- **Property test `ENG-STATE-PROP-01`:** generate 1,000 random sequences of valid events from any state; assert the resulting state after each event is always one of the states in the table above (never an undefined/crash state), and that no event sequence can reach `submitted` without passing through `finished` first (an ordering invariant).

---

## 4.11 The alignment / error-classification algorithm, worked by hand

**Purpose:** given a target text and what the user actually typed (the "final buffer"), determine, character by character, whether each difference is a **substitution**, **omission**, **insertion**, or **transposition** — this feeds the confusion-matrix and per-key error analytics in the weakness model (Chapter 8).

**Worked example — a realistic multi-error case:**
- **Target:** `the quick brown`
- **Typed (final buffer, free error mode, backspaces already resolved into this final string):** `teh qiuck brwon`

**Step-by-step alignment (this is the core logic an AI must implement — a classic edit-distance / sequence-alignment problem, explained here character-group by character-group so the expected classification is unambiguous):**

| Position in target | Target char | Aligned typed char(s) | Classification | Reasoning |
|---|---|---|---|---|
| 1 | t | t | correct | Matches |
| 2 | h | e | **substitution** (part of a transposition group) | See transposition note below |
| 3 | e | h | **substitution** (part of a transposition group) | Together, positions 2–3 form a **transposition**: the target `h,e` appears in the typed text as `e,h` — swapped adjacent characters |
| 4 | (space) | (space) | correct | Matches |
| 5 | q | q | correct | Matches |
| 6 | u | i | **substitution** (part of transposition) | |
| 7 | i | u | **substitution** (part of transposition) | Positions 6–7: target `u,i` typed as `i,u` — another transposition |
| 8 | c | c | correct | Matches |
| 9 | k | k | correct | Matches |
| 10 | (space) | (space) | correct | Matches |
| 11 | b | b | correct | Matches |
| 12 | r | r | correct | Matches |
| 13 | o | w | **substitution** (part of transposition) | |
| 14 | w | o | **substitution** (part of transposition) | Positions 13–14: target `o,w` typed as `w,o` — third transposition |
| 15 | n | n | correct | Matches |

**Classification decision rule (must be documented explicitly, since "substitution vs. transposition" is a judgment call):** when two adjacent character positions are BOTH wrong, AND the typed characters at those two positions are exactly the target characters but swapped, classify the pair as **one transposition event**, not two independent substitutions — because this is analytically much more useful (it tells you the user's *finger sequencing* is the problem, not that they don't know two individual letters) and because transposition errors have a well-known, distinct cause in typing research (adjacent-finger sequencing) worth tracking separately in the confusion matrix.

**Resulting summary for this fixture:**
- Correct characters: 9 of 15 (60%)
- Transposition events: 3 (`he→eh`, `ui→iu`, `ow→wo`)
- Substitution events (non-transposition): 0
- Omissions: 0
- Insertions: 0
- **Final accuracy** = 9/15 = **60%**
- **Net WPM**, if this took e.g. 6 seconds total = (9/5) ÷ (6/60) = 1.8 ÷ 0.1 = **18.0 WPM** (only the 9 correct characters count in the numerator, per the standing rule)

**Test name:** `ENG-FIXTURE-H01-transposition-classification`

**A second worked example — omission and insertion (distinct from substitution):**
- **Target:** `cats`
- **Typed:** `cts` (the `a` was simply never typed — an **omission**, not a substitution, because no wrong character was typed in its place; the buffer is just shorter)

Alignment:
| Target position | Target char | Aligned typed | Classification |
|---|---|---|---|
| 1 | c | c | correct |
| 2 | a | *(nothing)* | **omission** |
| 3 | t | t | correct |
| 4 | s | s | correct |

- **Final text length** = 3 characters, target length = 4. **Rule:** when the final text is *shorter* than the target (in a fixed-text mode where the test isn't yet "finished" until the target length is reached), this test is technically incomplete unless the mode allows ending early — document which modes allow this (e.g., a "give up" or time-based end condition where a fixed text wasn't fully typed) and how partial-completion is scored (typically: score only against the portion actually attempted, i.e., the target is effectively truncated to the attempted length for final-accuracy purposes, and the omission of the `a` is scored as one omission against the four positions actually reached — this requires the alignment algorithm to correctly detect that position 2 was *skipped over* rather than assuming the user simply stopped early; the disambiguator is that characters 3 and 4, `t` and `s`, DO appear correctly after the gap, proving the user kept going and skipped the `a` specifically, rather than stopping after `c`).

**A third example — insertion (typed more than the target at a position):**
- **Target:** `cat`
- **Typed:** `caat` (an extra `a` inserted)

Alignment:
| Target position | Target char | Aligned typed | Classification |
|---|---|---|---|
| 1 | c | c | correct |
| 2 | a | a | correct |
| — | *(no target char here)* | a | **insertion** |
| 3 | t | t | correct |

**Test names:** `ENG-FIXTURE-I01-omission-classification`, `ENG-FIXTURE-I02-insertion-classification`

**Why this level of detail matters:** the weakness model (Chapter 8) is entirely built on top of this classification. If substitutions and transpositions get conflated, or omissions get miscounted as substitutions against the wrong target position, every downstream "your weak keys are X, Y, Z" recommendation becomes subtly wrong, and the user will correctly sense that the tool doesn't understand their actual mistakes — this is a direct threat to Pillar 1 (does it make people better) from the proof plan, because a broken classifier feeds broken drills.

**Property test for the alignment algorithm (`ENG-ALIGN-PROP-01`):** generate 2,000 random (target, typed) pairs by taking random real words and applying random combinations of the four error types (substitution, omission, insertion, transposition) with known ground truth (since you generated the errors yourself, you know exactly what you injected). Assert the algorithm recovers the exact count and type of injected errors. This is a strong test because you control the ground truth completely — it's not just "does it not crash," it's "does it get the exact right classification every time," across thousands of randomized cases.

---

## 4.12 Per-key and per-bigram aggregation, worked example

**Purpose:** this is the raw material the weakness model consumes. Getting the aggregation math right here, with a fully worked numeric example, prevents an entire category of "the app tells me my weak key is wrong" complaints.

**Scenario:** over the course of one test, the user types the bigram `th` (as in "the," "that," "with") five separate times, with these five inter-key intervals (time from pressing `t` to pressing `h`): 180ms, 195ms, 1200ms (this one had a mid-sequence hesitation — maybe the user paused to think about the next word, not because `t→h` itself is hard), 175ms, 190ms.

**Naive (wrong) approach:** simple mean of all five = (180+195+1200+175+190)/5 = 1940/5 = **388ms average** — this makes `t→h` look mediocre/slow, but that's misleading, because four of the five instances were fast (175–195ms) and only one was a genuine outlier caused by something unrelated to the letter pair itself (a thinking pause).

**Correct approach, per the engine's stated rule ("only count pairs where both keystrokes were accepted and adjacent in time — no pause above threshold"):**
1. Apply the same "exclude gaps > 5 seconds" pause-exclusion rule used for IKI stats (§4.7's Worked Example F) — wait, 1200ms is under 5 seconds, so it would NOT be excluded by that rule alone. This reveals a genuine design decision that needs its own explicit threshold, separate from the whole-test IKI exclusion threshold: **bigram-level aggregation needs a tighter outlier-exclusion rule** than whole-test pause detection, because a 1200ms gap is unremarkable at the whole-test level (people pause between words normally) but IS an outlier specifically for a two-letter sequence *within* a word where no thinking should be happening.
2. **Recommended rule (a `[proposal]` requiring calibration):** for bigram-level timing, exclude any individual instance where the interval exceeds roughly **3× the user's own median interval for that specific bigram** (a self-relative outlier rule, not a fixed millisecond threshold, since typing speed varies hugely by person). Here, median of the four "normal" samples is about 187ms; 3× that is 562ms; the 1200ms sample exceeds this and is excluded from the *speed* aggregate for this bigram, though it MAY still be logged separately as a "hesitation event" (a different, useful signal — perhaps this bigram sits at a word boundary the user often pauses at, which is itself worth surfacing differently).
3. **Corrected aggregate for `t→h`:** mean of the four retained samples = (180+195+175+190)/4 = 740/4 = **185ms**, with a sample count (n=4, since one outlier was excluded) recorded alongside — never present an aggregate without its sample count, because the weakness model must down-weight low-confidence estimates (Chapter 8's rule D-M4-3).

**Worked hand vs. finger tagging for this bigram (feeds the "same-finger vs. alternate-hand" analytics):** on a standard QWERTY layout with a conventional touch-typing finger map, `t` is typically struck by the left index finger and `h` by the right index finger — this is a **cross-hand** bigram. Its expected baseline speed (from general typing research) should be faster than a same-finger bigram like `e→d` (both commonly assigned to fingers on the same hand in some finger maps) or especially a true same-finger bigram like `f→r` if a finger map assigns both to the left index. **This tag (same-hand / cross-hand / same-finger) must be computed from the ACTIVE layout's finger map, not hardcoded**, because a Dvorak or Colemak layout maps completely different characters to completely different fingers — the exact same bigram string (`t→h`) could be a same-finger pair on one layout and a cross-hand pair on another.

**Test names:**
- `ENG-AGG-FIXTURE-01-bigram-outlier-exclusion` (the worked 5-sample example above; assert the aggregate = 185ms with n=4, not 388ms with n=5)
- `ENG-AGG-FIXTURE-02-layout-dependent-hand-finger-tagging` (assert the same bigram string gets different hand/finger tags under QWERTY vs. Dvorak layout settings)
- `ENG-AGG-PROP-01`: property test — for any random set of samples, the aggregate excluding outliers must never have a lower sample count than 1, and must never silently include a sample more than the outlier threshold away from the median without flagging it as excluded in the stored record.

---

## 4.13 Consolidated Test Scenario Catalog (40 named scenarios)

This is the master checklist to hand to whoever (or whatever AI) implements the engine — a build is not "done" until every one of these has a passing automated test. Grouped by area; references the worked examples above where applicable.

**Group 1 — Core arithmetic (5)**
1. `ENG-FIXTURE-A01` — perfect even typing, zero errors (§4.2)
2. `ENG-FIXTURE-B01` — single corrected error, three-metric divergence (§4.3)
3. `ENG-FIXTURE-C01` — single uncorrected error, net WPM numerator check (§4.4)
4. `ENG-FIXTURE-A02` — extremely short test (2 characters, verify linear scaling holds, no divide-by-near-zero instability)
5. `ENG-FIXTURE-A03` — very long test (2,000+ characters) — performance and numeric-precision check, not just correctness

**Group 2 — Error modes (4)**
6. `ENG-FIXTURE-D01` — must-correct rejected attempts (§4.5)
7. `ENG-FIXTURE-D02` — stop-on-error mode: verify the test actually halts/ends on first wrong character, and elapsed time freezes at that exact moment
8. `ENG-FIXTURE-D03` — no-backspace (exam) mode: verify Backspace keydown events are entirely ignored (not queued, not counted, not affecting KSPC)
9. `ENG-FIXTURE-D04` — word-locked mode: verify the caret cannot move to a new word until the current word is fully correct, and that partial-word corrections within the word ARE allowed

**Group 3 — Rollover and timing precision (4)**
10. `ENG-FIXTURE-E01` — rollover detection, two-key overlap (§4.6)
11. `ENG-FIXTURE-E02` — a full-length passage with zero overlapping keys anywhere — assert rollover ratio computes to exactly 0%, not a rounding artifact
12. `ENG-FIXTURE-E03` — a passage where EVERY transition overlaps (simulated maximally fast rollover typist) — assert rollover ratio computes to 100%
13. `ENG-FIXTURE-F01` — long mid-test pause, burst vs. net divergence, IKI outlier exclusion (§4.7)

**Group 4 — Input adapter edge cases (6)**
14. `ENG-FIXTURE-G01` — key-repeat filtering (§4.8) — **critical severity**
15. `ENG-FIXTURE-E-CAPS` — Caps Lock case-error handling (Edge Case E3)
16. `ENG-FIXTURE-E-DEADKEY` — accented character via dead-key sequence (Edge Case E5)
17. `ENG-FIXTURE-E-EMOJI` — grapheme-cluster handling for an emoji or combining character (Edge Case E6)
18. `ENG-FIXTURE-E-PASTE` — paste event blocked client-side AND caught by server-side plausibility backstop if client block somehow fails (Edge Case E7)
19. `ENG-FIXTURE-E-DUALKEY` — a character reachable by two different physical keys on an international layout; verify finger/hand attribution uses actual physical key, not canonical character (Edge Case E8)

**Group 5 — Lifecycle and state machine (7, listed in §4.10)**
20. `ENG-STATE-01` through 26. `ENG-STATE-07` (all seven, per the table in §4.10)

**Group 6 — Alignment and error classification (5)**
27. `ENG-FIXTURE-H01` — transposition classification, three-transposition passage (§4.11)
28. `ENG-FIXTURE-I01` — omission classification (§4.11)
29. `ENG-FIXTURE-I02` — insertion classification (§4.11)
30. `ENG-FIXTURE-I03` — a mixed passage containing at least one of each of the four error types simultaneously, to verify the algorithm doesn't get confused when error types are adjacent to each other
31. `ENG-ALIGN-PROP-01` — the 2,000-random-case property test (§4.11)

**Group 7 — Aggregation (3)**
32. `ENG-AGG-FIXTURE-01` — bigram outlier exclusion (§4.12)
33. `ENG-AGG-FIXTURE-02` — layout-dependent hand/finger tagging (§4.12)
34. `ENG-AGG-PROP-01` — aggregation property test (§4.12)

**Group 8 — Cross-platform parity (3)**
35. `ENG-PARITY-01` — every fixture above run once through the browser build and once through the Node/server build; assert bit-for-bit (or tolerance-bounded) identical output for every single metric on every fixture
36. `ENG-PARITY-02` — the same fixture log, re-run through the metrics pipeline twice in a row on the same machine; assert perfectly deterministic identical output both times (catches accidental use of non-deterministic operations like unordered map iteration affecting floating-point summation order)
37. `ENG-PARITY-03` — layout matrix: the exact same physical key-press sequence, interpreted under five different active layout settings (QWERTY US/UK, Dvorak, Colemak, AZERTY, QWERTZ), produces five different (and each individually correct) target-character interpretations — verify against a hand-built lookup table for each layout, for at least the symbols and letters most likely to differ across layouts

**Group 9 — Failure and resilience (3)**
38. `ENG-FIXTURE-E09` — zero-keystroke test, verify "not available" not "0 WPM," and no crash on render (Edge Case E9)
39. `ENG-FIXTURE-CORRUPT-01` — a deliberately corrupted log (out-of-order timestamps, a keyup with no matching keydown, duplicate identical events) — verify the engine either repairs it per a documented policy or rejects it cleanly, but never crashes or silently produces garbage numbers
40. `ENG-FIXTURE-OFFLINE-01` — full offline-to-online round trip: complete a test with network disabled, verify local result displays correctly, restore network, verify automatic submission occurs exactly once (not zero times, not duplicated) using the stored idempotency key

---

## 4.14 What "done" looks like for this chapter

The typing engine milestone (M1) is not complete until:
- [ ] All 40 named test scenarios above exist as automated tests and pass.
- [ ] `ENG-PARITY-01` passes for literally every fixture, not a sample — any single mismatch between browser and server computation is a blocking bug, because the server's recomputation is the entire foundation of result integrity (Chapter 7 / the integrity program) and a systematic mismatch would either falsely reject honest users or falsely accept manipulated ones.
- [ ] The engine contract document explicitly states the chosen answer to every "Edge Case" decision in §4.9 (E1 through E10) — an implementation that silently picked an answer without writing it down is not acceptable, because the next person (human or AI) touching this code has no way to know whether current behavior is intentional or accidental.
- [ ] The two property tests (`ENG-STATE-PROP-01`, `ENG-ALIGN-PROP-01`, `ENG-AGG-PROP-01` — three total) each run with a fixed, recorded random seed so failures are reproducible, and each has run at least 1,000+ iterations without a single failure before being considered stable.

---

*This concludes the Chapter 4 deep-dive. Say which chapter number to expand next (Chapter 8, the Weakness Model, is the recommended next deep-dive, since it is the second-most bug-prone and highest-value component after the engine itself).*
