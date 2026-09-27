# Efficacy Study Protocol (fill in and freeze BEFORE collecting data)

**Study name:** ______   **Version/date:** ______   **Owner:** ______   **Status:** Draft / Frozen

## 1. Question and claim
- **Question:** Does adaptive, weakness-targeted practice improve typing more than matched random-text practice?
- **Smallest effect worth detecting (Delta), in WPM:** ______
- **Claims we will NOT make:** guaranteed speed gains, better programming, hireability, health benefits.

## 2. Design
- Level: L0 pre-post / L1 randomized in product / L2 delayed access / L3 external study (circle one)
- Arms: A = adaptive weakness-targeted drills; B = matched random-text drills (same time budget, same difficulty band)
- Randomization: unit = user (or group, if social features are involved); stable assignment; ratio ______
- Blinding: participants know they are in a study, not which arm is expected to be better
- Duration: baseline day 0; retests day 14 (early), day 30 (primary), day 60 (durability)

## 3. Population
- Adults 18+ only; consented; typing at least ___ days/week; content type(s): prose / code / numbers
- Exclusions (pre-specified): flagged/implausible results, layout change during study, fewer than ___ baseline attempts
- Recruitment source(s) and expected enrollment: ______

## 4. Consent and ethics checklist
- [ ] Plain-language consent, opt-in, revocable anytime, no penalty
- [ ] Both arms receive useful practice
- [ ] Only numbers stored; no typed content
- [ ] Data retention and deletion described
- [ ] Debrief plan for control arm
- [ ] Privacy notice matches behavior (see privacy data map)

## 5. Measurement
- Baseline: 3 attempts per content type on Form A; use the median
- Forms A and B: same difficulty band, length, and character mix; counterbalance order across users
- Record: layout, keyboard type (self-report), device, time of day
- **Primary outcome:** change in net WPM (same content type) from baseline to day 30
- **Secondary:** accuracy, KSPC, consistency, targeted-transition speed and errors, symbol error rate (programmers), friction survey (1-5), practice days
- Keyboard/layout changes: flag; analyze separately

## 6. Sample size worksheet
- n per arm = 2 x (1.96 + 0.84)^2 x sigma^2 / Delta^2  (80% power, 5% two-sided)
- sigma (SD of individual 30-day change) = ______ (from beta data; placeholder 6 WPM)
- Delta = ______  ->  n per arm = ______
- Expected dropout = ____%  ->  enroll ______ per arm  (n / (1 - dropout))
- Quick reference at sigma = 6: Delta 4 -> ~35; Delta 3 -> ~63; Delta 2 -> ~141 (before dropout)

## 7. Analysis plan (frozen before data)
- Primary model: compare arms adjusting for baseline speed; report mean difference, 95% CI, effect size
- Population: intention-to-treat primary; per-protocol secondary
- Missing data handling: ______
- Subgroups (max 3, pre-specified): baseline speed band; programmers vs prose; adherence
- Multiple comparisons: ______
- Stopping rule: fixed sample size (no peeking) or a named sequential method: ______
- Integrity checks: randomization ratio (sample ratio mismatch) before any outcome analysis; bot/flag exclusions
- Novelty check: compare day 14, 30, 60

## 8. Decision rules and claim wording
| Result | Decision | Public wording |
|---|---|---|
| Adaptive better by >= Delta, CI excludes 0 | Invest in the loop | "In our study, ... gained X WPM more (95% CI ...)" |
| No speed difference, accuracy/symbol errors improve | Reframe to accuracy/fluency | "Fewer errors on what you practiced" |
| Equal improvement | Practice helps; improve targeting | "Practice helps; we're improving targeting" |
| Control better | Stop that drill logic | No speed claim |
| Underpowered | Extend | "Early results, not conclusive" |

## 9. Reporting
- Internal weekly readout (no peeking at outcomes before the planned analysis)
- Public summary with limitations; publish protocol
- Sign-off: ______ (date) ______
