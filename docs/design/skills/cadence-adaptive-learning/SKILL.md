---
name: cadence-adaptive-learning
description: Use when implementing Cadence's curriculum, level gates, adaptive text generators, per-key and per-bigram models, coach recommendations, spaced review, placement test, or XP/stars. Encodes the key+transition model and difficulty-targeting rules.
---

# Cadence adaptive learning

Source of truth: `docs/spec/07-adaptive-learning-and-curriculum.md`; coach rules in 05 (F-COACH).

## Model summary
- Per-key EMA (a=0.1): `speed_ms`, `error`, `n`, `lastSeen` → `confidence = clamp(wpm_k/target,0,1.2) × (1 − min(err×4,0.6)) × recencyFactor`.
- Unlock next key when **all** active keys have confidence ≥ 1.0. Focus key = lowest confidence, in ≥60% of words.
- Per-pair EMA (a=0.15) with class baselines (SFB, scissor, row-jump, alternation). Impact = freq × max(0, excess ms). Drill top-impact pairs/trigrams.
- Practice at the edge: aim 92–97% accuracy. Interleave ≥30% review of earlier content. Daily plan: 20% warm-up / 50% weakness / 20% stretch / 10% real-world.

## Rules
1. Generators are pure + seeded (reproducible); never emit >2 identical consecutive words.
2. Curriculum is **layout-aware** — generate unlock order per layout, don't hardcode QWERTY.
3. Gates need speed AND accuracy across the last 2 passes; always offer "skip with placement". Never reduce existing progress.
4. Coach: max 3 recommendations, each explainable ("Why?" shows data), with expected gain estimate and a one-click drill; don't repeat unresolved advice more than 3 sessions in a row without changing approach.
5. No guilt mechanics: streak freezes, XP caps/day, calm copy.

## Workflow
Write unit tests with fixed seeds and synthetic stat fixtures; verify convergence (simulate a user whose weak key improves → confidence rises → key unlocks). Log analytics events listed in 07 §9. Tune priors in one config file, never inline.
