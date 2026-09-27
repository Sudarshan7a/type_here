# Chapter 8 (Deep-Dive) — The Weakness Model: Edge Cases, Worked Examples, Test Scenarios

**Extends:** Implementation Guide §9 (M4 — Learning Engine) and the design decisions D-M4-1 through D-M4-7.
**Purpose:** same treatment as Chapter 4 gave the typing engine — every abstract rule gets a worked numeric example, every edge case gets a named decision, every claim gets a test. This is the component the master spec calls "the product's heart," and it is also the component most likely to quietly go wrong without anyone noticing, because a *plausible-looking but wrong* weakness score doesn't crash — it just quietly gives bad advice.

---

## 8.1 Why this chapter is unusually high-stakes

An engine bug (Chapter 4) usually produces an obviously wrong number — a WPM that's clearly impossible, a crash. A **weakness-model bug produces a plausible-looking wrong answer** — "your weakest key is Q" when it's actually a data artifact, not a real weakness. The user has no way to know the recommendation is wrong; they'll just practice the wrong thing, get discouraged when it doesn't help, and (per the Pillar 1 proof plan) this directly threatens the product's core claim. **Every worked example below exists to make a specific silent failure mode loud and testable instead.**

---

## 8.2 The severity formula, worked in full with real numbers

**Recap of the rule (from the implementation guide, D-M4-2):** severity combines (a) relative slowness vs. the user's own baseline for comparable items, and (b) error rate, adjusted for how often the item appears — combined into a **severity score**, then ranked by **expected benefit** = severity × frequency-in-content.

**This section makes that concrete with an actual worked numeric example**, because "combine two signals into a score" is exactly the kind of instruction that gets implemented five different, all-plausible, all-different ways by five different people (or AI sessions) without a canonical worked example to check against.

### 8.2.1 Step 1 — Compute relative slowness for a single transition

**Scenario:** user's aggregated stats show:
- Their **overall median inter-key interval (IKI)** across all cross-hand bigram transitions (a reasonable "personal baseline" for comparable items) = **180ms**.
- Their specific transition `q→u` has a **median IKI of 340ms** across 22 samples.

**Relative slowness formula (a `[proposal]`, stated explicitly so it's testable):**
```
relative_slowness = (item_median_IKI - baseline_median_IKI) / baseline_median_IKI
```
Worked: `(340 - 180) / 180 = 160/180 = 0.889` → **the `q→u` transition is 88.9% slower than the user's comparable-transition baseline.**

**Why this specific formula and not a raw ratio (`340/180 = 1.89`, "1.89x slower"):** the percentage-difference framing produces a number that's directly usable in the UI copy string `weakness.transitionTable.column.speed` and matches the results-screen copy pattern already established (`results.whatToFix.item` uses "{detail}" like "about 40% slower than your average pair" — that 40% comes from exactly this formula). **Keeping the formula and the UI copy consistent is itself a testable invariant**: if the formula changes, the example string in the UI copy file must be regenerated to match, or the two documents will silently drift apart (a real risk across a large multi-file spec like this one — flagging it here as a cross-document consistency check to add to the release checklist).

### 8.2.2 Step 2 — Compute error-rate signal for the same transition

**Scenario continued:** of the 22 samples of `q→u`, **4 resulted in an error** (either the `q` or the `u` was mistyped, or a correction occurred immediately around that transition).
```
error_rate = errors / samples = 4 / 22 = 0.182 (18.2%)
```
**Compare to baseline:** the user's overall error rate across all transitions is **6%**. So this transition's error rate (18.2%) is **about 3x their baseline error rate**.

### 8.2.3 Step 3 — Combine into a severity score

**Worked combination formula (a `[proposal]`, using equal weighting as the documented starting point per the master spec's calibration note):**
```
severity = 0.5 * normalized_relative_slowness + 0.5 * normalized_relative_error_rate
```
where each "normalized" component is capped at a maximum contribution (e.g., clamp relative slowness at 2.0 = "200% slower" so one extreme outlier transition doesn't produce an absurd, off-the-chart severity score that dwarfs everything else) and error rate is expressed as its own ratio to baseline (3.0x, from Step 2), similarly clamped.

Worked: normalized_relative_slowness = min(0.889, 2.0) = 0.889 → scaled to a 0–1 range by dividing by the clamp ceiling: 0.889/2.0 = **0.445**
normalized_relative_error_rate = min(3.0, 4.0) = 3.0 → scaled: 3.0/4.0 = **0.75**

```
severity = 0.5 * 0.445 + 0.5 * 0.75 = 0.2225 + 0.375 = 0.5975
```
**Severity score for `q→u`: 0.60 (on a 0–1 scale).**

### 8.2.4 Step 4 — Multiply by frequency to get expected benefit

**Scenario continued:** the letter pair `q→u` appears, on average, in about **0.8% of all English bigrams** the user is likely to type (a real, known linguistic fact — `qu` is extremely common relative to other `q`-involving pairs, since `q` is almost always followed by `u` in English). Compare this to another hypothetical weak transition, `z→x`, which might have an identical severity score of 0.60 but a real-world frequency of only **0.02%** (a genuinely rare pair in English).

```
expected_benefit = severity * frequency_weight
```
Worked for `q→u`: `0.60 * 0.008 = 0.0048`
Worked for `z→x`: `0.60 * 0.0002 = 0.00012`

**`q→u` ranks roughly 40x higher in expected benefit than `z→x`, despite having the exact same severity score** — this is the entire point of multiplying by frequency: **fixing a common weak pattern matters far more than fixing an equally-bad but rare one**, because the common one will actually show up and cost the user time in real typing, while the rare one barely matters even if it's technically "just as broken." **This is the single most important worked number in this chapter** — an implementation that ranks purely by severity (ignoring frequency) will recommend drilling rare, low-value letter pairs over common, high-value ones, and this would be a subtle, hard-to-notice bug that directly undermines Pillar 1 (does the product make people better) since the recommended practice wouldn't transfer to real improvement.

**Test name:** `WM-FIXTURE-001-frequency-weighting-worked-example` — hardcode the exact numbers above (22 samples, 4 errors, 340ms median, 180ms baseline, 0.008 and 0.0002 frequency weights) and assert the exact severity (0.5975, rounds to 0.60) and expected-benefit ranking (q→u ranks above z→x) come out of the implementation.

---

## 8.3 Confidence and sample-size handling, worked in full

**Recap of the rule (D-M4-3):** don't rank items below a minimum sample count; shrink extreme estimates toward the user's average when data is thin.

### 8.3.1 Worked example — the "lucky/unlucky small sample" problem

**Scenario:** a user has typed the bigram `zj` (rare, but happens, e.g., in "pizza joint") exactly **twice** in their entire history. Both times, by pure chance, they were unusually slow (maybe they paused to think about something else both times, unrelated to the letters themselves) — median IKI for these 2 samples = **900ms**, versus their overall baseline of 180ms.

**Naive calculation (wrong):** relative_slowness = (900-180)/180 = **4.0 (400% slower!)** — this would make `zj` look like an extreme, urgent weakness, potentially ranking above genuinely well-established weak spots with dozens of samples.

**Correct handling — shrinkage toward the mean (a standard statistical technique, explained in plain terms):** when sample size is small, blend the item's own average with the user's overall baseline, weighted by how much data exists. A commonly used, simple version of this idea:
```
shrunk_estimate = (n * item_average + k * baseline_average) / (n + k)
```
where `n` = number of samples for this item (2, here), and `k` is a **shrinkage constant** representing "how many samples' worth of trust we place in the baseline by default" — a `[proposal]` starting value of **k = 15** (meaning: an item needs roughly 15+ samples before its own data dominates the estimate; below that, the baseline pulls the estimate back toward normal).

Worked: `shrunk_estimate = (2 * 900 + 15 * 180) / (2 + 15) = (1800 + 2700) / 17 = 4500 / 17 = 264.7ms`

**Recompute relative slowness using the shrunk estimate:** `(264.7 - 180) / 180 = 0.47 (47% slower)` — still elevated, correctly showing this MIGHT be a real weak spot worth watching, but nowhere near the wildly exaggerated 400% the naive 2-sample calculation produced.

**Confidence label:** since `n=2` is far below the informal "ready" threshold (a `[proposal]` of **n ≥ 8** before an item is shown as a ranked weakness rather than a "watching" item), this item is displayed as **"Still learning this one — 2 samples so far"** (matching the exact UI copy string `weakness.transitionTable.lowConfidence` already defined in the UI copy file) rather than confidently listed as a top weak spot.

**Test name:** `WM-FIXTURE-002-shrinkage-small-sample` — assert that with n=2 and the worked inputs above, the shrunk estimate is 264.7ms (not the naive 900ms), and that the item is flagged "watching" not "ranked weak," given it's below the n≥8 threshold.

### 8.3.2 Worked example — when shrinkage should NOT dominate (enough data)

**Scenario:** the same `zj` bigram, but now with **40 samples** accumulated over a month, with a stable median of 850ms (consistently slow, not a fluke).

Worked: `shrunk_estimate = (40 * 850 + 15 * 180) / (40 + 15) = (34000 + 2700) / 55 = 36700/55 = 667.3ms`

**Relative slowness:** `(667.3 - 180)/180 = 2.71 (271% slower)` — still pulled in slightly from the raw 850ms average, but now the user's own 40 real samples dominate the estimate (contributing 40 parts vs. the baseline's fixed 15-part pull), correctly reflecting that this IS a genuinely, consistently weak transition, not a fluke.

**Test name:** `WM-FIXTURE-003-shrinkage-large-sample` — assert that as `n` grows, the shrunk estimate converges toward the raw average (40 samples pulls much less toward baseline than 2 samples did), which is the core mathematical property this technique is supposed to have — worth its own property test:

**Property test `WM-SHRINKAGE-PROP-01`:** for a fixed raw average and fixed baseline, generate shrunk estimates across n = 1, 2, 5, 10, 20, 50, 100. Assert the sequence of resulting relative-slowness values is **monotonically increasing** toward the true (unshrunk) value as n grows — i.e., more data should always pull the estimate closer to the item's own raw average, never further away. A bug that breaks this monotonic property (e.g., an off-by-one in the shrinkage formula) would be a serious, silent error.

---

## 8.4 Recency weighting, worked example

**Recap of the rule (D-M4-4):** recent practice should matter more than old data, via a decay function with a half-life measured in days.

### 8.4.1 Worked example — how much does a 3-week-old sample count today?

**Formula (a `[proposal]`, exponential decay, half-life = 18 days as a starting value within the spec's proposed "two to three weeks" range):**
```
weight(age_in_days) = 0.5 ^ (age_in_days / half_life)
```
Worked for a sample from **3 days ago** (half_life=18): `0.5^(3/18) = 0.5^0.167 = 0.892` → this sample counts at **89.2% of full weight**.
Worked for a sample from **18 days ago** (exactly one half-life): `0.5^(18/18) = 0.5^1 = 0.5` → counts at **50% weight**, by definition of "half-life."
Worked for a sample from **36 days ago** (two half-lives): `0.5^(36/18) = 0.5^2 = 0.25` → counts at **25% weight**.
Worked for a sample from **90 days ago**: `0.5^(90/18) = 0.5^5 = 0.03125` → counts at only **3.1% weight** — effectively fading out but never mathematically reaching exactly zero (a known, accepted property of exponential decay, not a bug).

**Practical implementation implication:** rather than truly keep every sample forever with a shrinking weight (which would mean storing and re-weighting an ever-growing history — expensive and unnecessary), a real implementation should **prune samples below a weight floor** (e.g., anything below 1% weight, which per the formula above happens somewhere around 120 days for an 18-day half-life) — this is a `[proposal]` cutoff that should be documented explicitly, since "keep everything forever with decaying weight" and "keep everything for ~120 days then drop it" produce numerically almost-identical results but very different storage requirements.

**Test name:** `WM-FIXTURE-004-recency-decay-worked` — assert the four worked weight values above (0.892, 0.5, 0.25, 0.03125) come out of the implementation for ages 3, 18, 36, and 90 days respectively, using half_life=18.

### 8.4.2 Worked example — recency-weighted average, combining old and new samples

**Scenario:** a user's `th` transition has 3 samples: one from today (150ms), one from 18 days ago (200ms), one from 36 days ago (140ms).

**Naive unweighted average:** `(150+200+140)/3 = 490/3 = 163.3ms`

**Recency-weighted average (using the decay weights from §8.4.1):**
```
weighted_avg = (w1*v1 + w2*v2 + w3*v3) / (w1+w2+w3)
             = (1.0*150 + 0.5*200 + 0.25*140) / (1.0+0.5+0.25)
             = (150 + 100 + 35) / 1.75
             = 285 / 1.75
             = 162.9ms
```
**Note this specific worked example produces a nearly identical result (163.3 vs 162.9) to the naive average** — this is intentional and instructive: recency weighting matters most when there's been a **genuine trend** (the user is getting faster or slower over time), and matters very little when performance has been stable. **A second worked example showing where it DOES matter:**

**Scenario B (a real trend):** same transition, but the user has genuinely improved: today's sample = 120ms, 18-days-ago sample = 200ms, 36-days-ago sample = 260ms (clearly getting faster over time).

**Naive average:** `(120+200+260)/3 = 580/3 = 193.3ms` — this treats old, outdated (slow) performance as equally informative as today's real, current, faster performance, understating how good the user currently is.

**Recency-weighted average:** `(1.0*120 + 0.5*200 + 0.25*260) / 1.75 = (120+100+65)/1.75 = 285/1.75 = 162.9ms` — correctly shows a value much closer to today's actual 120ms performance, not dragged down by outdated data.

**Test name:** `WM-FIXTURE-005-recency-weighting-with-trend` — assert the recency-weighted average (162.9ms) is meaningfully different from and better-reflects-recent-performance than the naive average (193.3ms) for Scenario B specifically, proving the decay weighting earns its complexity in the case that actually matters.

---

## 8.5 Cold start, worked in full

**Recap of the rule (D-M4-5):** with little data, don't fake a diagnosis; use a coverage-designed first test.

### 8.5.1 What "coverage-designed" means, concretely

A **coverage-designed passage** is one deliberately constructed (or selected from the content library) to contain a wide, representative spread of common letter pairs, so that even a single 60-second test produces enough distinct-transition samples to seed a first weakness estimate — rather than, by bad luck, a passage that happens to repeat the same 5 easy transitions over and over and tells you nothing about the other 95% of the keyboard.

**Worked example using real content from the library:** `PROSE-01-005` ("I finally fixed the leaky faucet in the upstairs bathroom, though it took two trips to the hardware store and about $18 in parts I probably didn't all need.") — **let's actually check its coverage** by listing the distinct adjacent-letter bigrams it contains (a real, hand-countable exercise, demonstrating exactly how a coverage check would work):

A partial scan of this passage's bigrams (illustrative, not exhaustive): `I-f`, `fi`, `in`, `na`, `al`, `ll`, `ly`, `y-f`, `fi` (repeat), `ix`, `xe`, `ed`, `d-t`, `th`, `he`, `e-l`, `le`, `ea`, `ak`, `ky`, `y-f`(repeat)... — **this single passage already contains dozens of distinct bigrams**, several of which repeat (a good sign — repetition within the SAME test gives at least n=2 samples for common pairs like `th`, `in`, `fi` right away, seeding an initial estimate rather than needing a second test entirely).

**Practical coverage rule for content selection (a `[proposal]` for the pipeline):** when tagging content for use as a "first test" candidate specifically, compute (at content-authoring time, once the pipeline exists) the count of **distinct bigrams** contained in a passage; prefer passages scoring above a minimum distinct-bigram-count threshold (e.g., 30+ distinct pairs in a 60-second-length passage) for the specific "used as someone's very first test" slot, since this maximizes the value of that one precious first data point.

### 8.5.2 The "readiness" threshold, worked example

**Recap:** a weakness profile is "ready" only above a minimum sample count overall and per item (per D-M4-3's related n≥8-per-item threshold, plus an overall minimum).

**Worked overall threshold, a `[proposal]`:** require **at least 150 total accepted keystrokes** across all tests before showing ANY ranked weakness list (below that, always show the honest `results.whatToFix.notEnoughData` UI string already defined: "We need a bit more typing from you before we can point to anything specific.").

**Worked example — checking a real scenario against this threshold:** a user's very first test is a 60-second test at a modest 25 WPM. Using the metrics formula from Chapter 4 (net WPM = correct characters / 5 / minutes), 25 WPM over 1 minute implies roughly `25 * 5 = 125` correct characters typed, plus some error/correction overhead, so total keystrokes for that one test might be roughly 130-150. **This means a single slow-typist's first test might barely clear the 150-keystroke threshold, while a fast typist's first test (say 70 WPM = ~350 correct characters, comfortably over 400+ total keystrokes) clears it easily within one test.** This is a real, worth-flagging asymmetry: **slower typists take longer (in tests, not necessarily in time, since a 60-second test is 60 seconds regardless of speed) to reach a "ready" weakness profile than faster typists do**, simply because they produce fewer keystrokes per test. **Design implication:** consider extending the first test's duration slightly (e.g., 90 seconds instead of 60) specifically to ensure slower typists also reach the readiness threshold in one sitting — this is a genuine fairness consideration the "coverage-designed passage" idea alone doesn't solve, since duration and content coverage are two separate levers.

**Test name:** `WM-FIXTURE-006-readiness-threshold-asymmetry` — simulate a 25 WPM user and a 70 WPM user each completing one 60-second test; assert the 70 WPM user's profile is marked "ready" while the 25 WPM user's may not be (flagging this as an expected, documented asymmetry, not a bug — but one that should inform the "extend first-test duration" design decision above).

---

*(Continued in Part 2: naming-style switch-cost worked example, the "Next Best Drill" selection algorithm worked step by step, plateau detection worked example, a consolidated 25-scenario test catalog for the weakness model, and the calibration validation plan.)*
