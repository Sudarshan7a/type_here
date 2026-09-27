# Audit Report — How Good Were the Earlier Docs, and What Survived the Evidence Check?

**Date:** 19 Sep 2026
**Audited:** `typing-website-requirements.md` (v0.1) and `typing-website-programmer-track.md` (v0.2)
**Result:** `typing-website-master-spec-v1.md` (v1.0) — the consolidated, corrected spec
**Legend:** ✓✓ multiple independent sources · ✓ one credible source · ~ weak/anecdotal · ✗ rejected

**Contents**
1. Verdict and scorecard
2. Method and limits
3. Claim-by-claim validation
4. Defects found (with fixes)
5. Does typing training actually work? (premise check)
6. What reviews say, per competitor
7. Change log (kept / changed / cut / added)
8. What's still uncertain
9. Sources

---

## 1. Verdict and Scorecard

**Short verdict:** v0.1 + v0.2 were **good at finding problems and generating ideas**, but **weak at prioritizing, costing, and checking claims**. The evidence check confirmed most user pain points, but it **rejected or downgraded several things I presented as gaps or facts**, and it exposed a **bigger risk than any listed before: the product's core promise ("we make you faster") is not well supported by evidence.**

### My self-assessment (subjective)
| Dimension | v0.1 + v0.2 | Why | v1.0 |
|---|---|---|---|
| Evidence grounding | **B−** | Good pain-point mapping, but several claims leaned on vendor blogs | **B+** |
| Completeness | **B** | Generic product well covered; ops/legal/page specs thin until v0.2 | **A−** |
| Prioritization & feasibility | **D+** | 150+ requirements, 46 ideas, 60 levels for a small team | **B** |
| Accuracy of competitor claims | **C** | Five errors or overstatements found (below) | **B+** |
| Metrics rigor | **C** | rWPM seeded from a prose-only dataset; PTI false precision | **B** |
| Business realism | **C−** | Assumed subscription revenue; didn't examine low willingness to pay | **B** |
| Legal/licensing | **D** | Missed GPL/AGPL and dataset-terms issues | **B+** |
| Risk honesty | **B** | Flagged assumptions, but missed the "does training work?" risk | **B+** |
| Programmer track | **B** | Strong ideas; novelty overstated; needed gating | **B+** |
| Usability of the docs | **C+** | Two overlapping docs; long | **B** |

*v1.0 can't honestly be an "A" until primary research (interviews, prototype tests) exists. The master spec makes that its first phase.*

### Top 10 findings
1. **Premise risk (critical):** trained typists are only ~5 WPM faster than untrained (small effect), and I found no randomized evidence for typing apps. Build efficacy measurement in; promise diagnosis and practice, not guaranteed speed.
2. **No primary research (critical):** all requirements came from reviews and articles. Review sites skew negative and kid-heavy. Interviews come first.
3. **Overscoped (high):** cut to a strict MVP with a kill list.
4. **rWPM was seeded wrongly (high):** the public dataset is English prose sentences (≤ 70 characters, few digits, simple punctuation). It can't model code or symbols. Also, the hand/finger bigram features I planned to use weren't selected by the published Typability Index.
5. **Licensing blind spot (high):** Monkeytype is **GPL-3.0**; Keybr is AGPL (verify); the dataset is "for scientific use."
6. **Monetization optimism (high):** typing users pay little ($5 ad-free, ~$14 lifetime); Monkeytype relies on optional ads/donations.
7. **Wrong "nobody does this" claims (medium):** Keybr *does* have multiplayer; VimGolf already does edit-golf (Vim-only); symbol/camelCase drills already exist on many small sites.
8. **PTI single score (medium):** false precision → deferred.
9. **Architecture overbuilt for MVP (medium):** Redis/queues/sockets aren't needed until leaderboards and races.
10. **Programmer demand is real but specific (positive):** Keybr users asked for numbers/symbols/caps lessons for programming; Monkeytype users ask for an IDE-style code mode.

---

## 2. Method and Limits

**What I did (this round)**
- Read the primary CHI 2018 paper (136M keystrokes) and the 2026 Typability Index paper end to end.
- Checked competitor licenses, features, pricing signals, and cheating tools.
- Read review pages (Trustpilot, Common Sense, SmartCustomer, AlternativeTo), GitHub discussions/issues, and a Keybr user thread.
- Searched for gaps I had claimed (naming/number drills, edit-golf) and for evidence on training efficacy.

**Limits (be careful with these conclusions)**
- I can't read Reddit/Discord directly, so community sentiment is under-sampled.
- Review sites skew negative; TypingClub/Nitro Type reviewers are often school-assigned children.
- Some sources are competitor or voice-dictation vendors with incentives; I flagged and mostly excluded them.
- Several pages are dated (e.g., a 2018 Keybr thread, the 1999 IBM study).
- I didn't verify prices on official pricing pages; several come from competitor blogs.
- Absence of evidence in my search is not proof that no evidence exists.

---

## 3. Claim-by-Claim Validation

| # | Claim (from v0.1/v0.2 or common belief) | Verdict | Evidence |
|---|---|---|---|
| 1 | Ads/upsells and rigid gates are major complaints (TypingClub, Nitro Type) | **✓✓ Validated** | Trustpilot/Common Sense reviews |
| 2 | 10FastFingers text is easier/unrealistic | **✓✓ Validated** | Top-200 common words, no punctuation |
| 3 | "10–30% score inflation" | **~ Unverified** | Forum anecdote → removed from spec |
| 4 | Monkeytype doesn't teach | **✓ Validated** | Reviews describe it as a test tool |
| 5 | Monkeytype isn't adaptive at all | **✗ Corrected** | Has a "practice missed/slow words" option → *partial* |
| 6 | Monkeytype code mode isn't real code; users want IDE-style | **✓✓ Validated** | Feature request discussion #7114 (user-stated) |
| 7 | Monkeytype has multiplayer | **~ Unconfirmed** | A "Tribe" beta was mentioned earlier; a Jan 2026 discussion still asks for multiplayer |
| 8 | Monkeytype is "open source" (implication: reusable) | **✓ Validated, with a catch** | **GPL-3.0** → can't be copied into closed-source |
| 9 | Keybr has little/no competition mode | **✗ Rejected** | A review describes Keybr multiplayer |
| 10 | Keybr lacks integrated punctuation/number/symbol lessons | **✓ Validated (dated)** | 2018 user thread; enabling them lowers averages |
| 11 | "Nobody trains symbols or camelCase" | **✗ Rejected** | Several small sites offer bracket/symbol/camelCase drills |
| 12 | "No edit-efficiency (golf) tool exists" | **✗ Rejected** | VimGolf (since 2010; Vim-only) |
| 13 | Number-systems typing is unserved | **~ Plausible** | Found conversion quizzes (Khan Academy), not typing drills; absence not proven |
| 14 | Composition is slower than copying (33 vs 19 WPM) | **✓ Validated, dated** | 1999 IBM study via secondary sources |
| 15 | Typing lessons raise speed | **~ Weak** | Trained ≈ +5 WPM (d = 0.27), cross-sectional; no RCT found |
| 16 | Rollover correlates with speed | **✓✓ Validated** | r = 0.73 in CHI 2018 |
| 17 | Text difficulty matters and is modelable | **✓✓ Validated** | Typability Index explains 68–88% of variance |
| 18 | Seed rWPM from the 136M dataset | **✗ Rejected (for code)** | Prose sentences only; "scientific use" terms |
| 19 | Same-finger/hand-alternation classes should drive the difficulty model | **✗ Not supported** | Typability Index didn't select those features |
| 20 | "Average typist ≈ 52 WPM" as a benchmark | **~ Biased** | Self-selected typing-site users; 72% had a typing course; 68% US |
| 21 | Cheating is a real problem | **✓✓ Validated** | Cheat tools for 10FF and Monkeytype; Nitro Type bot complaints; TypeRacer post |
| 22 | Ratatype has ads/upsell | **✓ Validated** | Common Sense: occasional intrusive ad for ~$5 ad-free |
| 23 | Certificates are a value driver | **~ Weak** | A reviewer wasn't sure where to use it |
| 24 | Users will pay for a Pro subscription | **~ Unvalidated / doubtful** | $5 ad-free; ~$14 lifetime (competitor claim); donations |
| 25 | Programmers need numbers/symbols/caps lessons | **✓ Validated** | Keybr thread: users "forced to use other websites" |
| 26 | Non-US layouts make symbols awkward | **✓ Validated** | Layout community write-ups |
| 27 | Programmer typing speed predicts job performance | **✗ Not supported** | No credible universal threshold found |
| 28 | "Code is ~30% non-letters vs ~5% for prose" | **~ Unverified (vendor)** | Not used for requirements |
| 29 | "Coders average 30–45 WPM on code" | **~ Unverified (vendor)** | Informal poll |
| 30 | "RSI affects 50–60% of programmers" | **✗ Dropped** | Dubious vendor stat |
| 31 | "Monkeytype ≈ 4.4/5 on Trustpilot" | **~ Unverified** | Dropped |
| 32 | "TypingClub premium ≈ $78/yr" | **~ Conflicting** | Listings differ; treat as unverified |

---

## 4. Defects Found (With Fixes)

| ID | Sev. | What was wrong | Fix in v1.0 |
|---|---|---|---|
| D1 | **Critical** | Core promise ("makes you faster") not supported by evidence | §1.3 premise check; built-in efficacy measurement (ANA-09, §6.6); modest claims |
| D2 | **Critical** | No primary user research | R0 validation phase; E1–E10 experiments; go/no-go gates |
| D3 | **High** | Overscoped (150+ reqs, 46 ideas, 60 levels) | 12-item MVP, kill/defer list, levels 1–30 first |
| D4 | **High** | rWPM seeded from a prose-only dataset; wrong feature assumptions | Staged plan: difficulty **bands** → rWPM beta after our own data → code model later; use Typability Index feature families |
| D5 | **High** | Licensing blind spots (GPL-3.0, AGPL, dataset terms) | §9.2 register; clean-room policy (CNT-07); open-source decision §10.4 |
| D6 | **High** | Monetization optimism | §10 reality check; low-cost infra; supporters first; B2B pilot |
| D7 | Medium | Competitor errors (Keybr multiplayer, VimGolf, symbol drills, Monkeytype adaptivity) | Corrected in §2.3–2.4; commodity vs open space |
| D8 | Medium | PTI single composite index | Deferred; show profile (radar + ladder) |
| D9 | Medium | Architecture overbuilt for MVP | "Boring first" stack by phase (§9.1) |
| D10 | Medium | Public leaderboards before integrity layer | INT-10 policy; boards deferred to V1 |
| D11 | Medium | Vendor-source contamination | Vendor claims excluded from requirements; flagged in sources |
| D12 | Medium | Benchmarks biased upward | SC-10; labeled benchmarks; own cohorts later |
| D13 | Medium | Arbitrary level thresholds; no content plan | §6.5 marked "calibrate"; §7.4 generation strategy |
| D14 | Medium | Novelty overstated in programmer track | Demoted Edit Golf to V2 with a differentiation requirement; symbol drills labeled commodity |
| D15 | Low | Two overlapping docs and IDs | One master spec; IDs restart |
| D16 | Low | No page-level website spec | §4 sitemap + page specs + flows |
| D17 | Low | Timer/browser realities not spelled out | ENG-04 (hidden-tab throttling), ENG-10 (autocorrect), §6.1 timing precision |

---

## 5. Does Typing Training Actually Work? (Premise Check)

**Evidence for a modest effect**
- Trained typists averaged ~5 WPM faster than untrained (d = 0.27, "relatively small"), but the sample was self-selected users of a typing site (72% had taken a course). The comparison is observational, not causal. `[Aalto-CHI18]`
- In a small lab study (n = 60), the best performers had taken a class **and** aimed to type quickly in daily life; the authors suggest everyday typing can still improve if people push themselves. `[KeithEricsson-2007]`
- The CHI authors suggest **personalized, technique-aware training** (e.g., training rollover) might help non-touch typists, but that's a hypothesis. `[Aalto-CHI18]`

**Evidence against big promises**
- Untrained typists can be as fast as trained ones; keypress duration barely differs between slow and fast; speed differences live in inter-key timing. `[Aalto-CHI18]`
- I found **no RCT-quality evidence** that consumer typing apps raise adult speed. (The randomized studies that surfaced were about other populations/tasks.)
- For programmers, no credible universal speed threshold exists, and much of the work is reading/thinking. `[Prog-Articles]`

**What this means**
| Implication | Action |
|---|---|
| We can't claim guaranteed speed gains | Sell **diagnosis + practice + honest measurement** |
| Efficacy is our biggest unknown | **Baseline/retest + holdout A/B** from day one (ANA-09) |
| Speed isn't the only outcome | Track accuracy, symbol error rate, recall, comfort |
| Intent matters | Goal-setting, push challenges (LRN-06) |
| "Publish our results" can differentiate | Public efficacy stats with caveats |

---

## 6. What Reviews Say, Per Competitor

| Site | Users like | Users dislike | Lesson for us |
|---|---|---|---|
| **Monkeytype** | Minimal, fast, customizable, free | Doesn't teach; code mode is word lists; wants IDE-style, multiplayer | Add coaching and real code; respect the minimal feel |
| **Keybr** | Adaptive per-key lessons; ad-free option cheap | Punctuation/caps/numbers not integrated; averages drop when enabled; wants control over prioritized letters, typo visualization | Separate averages per content type; user control; typo arrows |
| **TypingClub** | Structure for beginners; accessibility work | Ads/upsell pop-ups, rigid pass marks, kid-oriented, weak feedback | No popups; flexible mastery; adult path |
| **Ratatype** | Clear progressive lessons; certificate; many layouts | Ads in free tier; fixed time limits; extra buttons between levels | Auto-advance; no-timer option; certificate value unclear |
| **Nitro Type** | Motivating races, teams | Cheaters/bots; teaches little; monetization gripes | Accuracy-aware racing; integrity first |
| **10FastFingers** | 50+ languages; contests; custom text | Unrealistic text; weak progress tracking | Realistic default text; strong history |
| **TypeRacer** (thin evidence) | Live races | Cheating disputes, ban disputes | Transparent appeals |
| **Typing.io / SpeedTyper** (thin evidence) | Real code, races | Fixed snippets; limited analytics | Depth + analytics |

---

## 7. Change Log (v0.1/v0.2 → v1.0)

**Kept:** pain-point mapping; personas; principles/anti-goals; typing engine/analytics/anti-cheat concepts; token-class idea; 12-tier level ladder; programmer baseline; privacy stance; risk table.

**Changed**
- rWPM → staged (difficulty bands first; multiplier only after our own data).
- MVP → a 12-item cut; leaderboards/races moved to V1.
- Levels → MVP ships L1–30 in two slices.
- Architecture → "boring first" stack.
- Competitor table → corrected (Keybr multiplayer, Monkeytype GPL/adaptivity/multiplayer status, VimGolf).
- Monetization → supporters first, Pro as a test, B2B pilot.
- Benchmarks → labeled as biased.

**Cut / deferred:** PTI; Edit Golf (to V2 with a differentiation requirement); consumer subscription as a plan; exam/Indic module (validate first); browser extension; native apps.

**Added:** premise check (§1.3); efficacy measurement (§6.6); licensing register (§9.2); assumption register (§1.8); validation plan (§13); website sitemap and page specs (§4); ops requirements folded into the main spec; timing/browser realities; Keybr-derived features (typo arrows, user control over prioritized items, separate averages); Ratatype-derived features (auto-advance, no-timer).

---

## 8. What's Still Uncertain (and how to find out)

| Uncertainty | Experiment |
|---|---|
| Do people want a diagnose→drill loop enough to switch? | E1 interviews, E2 waitlist |
| Do adaptive natural-text drills beat random text? | E7 A/B |
| Will programmers use token-class training weekly? | E2 by persona; E4 concierge test |
| Does a difficulty band help or confuse? | E5 comprehension test, E6 ranking check |
| Will anyone pay or support? | E9, E10 |
| Can we keep false positives low in anti-cheat? | E8 |
| Can input latency meet the target across browsers? | E3 |

**Recommended first move:** run R0 (two weeks) before writing production code.

---

## 9. Sources

(Full list with URLs is in Appendix C of `typing-website-master-spec-v1.md`.)

**Primary/scientific:** Dhakal et al. CHI 2018 (136M keystrokes); Williams et al. 2026 Typability Index; Keith & Ericsson 2007; Karat et al. 1999 (secondary summaries).
**Reviews/feedback:** Trustpilot, Common Sense (Ratatype, TypingClub, Nitro Type), SmartCustomer, AlternativeTo, GitHub discussions/issues (Monkeytype, Keybr), Keybr Google Group thread, CosmicKeys/TypingDoneWell/GeniusFirms reviews.
**Competitors/tech:** Monkeytype repository/licensing pages, SpeedTyper.dev, Typing.io, SpeedCoder, Speed(t)Code, VimGolf, KeyCombiner, ShortcutFoo, Tree-sitter, codemirror-vim, layout community write-ups.
**Vendor/competitor blogs (context only):** TypeQuicker, TypingFastest, TypingTestGo, Blabby, VoiceDash, Voibe.
