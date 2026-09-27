# Chapter 4 (Deep-Dive) — The Typing Engine: Edge Cases, Worked Examples, and Test Scenarios

**Extends:** Implementation Guide §5 (M1) and the `typing-engine-core` / `typing-metrics-spec` skills.
**Purpose:** this is the "no detail spared" version of the engine chapter. Every subsection adds what the summary version couldn't fit: concrete worked numbers, char-by-char examples, and named test scenarios an AI agent (or you) can implement directly as test cases.
**No code.** Everything here is specification and worked arithmetic, in words and tables.

---

## 4.1 Why this chapter exists

The summary implementation guide told you *what* to build (data contracts, state machine, metrics) and *that* you need fixtures. This chapter gives you the **actual fixtures**, worked by hand, so there is no ambiguity about what "correct" means before an AI writes a single line of the engine. If the AI's engine doesn't reproduce these exact numbers, the engine is wrong — not the test.

---

## 4.2 Worked Example A: The simplest possible test (sanity baseline)

**Target text:** `the cat sat` (11 characters including spaces)

**Scenario:** user types it perfectly, at a perfectly even pace, taking exactly 6 seconds total.

**Keystroke log (each entry: character produced, time in milliseconds since first keystroke):**
| # | Char | Time (ms) |
|---|---|---|
| 1 | t | 0 |
| 2 | h | 545 |
| 3 | e | 1090 |
| 4 | (space) | 1636 |
| 5 | c | 2181 |
| 6 | a | 2727 |
| 7 | t | 3272 |
| 8 | (space) | 3818 |
| 9 | s | 4363 |
| 10 | a | 4909 |
| 11 | t | 5454 |

**Elapsed time:** last keystroke at 5454 ms minus first at 0 ms = 5454 ms of *typing span*. But the **test duration** (what the clock actually measures) is defined as time-to-completion from first keystroke to the moment the last character is accepted — here that is 5.454 seconds. (If your engine's convention is "start the clock on focus" rather than "on first keystroke," see §4.9 Edge Case E1 below — this matters and must be picked explicitly.)

**Hand-computed expected results:**
- Total characters typed = 11, all correct, 0 errors.
- **Gross WPM** = (11 characters ÷ 5) ÷ (5.454 ÷ 60) minutes = 2.2 ÷ 0.0909 = **24.2 WPM**
- **Net WPM** = identical here since there are zero errors = **24.2 WPM**
- **Keystroke accuracy** = 11 correct ÷ 11 total keystrokes = **100%**
- **Final accuracy** = 11 correct ÷ 11 final characters = **100%**
- **KSPC (keystrokes per character)** = 11 keystrokes ÷ 11 final characters = **1.00** (no backspaces, perfectly efficient)
- **Rollover ratio** = 0 (each keydown is evenly spaced with clear gaps; no overlap) = **0%**
- **IKI (inter-key interval), mean** = 545.4 ms (5454 ms ÷ 10 intervals)
- **Consistency**: since every interval is nearly identical (545, 545, 546, 545, 546, 545, 546, 545, 546, 545 — rounding), the coefficient of variation is near 0, so **Consistency ≈ 99–100**.

**Test name:** `ENG-FIXTURE-A01-perfect-even-typing`
**What it proves:** the base arithmetic pipeline works end-to-end with the simplest possible case — no errors, no backspaces, no pauses.

---

## 4.3 Worked Example B: Typing with one corrected error

**Target text:** `the cat sat`

**Scenario:** the user mistypes `c` as `x`, notices, backspaces, and retypes `c` correctly. Everything else identical timing to Example A, with the correction taking an extra 400ms.

**Keystroke log:**
| # | Key event | Char/action | Time (ms) |
|---|---|---|---|
| 1 | keydown | t | 0 |
| 2 | keydown | h | 545 |
| 3 | keydown | e | 1090 |
| 4 | keydown | (space) | 1636 |
| 5 | keydown | **x** (wrong) | 2181 |
| 6 | keydown | Backspace | 2400 |
| 7 | keydown | c (corrected) | 2581 |
| 8 | keydown | a | 3127 |
| 9 | keydown | t | 3672 |
| 10 | keydown | (space) | 4218 |
| 11 | keydown | s | 4763 |
| 12 | keydown | a | 5309 |
| 13 | keydown | t | 5854 |

**Hand-computed expected results:**
- **Total keystrokes** (all keydown events that produce or remove a character) = 13 (11 correct final characters + 1 wrong keystroke + 1 backspace)
- **Final text** = `the cat sat` (fully correct after the correction) → **final accuracy = 100%** (correct chars ÷ total chars in final text = 11/11)
- **Keystroke accuracy** = this is the metric that *does* penalize the mistake. Correct keystrokes = 11 (the ones that ended up in the final text and were right the first time they landed) ÷ **13 total printable+edit keystrokes** = 11/13 = **84.6%**. (Rule: the wrong `x` and the `Backspace` both count against keystroke accuracy; this is the metric spec's explicit rule — "corrected mistakes still count.")
- **KSPC** = 13 keystrokes ÷ 11 final characters = **1.18** (18% more keystrokes than the theoretical minimum — this quantifies the cost of the correction)
- **Elapsed time** = 5854 ms = 5.854 s
- **Gross WPM** (final text length basis) = (11/5) ÷ (5.854/60) = 2.2 ÷ 0.0976 = **22.5 WPM**
- **Net WPM** — by the spec's rule ("Net WPM = correct characters in final text ÷ 5 ÷ minutes; correction time is included because the clock keeps running") — since the final text is 100% correct, **Net WPM = Gross WPM = 22.5 WPM** for *this* test. This is an important, easy-to-get-wrong point: **net WPM does not separately subtract for corrected errors** — the penalty already shows up automatically because the correction consumed time, lowering the speed. Net WPM only *additionally* drops when the *final* text still contains wrong characters (see Example C).
- **Raw WPM** (all keystrokes ÷5, including the wrong keystroke and the backspace) = (13/5) ÷ (5.854/60) = 2.6 ÷ 0.0976 = **26.6 WPM**. Note raw > net here — that's expected and is *always* true whenever there's been any correction activity, and is a useful diagnostic ("raw−net gap" signals correction overhead even when final accuracy is 100%).

**Test name:** `ENG-FIXTURE-B01-single-corrected-error`
**What it proves:** distinguishes keystroke accuracy (penalizes the mistake) from final accuracy (doesn't, since it was fixed) from net WPM (penalizes it only via time cost) — three different metrics giving three different, all-individually-correct answers about the same event. **This is the single most common place AI-generated metrics code gets it wrong** — it's very tempting to make "accuracy" one number and have it double-penalize or under-penalize corrections.

---

## 4.4 Worked Example C: Typing with one UNCORRECTED error (free error mode)

**Target text:** `the cat sat`
**Scenario:** user types `the cot sat` — types `o` instead of `a` in "cat" and never fixes it. Same timing skeleton as Example A (11 keystrokes, evenly spaced, 5454ms total), because there's no backspace this time.

**Hand-computed expected results:**
- **Total keystrokes** = 11 (no backspace)
- **Final text** = `the cot sat` (11 characters, but one is wrong)
- **Final accuracy** = 10 correct ÷ 11 total = **90.9%**
- **Keystroke accuracy** = 10 correct ÷ 11 total keystrokes = **90.9%** (same as final accuracy here, since nothing was corrected — keystroke accuracy and final accuracy only diverge when there ARE corrections)
- **Net WPM** = correct characters in final text ÷ 5 ÷ minutes = **10** correct chars (not 11!) ÷ 5 ÷ (5454/60000) = 2.0 ÷ 0.0909 = **22.0 WPM** — lower than Example A's 24.2 WPM even though typing speed (keystrokes/time) was identical, because net WPM only counts *correct* characters in its numerator.
- **Raw WPM** = 11/5 ÷ 0.0909 = **24.2 WPM** (same as Example A — raw doesn't care about correctness at all)
- **Gap** = raw (24.2) − net (22.0) = 2.2 WPM. This gap, caused purely by one wrong uncorrected letter, is a second important diagnostic distinct from the correction-overhead gap in Example B.

**Test name:** `ENG-FIXTURE-C01-single-uncorrected-error`
**What it proves:** net WPM's numerator must use *correct characters in the final text*, not total characters. A very common implementation bug is to compute net WPM as `(final_text_length / 5) / minutes` (ignoring correctness) — this fixture catches that bug immediately, because it would wrongly report 24.2 instead of the correct 22.0.

---

## 4.5 Worked Example D: The "must-correct" error mode

**Target text:** `the cat sat`
**Scenario:** identical to Example B's mistake (typing `x` instead of `c`), but now in **must-correct** mode, where the caret literally cannot advance past a wrong character — the engine must reject the character typed after a wrong one until it's fixed.

**Keystroke log:**
| # | Attempted char | Accepted? | Time (ms) |
|---|---|---|---|
| 1 | t | yes | 0 |
| 2 | h | yes | 545 |
| 3 | e | yes | 1090 |
| 4 | (space) | yes | 1636 |
| 5 | x (wrong) | **rejected — flashes as error, caret does not move** | 2181 |
| 6 | a (attempted next char while still on wrong position) | **rejected — same position** | 2350 |
| 7 | Backspace | accepted (clears the error) | 2500 |
| 8 | c (retry) | accepted | 2681 |
| 9 | a | yes | 3227 |
| 10 | t | yes | 3772 |
| 11 | (space) | yes | 4318 |
| 12 | s | yes | 4863 |
| 13 | a | yes | 5409 |
| 14 | t | yes | 5954 |

**Hand-computed expected results (must-correct mode's specific rules):**
- **Rejected keystrokes** (attempts #5 and #6 above) are logged but **do not add characters to the typed buffer** — they must be tracked separately as "rejected attempts," a metric that doesn't exist in free mode at all.
- **Total keystrokes contributing to KSPC** — decision needed and must be documented: does a *rejected* keystroke count toward KSPC? The recommended rule (state this explicitly in your engine contract doc): **rejected keystrokes count toward "raw attempts" but NOT toward KSPC**, because KSPC measures actual buffer edits, and a rejected keystroke never touched the buffer. So KSPC here = (accepted keystrokes: 12, since #5 and #6 didn't land, and Backspace + c both did) ÷ 11 final chars = **1.09**.
- **A new metric specific to must-correct mode: "rejected-attempt rate"** = 2 rejected ÷ 14 total attempts = **14.3%**. This should be surfaced in analytics as it did not exist in free mode.
- **Final accuracy** = 100% (must-correct mode guarantees the final text is always fully correct, by construction — this is a useful invariant to test: **property test rule** — "in must-correct mode, final accuracy must always equal 100%, for any random log, or the engine has a bug.")
- **Net WPM** — same rule as always (correct chars ÷5 ÷ minutes) = (11/5) ÷ (5954/60000) = 2.2 ÷ 0.0992 = **22.2 WPM**.

**Test name:** `ENG-FIXTURE-D01-must-correct-rejected-attempts`
**What it proves:** must-correct mode needs its own rejected-keystroke bookkeeping that free mode doesn't have, and gives you a free, powerful property test (100% final accuracy, always) that can run against thousands of random synthetic logs.

---

## 4.6 Worked Example E: Rollover (overlapping keys)

**Target text:** `fj` — a two-key example chosen because F and J are on opposite hands on a standard QWERTY layout, which is exactly the situation where fast typists overlap keys.

**Scenario:** user presses F down, then presses J down *before* releasing F (this is physically possible and common in fast alternate-hand typing), then releases both.

**Keystroke log (both keydown AND keyup recorded, which is why capturing keyup is mandatory, not optional):**
| # | Event | Key | Time (ms) |
|---|---|---|---|
| 1 | keydown | f | 0 |
| 2 | keydown | j | 60 |
| 3 | keyup | f | 110 |
| 4 | keyup | j | 150 |

**Hand-computed expected results:**
- **Rollover check for the transition f→j:** the rule is "keydown of the next key occurred before keyup of the previous key." Here, `j` keydown (60ms) is before `f` keyup (110ms) → **this transition IS rollover.**
- **Rollover ratio for this test** = 1 rollover event ÷ 1 transition (only one transition exists in a 2-key sequence) = **100%**.
- **IKI for this pair** = time between the two keydowns = 60ms − 0ms = **60ms** — very fast, consistent with rollover typing (compare: Example A's evenly-paced non-overlapping keystrokes had ~545ms IKI).
- **Critical implementation note:** if your engine only logs keydown events (a common shortcut), it is **structurally incapable of measuring rollover at all** — this is why `typing-engine-core` mandates capturing keyup. This fixture is the direct proof-of-necessity for that requirement.

**Test name:** `ENG-FIXTURE-E01-rollover-detection`
**Companion property test:** generate 500 random logs with randomized keydown/keyup overlap patterns; assert that the computed rollover ratio always falls in [0, 1] and that a log with zero overlapping pairs always computes to exactly 0% (not a floating-point artifact like 0.0001%).

---

## 4.7 Worked Example F: A long pause mid-test (burst vs. net speed divergence)

**Target text:** `the quick brown fox jumps over the lazy dog` (44 characters)

**Scenario:** user types the first half quickly, stops to think for 8 seconds (a genuine pause, not a system hiccup), then finishes quickly.

**Timeline summary (not full keystroke-by-keystroke — describing the pattern):**
- Characters 1–22 (`the quick brown fox ju`) typed evenly across 0–4000ms (≈182ms per keystroke — fast).
- **Pause from 4000ms to 12000ms** (8000ms of no keystrokes).
- Characters 23–44 typed evenly across 12000ms–16000ms (≈182ms per keystroke — fast again).
- Total elapsed = 16000ms = 16 seconds.

**Hand-computed expected results:**
- **Net WPM (whole-test average)** = (44/5) ÷ (16/60) = 8.8 ÷ 0.2667 = **33.0 WPM** — this looks mediocre, but it's misleading, because it's dragged down by 8 seconds of pure thinking time with zero keystrokes.
- **Burst WPM (best rolling 5-second window)** — take any 5-second window fully inside the fast-typing region, e.g., 0–5000ms roughly covers characters 1–22 at 182ms/char → about 27 characters in 5 seconds → (27/5) ÷ (5/60) = 5.4 ÷ 0.0833 = **64.8 WPM**. This is nearly double the whole-test net WPM, and it is the *true* reflection of the user's actual typing speed when they're not thinking.
- **IKI distribution rule test:** the spec says "exclude gaps > 5 seconds from IKI statistics." The 8000ms pause is a single interval that must be **excluded** from the mean/median IKI calculation, or it will massively skew the reported "average time between keystrokes" upward and make the user look far slower than they are at the keystroke level. **This is a specific, nameable bug**: if an AI implementation naively averages ALL inter-keystroke gaps including this one 8-second outlier, mean IKI would be wildly wrong (roughly 372ms average instead of the true ~182ms), and this exact fixture catches it.
- **Consistency score** — this SHOULD be low/poor for this test, correctly reflecting that the pace was inconsistent (fast, then a dead stop, then fast) — unlike IKI, the consistency metric does NOT exclude the pause; it's supposed to be penalized by it, because inconsistency is exactly what happened.

**Test name:** `ENG-FIXTURE-F01-long-pause-burst-divergence`
**What it proves:** (1) burst WPM and net WPM must diverge here on purpose — a test that checks `burst_wpm > net_wpm * 1.5` for this fixture is a reasonable regression guard; (2) IKI stats must exclude the outlier pause while consistency must NOT exclude it — these are two metrics with deliberately different outlier-handling rules, which is easy to accidentally implement identically.

---

## 4.8 Worked Example G: Key repeat (held key) — must NOT count as extra keystrokes

**Target text:** `aa` (deliberately just two identical letters, to isolate the key-repeat problem)

**Scenario:** the user intends to type the letter "a" twice, by pressing it, releasing, pressing again. But suppose instead they **hold the A key down slightly too long**, and the OS's key-repeat feature fires a second `keydown` event for "a" automatically (this is standard OS behavior — hold any key and it repeats after a short delay).

**Keystroke log:**
| # | Event | Key | Time (ms) | Note |
|---|---|---|---|---|
| 1 | keydown | a | 0 | Real user press |
| 2 | keydown | a | 520 | **OS-generated key-repeat event** (`.repeat` flag = true in the browser event) — the user never released and re-pressed |
| 3 | keyup | a | 540 | Finally released |
| 4 | keydown | a | 900 | Real second intentional press |
| 5 | keyup | a | 950 | Released |

**Hand-computed expected results:**
- **Correct final text should be `aa`** — exactly two letters — NOT `aaa`. The repeat event at 520ms must be **filtered out entirely** and never inserted into the buffer.
- **Detection rule:** browsers expose a `repeat` boolean on keyboard events specifically for this. The engine's input adapter must check this flag and **drop repeated keydown events before they ever reach the buffer or the metrics pipeline.**
- **If NOT filtered (the bug case):** final text becomes `aaa` (3 chars) vs. target `aa` (2 chars) → this would be scored as one "extra" character error, keystroke count would be inflated, and worse, the *user did nothing wrong* — this is a pure engine bug being scored as a user typing error, which is one of the worst possible classes of bug (it makes the tool actively unfair).
- **KSPC** (after correct filtering) = 2 accepted keystrokes ÷ 2 final chars = **1.00**.

**Test name:** `ENG-FIXTURE-G01-key-repeat-filtering`
**Severity if wrong:** **Critical.** This bug would silently corrupt scoring for any user who holds a key even slightly too long, which happens to essentially everyone occasionally, especially on laptop keyboards with short key-repeat delays. This should be one of the first fixtures written and one of the first tests run.

---

## 4.9 Named Edge Cases (catalog, each with a required decision)

Each edge case below requires an explicit, documented decision — not "whatever the framework happens to do." Write the decision in the engine contract document (Implementation Guide M1-14).

**E1 — When does the clock start?**
Options: (a) on page load, (b) on focus of the typing surface, (c) on the very first accepted keystroke. **Recommended: (c)**, because (a) and (b) would penalize a user who takes a moment to read the passage before starting, inflating their apparent time and lowering their WPM through no fault of their own. Test: a fixture where the user focuses the input, waits 10 seconds reading, THEN starts typing at a normal pace — result must show a normal WPM, not one artificially halved by the reading pause.

**E2 — What happens if the user types past the end of the target text (extra characters)?**
Example: target is `cat`, user types `catt` (one extra `t`). Decision: the extra `t` is classified as an **"extra" character** (not an error against a target position, since there is no 4th target position) and does count against final accuracy's denominator in most reasonable schemes, or is tracked as a separate "extra character count" metric. **Document which.** Test: verify extra characters at the end of a fixed-length test either extend the test (word-count modes) or are rejected (some modes cap input at target length) — behavior must match the mode's documented rule.

**E3 — Caps Lock is on, target text is lowercase.**
User's physical keypresses would each type an uppercase letter due to Caps Lock, producing e.g. `THE` instead of `the`. Decision: this is scored as **case errors** (a specific error subtype), not garbage — the engine must still correctly identify *which* physical keys were pressed (via `event.code`, not the shifted `event.key`) so that layout-based analytics (which key, which finger) remain accurate even though the produced character was wrong-case. Test fixture: simulate Caps-Lock-on typing of a lowercase target; verify (a) all characters are flagged as case-error substitutions, (b) the per-key analytics still correctly attribute presses to the correct physical keys, not nonsense.

**E4 — The user's browser tab loses focus mid-test (alt-tabs away).**
Decision matrix:
| Mode | Behavior required |
|---|---|
| Practice mode | Pause automatically; resume timer only when refocused; elapsed "wall clock" time during the blur is excluded from the scored duration |
| Verified/ranked mode | Test becomes **invalid** immediately on blur — cannot be verified, and must be clearly marked as such, not silently scored |
Test: simulate a `visibilitychange` event firing mid-test in both modes; assert practice mode shows a paused state with correct time exclusion, and ranked mode transitions to an `invalid` state that blocks server verification.

**E5 — Multi-key characters: accented letters via dead keys (e.g., typing `é` on some layouts requires pressing a dead-key modifier, then `e`).**
This looks like **two keydown events** but must produce **one target character** (`é`). Decision: the engine's text-model layer must recognize dead-key sequences (using the browser's composition-aware key handling) and attribute the *combined* time span (from the first key of the sequence to the completing key) as the "time to type this one character," not as two separate very-fast keystrokes on two different target characters (which would be nonsensical, since there's only one target character here). Test fixture: a target text containing one accented character, typed via a two-physical-key dead-key sequence on a French or Spanish layout; verify the engine produces exactly one character in the buffer with one attributed time cost, not two.

**E6 — Text containing emoji or combining characters (e.g., a flag emoji, which is technically 2+ Unicode code points rendered as one visual glyph).**
Decision: for MVP, the "unit" for comparison purposes is the **user-perceived character (grapheme cluster)**, not the raw code point, specifically so a single emoji doesn't get scored as "half correct, half missing" if the underlying encoding splits it into multiple code points. Document as a known limitation that full grapheme-cluster handling for complex scripts (e.g., some South Asian scripts with combining marks) may have gaps at MVP and is explicitly flagged for later hardening — do not silently guess.

**E7 — The user pastes text into the typing surface (should be blocked, but what if the block itself fails on some browser/OS combination)?**
Decision: defense in depth — (a) prevent the paste event at the DOM level, (b) as a backstop, if a suspiciously large burst of characters appears with implausibly small inter-key intervals (e.g., 40 characters all within 5ms of each other), the **server-side plausibility check** (not the client) flags the result regardless of whether the client-side block worked. Never rely on the client-side block alone for anything that matters (verified results, leaderboards).

**E8 — Two different physical keys that produce the same character on the active layout (rare, but layout-dependent — e.g., on some international layouts there can be more than one physical path to a given punctuation mark).**
Decision: attribute the keystroke's finger/hand analytics to the *actual physical key pressed* (`event.code`), never to a canonical "the" key for that character — otherwise per-finger heatmaps become wrong for users on non-standard layouts.

**E9 — A test with zero keystrokes (user opens the page and immediately navigates away, or the "test" times out with nothing typed).**
Decision: all speed metrics report as **"not available"**, not as `0 WPM` (0 WPM implies the user tried and failed at zero speed, which is misleading; "not available" correctly communicates that no data exists). Also must not crash the results-rendering code — this is a very common crash source ("divide by zero minutes" or "divide by zero characters") and deserves its own explicit test.

**E10 — The device's system clock changes mid-test** (e.g., automatic timezone/DST adjustment triggers, or a virtual machine's clock jumps).
Decision: engine timing must be based on **monotonic** time sources (`performance.now()`-style, which is guaranteed not to jump backward or be affected by system clock changes), never on wall-clock timestamps (`Date.now()`-style) for elapsed-time math. This is why `typing-engine-core` explicitly bans `Date.now()` for timing. Test: cannot easily simulate a real clock jump in a unit test, but you CAN assert in code review that no timing-critical path calls the wall-clock API — this is a static-analysis-style check, not a runtime fixture, and should be listed as a linting rule.

---

*(Continued in Part 2 of this chapter: the state-machine transition table worked in full, the alignment/error-classification algorithm worked by hand on a multi-error example, per-key/per-bigram aggregation worked examples, and a consolidated test scenario catalog of 40 named tests.)*
