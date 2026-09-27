---
name: efficacy-and-experiments
description: Rules for building efficacy measurement (baseline/retest, matched text forms, randomization, holdouts) and A/B experiment instrumentation without corrupting results or privacy. Use when implementing baseline tests, retests, experiment assignment, exposure logging, cohort or retention dashboards, or any analysis of whether the product works.
license: MIT
compatibility: opencode
metadata:
  project: realtype
  source: docs/spec/six-pillar-proof-plan
---

## Purpose
The product's biggest unknown is whether practice tools make people better. Instrumentation must let us find out honestly. Never build analysis that can only confirm what we hope.

## Measurement rules
1. **Baseline/retest pairing:** store day-0 baseline and day-14/30/60 retests per user per content type.
2. **Matched forms:** retests use different text of the **same difficulty band, length, and character mix** as the baseline; counterbalance Form A/B order across users.
3. **Multiple attempts:** baseline = median of 3 attempts. Never compare a single test to a single test.
4. **Record context:** layout, keyboard type (self-report), device, time of day. Flag changes; analyze separately.
5. **Numbers only:** never store or send typed text or full keystroke logs to analytics.

## Randomization and experiments
1. Assignment is **stable per user** (or per **group** when social features could interfere, e.g., clubs/leagues).
2. **Log exposures** (when the user actually experienced a variant), not just assignment.
3. Provide a **sample ratio mismatch check** (observed vs expected split) before any outcome analysis; block analysis if it fails.
4. **Pre-register** hypothesis, primary metric, guardrails, sample size, duration, stop rules in `docs/templates/efficacy-study-protocol.md` before enabling.
5. **No peeking-based stopping.** Use fixed sample size or a named sequential method.
6. Run at least one full weekly cycle; check novelty (compare early vs late weeks).
7. Underpowered tests exaggerate effects; compute required sample size first.

## Analysis rules
- Primary: change in net WPM (same content type), **adjusting for baseline**; report mean difference, 95% CI, effect size.
- **Intention-to-treat** primary; per-protocol secondary.
- Report medians and intervals; pre-specify at most 3 subgroups; correct for multiple comparisons or label exploratory.
- Exclude flagged/implausible results (integrity flags).
- Publish results with limitations, including null or negative outcomes.

## Ethics and privacy
- Explicit opt-in, revocable, adults 18+ only; both arms receive useful practice; debrief control arm.
- Compliance with `keystroke-privacy`: aggregates only; retention limits; export/delete works for study data.

## Retention metrics definitions
- **Practice-return** = a day with >= 3 focused minutes (not a page view).
- D1/D7/D30 by cohort with confidence intervals; weekly active practicers; resurrected users.
- Guardrails: gamification-off adoption, notification opt-outs, streak-anxiety survey, over-use flag.

## Done checklist
- [ ] Baseline/retest pairing with matched forms and counterbalancing
- [ ] Stable assignment + exposure logging + SRM check
- [ ] Analysis plan frozen before data
- [ ] No typed content in any analytics path
- [ ] Results reproducible from stored numbers
