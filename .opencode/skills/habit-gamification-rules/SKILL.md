---
name: habit-gamification-rules
description: Rules for building habit, streak, goal, notification, social, and gamification features ethically (weekly-goal streaks, freezes, pause, minimum viable session, if-then plans, non-gamified mode, notification policy, ethics checklist). Use when adding or reviewing any engagement, retention, reminder, streak, league, or reward feature.
license: MIT
compatibility: opencode
metadata:
  project: realtype
  source: docs/spec/retention-and-mastery-playbook
---

## Core rules
1. **Insight is the reward.** Prefer "what improved" over confetti. Celebrations are rare, skippable, and respect reduced motion.
2. **Forgiveness by default.** Primary streak is weekly consistency (user-set target). Daily streak is opt-in. Provide earned freezes, pause mode, and (V1) repair within 48 hours. One missed day must never erase progress.
3. **Minimum viable session:** 3 focused minutes counts as a practice day. Focused minutes exclude idle and paused time.
4. **Day boundary:** user-local day with a configurable rollover hour; handle time zones and DST; server is authoritative for signed-in users.
5. **Autonomy:** three gamification levels (Full, Light, Off). "Off" hides XP, streaks, leagues, celebrations, badges everywhere. Never hide the switch.
6. **If-then plans:** onboarding asks "When will you practice?" (cue-based). Reminders are opt-in and arrive in V1.
7. **Competence over volume:** XP and badges reward skill gains and plan completion, not raw minutes; diminishing returns.
8. **Social is opt-in and gentle:** private clubs first, shared weekly goals, skill-bracket leagues with opt-out, percentiles for everyone. No public boards before integrity layers exist.
9. **No pay-to-win:** paid or earned unlocks are cosmetic only.

## Copy rules
- Calm, factual, adult. **Banned:** guilt ("you'll lose everything"), fake urgency, shaming, "we miss you" pressure, promises about speed gains, programming ability, or hireability.
- Errors and misses use supportive language ("Fresh start this week", "A freeze covered last week").

## Notification policy
Opt-in only; ask after the first win. At most one per day; quiet hours; time-zone aware. Allowed types: the user's chosen practice cue; opted-in "save" notice when something specific is about to lapse; weekly review. One-tap pause/off. Measure opt-out rate as a guardrail.

## Ethics checklist (run for every engagement feature)
1. What behavior does it encourage, and does it serve the user's goal?
2. Can the user opt out or scale it down?
3. Does it work if the user misses a day?
4. Does it reward skill or just time?
5. Could it cause anxiety, exclusion, or unfair comparison?
6. Do we measure harm (opt-outs, complaints, survey anxiety) as well as engagement?

## Measurement
Retention means returning to **practice**, not just visiting. Track D1/D7/D30 by cohort, practice days per week, plan completion, gamification-level adoption, notification opt-outs, and a periodic "Do streaks feel stressful?" survey item. Effects are small and can fade: run experiments, not assumptions.

## Done checklist
- [ ] Works with Light and Off modes
- [ ] Forgiveness features present (freeze/pause; repair in V1)
- [ ] Copy audited for guilt/urgency/promises
- [ ] Events use the analytics allowlist; no typed content
- [ ] Time-zone and rollover cases tested with simulations
