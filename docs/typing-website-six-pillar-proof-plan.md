# The Six-Pillar Proof Plan — How to Show RealType Works and Earn Its Users

**Date:** 21 Sep 2026
**Purpose:** turn the six things that decide success into concrete programs with measures, decision rules, and steps. This is the "how do we *know*" document.
**Pillars:** (1) it makes people better · (2) people come back · (3) quality of execution · (4) content and design · (5) trust · (6) first users.
**Companion docs:** master spec, implementation guide, retention and mastery playbook, award playbook, Week 0–2 plan.

**Legend:** ✓✓ strong/official · ✓ credible secondary · ~ weak/vendor · **[proposal]** my starting value · **[H]** hypothesis to test · **[verify]** confirm with a professional or primary source.

**Contents**
0. Overview, scorecard, and a correction
1. Pillar 1 — Does it make people better? (efficacy program)
2. Pillar 2 — Do people come back? (retention proof)
3. Pillar 3 — Quality of execution
4. Pillar 4 — Content and design
5. Pillar 5 — Trust (privacy and integrity)
6. Pillar 6 — Getting the first users
7. Integrated 90-day proof plan and decision rules
8. Roles: what AI does, what you do
9. Risks and unknowns
10. Sources

---

## 0. Overview, Scorecard, and a Correction

### 0.1 The principle
Every pillar gets **(a) a definition of success, (b) a way to measure it, (c) a pre-set decision rule, and (d) an owner.** If a pillar fails its rule, you change the plan; you don't explain the failure away.

### 0.2 One-page scorecard (beta targets are **[proposals]**; set your own before you look at data)
| Pillar | Key measure | Beta target | Stretch | How measured |
|---|---|---|---|---|
| 1 Better | Adaptive vs control difference in 30-day net WPM change (matched text, ANCOVA-adjusted) | CI excludes 0, ≥ 2 WPM | ≥ 4 WPM | Randomized in-product study |
| 1 Better | Targeted-weakness improvement (transition speed/error rate) | Positive vs control | Large | Same study |
| 2 Come back | Practice-return D1 / D7 / D30 | 25% / 12% / 6% | 35% / 18% / 10% | Cohort tables |
| 2 Come back | "Very disappointed" if product disappeared | ≥ 40% among active users | ≥ 50% | Sean Ellis survey |
| 3 Quality | Metrics parity + latency + accessibility | 100% fixtures pass; INP ≤ 200 ms (field); axe clean | SUS ≥ 80 | CI + RUM + tests |
| 4 Content/design | 5-second test comprehension; SUS; content skip rate | ≥ 80% correct "what is this"; SUS ≥ 75 | SUS ≥ 80 | Tests + analytics |
| 5 Trust | Privacy incidents; deletion SLA; integrity false-positive rate | 0 incidents; deletion within SLA; FP ≤ set ceiling | Published | Audits + logs |
| 6 First users | Beta users; source quality; referral share | 100 manually recruited → 300 | 1,000 | Funnel by source |

### 0.3 A correction to the earlier docs: age policy
The earlier docs defaulted to **16+**. That's **wrong for a public product used in India.** India's Digital Personal Data Protection Act (2023) and the DPDP Rules (notified 13 Nov 2025, with phased compliance running about 18 months, to roughly mid-May 2027) treat **anyone under 18 as a child**, require **verifiable parental consent** before processing a child's data, and prohibit tracking, behavioral monitoring, and targeted advertising directed at children. `[DPDP-Scrut]` `[DPDP-Fisher]` `[DPDP-RecLaw]` ✓ (law-firm and consultant summaries; **[verify]** with counsel)

**New default (D3): 18+ only at launch.** Use a clear age gate and notice, don't design for minors, and revisit only with a proper parental-consent plan. I'll patch the affected lines in the earlier docs (see the end of this file).

---

## 1. Pillar 1 — Does It Make People Better? (Efficacy Program)

### 1.1 Define "better" before measuring
| Level | Outcome | Notes |
|---|---|---|
| **Primary** | **Net WPM** change per content type, on **matched text**, with accuracy not worse | Primary claim candidate |
| Primary (mechanism) | **Targeted-weakness improvement** (speed and error rate on drilled transitions) | Tests whether the *diagnose→drill* loop does what it says |
| Programmer | Symbol error rate, Symbol Fluency Ratio, first-try recall | Fluency, not "better programmer" |
| Writer | Words per day, flow minutes, composition burst speed | Not WPM |
| Perceived | Monthly "typing friction" survey (1–5) | Real-life transfer, self-reported |
**Never claim:** guaranteed speed gains, better programming, hireability, or health benefits.

### 1.2 What's known (so expectations are honest)
- Trained typists were about **5 WPM faster** than untrained ones (small effect, d = 0.27), cross-sectional data from self-selected typing-site users; untrained typists can match trained ones. `[Aalto-CHI18]` ✓✓
- In one lab study (n = 60), the best performers had a class **and** the goal of typing quickly in daily use. `[KeithEricsson-2007]` ✓
- I found **no randomized evidence** that consumer typing apps raise adult speed. (Absence in my search, not proof.)
- **So:** assume gains may be **small** (a few WPM) and that accuracy/fluency gains may be easier to show than speed gains. Design the study to detect small effects honestly.

### 1.3 The evidence ladder (build in this order)
| Level | Design | What it can prove | Weakness |
|---|---|---|---|
| **L0** | Single-arm baseline → day-14/30/60 retest for everyone | Whether people improve at all | Practice effect, regression to the mean, no comparison |
| **L1** | **Randomized in-product test:** adaptive drills vs matched random-text drills (both arms practice) | Whether *targeting* helps | Needs enough consented users |
| **L2** | Delayed-access control (waitlist arm gets the product later) | Whether the product beats "nothing extra" | Waiting users may practice elsewhere |
| **L3** | **Pre-registered external study** (recruit 100–150 volunteers, 4–6 weeks, small incentive) | Publishable-grade claim | Cost and coordination |
**Recommendation [proposal]:** ship L0 and L1 with the MVP; run L3 once the loop is stable (around months 4–6).

### 1.4 Measurement protocol (standardize everything)
1. **Baseline test:** three attempts per content type on **Form A** text; use the **median**. Record layout, keyboard type (self-report), device, time of day.
2. **Retest:** at day 14 (early signal), day 30 (primary), and day 60 (durability), on **Form B** text of the **same difficulty band, length, and character mix**. Counterbalance A/B order across users.
3. **Same conditions:** prompt for the same keyboard and layout; flag changes and analyze separately.
4. **Exclusions (pre-specified):** flagged/implausible results, layout changes, fewer than N practice days (only for secondary "per-protocol" analysis).
5. **Precision:** timing noise is ~10 ms at the keyboard/OS level; use medians of multiple attempts. `[Aalto-CHI18]`
6. **Noise control:** never compare across content types; never compare a single test to a single test.

### 1.5 Sample size and power (illustrative; replace assumptions with your beta data)
For two arms and a continuous outcome (change in net WPM), a standard approximation is:
**n per arm ≈ 2 × (1.96 + 0.84)² × σ² ÷ Δ²**, for 80% power and a two-sided 5% test, where **σ** is the standard deviation of individual change and **Δ** is the smallest difference you care about.

Assuming **σ ≈ 6 WPM** (an **assumption**; measure it in beta):
| Smallest effect worth detecting (Δ) | n per arm (no dropout) | n per arm with 40% dropout |
|---|---|---|
| 4 WPM | ~35 | ~59 |
| 3 WPM | ~63 | ~105 |
| 2 WPM | ~141 | ~235 |

**Meaning:** an open beta of 50–100 users **cannot** detect small effects. Treat beta as a **feasibility study** (estimate σ, dropout, and adherence), then size the real study. Underpowered tests exaggerate effects and mislead. `[Kohavi-LinkedIn]` ✓

### 1.6 Pre-registered analysis plan (write it before looking at data)
1. **Primary outcome:** change from baseline to day 30 in net WPM (same content type, matched forms).
2. **Analysis:** compare arms using a model that **adjusts for baseline speed** (this reduces noise and handles regression to the mean); report the mean difference with a **95% confidence interval** and effect size.
3. **Population:** primary analysis = **intention-to-treat** (everyone randomized, including low adherence); secondary = per-protocol.
4. **Missing data:** pre-specify handling (e.g., include those with a day-30 test; sensitivity analysis for missing).
5. **Subgroups (pre-specified, few):** baseline speed band; programmers vs prose users; adherence level. Correct for multiple comparisons or label exploratory.
6. **Stopping rules:** fixed sample size or a proper sequential method; **no peeking** and stopping when it "looks significant." `[Kohavi-Book]` ✓
7. **Integrity checks:** verify the randomization ratio (**sample ratio mismatch** invalidates results and occurs in roughly 6–10% of A/B tests). `[Kameleoon-Kohavi]` ✓
8. **Durability:** compare day 30 vs day 60; look for novelty effects (early boost that fades). `[Kohavi-Book]`
9. **Secondary outcomes:** accuracy, KSPC, consistency, targeted-transition speed, symbol error rate (programmers), friction survey.

### 1.7 Validity threats and how we handle them
| Threat | Why it matters | Mitigation |
|---|---|---|
| **Regression to the mean** | People who test low tend to improve anyway | Control arm; baseline-adjusted analysis; multiple baseline attempts |
| **Practice effect of testing itself** | Retesting alone can raise scores | Alternate forms; control arm also tests |
| **Novelty effect** | Early excitement fades | Day-60 follow-up |
| **Self-selection** | Enthusiasts join studies | Randomize within the consented group; report who joined |
| **Dropout / survivorship** | Only engaged users remain | Intention-to-treat; report dropout by arm |
| **Text difficulty differences** | Form B harder than Form A | Matched bands; counterbalance |
| **Hardware/layout changes** | Change results | Record and flag |
| **Cheating/bots** | Corrupt data | Exclude flagged results |
| **Interference between users** | Clubs/leagues spill over | Randomize at group level for social features (violates the independence assumption otherwise) `[Kohavi-Book]` |
| **Multiple testing** | False positives | Pre-specify; correct |
| **Hawthorne** (being observed) | Behavior changes | Both arms know they're in a study; same messaging |

### 1.8 Decision rules and the claim ladder
| Result at day 30 (pre-registered) | Decision | What we may say publicly |
|---|---|---|
| Adaptive beats control by ≥ 2 WPM, CI excludes 0 | Strong: invest in the loop | "In our study, users of adaptive drills gained X WPM more than control (95% CI …)." |
| No speed difference; **accuracy/symbol errors improve** | Pivot messaging to accuracy/fluency | "Fewer errors on the symbols/transitions you practiced." |
| Both arms improve equally | Loop isn't adding value beyond practice | "Practice helps; we're improving targeting." Redesign drills |
| Control better | Stop shipping that drill logic | Say nothing about speed; fix or remove |
| Underpowered/inconclusive | Extend the study | "Early results; not conclusive." |
**Rule:** no marketing claim about speed unless the **confidence interval** supports it. State limitations plainly.

### 1.9 Ethics and consent for the study
1. **Explicit opt-in**, plain language, revocable anytime, no penalty.
2. **Both arms get useful practice** (control isn't withheld help).
3. **Data minimization:** outcomes are numbers; no typed content.
4. **Adults only (18+)** at launch.
5. **Transparency:** publish protocol and results summaries.
6. **Debrief:** tell control users what they can now try.

### 1.10 Steps and timeline
| When | Step |
|---|---|
| Before beta | Build baseline/retest pairing, matched text forms, randomization, exposure logging (ANA-09, ER framework) |
| Beta weeks 1–4 | Run **L0**; estimate σ, dropout, adherence; verify randomization ratio on a dry run |
| Beta weeks 4–8 | Pilot **L1** in consenting users; treat as feasibility |
| Month 3–4 | Write and freeze the **protocol** and analysis plan |
| Month 4–6 | Run **L3** (100–150 volunteers, 4–6 weeks), or a larger L1 |
| After | Analyze once; publish summary with caveats |

### 1.11 Programmer and writer studies
- **Programmers:** primary = symbol error rate on matched symbol sets; secondary = Symbol Fluency Ratio, first-try recall, friction survey. No claims about programming ability.
- **Writers:** primary = words/day and flow minutes over 4 weeks; secondary = composition burst speed; text never leaves the device.

### 1.12 Kill/pivot criteria for Pillar 1
If after a properly powered study neither speed nor accuracy nor fluency shows benefit beyond plain practice, **stop selling "improvement"** and pivot the value proposition (measurement, guidance, motivation, or tooling for a niche), or stop.

---

## 2. Pillar 2 — Do People Come Back? (Retention Proof)

### 2.1 Definitions (fix these first)
- **Activation:** completed the first-session win (test → weak spots → drill → retest).
- **Practice-return:** a return day with ≥ 3 focused minutes (not just a page view).
- **D1/D7/D30:** share of a cohort that practice-returns on/around day N. Report with confidence intervals; small cohorts are noisy.
- **Weekly active practicers (WAP):** users who practiced on ≥ 1 day in a week; also track **≥ 3 days/week**.
- **Resurrected:** returned after ≥ 30 days away.

### 2.2 Benchmarks and honest targets
- **Directional benchmarks (mobile apps, secondary sources):** median D1 ≈ 26%, D7 ≈ 13%, D30 ≈ 7%; education apps ≈ 2–3% at D30; productivity strong performers ≈ 10–18% at D30. `[Retention-Bench]` ~
- **Caveat:** a web app with guest use isn't the same as an installed app. Establish **your own baselines** in beta.
- **Beta targets [proposal]:** D1 25%, D7 12%, D30 6% (stretch 35/18/10). With cohorts under ~30 users, treat results as directional only.

### 2.3 The product-market-fit survey (Sean Ellis test)
**Question (use this wording):** "How would you feel if you could no longer use this product?" Options: **Very disappointed / Somewhat disappointed / Not disappointed** (plus "N/A, I no longer use it").
**Rule of thumb:** **≥ 40% "very disappointed"** suggests likely PMF; below that, expect growth friction. It's an empirical rule from studying nearly 100 startups, not a law. `[Ellis-Sleekplan]` `[Ellis-Stackmatix]` ✓
**How to run it:**
1. **Who:** users who **used the core product at least twice in the last 14 days** and are past onboarding; exclude "no longer use" from the denominator.
2. **How many:** aim for **40–100 valid responses**; below ~40 treat as directional.
3. **Follow-ups (open text):** main benefit; who would you recommend it to; what would you improve; how did you find us.
4. **Segment:** by persona (upgrader, programmer, writer), content type, language, and acquisition source. A 30% overall score may hide a 55% segment. `[Ellis-Formbricks]`
5. **Cadence:** every 4–6 weeks; track trend.
6. **Pitfalls:** surveying only power users; counting "somewhat disappointed" as a win; ignoring the open-text answers.
7. **Action:** build for the "very disappointed" segment first; ask what they'd miss; read the language they use for positioning.

### 2.4 Qualitative retention research (do these, not just dashboards)
| Method | How | What you learn |
|---|---|---|
| **Diary study** | 8–10 users log daily for 2 weeks (2 minutes/day) | Real cues, obstacles, moods |
| **Exit interviews** | 8–10 users who stopped after 1–3 weeks | Why they left; what would bring them back |
| **"Almost quit" interviews** | Retained users: when did you almost stop? | Fragile moments to design for |
| **If-then plan review** | Are people using their cue? | Whether the plan works |
| **Session replays of the first-session win** (with consent, no typed content) | Watch hesitation | Onboarding friction |

### 2.5 Retention experiments (correct design)
Use the ER-1…ER-12 list from the retention playbook, with these rules `[Kohavi-Book]` `[Kameleoon-Kohavi]`:
1. **Pre-register** hypothesis, primary metric, guardrails, sample size, duration.
2. **Check the randomization ratio** first (SRM).
3. **Run full weekly cycles** (day-of-week effects); don't stop early.
4. **One primary metric**; correct for multiple comparisons.
5. **Watch novelty and survivorship** (analyze new vs existing users).
6. **Clubs/leagues/challenges interfere between users**; randomize at the **group** level.
7. **Underpowered tests exaggerate effects**; if traffic is small, test **bigger changes**, and replicate.

### 2.6 Funnel diagnostics
| Step | Question | Typical failure | Fix candidates |
|---|---|---|---|
| Visit → first test | Do they type? | Unclear page | Make the test the landing page |
| First test → weak spots viewed | Do they see value? | Results too dense | Simplify "What to fix" |
| Weak spots → drill started | Do they act? | Copy unclear; button not obvious | Stronger primary action |
| Drill → retest | Do they finish? | Too long/hard | Shorter set; gentler band |
| Retest → save/goal | Do they commit? | Prompt too early/late | Move after the win |
| Goal → D1 | Do they return? | No cue | If-then plan; reminder (V1) |
| D1 → D7 | Do they build a habit? | Streak pressure or boredom | Weekly goal; variety; quests |
| D7 → D30 | Does value persist? | Plateau | Plateau coach; new content types |

### 2.7 Health guardrails (retention must not cause harm)
- Streak-anxiety survey item; gamification-off adoption; notification opt-outs; over-use flag (long daily sessions for weeks); support complaints. Effects of streaks vary and can backfire. `[Streak-Risks]` ✓

### 2.8 Decision rules for Pillar 2
| Signal | Decision |
|---|---|
| PMF ≥ 40% **and** D7/D30 near targets | Invest in growth (Pillar 6) |
| PMF < 40% but a segment ≥ 40% | Narrow positioning to that segment |
| PMF < 30% overall and no strong segment | Return to problem interviews; revisit the value proposition |
| High D1, low D7 | Fix habit design (plan, cues, variety) |
| High activation, low D1 | Fix first-session win → next-day cue |
| Low activation | Fix onboarding/results clarity first |

---

## 3. Pillar 3 — Quality of Execution

### 3.1 Quality is a system, not a hope
Documents don't make software correct; **tests, gates, and your review do.** Each milestone has a gate; nothing proceeds until it passes. AI-generated code makes this **more** important, because it is fast, plausible, and sometimes wrong.

### 3.2 Quality bars (measurable)
| Attribute | Bar | Measured by |
|---|---|---|
| **Metric correctness** | 100% of fixtures pass; browser = server; independent spot-check matches | Golden tests; parity harness; spreadsheet audit |
| **Typing latency** | Internal p95 ≤ 16 ms **[proposal]**; field INP ≤ 200 ms at p75 `[WebDev-Vitals]` ✓✓ | Latency harness in CI; real-user monitoring |
| **Loading and stability** | LCP ≤ 2.5 s, CLS ≤ 0.1 at p75 `[WebDev-Vitals]` | Lab audits; RUM |
| **Accessibility** | WCAG 2.2 AA (non-test UI); keyboard-only core loop; screen-reader pass | Scanner + manual + tests with disabled users |
| **Usability** | SUS ≥ 75 (beta), ≥ 80 (award-level); average is 68 `[MeasuringU-SUS]` | 12+ participant SUS |
| **Reliability** | Error-free sessions ≥ 99%; API availability target 99.9% after MVP | Error tracking; uptime |
| **Security** | No high findings open; secrets scan clean | Reviews, scans, pen-test |
| **Privacy** | Behavior matches policy; canary tests green | Automated + audits |
| **Cross-platform** | Matrix passes (3 engines × 3 OS × 5 layouts) | Manual matrix + e2e |

### 3.3 Reviewing AI-generated code (your job)
**Before reading any implementation, read the tests.** Then use this checklist on every pull request:
1. **Scope:** does it do only the task? (≤ ~10 files; no drive-by changes)
2. **Tests first:** are there new tests that would fail without the change? Were any tests weakened, skipped, or deleted?
3. **Spec match:** run `/spec-check`; compare against acceptance criteria.
4. **Rules:** typing-path performance (no per-keystroke UI state), privacy (no typed content out), licensing (no copied GPL/AGPL), safety (no code execution).
5. **Dependencies:** any new package? Justified, licensed, maintained?
6. **Error handling:** what happens offline, on bad input, on partial failure?
7. **Accessibility/motion:** keyboard, focus, reduced motion, non-color cues.
8. **Data:** migrations safe? retention respected? analytics events allowlisted?
9. **Naming and clarity:** could a new person understand it?
10. **Security:** validation, authorization, rate limits, injection.
11. **Explainability:** ask the AI to explain the diff in plain language; if it can't, don't merge.
12. **Rollback:** feature flag or clean revert?
**Weekly independent audit:** pick one module (e.g., the metrics library) and have a **second reviewer** (a different model or a human engineer) audit it against the spec; log discrepancies.
**Test-the-tests:** occasionally introduce a deliberate bug (mutation) to confirm tests catch it.

### 3.4 Test strategy in depth
| Layer | Purpose | Notes |
|---|---|---|
| Golden fixtures | Metrics correctness | Expected values computed by hand/spreadsheet; recorded on real keyboards |
| Property tests | Invariants over random logs | Fixed seeds recorded |
| Parity | Same results in browser and server | Every fixture |
| Component/e2e | User flows | Deterministic seeds; three engines |
| Latency harness | Typing feel | Percentiles, long tasks; CPU-throttled runs |
| Accessibility | Inclusive use | Scanner in CI; manual keyboard and screen-reader scripts |
| Visual regression | Design consistency | All themes and states |
| Failure injection | Resilience | Offline, API down, slow network, expired session, corrupt local storage |
| Load | Scale | Result endpoint at 10× beta; races later |
| Security | Abuse resistance | Fuzzing, XSS via snippets/custom text, rate limits |
| Exploratory charters | Human curiosity | 60-minute sessions with a goal ("try to break the results page") |

### 3.5 Metrics correctness audit (do this early and again before launch)
1. Record **20 real typing logs** (varied styles and layouts).
2. **Recompute** WPM, accuracy, KSPC, consistency by hand or spreadsheet.
3. Compare to the engine; investigate every discrepancy > tolerance.
4. Sanity-check plausibility against well-known tests using comparable text (order of magnitude, not exact).
5. Publish the definitions on `/how-we-calculate`; version them.

### 3.6 Quality dashboard (weekly)
Open bugs by severity · escaped defects (found by users) · flaky-test rate · latency p50/p95 · INP/LCP/CLS at p75 · accessibility issues open · test coverage on the engine · dependency alerts · time to fix S1/S2.

### 3.7 Usability testing cadence
- **Qualitative rounds:** 5 users per round, then fix, then another 5. Use **3 per distinct group** if testing several groups; the "5 users" rule applies to iterative qualitative testing, **not** to quantitative claims, and better interfaces need more users to find remaining issues. `[NNg-5Users]` `[NNg-QualQuant]` ✓✓
- **Quantitative:** SUS, task success, time on task with 12+ participants.
- **Cadence:** every 2–3 weeks during build; monthly after launch.

### 3.8 Release and rollback
Feature flags; staged rollouts (10% → 50% → 100%); automatic rollback triggers (error rate, latency); a written rollback procedure tested once per quarter.

### 3.9 Technical debt policy
Reserve ~15–20% of each cycle for refactors and test improvements; track debt items; never defer accessibility or privacy fixes.

### 3.10 One external review before public launch
Get **one or two experienced engineers** (paid or peer) to review: engine and metrics, the submission/verification pipeline, privacy behavior, and security. Fix all high findings first.

### 3.11 Decision rules for Pillar 3
| Signal | Decision |
|---|---|
| Any metric parity failure | Stop feature work; fix; add a regression fixture |
| p95 latency or INP over budget | Roll back or fix before shipping |
| A11y blocker | Blocks release |
| Escaped S1/S2 defects rising | Slow down; strengthen tests and review |

---

## 4. Pillar 4 — Content and Design

### 4.1 Content: the plan
**Targets [proposal] for MVP:** ~300 Real-World Prose passages; ~300 quotes (public-domain/original); ~1,000-word frequency list; generators for tiers 1–6; ~100 reviewed snippets per initial language; ~50 recall idioms per language.

**Workflow (per batch of ~50 items):**
1. **Brief:** style guide (voice variety, length 20–120 words, mixed punctuation, some digits/names/URLs, no PII).
2. **Draft:** AI-assisted drafting is fine, but **a human edits every item**; discard generic, repetitive, or odd text.
3. **License check:** every item gets a register entry; original text gets an "original" tag.
4. **Filters:** offensive content, PII, secrets, duplicates.
5. **Difficulty tagging:** compute the typability band; balance Easy/Typical/Hard.
6. **Read-aloud test:** does it sound natural? Would a person write it?
7. **Sample audit:** a second person audits 10–20%.
8. **Publish** with version and audit trail.
**Standards:** varied domains (email, notes, instructions, explanations, stories, technical writing); avoid AI clichés; avoid culturally narrow references; keep punctuation realistic.
**Programmer content:** have **practicing programmers per language** review snippet realism and idioms; verify naming vocab and numeric/ID formats; ensure symbols are reachable on target layouts.
**Content analytics:** skip rate, error hotspots (by item, never by typed text), user reports; retire or fix bad items monthly.

### 4.2 Design: from "fine" to "excellent"
1. **Brief first** (audience, three feeling words, do-nots, references).
2. **Three art-direction prototypes:** design the **results screen** in each direction (a day each); this screen carries the product's value.
3. **Choose by evidence:** show them to 5–8 target users; ask for first impressions, trust, clarity, and preference; also run a **5-second test** (show a screenshot for five seconds; ask "what is this?" and "what would you do first?") and a **first-click test**. **[general UX methods]**
4. **Build the design system:** tokens, themes, states, motion language, special pages.
5. **Design critique protocol:** 3 outside critiques with a script: "What's the first thing you notice? What's confusing? What feels off-brand? What would you cut?"
6. **Who designs:** you plus AI for implementation; add a **freelance designer** for brand identity, logo, and critique; budget for it early.
7. **Consistency audits:** monthly; fix drift (spacing, type, icons, copy).
8. **Special pages:** 404, loading, empty, offline, error are designed, not defaults.
9. **Design QA:** visual regression + human review before every release.

### 4.3 What users notice in the first minute
Speed of first keystroke · clarity of the results screen · whether the "What to fix" card feels personal and correct · calm visuals · no popups. Test these explicitly.

### 4.4 UX writing
Voice guide, banned phrases (guilt, hype, promises), and reviewed microcopy. Explain scores in plain language.

### 4.5 Decision rules for Pillar 4
| Signal | Decision |
|---|---|
| < 80% correctly say what the product is (5-second test) | Fix the landing/test page copy and layout |
| SUS < 75 | Fix top usability issues before more features |
| High content skip rate on an item | Rewrite or retire it |
| Reviewers find generic/odd passages | Raise editorial bar; cut volume |

---

## 5. Pillar 5 — Trust (Privacy and Integrity)

### 5.1 Public trust commitments (write these on a page)
1. We never sell or share your typing data.
2. We don't store what you type; we store timing statistics.
3. Raw keystroke logs expire (default 30 days).
4. Research use is opt-in and revocable.
5. You can export or delete your data at any time.
6. Rankings are verified; our rules and appeals are public.
7. We publish how scores are calculated and whether the product works.
8. We don't use dark patterns or guilt.

### 5.2 Privacy program

**Legal landscape (summaries; not legal advice; [verify] with counsel):**
- **India (DPDP Act 2023 + Rules 2025):** rules notified 13 Nov 2025; phased compliance to roughly mid-May 2027; **child = under 18** with **verifiable parental consent** required; **tracking, behavioral monitoring, and targeted advertising directed at children are prohibited**; itemized notices; purpose-based retention; **reasonable security safeguards**; **breach reporting within 72 hours** (runs from awareness); **access/correction/erasure requests answered within 90 days**; penalties **up to ₹250 crore** for failing security safeguards; the Act applies to services offered to people in India even from outside. `[DPDP-Scrut]` `[DPDP-EY]` `[DPDP-Fisher]` `[DPDP-RecLaw]` `[DPDP-Seclore]` ✓ (secondary summaries)
- **GDPR/UK GDPR (if you serve EU/UK users):** biometric data is **special-category only when processed to uniquely identify a person**; purpose matters. Typing rhythm can identify people (keystroke dynamics is a behavioral biometric), so **never use timing signatures to identify or link accounts.** `[ICO-Biometric]` `[GDPR-Art9]` ✓✓ Some vendors argue typing patterns are generally Article 9 biometric identifiers and can reveal states like emotion; treat as a reason to minimize, not as settled law. `[ZK-PoP]` ~

**Program steps:**
1. **Age gate: 18+ only at launch;** clear notice; don't design for minors; no child-directed features.
2. **Data map:** each data type → purpose → storage → retention → access. Keep it current.
3. **Notice and consent:** itemized, plain-language privacy notice; separate, revocable consent for research and (later) composition-text saving.
4. **Retention schedule:** raw logs 30 days (verified/flagged exceptions), aggregates until deletion; a tested deletion job.
5. **Rights handling:** export, correction, erasure, and a **grievance contact**; respond well within the 90-day maximum (target days, not weeks).
6. **Breach plan:** detection → containment → assessment → notification (72-hour clock) → postmortem; drill it once.
7. **Processors:** list hosting, database, analytics, error tracking, email; sign data-processing terms; check data locations and transfer rules **[verify]**.
8. **Privacy by design:** no typed content in analytics/errors (canary tests); strict allowlists; no third-party trackers in the test flow.
9. **DPIA-lite:** for each new feature that touches user data, answer: what data, why, how long, who can see it, can it identify someone?
10. **Audit cadence:** quarterly access review; annual policy review.
11. **Professional review** of privacy notice and terms before launch.

### 5.3 Security program (summary)
Threat model per feature; secure-by-default configs; secrets in a secret store; dependency and secret scanning in CI; least privilege and MFA for admin; audit logs; backups with restore tests; incident response; a pre-launch penetration test; a coordinated-disclosure contact page.

### 5.4 Integrity program: rankings that can't be cheated
**Reality:** cheat tools exist for popular typing sites, including scripts that defeat image-based checks and paid bots. `[Cheat-Tools]` ✓ Perfect prevention is impossible; the goal is **costly cheating, very low false positives, and transparency.**

**Rules**
1. **No public boards until the integrity layer exists** (INT-05…INT-08 in the spec).
2. **Server recompute** and **signed sessions** from day one (private results).
3. **Layered detection:** deterministic plausibility → timing-distribution checks → account behavior → human review → verification re-test → appeals.
4. **Never permanently ban on one automated signal;** hold and review.
5. **Never use keystroke timing to identify or link accounts** (biometric risk); use device/session/behavior signals carefully and disclose.

**Measuring detection quality [proposal]**
| Test | How | Target |
|---|---|---|
| **Known-human set** | Recruit 30–50 legitimate fast typists (incl. 100+ WPM) and let them type | False-positive rate ≤ 0.5% (set your ceiling) |
| **Known-bot set** | Build simple and "humanized" bots **privately** for testing only; never distribute | Detect the crude ones reliably; measure the humanized ones honestly |
| **Red team** | Invite trusted testers to try cheating in a controlled window; reward findings | List of bypasses fixed |
| **Appeals** | Track volume, outcomes, time to resolve | Median resolution ≤ 3 days |
| **Reviewer QA** | Second reviewer audits 10% of decisions | Agreement rate tracked |

**Policy artifacts:** public integrity policy, reason categories, appeal form, a small **transparency report** each quarter (flags, holds, bans, appeals, overturns).

### 5.5 Trust metrics
Privacy incidents (target 0) · consent rates for research · deletion/export SLA · integrity false-positive rate and overturn rate · a periodic trust survey item ("I trust how RealType handles my data" 1–5).

### 5.6 Anti-patterns to avoid
Storing typed text "just in case" · logging full request bodies · using rhythm to fingerprint users · unexplained bans · hiding data practices in long legalese · collecting more data than the feature needs.

### 5.7 Decision rules for Pillar 5
| Signal | Decision |
|---|---|
| Any privacy incident | S1 response; stop related work; fix and disclose per law |
| Integrity FP above ceiling | Disable holds/boards for that rule; fix |
| Consent rates very low | Improve explanations; don't weaken consent |
| Legal review finds mismatch | Fix behavior or text before launch |

---

## 6. Pillar 6 — Getting the First Users

### 6.1 What history says
- **Monkeytype** began as a quarantine project, was improved from feedback on a Reddit prototype, launched officially in May 2020, and grew through community-contributed themes/languages and Discord. `[Monkeytype-About]` `[KBD-Interview]` ✓
- **Paul Graham's advice:** the most common unscalable thing is to **recruit users manually**; start in a **narrow market**; big launches and partnerships rarely drive early growth; the happiness of early users matters more than their number. `[PG-Devto]` `[PG-Medium]` `[PG-Library]` ✓
- **Practical version:** write a **list of 100 real people** who have the problem, contact them one by one about *their* problem, and sit with them for the first run to see where they'd give up. `[PG-Devto]`
- **HN and Product Hunt** are amplifiers, not foundations (see the award playbook §11).

### 6.2 Choose a beachhead (a group whose first 100 could plausibly know each other)
| Option | Why | Risk |
|---|---|---|
| **Programmers and CS students** | Clear pain (symbols, numbers, recall); reachable through campuses and dev communities; matches the differentiator | Crowded attention; need a sharp message |
| Keyboard/typing hobbyists | Already practice daily; give strong feedback | They love existing tools; cheating-sensitive |
| Writers | Distinct need (sprints, words/day) | Less overlap with the core engine |
| Bootcamps/college clubs | Group adoption; later B2B | Slow; requires relationships |
**Recommendation [inference]:** start with **programmers and students** in communities you can actually reach, then expand. Validate with the Week 0–2 interviews before committing.

### 6.3 The manual-outreach engine (Weeks 0–8)
1. **Build "the 100 list":** name/handle, where they are, why they'd care (from their own posts or interview answers), and the channel.
2. **Message about their problem, not your product** ("I'm working on a tool that shows which symbols slow you down when coding; could I watch you try it for 15 minutes?"). Keep it short, specific, and honest.
3. **Expect a modest reply rate** (one in five still gives you conversations). `[PG-Devto]`
4. **Do the first run with them** (screen share or in person): watch, don't explain; note every hesitation; that is your onboarding backlog.
5. **Ask for two things:** feedback and one introduction.
6. **Follow up within 24 hours** with a fix or thanks ("You said, we did").
7. **Track** each person: source, first-run outcome, D1/D7 return, PMF answer.

### 6.4 Channel sequence
| Phase | Weeks | Activity | Goal |
|---|---|---|---|
| A | 0–4 | Manual outreach, interviews, prototype tests | 30–50 engaged testers |
| B | 5–8 | Build-in-public posts; relevant communities (**read each community's self-promotion rules first**); campus clubs; dev forums | ~100 users |
| C | 9–12 | Beta waves; Discord; office hours; changelog | 100 → 300 |
| D | After beta | **Show HN** (programmer story; technical description; no vote solicitation), optional Product Hunt with a prepared campaign, SEO guides, referrals | 300 → 1,000 |
**Note:** incumbent typing sites have large organic reach; SEO is a long game, so lead with niche long-tail guides that end in drills (for example, typing hex/binary literals, naming-convention drills, "typing test for programmers"). **[inference]**

### 6.5 Community infrastructure
- **Discord (or similar):** rules, code of conduct, roles, a feedback channel, office hours.
- **Public roadmap and changelog;** monthly "what we shipped, what we learned."
- **If open-core:** a contributing guide, "good first issues," and a way for people to add themes/languages/drill packs (with licensing statements).

### 6.6 Referral and sharing loops (ethical)
Share cards for results; challenge links (same text); clubs; invite-a-friend for weekly goals. Measure share rate and conversion by source. No spam, no forced sharing, no rewards that distort behavior.

### 6.7 Funnel and source metrics
Visit → first test → first-session win → signup → D7 return, **by source**. Track which channels produce people who **practice again**, not just visit. Cost of acquisition is near zero early; **time** is the cost.

### 6.8 First 100 → 300 → 1,000 gates
| Gate | Evidence to proceed |
|---|---|
| **100** (manual) | ≥ 20 first-run sessions watched; top 10 onboarding fixes shipped; PMF survey started |
| **300** | D7 and PMF trending up; no unresolved S1/S2; community rules working |
| **1,000** | PMF ≥ 40% in at least one segment; efficacy pilot running; support load manageable |

### 6.9 Delight and support
Reply within 24 hours; fix small issues fast; thank contributors publicly; add requested features when several people ask (and tell them). Early happiness matters more than early count. `[PG-Medium]`

### 6.10 Anti-patterns
Buying ads before you know who wants it · posting in six places at once · a big launch as the plan · coordinated voting · ignoring community rules · scaling before the first 100 are happy.

### 6.11 Decision rules for Pillar 6
| Signal | Decision |
|---|---|
| Reply rate < ~5% after 50 messages | Rework the message and the target group |
| Manual first-runs show repeated confusion | Fix onboarding before recruiting more |
| One channel gives most retained users | Double down there |
| Growth stalls with high retention | Improve distribution (guides, referrals, Show HN) |
| Growth strong but retention weak | Fix habit design before spending more effort on reach |

---

## 7. Integrated 90-Day Proof Plan and Decision Rules

| Weeks | Pillar focus | Key actions | Proof gate |
|---|---|---|---|
| 0–2 | 6, 2, 3 | Interviews, waitlist, prototype test; engine + parity; license register | **Day 14:** go/no-go; parity and latency spikes pass |
| 3–6 | 3, 4, 5 | M1–M3: engine, typing surface, results, privacy features; content batch 1; design brief and 3 art-direction prototypes | Latency/a11y/privacy gates pass |
| 5–8 | 6 | Manual outreach continues; invite first testers | ≥ 20 watched first runs |
| 7–10 | 1, 2 | M4 loop; baseline/retest; L0 efficacy; first PMF survey (small) | Loop works with real testers |
| 9–12 | 4, 1 | Programmer track; content batch 2; SUS; L1 pilot | SUS ≥ 75; σ and dropout estimated |
| 13–16 | 2, 5, 6 | Beta waves; retention cohorts; legal review; integrity groundwork | D7/PMF readout; legal pages live |
| 17–24 | 1 | Freeze protocol; recruit study participants | Protocol registered |
| 25–36 | 1, 6 | Run L3 study; Show HN when ready | Analysis and public summary |

**If a pillar fails:**
- **Pillar 1 fails** → repurpose value (measurement/guidance/fluency) or stop selling "improvement."
- **Pillar 2 fails** → return to interviews; simplify; fix onboarding and habit design before growth.
- **Pillar 3 fails** → stop feature work; fix; add regression tests.
- **Pillar 4 fails** → raise editorial and design bars; cut scope.
- **Pillar 5 fails** → stop and fix before any growth.
- **Pillar 6 fails** → narrow the beachhead; do more manual outreach.

---

## 8. Roles: What AI Does, What You Do

| Pillar | AI can do | Only you (or humans) can do |
|---|---|---|
| 1 Efficacy | Build instrumentation, matched forms, analysis scripts, draft protocol | Decide claims; recruit participants; ethics; interpret results |
| 2 Retention | Build cohorts/dashboards/surveys; draft copy | Interviews, diary studies, judge tone, decide trade-offs |
| 3 Quality | Write tests, run audits, fix bugs, draft checklists | Review diffs, run real-keyboard tests, external review |
| 4 Content/design | Draft passages/snippets, implement tokens/components | Edit and approve content, choose art direction, run design tests, hire critique |
| 5 Trust | Implement retention jobs, scrubbers, integrity checks; draft policies | Legal review, breach decisions, red-team judgment, policy decisions |
| 6 First users | Draft outreach templates, build landing pages, analytics | Do the outreach, join communities, run onboarding calls |

---

## 9. Risks and Unknowns

- **Efficacy may be small or null;** plan for that outcome and know your fallback value proposition.
- **Small samples mislead;** avoid declaring wins from dozens of users.
- **Many sources are secondary/vendor** (retention benchmarks, DPDP summaries, PMF articles); **[verify]** legal points with a professional.
- **I haven't verified** DPDP cross-border transfer rules, the exact breach-report recipients, or how a self-declared age gate is treated; ask counsel.
- **Integrity numbers (FP ceiling, resolution times) are proposals.**
- **Beachhead choice is an inference,** to be settled by the Week 0–2 interviews.
- **Effect sizes and σ are assumptions** until you have your own data.

---

## 10. Sources

**Efficacy and experiments**
- `[Aalto-CHI18]` https://userinterfaces.aalto.fi/136Mkeystrokes/ · `[KeithEricsson-2007]` https://pubmed.ncbi.nlm.nih.gov/17924799/
- `[Kohavi-Book]` https://andrewclark.co.uk/all-media/trustworthy-online-controlled-experiments (summary of *Trustworthy Online Controlled Experiments*) · `[Kameleoon-Kohavi]` https://www.kameleoon.com/blog/ronny-kohavi-getting-results-you-trust · `[Kohavi-LinkedIn]` https://www.linkedin.com/posts/ronnyk_abtest-experimentguide-activity-6973375103745028096-Bweu

**Retention and PMF**
- `[Retention-Bench]` https://www.getpanto.ai/blog/mobile-app-retention-statistics · https://uxcam.com/blog/mobile-app-retention-benchmarks/ · https://www.businessofapps.com/data/education-app-benchmarks/
- `[Ellis-Sleekplan]` https://sleekplan.com/blog/product-market-fit-survey-questions-use-the-40-rule-jtbd-and-nps-to-validate-real-demand-8575/ · `[Ellis-Stackmatix]` https://www.stackmatix.com/blog/sean-ellis-pmf-survey · `[Ellis-Formbricks]` https://formbricks.com/blog/product-market-fit-survey-questions
- `[Streak-Risks]` https://www.ehm-tech.com/habit/blog/habit-streaks-do-they-actually-work/

**Quality and usability**
- `[WebDev-Vitals]` https://web.dev/articles/vitals · `[MeasuringU-SUS]` https://measuringu.com/sus/
- `[NNg-5Users]` https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/ · `[NNg-QualQuant]` https://www.nngroup.com/articles/5-test-users-qual-quant/

**Privacy and integrity**
- `[DPDP-Scrut]` https://www.scrut.io/post/dpdp-rules · `[DPDP-EY]` https://www.ey.com/en_in/insights/cybersecurity/transforming-data-privacy-digital-personal-data-protection-rules-2025 · `[DPDP-Fisher]` https://www.fisherphillips.com/en/insights/insights/indias-new-data-privacy-rules-are-here · `[DPDP-RecLaw]` https://www.recordinglaw.com/world-laws/world-data-privacy-laws/india-data-privacy-laws/ · `[DPDP-Seclore]` https://www.seclore.com/fundamentals/dpdp-rules-2025-compliance-guide/ · official PIB notice: https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf
- `[ICO-Biometric]` https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/biometric-data-guidance-biometric-recognition/key-data-protection-concepts/ · `[GDPR-Art9]` https://gdpr-info.eu/art-9-gdpr/ · `[ZK-PoP]` https://arxiv.org/pdf/2603.00179 (vendor-authored)
- `[Cheat-Tools]` https://github.com/topics/monkeytype-cheat · https://github.com/FarisHijazi/10FastFingers_BotAntiAntiCheat

**First users**
- `[Monkeytype-About]` https://monkeytype.com/about · `[KBD-Interview]` https://kbd.news/Interview-3-years-of-Monkeytype-2019.html
- `[PG-Devto]` https://dev.to/markfulton/how-to-get-your-first-100-users-when-you-built-it-alone-5-unscalable-moves-1g46 · `[PG-Medium]` https://medium.com/@levelupday/early-customer-acquisition-do-things-that-dont-scale-by-paul-graham-e1d6d4d29080 · `[PG-Library]` https://libraryofllm.com/sources/pg-do-things-that-dont-scale

*All sample sizes, targets, and thresholds in this document are proposals to be set and pre-registered by you before looking at data.*
