# Retention and Mastery Playbook — How to Actually Improve Typing and Keep People Coming Back

**Date:** 20 Sep 2026
**For:** RealType (see `typing-website-master-spec-v1.md`). Extends the spec with new requirement IDs `MST-*` (mastery/training) and `RET-*` (retention/habit).
**Audience:** programmers, authors/writers, students, professionals, beginners, competitive typists.

**Legend:** ✓✓ strong (meta-analysis/primary, multiple sources) · ✓ credible single or secondary source · ~ anecdotal/vendor · **[proposal]** my design idea · **[H]** hypothesis to test in the product · **[inference]** my reasoning

**Contents**
1. TL;DR
2. Reality check
3. What the science says (and what it means for us)
4. What competitors teach us (retention and mastery)
5. Design principles
6. The training model: the daily session and difficulty targeting
7. The habit engine: onboarding, goals, streaks, notifications, social
8. Gamification catalog (mechanic → evidence → use → guardrail)
9. Segment playbooks (programmers, authors, students, professionals, beginners, competitors, accessibility)
10. New requirements to merge into the spec
11. Metrics, benchmarks, and experiments
12. Ethics and guardrails
13. Risks and unknowns
14. Research backlog
15. Sources

---

## 1. TL;DR

1. **The best product is a loop, not a game skin:** *diagnose → targeted practice → retest → visible progress → gentle reason to return tomorrow.* Gamification helps only when it serves that loop. Points and badges bolted onto content are the weakest form. `[Cogn-IQ]` `[Sailer-Homner]` ✓✓
2. **What actually predicts typing speed** is not mystical: inter-keystroke consistency, hand alternation, **eye-hand span (how far ahead you read)**, and errors/corrections. `[Salthouse-1984]` `[Butsch]` `[Aalto-CHI18]` ✓ That points to concrete trainers: **preview-span**, **rhythm/consistency**, **hardest-transition** drills.
3. **Practice design matters more than volume.** Goal-directed effort beat mere class attendance in one study; the average trained-vs-untrained gap is only ~5 WPM. `[KeithEricsson-2007]` `[Aalto-CHI18]` ✓
4. **Habits are forgiving.** One missed day didn't materially hurt habit formation; automaticity took a median of 66 days (range 18–254). `[Lally-2010]` ✓✓ **So don't punish a missed day.** Prefer a *weekly-goal streak* with freezes and repair.
5. **If-then planning works:** "When X happens, I will practice" raised goal attainment (d = 0.65 across 94 studies), especially for *initiating* behaviors. `[GollwitzerSheeran-2006]` ✓✓ Build it into onboarding.
6. **Gamification effects are real but small-to-moderate and can fade or backfire:** g = 0.49 (cognitive), 0.36 (motivational), 0.25 (behavioral); effects on motivation/behavior were less stable; game fiction and *competition combined with collaboration* helped behavior. `[Sailer-Homner]` ✓✓ Streak loss aversion can turn into anxiety. `[Streak-Risks]` ✓
7. **Duolingo's playbook, minus the guilt:** the streak is the spine; add freezes/repair, "save" notifications only when something specific is at stake, leagues with opt-out, and make streaks *easier* to keep. `[Duolingo-Mazal]` `[Duolingo-Reminders]` `[UXMag-Streaks]` ✓ (correlation caveats apply)
8. **Retention benchmarks are harsh:** median mobile-app D1/D7/D30 ≈ 26% / 13% / 7%; education apps ≈ 2–3% at D30. `[Retention-Benchmarks]` ✓ (secondary) Aim to beat the median with a first-session win and a real reason to return.
9. **Authors need a different track:** words/day, sprints, typewriter/blur modes, flow minutes, not WPM. Composition is slower than copying; thinking, not fingers, is the bottleneck. `[750Words]` `[WritingStreak]` `[Karat-1999]` ✓
10. **Measure whether it works.** No RCT-level evidence exists that consumer typing apps raise adult speed; build A/B efficacy tests and guardrail metrics into the product.

---

## 2. Reality Check

- **"Best for improving speed" ≠ "guaranteed speed."** In 136M keystrokes, trained typists were ~5 WPM faster than untrained (small effect); untrained can match trained. `[Aalto-CHI18]` ✓✓
- **Retention and learning aren't the same.** Gamification can raise engagement without raising skill. Our north star stays *targeted weakness improvement*, with retention as a supporting metric.
- **Habit science is about simple, cue-linked behaviors.** Typing practice is a moderately complex habit; implementation-intention effects are smaller for complex sustained behaviors (e.g., exercise d ≈ 0.31 in one summary) than for initiating a simple action. `[GollwitzerSheeran-Notes]` ✓ So keep the *initial* action tiny.
- **Most evidence is transferred from other domains** (finger-tapping tasks, language apps, health apps). Treat it as design guidance to test, not proof for typing.

---

## 3. What the Science Says (and What It Means for Us)

### 3.1 Typing skill itself
| ID | Finding | Implication |
|---|---|---|
| SC-11 | Across studies, the best predictors of typing speed were **inter-keystroke variability, the one-finger vs two-hand ratio, eye-hand span, and alternate-hand tapping**; opposite-hand keystrokes are **30–60 ms faster**; frequent letter pairs are typed faster `[Salthouse-1984]` ✓ | Track **consistency (variability)**, hand-alternation, **preview span**; drill frequent real-word chunks |
| SC-12 | Rapid typists have a larger **eye-hand span**; +10 WPM went with a larger span; the eye stays roughly a second ahead of the hand regardless of speed `[Butsch]` ✓ | **Preview-span probe + trainer** (limit text ahead to measure and train) **[H]** |
| SC-13 | Typing proceeds about as fast for random words as for prose (median IKI 174 vs 178 ms), implying sentence-level meaning matters little, while unfamiliar letter strings raise IKIs `[Salthouse-1986]` ✓ | Practice **real words and frequent chunks**; sentence "meaning" isn't the lever |
| SC-14 | Fewer errors and corrections go with faster typing; rollover is common in fast typists `[Aalto-CHI18]` ✓✓ | Accuracy-aware coaching; optional rollover lab [H] |
| SC-15 | Goal-directed typing in everyday use, plus a class, marked the best performers `[KeithEricsson-2007]` ✓ (n = 60) | **Goals** and "push" sessions, not only passive practice |

### 3.2 Motor learning and practice schedules
| ID | Finding | Implication |
|---|---|---|
| SC-16 | In a finger-tapping sequence task, a night of sleep gave a **~20% speed gain without losing accuracy**, while a similar time awake gave none `[Walker-2002]` ✓✓; the **hardest transitions gained ~17.8%** overnight vs ~1.4% for the easiest `[Kuriyama-2004]` ✓ | Drill **hardest transitions**; **evening practice → morning retest** experiment **[H]** |
| SC-17 | Caveat: another study with probabilistic sequences found no sleep enhancement `[Sleep-Caveat]` ✓ | Don't promise sleep effects; test them |
| SC-18 | Distributed practice beats massed practice for verbal recall (839 assessments, 317 experiments); the best gap grows with the desired retention interval `[Cepeda-2006]` ✓✓ (verbal tasks; motor/perceptual studies were excluded from at least one follow-up review `[Spacing-EPR]`) | **Spaced review for programmer recall items**; for motor practice, prefer short daily sessions **[inference]** |
| SC-19 | Repeated retrieval (testing) can beat re-studying once info can be recalled `[Cepeda-2006]` (as cited in related work) ✓ | **Recall Mode** for syntax/templates |
| SC-20 | "85% Rule": for a broad class of learning algorithms on binary classification, learning is fastest when training accuracy is ~85% (error ~15.87%); shown for AI and biologically plausible networks `[Wilson-85]` ✓✓ | Use as a **difficulty-targeting principle** (not too easy, not too hard); **don't apply literally to typing** (85% accuracy would be far too sloppy for headline runs) **[H]** |
| SC-21 | **Speed vs accuracy:** beginners emphasize accuracy; experts tolerate more errors as a strategic trade-off `[SpeedAccuracy]`; skill-learning studies show instruction shifts performance, and results on what is *learned* are mixed `[SpeedAccuracy-Learning]` ✓; teachers and forums commonly recommend accuracy first and ~97% as a target `[Typing.com-Accuracy]` `[Colemak-Forum]` ~ | **Alternate** accuracy-focused and push-focused blocks; make thresholds adjustable; test |

### 3.3 Habit formation and follow-through
| ID | Finding | Implication |
|---|---|---|
| SC-22 | Habit automaticity took a **median of 66 days (range 18–254)**; **missing one opportunity did not materially affect** habit formation; consistency in a stable context helped `[Lally-2010]` `[Lally-Nuance]` ✓✓ | Weekly-goal streaks; forgiving misses; **anchor to a daily cue** |
| SC-23 | **Implementation intentions** ("if X, then I will Y") raised goal attainment, d = 0.65 across 94 studies (>8,000 people) `[GollwitzerSheeran-2006]` ✓✓; strongest for simple initiation `[GollwitzerSheeran-Notes]` | **"When will you practice?"** plan in onboarding |
| SC-24 | Self-monitoring meta-analysis (~20,000 participants) supports progress tracking for goal attainment `[Streak-Risks]` ~ (secondary) | Always-visible, honest progress |

### 3.4 Gamification: what works and what backfires
| ID | Finding | Implication |
|---|---|---|
| SC-25 | Gamification of learning: **g = 0.49 cognitive, 0.36 motivational, 0.25 behavioral**; motivational/behavioral effects less stable; **game fiction** and **competition + collaboration** helped behavioral outcomes `[Sailer-Homner]` ✓✓ | Add narrative/"path" and **team/club goals** alongside individual play |
| SC-26 | Reward-and-status mechanics alone are far less effective than designs with **challenge, meaningful goals, and narrative** `[Cogn-IQ]` ✓ (review) | Tie rewards to real skill milestones |
| SC-27 | **Overjustification:** external rewards can undermine intrinsic motivation `[Overjustification]` ✓ | Keep rewards informational (skill/insight), cosmetic unlocks optional; offer a **"no gamification" mode** |
| SC-28 | Streaks leverage loss aversion and can drive anxiety or all-or-nothing dropout; qualitative studies (n = 21, n = 27) describe fear of breaking streaks and abandoning plans when exact standards aren't met `[Streak-Risks]` `[Routinery]` ✓ (small qualitative) | Forgiveness features; weekly goals; **"minimum viable session"** |
| SC-29 | Gamified health-app effects shrank after ~6 months in one meta-analysis summary (RR 1.91 → 1.37) `[Routinery]` ~ (secondary) | Expect novelty decay; refresh with new challenges |
| SC-30 | In one health study, **ranking first on a leaderboard boosted motivation, and not ranking first did not harm** sedentary users on average `[Leaderboards-Health]` ✓ (single study, different domain) | Leaderboards can work if brackets are fair and optional |

### 3.5 Writing and composition
| ID | Finding | Implication |
|---|---|---|
| SC-31 | Writing involves planning, translating, revising (Flower & Hayes; Kellogg); transcription typing is mostly perceptual-motor, composition engages language generation `[Flower-Hayes]` ✓ | Separate **copy-typing** and **composition** metrics |
| SC-32 | Composition ran ~19 WPM vs ~33 WPM copying in a 1999 study `[Karat-1999]` ✓ (dated) | Authors' bottleneck is thinking/flow |
| SC-33 | Writer tools reward **any** writing (1 point) and **goal** writing (2 points) plus streak bonuses `[750Words]`; offer typewriter mode (no backspace), blur mode, and 20/10-minute sprints `[WritingStreak]`; advise lowering goals so the habit forms `[WriteNext]` ✓ | **Draft Sprint** feature set; flexible goals |

### 3.6 Wellbeing
- Cochrane's review of additional work breaks for musculoskeletal symptoms found **very uncertain evidence** (updated Oct 2025). `[Microbreaks-Cochrane]` ✓✓
- A separate meta-analysis of micro-breaks found benefits for **vigor and fatigue** and no evidence of performance harm. `[Microbreaks-PLOS]` `[Microbreaks-Cornell]` ✓
- **Implication:** break reminders are **opt-in and framed as energy/fatigue support, with no medical claims**.

---

## 4. What Competitors Teach Us (Retention and Mastery)

### 4.1 Duolingo (the retention benchmark) ✓ (secondary/insider summaries)
- **Streak as the spine** the rest of the system attaches to; it's a daily yes/no decision that turns a long goal into a short action. `[Duolingo-Repair]` `[Duolingo-Leagues]`
- The first big win was a **streak-saver notification** for users about to lose a streak; later came calendars, animations, streak freezes, and streak rewards. `[Duolingo-Growth-Model]`
- **Caveat from an insider account:** the "10-day streak users retain better" insight was affected by **correlation and selection bias**, yet it sparked productive experiments. `[Duolingo-Growth-Model]`
- **Repair mechanics** (freezes, repair) exist because a broken streak is when the habit is most likely to end. `[Duolingo-Repair]`
- **Making streaks easier to keep** increased long-term engagement. `[UXMag-Streaks]`
- **Leagues:** weekly XP competition with tiers and an opt-out. `[Duolingo-Leagues]`
- **Notifications:** "save" notices fire only when something specific is about to be lost. `[Duolingo-Reminders]`
- **Reported outcomes** (treat with caution): monthly churn 47% → 28% (2020 → 2023) `[Duolingo-Reminders]`; 450% DAU growth over four years with CURR (current user retention rate) as the focus metric `[Duolingo-Growth-Model]`.
- **Sign-up timing:** one summary says moving the sign-up prompt after the first lesson raised next-day retention ~20% `[StriveCloud]` ~ (vendor summary).

### 4.2 Monkeytype
- Daily/weekly leaderboards **with XP rewards**, all-time boards per mode/language, XP config includes **streak multipliers**, 400+ themes, 40+ modifiers. `[MT-Features]` ✓
- Community: contributors add themes/languages; a Discord bot assigns optional roles from performance and challenges. `[Monkeytype-About]` ✓
- **Lesson from complaints:** casual typists asked to be able to get on the leaderboard and wanted percentile views, so **fixed global boards exclude most users**. `[MT-1049]` ✓

### 4.3 Keybr (adaptive mastery, and its pitfalls)
- Per-key stats, weakest-key lessons, user-set target speed, prediction of lessons needed. `[Keybr-GitHub]` `[Keybr-Help]` ✓
- **User-reported pitfalls (one 2021 thread; anecdotal):** the metric tracks speed *into the target letter* and can be gamed; people get **stuck on one letter and quit**; a user wanted to **choose letters** to drill; another said keys kept being added after they hit the target speed while accuracy dropped. `[Keybr-Thread-2021]` ~
- **Lessons:** mastery criteria must combine speed **and** accuracy in context; let users **choose focus**; avoid single-letter gating traps.

### 4.4 Writing habit tools (for authors)
- **750 Words:** points for any writing and more for 750+ words, streak badges, distraction-free screen. `[750Words]` `[750Words-Review]`
- **Writing Streak:** typewriter mode (no backspace), blur mode, sprints (20 min work + 10 min break), ideal-vs-actual progress line. `[WritingStreak]`
- **Insight:** the two biggest obstacles are **overthinking and distractions**, so features target the inner editor and interruptions. `[WritingStreak]`

### 4.5 Typing tools with weaker retention design
- Fixed courses and races rely on stars/cars; complaints about ads and rigid gates hurt loyalty (see the earlier audit). Racing sites face cheating that erodes trust.

---

## 5. Design Principles

1. **Insight is the reward.** The best feedback is "you improved the `th→e` transition by 14%," not confetti.
2. **Tiny first action, big first win.** Show a real insight within 60 seconds of arriving.
3. **Forgiveness over fear.** Weekly goals, freezes, repair, welcome-back sessions; never shame.
4. **Autonomy first.** Let users choose focus, goals, and how much gamification they get (down to none).
5. **Competence over status.** Levels and stars mean *skills gained*, not time spent.
6. **Relatedness without pressure.** Clubs and collaborative goals; opt-in leagues with fair brackets.
7. **Vary the practice.** Alternate accuracy, push, real-world, and recall blocks.
8. **Honest measurement.** Show noise bands and per-content-type baselines; publish efficacy results.
9. **Protect the typing surface.** Motivation features live around it, never inside it.
10. **Respect attention.** Few, useful notifications; quiet hours; easy off.
11. **Serve every user type.** Programmers, authors, students, professionals, beginners, and competitors get different paths.
12. **Test everything.** Effects vary by user and fade over time; instrument and iterate.

---

## 6. The Training Model: Daily Session and Difficulty Targeting

All values are **[proposals]** to test (see §11). The structure follows the evidence in §3: short, focused, varied practice; hardest transitions first; alternate accuracy and push; retest in the same content type.

### 6.1 The daily session blueprint
| Block | Length (15-min default) | What happens | Why |
|---|---|---|---|
| **Warm-up** | 2 min | Easy, accurate typing in the user's chosen content type | Settles technique; low pressure `[inference]` |
| **Focus** | 6–8 min | Short sets (30–60 s) on the **hardest transitions/tokens** from the weakness profile, with immediate error feedback | Hard transitions gain most from practice `[Kuriyama-2004]`; deliberate practice `[KeithEricsson-2007]` |
| **Push** | 2–3 min | Burst sprints (10–15 s) aiming above comfort speed; accuracy floor relaxed slightly | Raises the speed ceiling; alternation of emphasis `[SpeedAccuracy]` |
| **Real-world** | 3–4 min | Prose, code, numbers, or composition, per the user's profile | Transfer to real tasks |
| **Retest + summary** | 1 min | One test in the same content type; "what improved" card | Trend data; insight as reward |

**Variants:** **5-minute minimum** (Focus + Retest); **30-minute deep** (adds Endurance, Recall/Spaced review, and a second Focus block); **Writer sprint** (§9.2); **Programmer kata** (§9.1).

### 6.2 Difficulty targeting
1. **Two layers.** *Headline runs* keep normal accuracy expectations (e.g., ≥ 95%). *Focus drills* aim slightly harder so there is something to learn.
2. **Target band for focus drills [H]:** start users around **~90% accuracy on targeted items** and adapt within an 85–95% band; increase difficulty when the user sits above the band for several sets, decrease when below.
3. **Why:** the 85% Rule shows a sweet spot between too easy and too hard for a class of learners; **do not apply it literally** to whole-test accuracy. `[Wilson-85]`
4. **Safety valve:** if accuracy falls under the floor twice in a row, drop the difficulty and say why ("Let's steady this pair").
5. **User control:** show the target band and let users shift it ("Gentler" / "Sharper").

### 6.3 Trainers to build (mapped to evidence)
| Trainer | What it does | Evidence link | Tag |
|---|---|---|---|
| **Hardest-transition drills** | Bigram/trigram sets weighted to slowest/most error-prone pairs, in natural words | Hard transitions gain most; frequent chunks are typed faster | MVP (via LRN-02) |
| **Consistency/rhythm trainer** | Shows IKI variability; optional steady-beat cue; goal = smoother rhythm | IKI variability predicts speed `[Salthouse-1984]` | V1 **[H]** |
| **Preview-span probe + trainer** | Limits how many characters/words ahead are visible to estimate span, then trains slightly beyond it | Eye-hand span predicts speed `[Butsch]` | V1 **[H]** |
| **Hand-alternation drills** | Sets that exploit or work on same-hand pairs per user | Hand alternation effects differ by skill `[Aalto-CHI18]` | V1 |
| **Accuracy vs Push alternation** | Alternating blocks with different scoring rules | Mixed evidence on speed vs accuracy emphasis | MVP (blocks) |
| **Rollover Lab** | Encourages overlapping keypresses on alternating pairs | Rollover correlates with speed `[Aalto-CHI18]` | V2 **[H]** |
| **Recall/spaced review** | Hide-and-type of syntax/templates; spaced schedule | Spacing and retrieval effects `[Cepeda-2006]` | MVP-lite → V1 |
| **Composition sprints** | Write from a prompt; measure flow, pauses, words | Composition ≠ transcription `[Karat-1999]` | V1 |

### 6.4 Weekly rhythm and plateaus
- **Weekly shape (default):** 4 focused days + 1 long test/endurance + 1 review; rest days allowed. Users can choose 3, 4, 5, or 7 days.
- **Plateau logic (no change in trailing median for ~14 days):** suggest, with reasons, one of: harder text, push blocks, accuracy focus, preview trainer, a new content type, or a rest week.
- **Sleep-informed experiment [H]:** offer an "evening practice → next-morning retest" option and compare gains against same-day retests. Do not claim a sleep benefit until measured. `[Walker-2002]` `[Sleep-Caveat]`
- **Fatigue guard:** if accuracy and consistency degrade sharply mid-session, suggest stopping.

### 6.5 Feedback design
- **During typing:** minimal; instant character state only.
- **After each set:** three things max: what improved, what regressed, next action.
- **Error views:** typo arrows on the keyboard (intended → typed), confusion pairs, transition table.
- **Noise honesty:** show a rolling median (last 5) and a noise band, so one test can't mislead.
- **Per content type:** never mix prose, code, numbers, and composition in one average.

### 6.6 Personalization inputs and user control
Inputs: placement/baseline, weakness profile, content-type mix (prose/code/numbers/composition), goal, time available, layout, accessibility settings. Controls: choose focus items, pick session length, adjust difficulty band, pin/skip drills, turn gamification levels up or down.

### 6.7 Mastery rules that resist gaming (lessons from Keybr threads)
1. Mastery combines **speed and accuracy in context**, not one metric on one letter.
2. **Best 3 of last 5** attempts, on **varied text**, not repeated identical sets.
3. Never gate all progress behind one item; allow **parallel tracks** and **skip/test-out**.
4. When a target speed is reached, **do not add new items faster than accuracy holds**.
5. Allow the user to **choose** the focus item.

---

## 7. The Habit Engine

### 7.1 Onboarding: the first three minutes
1. **Land on the test** (no signup, no popups).
2. **First test (60 s)** → immediate results with **"Your top 3 weak spots."**
3. **First drill (2 min)** from those spots → **retest** → show the **delta** ("`th→e` 18% faster"). This is the first-session win.
4. **Only now** offer "Save your progress" (dismissible). Signup after value matches a reported Duolingo change. `[StriveCloud]` ~
5. **Set a goal in one tap** (e.g., "+10 WPM in 60 days", "fewer symbol errors", "write 300 words/day").
6. **If-then plan:** "When will you practice?" Options: after coffee, after standup, before bed, custom. Optional reminder at that time. `[GollwitzerSheeran-2006]`
7. **Show tomorrow's 5-minute plan** so the next step is obvious.

### 7.2 The daily loop
| Part | Design |
|---|---|
| **Cue** | The user's if-then plan; optional reminder; visible "Today" card |
| **Routine** | A **minimum viable session (3 minutes)** counts; longer is optional |
| **Reward** | An insight ("what improved"), personal record, progress on the skill map, and (optionally) XP |
| **Investment** | Goal, plan, profile, packs, club membership, history |

### 7.3 Streak system (forgiving by design)
- **Primary streak = weekly consistency**: "Practiced **4 of 7 days**" (user-set target). Weeks completed in a row = the streak.
- **Optional daily streak** for those who want it, with all the safety nets below.
- **What counts:** ≥ 3 focused minutes (minimum viable session), **not** spam clicks.
- **Freeze:** earn freezes through practice (not just purchase); auto-apply to a missed day; visible count.
- **Repair:** within 48 hours, complete a slightly longer session to restore a broken streak.
- **Grace:** "Never miss twice" nudge on day two, tone supportive. `[Streak-Risks]`
- **Pause mode:** vacation/illness pauses streaks without penalty.
- **Milestones** celebrate skill or consistency (7, 30, 100 days), once, skippable.
- **No loss-framing copy** ("You'll lose everything!"). Save notices only when the user opted in.
- **Why:** one missed day didn't materially hurt habit formation `[Lally-2010]`; all-or-nothing thinking drives dropout `[Routinery]`; easier streaks improved engagement in a reported Duolingo change `[UXMag-Streaks]`.

### 7.4 Notification policy
| Rule | Detail |
|---|---|
| Opt-in only | Ask after the first win, with a clear benefit |
| Cap | ≤ 1 per day; quiet hours respected; time-zone aware |
| Allowed types | (a) your chosen practice cue, (b) opted-in "save" notice when a streak/promotion is about to lapse, (c) weekly review |
| Never | Guilt ("we miss you"), fake urgency, unrelated promos |
| Control | One-tap pause/off; per-type toggles |
| Measure | Opt-out rate, dismissals, effect on D7/D30 |

### 7.5 Social layer (opt-in, no shame)
- **Clubs** (friends/teams/bootcamps): shared **weekly goal** (collaboration) plus friendly comparison. `[Sailer-Homner]`
- **Skill-bracket leagues:** weekly, small groups by level, **opt-out** available; promotion/relegation gentle. `[Duolingo-Leagues]`
- **Percentiles for everyone**, so casual users see where they stand without top-50 boards. `[MT-1049]`
- **Ghost races** against your past self or a friend.
- **Daily challenge:** one shared text/task; results by bracket.
- **Integrity first:** no public boards until verification exists (spec INT-10). `[Cheat-Tools]`

### 7.6 Progression and identity
- **Skill-based levels** (the 60-level ladder) with stars; **refreshers** when skills decay.
- **Ranks/titles** reflect skills (fun, optional); no single composite index until calibrated.
- **Collections:** cosmetic unlocks (themes, sounds) earned by consistency, never sold as advantages.

### 7.7 Re-engagement and welcome-back
| Lapse | Action |
|---|---|
| 2–3 days | Gentle in-app note; offer a 3-minute session |
| 7 days | One email/push (if opted in): a fresh, tiny goal |
| 30+ days | "Welcome back" flow: 60-second re-baseline, reset goals, no streak shaming |
| Any | Show what stayed (skills, records); never guilt |

### 7.8 Weekly review
A short, skimmable summary: days practiced, top improvement, weakest spot, next week's plan, and an optional "reflection" prompt. Opt-in email.

### 7.9 Non-gamified mode
A settings switch that hides XP, streaks, leagues, and celebrations, leaving insight, goals, and progress. (Autonomy support; guards against overjustification.) `[Overjustification]`

---

## 8. Gamification Catalog

| Mechanic | Evidence | How we use it | Risk | Guardrail |
|---|---|---|---|---|
| **XP for competence** | Rewards alone are weak; tie to meaningful goals `[Cogn-IQ]` | XP for improving weak items and completing plan blocks, not raw minutes | Grinding | Diminishing returns; skill-linked |
| **Weekly-goal streak** | Missing one day is harmless `[Lally-2010]` | Primary streak | Perfectionism | Freeze, repair, pause |
| **Daily streak (optional)** | Loss aversion; anxiety risk `[Streak-Risks]` | Opt-in | Anxiety | Freeze/repair; no shame copy |
| **Levels/bosses (skills)** | Challenge and narrative help `[Cogn-IQ]` | 60-level ladder with mixed-test bosses | Content cost | Programmatic generators |
| **Stars/mastery** | Competence feedback | ★ pass, ★★ accuracy, ★★★ speed | Gate frustration | "Almost there" state |
| **Leagues** | Reported traction, opt-out `[Duolingo-Leagues]` | Small skill-bracket weekly leagues | Stress | Opt-out; fair brackets; integrity |
| **Clubs/team goals** | Competition + collaboration helped behavior `[Sailer-Homner]` | Shared weekly goals | Cliques | Private by default; moderation |
| **Leaderboards** | Can motivate; can exclude `[Leaderboards-Health]` `[MT-1049]` | Percentiles + brackets; verified only | Cheating; discouragement | INT-10; opt-out |
| **Daily challenge** | Novelty/variety | Same text for all; bracketed | Fatigue | Skippable |
| **Quests** | Variety and goals | Weekly quests ("fix 3 symbol confusions") | Chore feeling | Small set; choice |
| **Badges** | Weak alone `[Cogn-IQ]` | Skill/insight badges, not volume | Clutter | Few, meaningful |
| **Unlocks (cosmetic)** | Low risk | Themes, sounds, caret styles | Pay-to-win perception | Cosmetic only |
| **Narrative/"path"** | Game fiction helped behavior `[Sailer-Homner]` | Light "path to mastery" framing | Childish tone | Adult tone; optional |
| **Progress visualization** | Self-monitoring helps `[Streak-Risks]` | Skill map, trends with noise band | Over-reading noise | Medians, bands |
| **Ghost/PR races** | Personal competition | Race your past self | None major | Off by default in focus mode |
| **Surprise rewards** | Novelty | Rare, gentle | Manipulation | Keep informational |
| **Mastery decay/refresh** | Spacing `[Cepeda-2006]` | 5-minute refreshers | Nagging | Opt-in reminders |

---

## 9. Segment Playbooks

### 9.1 Programmers (P2)
- **Goals:** symbol/number/naming fluency, syntax recall, less editing friction. **Not** "become a better programmer."
- **Daily kata (10 min):** 2 min symbol warm-up → 4 min focus (weak symbols/token classes) → 2 min recall (syntax/template) → 2 min dev prose or code retest.
- **Retention hooks:** level ladder, Stack Packs (V1), weekly "syntax kata," baseline retest at day 30, symbol confusion-matrix improvements.
- **Measures:** symbol error rate, Symbol Fluency Ratio, first-try recall, self-reported friction.
- **Watch-outs:** no execution of code; local-only own-code import; no hireability claims.

### 9.2 Authors and writers
- **Goals:** consistent drafting, words/day, flow, fewer interruptions; typing speed is secondary.
- **Draft Sprint (V1):** 10/20-minute timed sprints; **typewriter mode** (no backspace) and **blur mode** to quiet the inner editor; word-goal and flow-minute tracking; ideal-vs-actual progress line. `[WritingStreak]`
- **Habit design:** streak counts **any writing** (1 point) and **goal writing** (2 points) like a reported model; goals are flexible ("300 words is fine"). `[750Words]` `[WriteNext]`
- **Privacy:** composition text stays local or unstored unless opted in.
- **Measures:** words/day, sprints completed, flow minutes, composition burst speed, transfer ratio.

### 9.3 Students
- **Goals:** speed for essays/exams, coding classes; a light curriculum with assignments (V2 teacher tools).
- **Design:** adult-friendly path, short sessions between classes, class/club goals.
- **Watch-outs:** age policy; no ads; accessibility.

### 9.4 Professionals and data-entry
- **Goals:** accuracy and net speed on numbers, forms, email; reliability under fatigue.
- **Design:** Numbers/IDs drills, endurance sessions, fatigue guard, verified results/certificates only if validated.
- **Measures:** net speed, error rate, correction cost, sustained WPM.

### 9.5 Beginners and adult re-learners
- **Goals:** touch typing without kid-style lessons.
- **Design:** placement + skip-ahead, gentle structure (beginners like it `[Ratatype-TP]`), auto-advance, no-timer practice, posture tips, easy wins first.
- **Measures:** first-session win, week-1 return, accuracy trend.

### 9.6 Competitive typists (100+ WPM)
- **Goals:** trusted rankings, deep analytics, races.
- **Design:** verified boards, ghost races, rhythm/preview trainers, rollover lab (V2), burst analytics, PB tracking with noise bands.
- **Watch-outs:** integrity, burnout; healthy caps.

### 9.7 Accessibility-first users
- **Goals:** one-handed tracks, screen reader, dyslexia support, motor limitations.
- **Design:** no-timer practice, adjustable targets, sticky-keys support, table alternatives, reduced motion, no gamification mode.
- **Measure:** completion rates and satisfaction in accessibility cohorts; usability testing with real users.

---

## 10. New Requirements to Merge into the Spec

Tags: **[MVP] [V1] [V2] [LATER]**. IDs are new; where they extend an existing ID, that's noted.

### 10.1 MST — Mastery and training
- **MST-01 [MVP]** **Session blueprint engine:** builds 5/15/30-minute sessions from blocks (warm-up, focus, push, real-world, retest) using the user's weakness profile and content-type mix. *AC:* each session shows a plan up front, can be shortened to the 5-minute minimum, and ends with a summary.
- **MST-02 [MVP]** **Hardest-transition selection:** rank the user's slowest/most error-prone bigrams/trigrams/tokens and build focus sets from natural words/snippets (extends LRN-02).
- **MST-03 [MVP]** **Focus/Push alternation:** blocks with different scoring rules (accuracy floor vs relaxed floor) and clear labels.
- **MST-04 [MVP]** **Difficulty targeting for drills:** adaptive band (default ~85–95% accuracy on targeted items **[H]**), visible to the user with "Gentler/Sharper," and a safety valve after two low-accuracy sets.
- **MST-05 [MVP]** **Feedback cards:** "what improved / what regressed / next action," rolling median (last 5), noise band, per content type (extends ANA-04).
- **MST-06 [MVP]** **Anti-gaming mastery rules:** best 3 of last 5 on varied text, parallel tracks, user-chosen focus, speed *and* accuracy in context (extends LRN-04).
- **MST-07 [V1]** **Consistency/rhythm trainer:** surfaces IKI variability, optional steady-beat cue **[H]**.
- **MST-08 [V1]** **Preview-span probe and trainer:** limited-preview tests to estimate span; training slightly beyond it **[H]**.
- **MST-09 [V1]** **Hand-alternation drills** personalized to the user's pattern.
- **MST-10 [V1]** **Plateau detection with reasoned interventions** (extends LRN-10).
- **MST-11 [V1]** **Draft Sprint** for writers: 10/20-minute sprints, typewriter mode (no backspace), blur mode, word goals, flow minutes; text not stored by default.
- **MST-12 [V1]** **Spaced review scheduling** for recall items (extends PRG-16).
- **MST-13 [V2] [H]** **Rollover Lab.**
- **MST-14 [V1] [H]** **Evening → morning retest option** to test sleep-related gains; no claims until measured.
- **MST-15 [V1]** **Fatigue guard:** suggest stopping when accuracy/consistency degrade sharply.

### 10.2 RET — Retention and habit
- **RET-01 [MVP]** **First-session win flow:** 60-second test → top 3 weak spots → 2-minute drill → retest with a visible delta.
- **RET-02 [MVP]** **Deferred sign-up:** account prompt only after the first result; non-blocking (extends USR-01).
- **RET-03 [MVP]** **Goal presets** (speed, symbol errors, words/day) with ETA (extends LRN-06).
- **RET-04 [MVP]** **If-then practice plan** ("When will you practice?") with optional cue; reminders arrive in V1.
- **RET-05 [MVP]** **Minimum viable session:** ≥ 3 focused minutes counts.
- **RET-06 [MVP]** **Weekly-goal streak** (user-set days per week) as the primary streak; **optional daily streak** (replaces the rigid daily rule in MOT-01).
- **RET-07 [MVP]** **Freezes (earned) and pause mode**; **[V1]** repair within 48 hours.
- **RET-08 [MVP]** **Today card and tomorrow's plan.**
- **RET-09 [MVP]** **Non-gamified mode** toggle.
- **RET-10 [MVP]** **Session summary with personal records** (extends MOT-02).
- **RET-11 [V1]** **Notification system** per §7.4 (extends OPS-08).
- **RET-12 [V1]** **Weekly review** (in-app; email opt-in) (extends ANA-13).
- **RET-13 [V1]** **Welcome-back flow** for lapsed users.
- **RET-14 [V1]** **Competence XP, weekly quests, daily challenge.**
- **RET-15 [V1]** **Clubs with shared weekly goals.**
- **RET-16 [V1]** **Skill-bracket leagues (opt-out), percentile views; verified results only** (INT-10).
- **RET-17 [V1]** **Ghost races** vs your past self.
- **RET-18 [V1]** **Cosmetic unlocks** earned by consistency.
- **RET-19 [V2]** **Coach/teacher plans and cohort challenges.**
- **RET-20 [MVP]** **Retention and guardrail instrumentation:** events, cohorts, experiment assignment (uses ANA-09/ADM-03).
- **RET-21 [Policy]** **Ethics checklist** (§12) enforced in review for every engagement feature.

### 10.3 Edits to existing spec items
| Existing | Change |
|---|---|
| MOT-01 (streaks) | Replace "daily streak, ≥ 5 min" with RET-05/06/07 (weekly-goal primary; ≥ 3 min counts; freezes; pause) |
| LRN-06 (goals) | Add if-then plan (RET-04) and presets (RET-03) |
| ANA-04 | Add per-content-type medians and noise band (MST-05) |
| ANA-13 (weekly report) | Extend to RET-12 |
| ADM-03 (experimentation) | Move a minimal version to **[MVP]** to run the experiments below |
| OPS-08 (notifications) | Adopt the policy in §7.4 |

---

## 11. Metrics, Benchmarks, and Experiments

### 11.1 Benchmarks (directional; mobile apps, secondary sources)
- Median mobile-app retention: **D1 ≈ 26%, D7 ≈ 13%, D30 ≈ 7%** (Adjust 2026, via a summary). `[Retention-Benchmarks]`
- **Education apps ≈ 2–3% at D30**; productivity strong performers ≈ 10–18% at D30. `[Retention-Benchmarks]`
- Users who complete a meaningful action in the first session were reported as 2–3× more likely to be active at D30 (vendor claim). `[Retention-Benchmarks]` ~
- **Caveat:** these are app benchmarks; a web app (with guest use) will measure differently. Establish your own baselines in beta.

### 11.2 Proposed targets [proposal]
| Metric | Beta goal | Stretch |
|---|---|---|
| First-session win rate (drill completed + retest) | ≥ 40% of new visitors who finish a test | ≥ 55% |
| D1 / D7 / D30 (returning users, by cohort) | 25% / 12% / 6% | 35% / 18% / 10% |
| Practice days per week (median of weekly-active users) | ≥ 3 | ≥ 4 |
| Weekly active practicers (share of monthly actives) | Track | Improve |
| Targeted-weakness improvement in 30 days (vs holdout) | Positive, CI excludes 0 | Publish |

### 11.3 Healthy-engagement and guardrail metrics
| Type | Metric |
|---|---|
| Health | Share of users in non-gamified mode (track, don't punish) |
| Health | Notification opt-out and dismissal rates |
| Health | Streak-anxiety survey item ("Do streaks feel stressful?" 1–5) |
| Health | Over-use flag: > 90 min/day for 14 days → gentle rest suggestion |
| Trust | Support tickets/complaints about streaks or notifications |
| Quality | Skill improvement rate vs engagement (are engaged users actually improving?) |

### 11.4 Experiments (A/B or holdout)
Small behavioral effects need adequate samples and full weekly cycles; guard against novelty effects and multiple comparisons. Pre-register hypotheses and stop rules.

| # | Hypothesis | Arms | Primary metric | Guardrail |
|---|---|---|---|---|
| ER-1 | Deferring sign-up until after the first drill raises D1 | Prompt after result vs after drill vs before | D1, first-session win | Signup rate |
| ER-2 | If-then plan raises week-1 practice days | Plan prompt vs none | Days practiced wk1 | Onboarding drop-off |
| ER-3 | Weekly-goal streak beats daily streak on D30 without more anxiety | Weekly vs daily | D30, practice days | Anxiety item |
| ER-4 | Earned freezes reduce lapses after a miss | Freezes on/off | Next-day return after a miss | Streak-farming |
| ER-5 | 3-minute minimum session raises weekly consistency | 3 vs 5 min threshold | Weekly goal completion | Practice quality |
| ER-6 | Focus/Push alternation improves speed vs accuracy-only | Alternating vs steady | 30-day net WPM, accuracy | Drop-outs |
| ER-7 | Hardest-transition drills beat random text | Targeted vs matched random | Weak-item speed change | Engagement |
| ER-8 | Difficulty band (~90%) beats fixed easy | Adaptive band vs easy | Learning rate | Frustration exits |
| ER-9 | Preview-span trainer raises speed for mid-level typists **[H]** | Trainer vs control | 30-day net WPM | Errors |
| ER-10 | Evening→morning retest shows overnight gains **[H]** | Evening+AM vs same-day | Retest delta | None |
| ER-11 | Leagues with opt-out raise D7 without raising churn | Leagues vs none | D7 | Opt-out, complaints |
| ER-12 | Notification cap of 1/day with opt-in outperforms more | 1/day vs 3/week vs none | D7/D30 | Opt-out |

---

## 12. Ethics and Guardrails

**Do**
- Keep engagement features **opt-in or easy to turn off**; offer a **non-gamified mode**.
- Make forgiveness the default (freezes, repair, pause).
- Use rewards that carry **information** (skill, insight), not just status.
- Be transparent about how scores, streaks, and leagues work.
- Keep **cosmetic-only** purchases; never sell competitive advantage.
- Support vulnerable users: perfectionism/anxiety and executive-function challenges can make rigid daily streaks harmful; offer flexible goals. `[Streak-Risks]`
- Respect attention: cap notifications; quiet hours.

**Don't**
- Guilt-trip, shame, or use fake urgency.
- Hide cancellation or pause options.
- Use variable rewards to create compulsion.
- Collect keystroke content for engagement analytics (see `keystroke-privacy`).
- Ship public leaderboards before integrity (INT-10).
- Claim the product improves programming ability, hireability, or health.

**Ethics checklist for every engagement feature**
1. What behavior does this encourage, and is it good for the user's goal?
2. Can the user opt out or scale it down?
3. Does it work if the user misses a day?
4. Does it reward skill or just time?
5. Could it cause anxiety, exclusion, or unfair comparison?
6. Do we measure harm as well as engagement?

---

## 13. Risks and Unknowns

| Risk / unknown | Mitigation |
|---|---|
| **Evidence transfer:** much research is from finger-tapping tasks, language apps, or health apps | Treat as hypotheses; run experiments ER-1…ER-12 |
| **Correlation vs causation** (e.g., "10-day streak users retain better") `[Duolingo-Growth-Model]` | Use randomized tests, not correlations |
| **Vendor/secondary stats** (benchmarks, Duolingo numbers) | Label as directional; establish own baselines |
| **Novelty decay** of gamification `[Routinery]` | Rotate quests/challenges; measure over months |
| **Streak anxiety / all-or-nothing dropout** `[Streak-Risks]` | Weekly goal, freezes, repair, non-gamified mode |
| **Social features need moderation** | Private clubs first; reporting; small scope |
| **Solo-dev capacity** | MVP includes only RET-01…10 and MST-01…06 |
| **Small effects need large samples** | Pre-register; long tests; combine with qualitative feedback |
| **Preview/rhythm/rollover trainers are unproven** | Keep [H]; ship as experiments |
| **Sleep effects may not generalize** `[Sleep-Caveat]` | Test, don't claim |

---

## 14. Research Backlog (Next Searches)

1. **Typing-app onboarding teardowns** (screens and steps of Duolingo, Monkeytype, Keybr, TypingClub, Nitro Type).
2. **Notification research** (effect sizes, opt-in rates, fatigue) beyond vendor blogs.
3. **Adult motor learning for keyboard skills** (preview manipulation, rhythm training) for direct evidence.
4. **Accessibility in gamified apps** (neurodivergent users and streak design).
5. **Leaderboard/league design research** (brackets, fairness, opt-out effects).
6. **Writer-specific retention** (NaNoWriMo-style communities, sprint tools) and competitor teardown.
7. **Programmer learning tools** (retention in code-practice apps, kata communities).
8. **Sound/haptic feedback effects** on motivation and performance.
9. **Legal/ethical review of engagement mechanics** (dark-pattern regulation, India/EU consumer rules).
10. **Efficacy study design** (power analysis for typing improvement, holdout design).

---

## 15. Sources

**Typing skill and motor learning**
- `[Salthouse-1984]` summary: http://www.jimdavies.org/summaries/salthouse1984.html · `[Salthouse-1986]` https://pubmed.ncbi.nlm.nih.gov/3714922/
- `[Butsch]` eye-hand span (via review): https://www.researchgate.net/publication/288989483_Does_typing_speed_depend_on_the_process_of_anticipation
- `[Aalto-CHI18]` https://userinterfaces.aalto.fi/136Mkeystrokes/ · `[KeithEricsson-2007]` https://pubmed.ncbi.nlm.nih.gov/17924799/ · `[Karat-1999]` https://www.humanfactors.com/newsletters/human_interaction_speeds.asp
- `[Walker-2002]` https://www.sciencedirect.com/science/article/pii/S0896627302007468 · `[Kuriyama-2004]` https://pmc.ncbi.nlm.nih.gov/articles/PMC534699 · `[Sleep-Caveat]` https://pmc.ncbi.nlm.nih.gov/articles/PMC6673329
- `[Cepeda-2006]` https://www.yorku.ca/ncepeda/publications/CPVWR2006.html · `[Spacing-EPR]` http://www.lscp.net/persons/ramus/docs/EPR20.pdf
- `[Wilson-85]` https://www.nature.com/articles/s41467-019-12552-4
- `[SpeedAccuracy]` https://www.sciencedirect.com/science/article/pii/S0747563221003150 · `[SpeedAccuracy-Learning]` https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8152873/ · `[Typing.com-Accuracy]` https://www.typing.com/blog/whats-important-typing-speed-accuracy-emphasize-students/ · `[Colemak-Forum]` https://forum.colemak.com/topic/2038-accuracy-vs-speed/

**Habit, goals, gamification**
- `[Lally-2010]` https://onlinelibrary.wiley.com/doi/abs/10.1002/ejsp.674 · `[Lally-Nuance]` https://www.thebehavioralscientist.com/articles/how-long-to-form-a-habit
- `[GollwitzerSheeran-2006]` https://cancercontrol.cancer.gov/sites/default/files/2020-06/goal_intent_attain.pdf · `[GollwitzerSheeran-Notes]` https://www.thebehavioralscientist.com/glossary/implementation-intentions
- `[Sailer-Homner]` https://eric.ed.gov/?id=EJ1245270 · `[Cogn-IQ]` https://www.cogn-iq.org/blog/gamified-learning/ · `[Leaderboards-Health]` https://arxiv.org/pdf/2301.02767
- `[Overjustification]` https://nerdsip.com/blog/gamification-gone-wrong-when-streaks-become-the-point · `[Streak-Risks]` https://www.ehm-tech.com/habit/blog/habit-streaks-do-they-actually-work/ · https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification · `[Routinery]` https://www.routinery.app/blog/micro-rewards-vs-streaks-adherence-science

**Competitors and retention**
- `[Duolingo-Mazal]` https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth · `[Duolingo-Growth-Model]` https://marishalakhiani.substack.com/p/breaking-down-duolingos-growth-model · `[Duolingo-Leagues]` https://www.uladshauchenka.com/p/duolingo-case-study-the-gamification · `[Duolingo-Reminders]` https://www.digia.tech/post/duolingo-habit-forming-reminders-retention-architecture/ · `[Duolingo-Repair]` https://vmobify.com/blog/how-duolingo-grew · `[UXMag-Streaks]` https://uxmag.com/articles/the-psychology-of-hot-streak-game-design-how-to-keep-players-coming-back-every-day-without-shame · `[StriveCloud]` https://www.strivecloud.io/blog/gamification-examples-boost-user-retention-duolingo
- `[MT-Features]` https://mintlify.wiki/monkeytypegame/monkeytype/features · `[MT-1049]` https://github.com/monkeytypegame/monkeytype/discussions/1049 · `[Monkeytype-About]` https://monkeytype.com/about
- `[Keybr-Help]` https://www.keybr.com/help · `[Keybr-GitHub]` https://github.com/aradzie/keybr.com · `[Keybr-Thread-2021]` https://groups.google.com/g/keybr/c/9SDXQDvoapE
- `[750Words]` https://www.750words.com/ · `[750Words-Review]` https://www.andrlik.org/dispatches/review-750-words/ · `[WritingStreak]` https://writingstreak.io/ · `[WriteNext]` https://www.writenext.io/ · `[Flower-Hayes]` https://arxiv.org/pdf/2603.00177
- `[Retention-Benchmarks]` https://www.getpanto.ai/blog/mobile-app-retention-statistics · https://uxcam.com/blog/mobile-app-retention-benchmarks/ · https://www.businessofapps.com/data/education-app-benchmarks/
- `[Ratatype-TP]` https://www.trustpilot.com/review/ratatype.com · `[Cheat-Tools]` https://github.com/topics/monkeytype-cheat

**Wellbeing**
- `[Microbreaks-Cochrane]` https://www.cochrane.org/evidence/CD012886_work-break-interventions-preventing-musculoskeletal-symptoms-and-disorders-healthy-workers · `[Microbreaks-PLOS]` https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0272460 · `[Microbreaks-Cornell]` https://evidencebasedliving.human.cornell.edu/blog/feeling-stressed-at-work-take-microbreaks

*Notes: many retention and Duolingo figures come from secondary summaries and vendor blogs; treat them as directional. Effect sizes come from different domains (finger tapping, health apps, education) and are hypotheses for typing until tested in our own experiments.*
