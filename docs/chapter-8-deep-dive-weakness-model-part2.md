# Chapter 8 (Deep-Dive) — The Weakness Model, Part 2: Drill Selection, Plateau Detection, Test Catalog

**Continues from Part 1.**

---

## 8.6 The "Next Best Drill" selection algorithm, worked step by step

**Recap of the rule (ANA-06 in the master spec):** choose the weakest dimension weighted by how often that class appears in the user's chosen language/stack.

### 8.6.1 Full worked example — a programmer user's real profile

**Scenario:** a user practicing JavaScript has this weakness profile (expected-benefit scores from §8.2, already computed per-item and then aggregated per token class):

| Token class | Aggregated expected-benefit score (sum across items in class) | Frequency of this class in JavaScript specifically (a `[proposal]` estimated weight, since real code has more brackets/identifiers than, say, comments) |
|---|---|---|
| Brackets | 0.015 | 0.22 (22% of typical JS tokens are brackets/braces) |
| Operators | 0.008 | 0.15 |
| Numbers | 0.031 | 0.06 |
| Naming/identifiers | 0.012 | 0.30 |
| Strings | 0.006 | 0.10 |
| Comments | 0.002 | 0.05 |

**Step 1 — raw class scores are already frequency-weighted at the item level (per §8.2.4)**, so at this point we have two reasonable design choices, and this is a real decision point worth naming explicitly:

**Option A: use the raw aggregated expected-benefit score directly** (Numbers wins, at 0.031, more than double the next-highest class).
**Option B: re-weight by class-level frequency-in-language on top of the already-item-level-weighted score** (double-counting frequency), which would compute `0.031 * 0.06 = 0.00186` for Numbers vs. `0.012 * 0.30 = 0.0036` for Naming — flipping the winner to Naming instead.

**Decision (documented here, since this is exactly the kind of ambiguity that needs an explicit call, not an implicit one):** **use Option A** — the per-item expected-benefit calculation (§8.2.4) already incorporates frequency at the individual bigram/symbol level (e.g., `q→u`'s real English-language frequency was already baked into its score). Re-applying a *class-level* frequency weight on top would double-count frequency and bias the recommendation toward whatever token class happens to be common in the language, even if the user has no actual measured weakness there. **The class-level "frequency of this class in the language" column above is retained in the data model for a different, legitimate purpose instead: as a tie-breaker only**, used when two classes have expected-benefit scores within a small tolerance of each other (e.g., within 10%), in which case prefer recommending the class that's more frequent in the user's actual language/stack, since a near-tie in measured weakness should be broken in favor of practical impact.

**Step 2 — apply the decision:** Numbers wins outright (0.031, far above the 10% tolerance band over the next class at 0.015), so the Next Best Drill recommendation is: **"Practice Numbers"** — specifically, drill into which items within the Numbers class are driving that score (per-item breakdown from the underlying data, e.g., maybe it's specifically hex-literal formatting that's weak, informing which generator/level to route the user toward from the vocabulary file's Tier 5 tables).

**Test name:** `WM-FIXTURE-007-next-best-drill-no-double-counting` — assert that given the worked table above, the algorithm selects "Numbers" (not "Naming"), proving the double-counting bug described in Option B was avoided.
**Test name:** `WM-FIXTURE-008-next-best-drill-tiebreaker` — construct a scenario where two classes have expected-benefit scores within 10% of each other (e.g., 0.020 and 0.019) and assert the tie-breaker correctly favors the more-frequent-in-language class.

---

## 8.7 Plateau detection, worked example

**Recap of the rule (MST-10 in the retention playbook, LRN-10 in the master spec):** trigger after roughly 14 days with no trend improvement in the trailing rolling median.

### 8.7.1 Worked example — is this actually a plateau, or just noise?

**Scenario:** a user's rolling-median net WPM (Real-World Prose) over the last 14 days, sampled every 2 days: Day 0: 42.1, Day 2: 43.5, Day 4: 41.8, Day 6: 44.2, Day 8: 42.9, Day 10: 43.1, Day 12: 42.6, Day 14: 43.8.

**Naive check (wrong): "did the last value exceed the first value?"** `43.8 > 42.1` → technically yes, a naive check would say "not a plateau, still improving" — but this misses that the whole series is just bouncing around a flat mean with no real trend.

**Correct approach — fit a simple linear trend and check its slope, not just endpoints:** using the 8 data points above, a linear regression (ordinary least squares, computed by hand for illustration) gives a slope of approximately **+0.06 WPM per day** — technically positive, but so small it's well within normal day-to-day noise (the standard deviation of the 8 values themselves is about 0.85 WPM, meaning a slope of 0.06/day over 14 days only predicts about 0.84 WPM of "real" change, comparable to or smaller than the noise itself).

**Decision rule (a `[proposal]`, made concrete and testable):** flag a plateau when the fitted 14-day slope's predicted total change is **less than one standard deviation of the underlying data points** — i.e., the "trend," if real, would be smaller than the noise, meaning you can't actually distinguish "slowly improving" from "flat with random variation" at this sample size. Worked: predicted 14-day change (0.84) vs. one standard deviation (0.85) → **0.84 < 0.85, so this IS flagged as a plateau**, correctly overriding the naive "last point is higher than first point" check.

**Test name:** `WM-FIXTURE-009-plateau-detection-noise-vs-trend` — hardcode the 8 data points above; assert the naive endpoint-comparison would say "improving" but the correct slope-vs-noise check says "plateau," and assert the implementation produces the correct (plateau) result.

### 8.7.2 What happens after a plateau is flagged (the intervention menu, concretely)

Per the master spec's LRN-10, the system recommends one of several reasoned interventions. Here's a worked concrete example of **how to choose which one**, since "recommend an intervention" is not itself an algorithm without a selection rule:

| Signal available | Recommended intervention | Why |
|---|---|---|
| Accuracy has been declining alongside the flat speed | "Let's slow down and focus on accuracy for a few days" | Speed plateaus are often accuracy problems in disguise — pushing for more speed while accuracy erodes usually backfires |
| Accuracy has been stable/high, session count has been low (e.g., under 2 sessions/week) | "You've been consistent when you practice — try adding one more short session this week" | The plateau may simply be under-practice, not a skill ceiling |
| Accuracy stable, session count adequate (3+/week), but always the same content type | "Try mixing in {other content type} this week" | Same content repeatedly can plateau even with good practice habits — variety itself can help |
| Burst WPM (best 5-second window, per Chapter 4 §4.7) has been climbing even though net WPM is flat | "Your peak speed is actually improving — your sustained pace just hasn't caught up yet. Keep going." | This is genuinely encouraging AND accurate — a real, honest signal that things ARE moving, just not yet visible in the headline number |

**Test name:** `WM-FIXTURE-010-intervention-selection` — construct four synthetic scenarios matching each row above; assert each produces its corresponding, correct intervention recommendation, not a generic one-size-fits-all message.

---

## 8.8 Consolidated Test Scenario Catalog for the Weakness Model (25 named scenarios)

**Group 1 — Severity and expected benefit (4)**
1. `WM-FIXTURE-001` — frequency-weighting worked example, q→u vs z→x (§8.2)
2. `WM-SEVERITY-002` — an item with high slowness but zero errors (isolate the slowness-only case)
3. `WM-SEVERITY-003` — an item with high error rate but normal speed (isolate the error-only case)
4. `WM-SEVERITY-004` — an item with BOTH high slowness AND high errors — assert the combined score exceeds either individual signal's contribution alone (sanity check that the combination formula doesn't cap out or clip unexpectedly)

**Group 2 — Confidence and shrinkage (4)**
5. `WM-FIXTURE-002` — shrinkage, small sample (§8.3.1)
6. `WM-FIXTURE-003` — shrinkage, large sample, convergence (§8.3.2)
7. `WM-SHRINKAGE-PROP-01` — monotonic convergence property test (§8.3.2)
8. `WM-FIXTURE-011` — an item with exactly zero samples (never yet encountered) — assert it does not appear in ANY ranked list (not even as "watching"), since there is nothing to watch yet; verify no divide-by-zero crash

**Group 3 — Recency weighting (3)**
9. `WM-FIXTURE-004` — decay weight worked values at 3/18/36/90 days (§8.4.1)
10. `WM-FIXTURE-005` — recency-weighted average with a real trend (§8.4.2)
11. `WM-FIXTURE-012` — an item whose most recent sample is very old (say, 200 days) — assert it either drops out of the active profile entirely (per the pruning floor from §8.4.1) or is clearly marked as stale/decayed data, never silently treated as current

**Group 4 — Cold start and readiness (3)**
12. `WM-FIXTURE-006` — readiness-threshold asymmetry between fast and slow typists (§8.5.2)
13. `WM-FIXTURE-013` — a user below the overall 150-keystroke threshold — assert the UI shows the honest "not enough data" message, never a fabricated or forced ranking
14. `WM-FIXTURE-014` — a user who crosses the threshold mid-session (e.g., reaches keystroke 150 partway through their second test) — assert the profile becomes available for the very next results screen, not delayed an extra full test cycle

**Group 5 — Next Best Drill selection (3)**
15. `WM-FIXTURE-007` — no double-counting of frequency (§8.6.1)
16. `WM-FIXTURE-008` — tie-breaker logic (§8.6.1)
17. `WM-FIXTURE-015` — a user with an EMPTY profile in one entire token class (e.g., they've never typed any code numbers at all yet) — assert this class is excluded from ranking (not falsely scored as "perfect, zero weakness," which would be wrong — "never measured" and "measured and found strong" must be distinguishable states, not conflated)

**Group 6 — Plateau detection (3)**
18. `WM-FIXTURE-009` — noise-vs-trend plateau detection (§8.7.1)
19. `WM-FIXTURE-010` — intervention selection across four scenarios (§8.7.2)
20. `WM-FIXTURE-016` — a genuinely improving user (real upward slope exceeding the noise floor) — assert NO plateau is flagged, avoiding a false-positive plateau warning for someone who's actually progressing well

**Group 7 — Cross-content-type isolation (2)**
21. `WM-FIXTURE-017` — a user who is fast at Prose but slow at Code — assert their Prose weakness profile and Code weakness profile are computed and stored completely independently, with no cross-contamination (e.g., the "baseline IKI" used in §8.2.1's formula must be the Code-specific baseline when analyzing Code weaknesses, not a blended overall baseline that would make Code transitions look artificially better or worse than they really are relative to Code-specific norms)
22. `WM-FIXTURE-018` — a user who switches keyboard layouts mid-history (e.g., QWERTY to Colemak) — assert weakness data from before the switch is kept separate (per the master spec's "keep separate aggregates per layout" rule) and does not get blended into the new layout's profile, which would produce meaningless, incomparable numbers

**Group 8 — End-to-end integration (3)**
23. `WM-INTEGRATION-001` — full pipeline test: feed a sequence of 10 realistic typing-test logs (using the Chapter 4 fixture format) through result-processing → aggregation → severity scoring → Next Best Drill selection → assert the final recommendation matches a hand-computed expected answer for this specific synthetic 10-test history
24. `WM-INTEGRATION-002` — the "practice actually helps" loop: after the drill recommended by test 23 is completed with simulated improvement on the targeted item, assert the SAME item's severity score decreases on the next computation (proving the feedback loop is genuinely responsive to real improvement, not stuck or stale)
25. `WM-INTEGRATION-003` — the "practice doesn't help" honesty check: simulate a drill completed with NO improvement (or even slight regression) on the targeted item; assert the system does NOT falsely report improvement (checking against the honest "steady" UI copy string from the UI copy file, `onboarding.postDrill.delta.steady`, rather than always defaulting to a positive-sounding message regardless of actual data)

---

## 8.9 Calibration validation plan (how to know if any of this is actually right, once real users exist)

**This entire chapter's formulas are `[proposal]` starting values** (the k=15 shrinkage constant, the 18-day half-life, the 0.5/0.5 severity weighting, the 150-keystroke and n≥8 readiness thresholds, the 10% tie-breaker tolerance). **None of these numbers should be treated as final** — they are defensible, reasoned starting points chosen so the system can launch and start collecting real data, not the result of fitting against real user behavior (which doesn't exist yet).

**The actual calibration procedure, once beta data exists (ties directly into the Six-Pillar Proof Plan's Pillar 1 efficacy program):**
1. **Validate the severity formula's weighting (0.5/0.5 slowness/error split)** by checking: among items flagged as "high severity," do users who specifically drill them show measurably more improvement than users who drill randomly-matched-difficulty items? If the 0.5/0.5 split under- or over-weights one signal, this comparison should reveal it, and the weighting can be adjusted (this is a direct instance of the efficacy program's L1 randomized design from the proof plan, applied specifically to validate this one internal formula rather than the product's overall efficacy claim).
2. **Validate the shrinkage constant (k=15)** by checking prediction accuracy: for items with exactly, say, 5 samples, does the shrunk estimate predict that item's eventual (once it accumulates 50+ samples) true average better than the raw 5-sample average would have? This is a standard, checkable statistical validation (a form of cross-validation) that doesn't require waiting for the full efficacy study — it can be run on beta data directly, fairly early.
3. **Validate the recency half-life (18 days)** similarly: does a THE user's practice show detectable week-over-week change fast enough that an 18-day half-life is the right sensitivity, or should it be shorter (more responsive to very recent practice) or longer (more stable, less noisy)? This is tunable once real trend data exists.
4. **Validate the readiness thresholds (150 keystrokes, n≥8 per item)** by checking false-positive rates: how often does a weakness flagged as "ready" at exactly the threshold turn out, with more data, to have been a fluke (i.e., check whether the confidence threshold is actually protective, or whether it needs to be raised)?

**None of this validation work is possible without real user data** — which is exactly why the Week 0-2 plan and the Six-Pillar Proof Plan both insist on getting real users engaged with instrumentation running as early as possible, rather than trying to perfect these formulas in the abstract before anyone has used the product.
