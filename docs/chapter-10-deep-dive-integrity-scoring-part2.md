# Chapter 10 (Deep-Dive) — Integrity Scoring, Part 2: Risk Combination, False-Positive Math, Session Security, Test Catalog

**Continues from Part 1.** Read Part 1 first for the five individual checks (physical floor, single-outlier IKI, impossible rollover, bigram-dependence spread, low-variance detection) — this part combines them into one usable score and works the false-positive/appeals math the integrity program's own stated goals depend on.

---

## 10.6 Combining five checks into one risk score, worked in full

**The problem stated plainly:** five separate checks each produce their own yes/no or partial signal. A real system needs ONE actionable risk score per result, not five separate unreconciled flags. This section builds that combination with real numbers.

### 10.6.1 The weighting table (a `[proposal]`, with each weight justified)

| Check | Weight | Justification for this specific weight |
|---|---|---|
| Check 1 — Sustained physical floor violation | **40 points** (high) | Near-zero legitimate explanation once the 45ms floor (set with an 18% safety margin per §10.2.2) is crossed for a SUSTAINED window — this is the strongest single signal |
| Check 2 — Single-outlier impossible interval | **25 points** (moderate-high) | Strong signal, but a single outlier COULD in rare cases arise from a genuine hardware/OS timing glitch (e.g., a dropped/delayed event later double-counted) — not zero false-positive risk, so weighted below Check 1 |
| Check 3 — Same-finger impossible rollover | **15 points** (moderate) | Deliberately capped lower per the explicit caveat in Part 1 §10.4.2 — atypical-but-legitimate finger usage can trigger this, so it must never dominate the score alone |
| Check 4 — Bigram-dependence spread anomaly | **30 points** (high) | A very strong signal because it requires deep, hard-to-fake domain knowledge (real physical-layout awareness) to evade — few unsophisticated bots get this right |
| Check 5 — Unnaturally low variance | **20 points** (moderate-high) | Catches sophisticated evasion of Check 4, but a genuinely very metronomic (if unusual) human typist COULD occasionally show lower-than-typical variance on a short sample, so weighted slightly below Check 4 |

**Decision threshold (a `[proposal]`):** total risk score **≥ 50 points → HOLD** (results excluded from leaderboards, marked "under review," never silently deleted); **≥ 80 points → HOLD + flagged for priority human review** (likely automation, reviewed sooner); **below 50 → no action**, result stands as normal.

### 10.6.2 Worked example 1 — a genuine elite human typist, full combination

Using the worked "genuine elite typist" numbers established across Part 1:
- Check 1: 52.9ms sustained mean, above the 45ms floor → **0 points** (not triggered)
- Check 2: no single-outlier sub-15ms/35ms pairs found in this hypothetical clean sample → **0 points**
- Check 3: no same-finger overlaps detected → **0 points**
- Check 4: bigram-dependence spread of, say, 38% (within the human-plausible 20-60% band) → **0 points**
- Check 5: variance-to-mean ratio of 22% (above the 15% floor) → **0 points**

**Total risk score: 0.** Correctly, an elite genuine typist triggers nothing at all — this worked example demonstrates the entire pipeline correctly produces a clean, unflagged result for exactly the kind of user (very fast, real) that a poorly-designed system would be most likely to wrongly punish.

### 10.6.3 Worked example 2 — the naive bot from Part 1, full combination

- Check 1: 20ms sustained mean, below the 45ms floor → **40 points** (triggered, full weight)
- Check 2: (this bot's fixed-interval design likely also produces some sub-15ms artifacts if any two events happen to double up, but assume for this worked example it doesn't specifically trigger this separate check) → **0 points**
- Check 3: with fixed 20ms timing between every keystroke, some same-finger pairs will inevitably fall within the impossible-overlap window → **15 points** (triggered)
- Check 4: with uniform fixed timing, bigram-dependence spread ≈ 0% (far below the human-plausible band) → **30 points** (triggered)
- Check 5: with fixed/near-fixed timing, variance-to-mean ratio ≈ 2% (far below the 15% floor) → **20 points** (triggered)

**Total risk score: 40+0+15+30+20 = 105 points.** This clears BOTH thresholds (≥50 hold, ≥80 priority review) — correctly, an unsophisticated bot is caught decisively and with high confidence, triggering the strongest available response.

### 10.6.4 Worked example 3 — the sophisticated bot (the genuinely hard case)

A bot deliberately built to add randomized jitter, vary timing by bigram category (mimicking Check 4's expected pattern), and avoid sustained sub-45ms rates:
- Check 1: bot author tuned sustained rate to ~90ms mean (comfortably human-like) → **0 points**
- Check 2: bot author added enough jitter to avoid single-outlier sub-15ms events → **0 points**
- Check 3: bot doesn't model finger overlap physics at all, so it accidentally avoids same-finger-specific violations simply because it never generates true rollover in the first place (a genuinely realistic scenario — many bots don't bother simulating rollover, since it's an advanced feature to fake) → **0 points**
- Check 4: bot author DID model three different mean delays per bigram category, achieving a spread of 35% (within the human-plausible band) → **0 points**
- Check 5: BUT the bot author used narrow fixed-range jitter within each category (say ±3ms around each mean) rather than genuinely human-scale variance → **20 points** (triggered — this is exactly the scenario Check 5 exists for)

**Total risk score: 20 points.** This is **below the 50-point hold threshold** — the sophisticated bot is NOT automatically held under this specific combination of checks. **This worked example is important precisely because it's honest about a real limitation**: a sufficiently careful bot author, aware of checks 1-4, but who doesn't also nail realistic variance, will still slip under a 50-point threshold with only Check 5 triggering. **This directly validates the master spec's own honest framing: "no system is perfect... goals are to make cheating costly, keep false positives very low, and be transparent"** — this worked example is concrete proof that the five-check system, even well-implemented, has a real, quantifiable gap against a sufficiently sophisticated adversary, which is exactly why the integrity program layers in ADDITIONAL non-timing-based signals (account behavior, human review, verification re-tests) on top of these five statistical checks, rather than relying on timing analysis alone.

**Test name:** `INT-FIXTURE-006-sophisticated-bot-gap` — hardcode this exact scenario; assert the combined score (20) falls below the hold threshold (50), and treat this test's very existence as **documentation of a known, accepted gap**, not a bug to silently "fix" by over-tuning Check 5's weight upward (which would risk pushing genuine low-variance-but-real typists over the hold threshold instead — recall the false-positive-risk tension already established for every one of these checks).

---

## 10.7 False-positive rate, worked with real (illustrative) numbers

**Recap of the goal (from `integrity-test-plan.md`, already in the templates pack):** false-positive rate on legitimate fast typists ≤ some ceiling (e.g., 0.5%).

### 10.7.1 Worked calculation from a hypothetical calibration run

**Scenario:** following the `integrity-test-plan.md` procedure, 40 legitimate typists (including several 100+ WPM typists) are recruited and run through the full pipeline described in this chapter, producing 40 total risk scores.

**Worked results table (illustrative, since real data doesn't exist yet):**

| Risk score band | Number of the 40 legitimate typists landing here |
|---|---|
| 0-10 | 31 |
| 11-30 | 7 |
| 31-49 | 1 |
| ≥50 (would trigger a hold) | **1** |

**Worked false-positive rate:** `1 / 40 = 2.5%` — **this is far ABOVE the 0.5% target ceiling** from the integrity test plan. **What this worked (illustrative) result demonstrates, concretely:** if a real calibration run produced numbers like this, **the correct response is NOT to declare the system "done" and ship it** — it's to go back and investigate exactly which check(s) fired for that one flagged legitimate typist, and either raise that specific check's threshold, lower its weight, or add a mitigating signal (e.g., that specific typist's account has months of consistent prior history at a similar speed, which should count as evidence AGAINST them being a new bot account — see §10.7.2).

### 10.7.2 Worked example — using account history to reduce a false positive

**Scenario:** the one flagged legitimate typist from §10.7.1 triggered Check 3 (same-finger rollover) at a moderate level, likely due to their genuinely atypical, self-taught finger usage (the exact caveat flagged back in Part 1 §10.4.2). **Mitigating signal:** this same account has **180 days of prior typing history**, consistently showing similar (moderately elevated) same-finger-overlap patterns across many past sessions, all otherwise unflagged by the other four checks, at a stable, plausible skill level that gradually improved over those 180 days in a way entirely consistent with normal human learning curves (per Chapter 8's plateau/trend logic).

**Rule (a `[proposal]`, making "account behavior" concrete rather than an abstract phrase):** **reduce a check's contributed risk score by up to 50% when the SAME check has fired consistently (not as a one-off spike) across ≥30 days of the same account's prior history with no escalation in severity** — the reasoning being that a genuinely new automation script would typically be a NEW account (or would show a sudden CHANGE in pattern on an existing account, e.g., someone's real account gets compromised and starts being driven by a bot), whereas a long-standing, stable, gradually-improving pattern is much more consistent with a genuine, if atypical, human typist.

**Worked recalculation:** Check 3's original contribution (say, 15 points, at the low end of a "moderate" trigger) is reduced by 50% due to the historical-consistency mitigant → **7.5 points** — likely pulling this specific user's total score below whatever combination originally put them at "≥50," resolving the false positive using the account-history dimension the master spec calls for ("account behavior, sudden jumps vs history") rather than by weakening the underlying check for everyone.

**Test name:** `INT-FIXTURE-007-account-history-mitigation` — construct the scenario above; assert the mitigated score correctly falls below the hold threshold, while a DIFFERENT scenario (same Check 3 trigger, but on a brand-new account created minutes ago with zero history) receives NO mitigation and correctly remains held — demonstrating the mitigation is conditional on genuine historical consistency, not applied blanket to everyone.

### 10.7.3 The appeals-resolution worked timeline

**Recap (from `integrity-test-plan.md`):** median appeal resolution ≤ 3 days.

**Worked staffing calculation:** suppose beta-stage volume produces roughly **8 holds per week** (a `[proposal]` illustrative volume for an early-stage product). If roughly 60% of held users bother to file an appeal (a `[proposal]` assumption — many won't, especially if the hold doesn't block anything they personally care about, like a casual user who doesn't use leaderboards anyway), that's **~5 appeals per week**. At an estimated **20 minutes of reviewer time per appeal** (checking the specific triggered checks, the account history, and making a judgment call), that's **100 minutes (1.7 hours) of reviewer time per week** — a genuinely small, easily-staffable workload at this scale, worth stating explicitly so a solo founder doesn't over-estimate the operational burden of running an integrity program early on. **This calculation should be re-run once real beta volume exists**, replacing the illustrative 8-holds/week assumption with real data.

---

## 10.8 Session signing and replay-attack prevention, worked

**Recap (INT-03):** server issues seed/nonce/text hash at session start; submissions must arrive within a TTL; single-use.

### 10.8.1 Worked replay-attack scenario and why signing stops it

**The attack being defended against, made concrete:** a user completes a genuinely excellent, fast, accurate test once. They then attempt to submit that SAME successful result multiple times (perhaps to different leaderboard categories, or hoping a resubmission might be scored more favorably by some quirk, or as a deliberate attempt to inflate their apparent activity/streak count without actually practicing again).

**Worked mechanics:** at test start, the server issues a session record: `{session_id: "abc123", nonce: "xk29f...", text_hash: "sha256:8f3e...", expires_at: "2026-09-24T10:15:00Z"}` (a 5-minute TTL from a 60-second test's start, giving reasonable buffer for network latency and slow connections without leaving the window open long enough to be practically useful for abuse). Upon submission, the server checks: **(a) does this session_id exist and is it unexpired? (b) has it already been marked "used"? (c) does the submitted log's implied text match the text_hash on record?**

**Worked outcome for the replay attempt:** the first submission using `session_id: abc123` succeeds and the server marks that session_id as **used**. A second submission attempt using the exact same session_id (the replay attempt) is **rejected outright** at step (b), before the server even bothers recomputing any metrics — a cheap, fast rejection that doesn't waste server resources on a request that's already structurally invalid.

**Test name:** `INT-FIXTURE-008-replay-rejected` — submit the same valid, well-formed result payload twice using the same session_id; assert the first submission succeeds and the second is rejected with a specific "session already used" error, distinguishable in logs/monitoring from other rejection reasons (useful for tracking how often replay attempts are actually being tried in production, a genuinely interesting integrity-monitoring metric in its own right).

### 10.8.2 Worked scenario — TTL expiration edge case

**A genuine, non-malicious edge case worth naming:** a user starts a 60-second test, but their device goes to sleep or loses connectivity for 6 minutes before they finish and try to submit (perhaps they got called away mid-test and the practice-mode pause, per Chapter 4's state machine, kept the LOCAL test state alive, but the SERVER-SIDE session TTL of 5 minutes has since expired).

**Worked outcome:** the submission is rejected not because of any wrongdoing, but simply because the session's TTL lapsed. **The correct, non-punitive handling (explicitly specified here since a naive implementation might treat "expired session" identically to "suspicious activity"):** this specific rejection reason must be distinguished in the API response and shown to the user with neutral, honest language — matching the UI copy file's already-defined string `error.session.expired`: *"This test session timed out. Your result is still here, just not verified — you can try a fresh one anytime."* — never with language implying suspicion of cheating, since this is overwhelmingly a benign, ordinary occurrence (a phone locking, a laptop sleeping), not an integrity violation.

**Test name:** `INT-FIXTURE-009-ttl-expiration-benign-handling` — simulate exactly this scenario (valid test, genuine pause exceeding the TTL, late submission); assert the rejection reason is coded distinctly from a "replay attempt" or "risk score exceeded" rejection, and that the corresponding UI string shown is the neutral `error.session.expired`, never anything implying suspicion.

---

## 10.9 Consolidated Test Scenario Catalog — Integrity Scoring (20 named scenarios)

**Group 1 — Individual checks (7, all from Part 1)**
1. `INT-FIXTURE-001` — physical floor, bot vs. elite typist (§10.2.2)
2. `INT-FIXTURE-002` — single-outlier detection vs. sustained-window check gap (§10.3.1)
3. `INT-FIXTURE-003` — same-finger impossible rollover, with capped weight caveat (§10.4.2)
4. `INT-FIXTURE-004` — bigram-dependence spread, human vs. naive bot (§10.5.2)
5. `INT-FIXTURE-005` — low-variance detection catching a sophisticated bot that passes check 4 (§10.5.3)
6. `INT-CHECK-006` — a genuinely atypical (self-taught, unconventional finger usage) but 100% real human typist — assert this triggers AT MOST Check 3 (same-finger, capped low weight) and none of the other four checks, keeping their total score well under the hold threshold
7. `INT-CHECK-007` — a user typing on an unusual physical keyboard (e.g., a split ergonomic keyboard with a genuinely different finger-to-key mapping than standard QWERTY) — assert the finger-map used for Check 3 and Check 4 is the one matching their DECLARED keyboard/layout setting, not a hardcoded standard assumption, since using the wrong finger-map would produce systematically wrong (and unfair) results for this entire category of real users

**Group 2 — Combination and false positives (5)**
8. `INT-FIXTURE-006` — sophisticated-bot gap, documented and accepted (§10.6.4)
9. `INT-FIXTURE-007` — account-history mitigation reducing a false positive (§10.7.2)
10. `INT-COMBO-008` — a user who triggers checks 3 AND 5 simultaneously, neither individually reaching the hold threshold alone, but combined (15+20=35) still under 50 — assert this correctly does NOT trigger a hold, verifying the combination math (not an "any check fires = hold" all-or-nothing rule, which the spec explicitly rejects: "never permanently ban on a single automated signal")
11. `INT-COMBO-009` — the exact boundary case: a combined score of exactly 50 — assert this DOES trigger a hold (the ≥50 threshold is inclusive, stated explicitly here to avoid the same off-by-one ambiguity resolved for brackets in Chapter 9 §9.4.2)
12. `INT-COMBO-010` — the exact boundary case: a combined score of 49 — assert this does NOT trigger a hold

**Group 3 — Session security (3, from §10.8)**
13. `INT-FIXTURE-008` — replay attack rejected (§10.8.1)
14. `INT-FIXTURE-009` — TTL expiration, benign handling (§10.8.2)
15. `INT-SESSION-011` — a forged session_id (one that was never actually issued by the server, e.g., a client attempting to fabricate a plausible-looking but never-real session token) — assert this is rejected identically to an expired/used session (from the submitter's perspective, indistinguishable — the server should not leak information about WHY a session_id is invalid, since doing so could help an attacker iteratively guess valid patterns; this is a security-through-obscurity detail worth making explicit as a genuine hardening measure)

**Group 4 — Metric recomputation integrity (3, tying back to Chapter 4's parity work)**
16. `INT-RECOMPUTE-012` — a client submits a result summary claiming 85 WPM, but the accompanying raw keystroke log, when independently recomputed server-side using the exact Chapter 4 engine, produces 62 WPM — assert this mismatch (a 23-point discrepancy, far beyond any reasonable floating-point/rounding tolerance) is rejected outright as a forged/tampered submission, distinct from and in addition to the five statistical plausibility checks (this is the master spec's INT-01 "server recomputes" rule, tested here specifically in the integrity context)
17. `INT-RECOMPUTE-013` — a client submits a result where the summary and the recomputed values differ by a TINY amount (e.g., 62.03 vs. 62.05 WPM) — assert this is accepted within a documented floating-point tolerance band (a `[proposal]` of ±0.1 WPM), not rejected as tampering, since legitimate tiny numerical differences CAN arise from different floating-point rounding orders between client and server runtimes even with correct, honest code (a real, benign technical reality worth explicitly tolerating rather than treating every microscopic mismatch as fraud)
18. `INT-RECOMPUTE-014` — a client's log, when replayed (per Chapter 4's replay mechanism), produces a DIFFERENT final text than what the client's summary claims was typed — assert this structural inconsistency (not just a metric-value mismatch, but the replay literally not reproducing the claimed final state) is treated as a HIGH-severity rejection, since this specific failure mode is much harder to explain away as an innocent rounding difference than a small numeric discrepancy

**Group 5 — End-to-end and appeals (2)**
19. `INT-E2E-015` — full pipeline integration test: submit a log through session creation → recomputation → all five plausibility checks → risk combination → hold decision → simulated appeal → simulated account-history mitigation → final resolution, asserting each stage's output correctly feeds the next, using one continuous worked synthetic scenario end to end
20. `INT-APPEALS-016` — a held result that a human reviewer overturns (judges to be a legitimate, if unusual, human performance) — assert the overturn is logged with the reviewer's identity and reasoning (per the audit-trail requirement), the result is released from hold, AND the specific account gets the historical-mitigation credit described in §10.7.2 applied to future similar patterns going forward, so a resolved false positive doesn't recur identically for the same real user next week

---

## 10.10 What this chapter establishes that wasn't previously specified

1. **Concrete, worked numeric thresholds for all five plausibility checks** (45ms sustained floor, 15ms/35ms single-outlier floors, same-finger overlap detection, the 20-60% human-plausible bigram-spread band, the 15% variance-to-mean floor) — the master spec named the CATEGORIES of checks; this chapter gave them actual numbers with justified safety margins against real elite-typist data.
2. **A complete, weighted risk-combination formula** with justified per-check weights and two explicit decision thresholds (50 = hold, 80 = priority review) — previously the spec said "risk-scoring workers" and "assign a risk score" without specifying HOW multiple signals combine into one number.
3. **An honest, worked demonstration of the system's real limitation** against a sophisticated adversary (§10.6.4) — turning the spec's honest caveat ("no system is perfect") into a concrete, numbered example showing exactly where and why the gap exists, which is far more useful to a future engineer than the caveat alone.
4. **A concrete account-history mitigation mechanism** (§10.7.2) that operationalizes the previously-abstract phrase "account behavior, sudden jumps vs. history" into an actual, testable percentage-reduction rule.
5. **Explicit tolerance-band handling for the metric-recomputation check** (§Group 4, test 17) — the spec said "server recomputes... reject mismatches," which without a stated tolerance would either be impossibly strict (rejecting benign floating-point differences) or dangerously vague (no defined threshold at all).

---

# What's Still Left to Build the Best Possible Version of This for Everyone

**This is the honest closing accounting, across everything delivered across this entire multi-session project.** Read this as the actual, current gap list — not a formality.

## What now exists (a genuinely strong foundation)
Full product spec and step-by-step build guide · retention, award, and proof-of-success playbooks · an OpenCode kit with 13 guardrail skills · four fully-worked deep-dive chapters (Engine, Weakness Model, Token Engine/Levels, Integrity) totaling dozens of worked numeric examples and over 100 named test scenarios · real content: 180 original prose passages, 130 quotes (90 original + 40 verified public-domain with real source trails), a transparently-derived word list, 105 composition prompts, ~140 UI strings, full Tier 1-6 vocabulary/generation parameter tables, and complete boss-level content for all 6 currently-defined bosses.

## What is still genuinely missing before this can be "the best typing website for everyone to improve their typing"

**1. It has never been run.** Nothing in any of these files has been executed as real, working software. The very first, most important next step is scaffolding the actual repository (Implementation Guide M0) and building the engine (M1) against the Chapter 4 fixtures to see if the worked math survives contact with a real implementation.

**2. No real person has used any of this.** Zero interviews, zero usability tests, zero waitlist signups have happened. Every threshold in every chapter (the 45ms integrity floor, the k=15 shrinkage constant, the 18-day recency half-life, the 85-95% difficulty band) is a defensible starting guess, not a validated fact. The Week 0-2 plan and Six-Pillar Proof Plan exist specifically to close this gap — they haven't been run yet.

**3. Content is a strong seed, not a full library.** 180 of ~300 target prose passages, 130 of ~300 target quotes, effectively 1 fully-verified code snippet (plus 3 license-confirmed-but-content-pending placeholders) against a ~100-per-language target. The code-snippet gap specifically requires real repository access this research context doesn't have.

**4. Tiers 7-12 (Levels 31-60) have zero content or generator parameters** — only Tiers 1-6 (Levels 1-30) were built out, deliberately, per the spec's own validation gate ("confirm demand before building Levels 31+").

**5. No design has been drawn.** Every visual rule exists in words; not one actual screen, mockup, or component has been designed.

**6. No lawyer has reviewed anything.** The age-policy correction (18+), the DPDP/GDPR summaries, and the privacy program are careful research, not legal sign-off.

**7. The hardest engineering pieces (real-time races, the actual Tree-sitter grammar integration, the actual embedded editor for code mode) have detailed specs but zero prototypes** — Chapter 9's tokenization examples assume a working grammar parser exists; building that integration for real, across 3-5 languages, inside a performance budget, is unproven work.

**8. Nobody has been recruited.** The "100 list" outreach template exists; it has zero names on it yet.

**The honest one-sentence answer to "what's remaining":** everything that turns careful planning into a working, tested, used, and validated product — which is to say, the actual months of building, watching real people struggle with it, and changing the plan based on what they show you, starting with opening a terminal and running the very first `M0-01` task from the implementation guide.
