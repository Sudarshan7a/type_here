# RealType — Master Product & Requirements Specification v1.0

**Status:** Draft 1.0 — ready for a validation sprint (see §13)
**Date:** 19 Sep 2026
**Supersedes:** `typing-website-requirements.md` (v0.1) and `typing-website-programmer-track.md` (v0.2)
**Companion:** `typing-website-audit-report.md` (what was wrong with v0.1/v0.2, what was validated or rejected, what changed)

**How to read this document**
- **[MVP]** first public release · **[V1]** next · **[V2]** later · **[LATER]** only if validated
- Evidence strength: **✓✓** multiple independent sources · **✓** one credible source · **~** weak/anecdotal · **✗** rejected · **A** assumption · **H** hypothesis to test
- Source keys like `[Aalto-CHI18]` map to Appendix C.
- Requirement IDs restart in this document; old IDs are retired.
- All numeric targets (latency, thresholds, weights) are **proposals to calibrate**, not facts.

**Contents**
1. Product definition
2. Evidence base
3. Scope and releases
4. Website information architecture and page specs
5. Functional requirements
6. Metrics specification
7. Programmer track (language-agnostic design)
8. Non-functional requirements
9. Architecture, data, security, reuse/licensing
10. Business model and go-to-market
11. Roadmap, definition of done, launch checklist
12. Risks
13. Validation plan
14. Open decisions
- Appendix A: Pain point → requirement traceability
- Appendix B: Glossary
- Appendix C: Sources

---

## 1. Product Definition

### 1.1 One-liner
A typing trainer that shows **what actually slows you down** in real typing (prose, code, numbers), gives you **targeted practice**, and measures progress **honestly**. It includes a **language-agnostic track for programmers** (symbols, number systems, naming styles, recall).

### 1.2 The problem (evidence-based)
1. **Tests measure; courses teach; few connect diagnosis → targeted practice → retest.** Monkeytype users describe it as a test tool, not a teacher; TypingClub is a fixed course. ✓✓ `[MT-Reviews]` `[TC-Reviews]`
2. **Defaults are often unrealistic.** 10FastFingers uses very common words without punctuation. ✓✓ `[10FF-Reviews]`
3. **Programmers are under-served.** Monkeytype's code mode is a word list rather than real structured code, and users are asking for an IDE-style mode. ✓✓ `[MT-7114]` Keybr users asked for lessons on numbers, symbols and capitals for programming students and said they were "forced to use other websites." ✓ `[Keybr-Group-2018]`
4. **Trust and friction dominate complaints:** ads/upsells, rigid pass marks, cheating. ✓✓ `[TC-Reviews]` `[NT-Reviews]` `[Cheat-Tools]`
5. **Text difficulty changes speed**, so scores on different text aren't comparable. A 2026 peer-reviewed model explains 68–88% of the variance in sentence typability. ✓✓ `[Typability-2026]`

### 1.3 Reality check on the premise (read this)
- **Training's measured benefit is modest.** In 136M keystrokes from ~169k volunteers, trained typists were ~5 WPM faster than untrained (small effect, d = 0.27), and untrained typists can be as fast. The sample was self-selected typing-site users (72% had taken a course). ✓✓ `[Aalto-CHI18]`
- **I found no randomized evidence** that consumer typing apps (adaptive or not) raise adult typing speed. Treat "improves your speed" as an **unproven claim we must test ourselves**. (Absence of evidence in my search, not proof of absence.)
- **Intent matters.** In one lab study (n = 60), top performers had both taken a typing class *and* adopted the goal of typing quickly in everyday typing. ✓ `[KeithEricsson-2007]`
- **For programmers, no credible universal typing-speed threshold exists**, and reading/thinking take most of the time. `[Prog-Articles]` (mixed vendor/non-vendor sources)

**Consequences for the product**
1. Promise **diagnosis and practice**, not guaranteed speed gains.
2. Build **efficacy measurement** into the product (holdouts, before/after baselines) and publish it.
3. Target **workflow friction** (accuracy, symbols, recall, editing), not only WPM.
4. Keep **costs low**, because willingness to pay is uncertain (§10).

### 1.4 Personas and jobs-to-be-done
| ID | Persona | Job to be done | Priority |
|---|---|---|---|
| P1 | **Upgrader** (30–70 WPM; studies/works on a keyboard) | "Find out why I plateau and fix it in 15–20 min/day" | **Primary** |
| P2 | **Developer / CS student** | "Stop fumbling symbols, numbers and brackets; be fluent in any language" | **Primary** |
| P3 | **Adult re-learner** (hunt-and-peck) | "Learn touch typing without kid-style lessons" | Secondary |
| P4 | **Competitor** (100+ WPM) | "Trusted rankings and deep analytics" | Secondary |
| P5 | **Accessibility-first user** | "Practice with one hand / screen reader / dyslexia-friendly settings" | Cross-cutting |
| P6 | **Coach / bootcamp / teacher** | "Assign practice and see progress" | [V2] |
| P7 | **Exam aspirant** (net-speed rules, Indic layouts) | "Exam-style practice" | [LATER] validate first |

### 1.5 Table stakes vs differentiators
| Table stakes (must match) | Differentiators (must win) |
|---|---|
| Instant start, clean UI, no signup wall | **Diagnose → drill → retest loop** using natural text |
| Themes, fonts, caret, focus mode | **Programmer token-class track** (symbols, numbers/IDs, naming, recall) |
| Custom text, quotes, time/word modes | **Honest metrics** (difficulty bands now; normalized score later) |
| Layouts (QWERTY, Dvorak, Colemak…) | **Trusted results** (server-verified, transparent, appealable) |
| Stats history, keyboard heatmap | **Respectful UX** (no popups, no pay-to-win) |
| Free core, low/no ads | **Public efficacy stats** ("does it work?") |

Note: symbol and camelCase drills already exist on several small sites (commodity). ✓ `[Code-Sites]` Differentiation must come from depth, analytics, curriculum, recall and honesty, not from having a "symbols page."

### 1.6 Principles and anti-goals
**Principles**
1. Type first: the landing page *is* the test.
2. Honest numbers: explain how every score is computed.
3. Diagnose, then prescribe.
4. Fair play is a feature.
5. Your data is yours: export/delete anytime, minimal retention.
6. Accessible by default; keyboard-first.
7. Fast: the core test works even if the backend is down.

**Anti-goals (we will not)**
- Show ads or upsell popups during typing or between exercises.
- Sell paid competitive advantages.
- Gate progress on a single attempt or one WPM point.
- Force kid-themed games on adults.
- Shame users for missed streaks.
- Sell or share raw keystroke data.
- Copy GPL/AGPL code or content into a closed-source product (§9.2).
- Claim that the product improves programming ability, hireability, or health outcomes.
- Launch public leaderboards before the integrity layer exists (INT-10).

### 1.7 Success metrics
| Type | Metric |
|---|---|
| **North star** | % of users practicing ≥ 3 days/week whose **targeted weakness improves** over 30 days (vs holdout) |
| Efficacy | 30-day within-user change in net WPM / symbol error rate for the *same content type*, adaptive vs random-text control |
| Activation | % of visitors finishing a first test; % opening the weak-spot report; % starting a drill |
| Retention | D1 / D7 / D30 |
| Quality | Drill completion; replay views; goal attainment |
| Integrity | % results flagged; false-positive rate |
| Performance | Input-to-paint p95; API p95; crash-free sessions |
| Business | Supporter/Pro conversion; refunds/cancellations; support tickets per 1k users |
| Satisfaction | In-app rating; feedback themes; monthly "typing friction" survey |

### 1.8 Assumption register (test before scaling)
| # | Assumption | How to test | Pivot signal (set numbers before testing) |
|---|---|---|---|
| A1 | People want a diagnose→drill loop beyond current sites | 10–15 interviews; landing-page waitlist | Low interest / few would switch |
| A2 | Adaptive natural-text drills beat random text | A/B holdout in beta | No measurable difference |
| A3 | Programmers value token-class training | Waitlist by persona; interview probes | P2 interest ≪ P1 |
| A4 | Users understand and value difficulty-aware scores | Prototype tests | Confusion or indifference |
| A5 | Users will pay or support | Supporter link; Pro test; 1–2 B2B pilots | Near-zero conversion |
| A6 | Cheating is manageable | Beta with private boards first | High flag rate |
| A7 | Opt-in keystroke research consent is acceptable | Opt-in rate | < ~10% opt-in blocks calibration |
| A8 | Real-world default text doesn't demotivate | A/B default mode | Higher churn |

---

## 2. Evidence Base

### 2.1 Science facts we design on
| ID | Finding | Design implication |
|---|---|---|
| SC-1 | Speed differences live in **inter-key interval (IKI)**, not key-hold time (fast ≈ 120 ms IKI vs slow ≈ 480 ms; key durations similar) `[Aalto-CHI18]` | Track IKI/bigrams; don't optimize press duration |
| SC-2 | **Rollover** (next key pressed before release) correlates strongly with speed (r = 0.73); fast typists use it on 40–70% of keystrokes; slow ≈ 8% `[Aalto-CHI18]` | Log keydown **and** keyup; show rollover ratio; experimental training **[H]** |
| SC-3 | Faster typists make and correct fewer errors; substitution errors are most common; small error reductions can give large speed gains `[Aalto-CHI18]` | Accuracy-first; net speed as headline |
| SC-4 | Hand alternation helps most typists a little (5–20 ms) but slow typists show the opposite `[Aalto-CHI18]` | Personalize; don't assume one pattern |
| SC-5 | Trained ≈ +5 WPM vs untrained (d = 0.27); self-taught can match; finger count correlates (r ≈ 0.38) `[Aalto-CHI18]` | Technique coaching is optional and outcome-based |
| SC-6 | **Typability** is predictable from text features (lowercase share, word frequency, bigram frequency, right-side keys ↑; total keystrokes, syllables/word, symbol share, non-dictionary words ↓). Hand/finger bigram relations were *not* selected `[Typability-2026]` | Score text difficulty with a transparent model; limited to English prose |
| SC-7 | Copy typing (~33 WPM) vs composition (~19 WPM) in a **1999** IBM study `[Karat-1999]` | Composition mode and transfer ratio; treat numbers as directional (dated) |
| SC-8 | Goal-directed practice associates with better performance (n = 60) `[KeithEricsson-2007]` | Goal setting, push challenges |
| SC-9 | Keystroke timing can identify people (biometrics research) `[Aalto-CHI18]` | Treat logs as sensitive: consent, expiry, minimization |
| SC-10 | Dataset caveats: self-selected typing-site users, 68% US, mean age 24.5, ~10–15 ms timestamp precision `[Aalto-CHI18]` | Benchmarks skew upward; use `performance.now()` |

### 2.2 Review-validated pain points
Legend: ✓✓ multiple sources · ✓ credible source · ~ weak. (Review sites skew negative and TypingClub/Nitro Type reviewers are often school-assigned kids.)

| ID | Pain point | Strength | Where |
|---|---|---|---|
| PP-01 | Ads/upsells interrupt practice | ✓✓ | TypingClub, Nitro Type, Ratatype free tier `[TC-Reviews]` `[NT-Reviews]` `[Ratatype-CS]` |
| PP-02 | Rigid pass thresholds; single attempt decides | ✓ | TypingClub `[TC-Reviews]` |
| PP-03 | Childish/slow for adults; forced games | ✓ | TypingClub, Nitro Type |
| PP-04 | Fixed curriculum (beginners *like* structure; adults want adaptivity/skip) | ✓ | TypingClub, Ratatype `[Ratatype-TP]` |
| PP-05 | Tests don't teach; no technique/finger guidance | ✓ | Monkeytype `[MT-Reviews]` |
| PP-06 | Keybr: punctuation/caps/numbers not integrated into lessons; enabling them lowers averages | ✓ (dated) | Keybr `[Keybr-Group-2018]` |
| PP-07 | Easy/unrealistic default text | ✓✓ | 10FastFingers `[10FF-Reviews]` |
| PP-08 | Cheating/bots; disputed bans | ✓✓ | 10FF, Monkeytype, Nitro Type, TypeRacer `[Cheat-Tools]` `[TypeRacer-Blog]` |
| PP-09 | Racing rewards speed over accuracy; teaches little | ✓ | Nitro Type `[NT-Reviews]` |
| PP-10 | Monetization friction; low-value premium | ✓ | TypingClub `[TC-Reviews]` |
| PP-11 | Weak post-test feedback (what did I mistype?) | ✓ | TypingClub; Keybr users want typo arrows on the keyboard `[Keybr-Issues]` |
| PP-12 | Lag/heavy pages | ~ | TypingClub |
| PP-13 | Progress tracking gated or weak | ~ | TypingClub; 10FF `[10FF-Reviews]` |
| PP-14 | No integrated multiplayer on the minimal test sites **(unconfirmed: a "Tribe" beta existed; a Jan 2026 discussion still asks for it)** | ✓ | Monkeytype `[MT-7452]` `[MT-4314]` |
| PP-15 | Transcription ≠ composition; transfer unmeasured | ✓ (dated) | All `[Karat-1999]` |
| PP-16 | Accessibility patchy outside school tools | ~ | Most test sites |
| PP-17 | No offline mode | ~ | TypingClub |
| PP-18 | Over-competitive design / frustration | ~ | Nitro Type |
| PP-19 | Code typing isn't real code; users want IDE-style, highlighting, custom code | ✓✓ | Monkeytype `[MT-7114]` |
| PP-20 | Fixed time limits and extra clicks between levels | ✓ | Ratatype `[Ratatype-TP]` |
| PP-21 | Certificate's real-world value unclear | ~ | Ratatype `[Ratatype-TP]` |
| PP-22 | No feedback channel | ~ | TypingClub |
| PP-23 | Keystroke data is sensitive | ✓ | Industry-wide `[Aalto-CHI18]` |
| PP-24 | Programmers need numbers/symbols/caps lessons; small code-drill sites exist | ✓✓ | Keybr users; code-drill sites `[Keybr-Group-2018]` `[Code-Sites]` |
| PP-25 | Non-US layouts make symbols awkward (e.g., AltGr braces) | ✓ | Layout community `[Layouts]` |
| PP-26 | Auto-pair/smart-quote editors muddy code-typing measurement | ~ | Articles `[Prog-Articles]` |

### 2.3 Competitive landscape (corrected)
| Tool | Key facts | Gap for us |
|---|---|---|
| **Monkeytype** | Free; **GPL-3.0** `[MT-License]`; optional ads/donations/Patreon/merch `[Pricing]`; friends/streak features exist; multiplayer unconfirmed; partial "practice missed/slow words"; code mode = word lists `[MT-7114]`; cheat bots exist `[Cheat-Tools]` | Coaching, real code, honesty about difficulty |
| **Keybr** | Adaptive per-key lessons; ads + optional premium (reported ≈ $14 lifetime, vendor source) `[Pricing]`; **has multiplayer** and custom text `[Keybr-Reviews]`; open-source (AGPL — verify) | Punctuation/symbol integration, programmer track, real text |
| **TypingClub** | Structured course; school-friendly; premium reported ≈ $8.50/mo (vendor) `[Pricing]`; heavy complaints about ads/upsell/gates `[TC-Reviews]` | Adult adaptivity, respectful UX |
| **Ratatype** | Mostly positive reviews (structure, certificate); free tier ads; ad-free ≈ $5 `[Ratatype-TP]` `[Ratatype-CS]` | Adaptivity, analytics |
| **10FastFingers** | Top-200/1000 words; 50+ languages; custom text; multiplayer; contests `[10FF-Reviews]` | Realism, tracking, anti-cheat |
| **TypeRacer / Nitro Type** | Racing communities; cheating disputes `[TypeRacer-Blog]` `[NT-Reviews]` | Accuracy-aware, verified, coaching |
| **Typing.io** | Real open-source code; symbols + backspace; freemium `[Typing.io]` | Curriculum, analytics |
| **SpeedTyper.dev** | Real OSS snippets; private races; leaderboard; **MIT** `[SpeedTyper]` | Depth, analytics, token classes |
| **SpeedCoder / Speed(t)Code** | Finger-guided code typing; LeetCode-style typing races `[SpeedCoder]` `[SpeedTCode]` | Same |
| **Small code-drill sites** (typer.training, OnlineTyping, TypingTest.now, TypeQuicker) | Symbol/camelCase/bracket drills, some claim analytics `[Code-Sites]` | Commodity — don't rely on it |
| **KeyCombiner / ShortcutFoo** | Shortcut flashcards with spaced repetition `[KeyCombiner]` | Situational tasks, typing fluency |
| **VimGolf** | Since 2010: edit text in fewest Vim keystrokes; includes naming-style and bitwise tasks `[VimGolf]` | Editor-agnostic, guided, browser-based |
| **Layout ecosystem** | Programmer Dvorak, symmetric-bracket layouts, AltGr layers `[Layouts]` | Trainers aware of *your* layout's symbol reach |

### 2.4 Commodity vs open space
- **Commodity (don't headline):** symbol/bracket drills, camelCase drills, Vim-style edit golf (VimGolf), shortcut flashcards, races, themes.
- **Open space (as far as found; absence not proven):** number-systems and ID typing, token-class analytics across languages, recall-by-typing for syntax/templates, difficulty-aware scoring, own-codebase drills (local), published efficacy data.

---

## 3. Scope and Releases

### 3.1 Release tiers
| Tier | Goal | Exit criteria (set targets before starting) |
|---|---|---|
| **R0 Validate** (≈ 2 weeks) | Prove demand and feasibility before heavy build | 10–15 interviews; waitlist test; input-latency prototype; license decision (§9.2) |
| **R1 MVP** (≈ 8–12 weeks full-time; ×2–3 part-time) | Ship the **core loop** to ~50–100 beta users | Loop works end-to-end; efficacy instrumentation on; no P0 bugs |
| **R2 V1** | Retention, trust, and social | Verified leaderboards, races, PWA, composition mode, stack packs |
| **R3 V2** | Specialize and monetize | Teams/coach, certificates (if validated), editor tasks, more languages |

### 3.2 MVP cut (the whole list)
1. Typing engine + shared metrics library (with golden tests)
2. Modes: Classic, Real-World Prose, Numbers/Symbols, custom text, **Code (3–5 languages)**
3. Results page (metrics, error review, weak spots, basic replay)
4. **Diagnose → drill loop** (key/bigram/token weakness map; one-click drill from natural sentences)
5. Progress: history, rolling averages per content type, goals/ETA, baseline test, light streak
6. **Programmer core:** token-aware engine, Symbol Gym, Bracket Balance, Strings & Escapes, Numbers/Number Systems/IDs, Naming Switcher, IDE-realism view, Recall (lite), Levels 1–30 in two slices
7. Guest-first (local storage) + optional accounts (email/Google/GitHub), export/delete
8. Server-side result verification (recompute, plausibility, signed sessions)
9. Efficacy instrumentation (holdout + before/after)
10. Ops minimum: legal pages, feedback widget, privacy-friendly analytics, basic admin, backups
11. Accessibility basics (contrast, scaling, reduced motion, no-timer practice)
12. Themes/fonts/layouts (5 layouts)

### 3.3 Kill / defer list (with reasons)
| Item | Decision | Reason |
|---|---|---|
| Public leaderboards | **Defer to V1** | Cheating incentive; integrity layer first |
| Real-time races | **Defer to V1** | Infra cost; not needed to prove the loop |
| Single "PTI" score | **Defer / drop** | False precision without calibration |
| Normalized rWPM multiplier | **Beta after data** | No code/symbol dataset; prose model only |
| Levels 31–60 | **V1/V2** | Validate demand for L1–30 first |
| Consumer subscription | **Test later** | Low willingness to pay in this market (§10) |
| Edit Golf (Vim/VS Code tasks) | **V2** | VimGolf exists; need an editor-agnostic angle |
| Browser extension | **LATER** | Privacy + review friction |
| Exam module (India) | **LATER** | Crowded, unvalidated |
| Native mobile apps | **LATER** | PWA first |

### 3.4 Dependencies
Typing engine → metrics library → results → weakness map → drills. Token engine (Tree-sitter) → token analytics → programmer levels. Verification (INT) → leaderboards. Baseline tests → efficacy instrumentation → publishable results.

---

## 4. Website Information Architecture and Page Specs

### 4.1 Sitemap
```
/                      Home = Test (default: 60 s Real-World Prose; Classic one click away)
/results/:id           Results
/replay/:id            Replay
/practice              Practice hub (all modes, presets)
/learn                 General learning path (placement, courses)
/code                  Programmer hub (levels map, packs, baseline)
/code/level/:n         Level drill screen
/baseline              Baseline tests (general / programmer)
/dashboard             Today plan, progress, weakness map
/profile/:user         Profile (public/private)
/leaderboards          [V1]
/race                  [V1]
/settings              Settings
/account               Sign in/up, export, delete
/support               Supporters / Pro [V1]
/how-we-calculate      Public metric definitions and model versions
/about  /roadmap  /changelog  /feedback
/help  /legal/*        FAQ; Terms, Privacy, Cookies, Licenses, DMCA
/blog                  SEO/education content
/admin                 Internal tools
```

### 4.2 Global UI rules
- **Header:** logo · Practice · Learn · Code · Dashboard · account. It fades while typing (focus mode).
- **Footer:** How we calculate · Roadmap · Changelog · Feedback · Privacy · Terms · Licenses.
- **Keyboard-first:** `Tab` = restart, `Esc` = command/menu, shortcuts documented on `/help`.
- **No modals or popups during typing.** Save prompts appear only *after* results and are dismissible.
- **States for every page:** loading (skeleton), empty (clear next action), error (retry), offline (banner; core test still works).
- **Persistence:** all settings persist locally first, sync when signed in [V1].

### 4.3 Page specs

**Home / Test `/`** [MVP]
- Purpose: start typing in one keystroke.
- Components: text area with caret; mode bar (time/words/quote/custom; Prose/Code/Numbers); live stats (optional); restart; difficulty badge.
- Actions: choose mode; change duration; open settings; view last result.
- AC: page interactive ≤ 1.5 s on mid-range phone (4G); first keystroke starts test; no network needed to complete a test.

**Results `/results/:id`** [MVP]
1. Headline: net WPM, accuracy; classic WPM shown alongside; text difficulty band.
2. Speed graph with error markers.
3. **"What to fix" card:** top 3 weak keys/bigrams/tokens + **Practice these** button.
4. Comparison vs your personal best and 7-day average *for this content type*.
5. Details: raw, consistency, KSPC, rollover ratio, burst; replay link.
6. Non-blocking "Save progress" (guests only).
- AC: "Practice these" starts a drill in ≤ 2 clicks; numbers match server recomputation.

**Replay `/replay/:id`** [MVP basic]
- Step through keystrokes, speed control, error highlights. [V1: heatmap overlay]

**Practice hub `/practice`** [MVP]
- Cards: Classic · Real-World Prose · Code · Numbers & Symbols · Custom text · Drills from my weaknesses · (V1: Composition, Endurance, Split-pane).

**Learn `/learn`** [MVP placement; V1 courses]
- Placement test → recommended path; skip-ahead; adult tone; optional games off by default.

**Programmer hub `/code`** [MVP]
- Sections: Baseline test · **Level map (60 levels; 1–30 live at MVP)** · Language/skin picker · Packs [V1] · "Train on my code" [V1] · Skill radar.
- AC: a new visitor can pick a language and start Level 1 in ≤ 3 clicks.

**Level drill `/code/level/:n`** [MVP]
- Drill text (generated/curated), live token feedback, star criteria, "almost there" state, next level.
- AC: pass rule = best 3 of last 5 (adjustable); auto-advance without extra clicks.

**Baseline `/baseline`** [MVP]
- General (3 min) and Programmer (10 min) tests; outputs a profile and recommended path; schedule re-test at 30 days.

**Dashboard `/dashboard`** [MVP]
- Today's plan (15/30 min), goal + ETA, trends (rolling averages per content type), weakness map (keyboard + token classes), streak, efficacy opt-in card.

**Profile `/profile/:user`** [MVP]
- Stats, PBs, activity calendar, badges; privacy toggles (public/private/hidden from boards).

**Leaderboards `/leaderboards`** [V1]
- Verified results only; segmented by mode/difficulty/language; accuracy floor; "how verification works" link.

**Race `/race`** [V1]
- Quick match by bracket, private rooms, reconnect, post-race coaching.

**Settings `/settings`** [MVP]
- Layout, theme, font, caret, focus mode, sounds [V1], error mode, auto-indent/autopair, accessibility options, data & privacy, notifications [V1].

**Account `/account`** [MVP]
- Sign in/up (email, Google, GitHub), sessions, export (CSV/JSON), delete account.

**Support `/support`** [V1]
- Supporters/Pro plans, transparent pricing, cancel anytime.

**How we calculate `/how-we-calculate`** [MVP]
- Formulas, model versions, changelog of metric changes, known limitations.

**About / Roadmap / Changelog / Feedback** [MVP]
- Public roadmap; feedback form; changelog.

**Help & Legal** [MVP]
- FAQ, keyboard shortcuts, Terms, Privacy, Cookies, content licenses/attribution, DMCA/takedown.

**Blog / SEO** [MVP-lite → V1]
- Guides such as "typing test for programmers," "typing hex/binary literals," "naming conventions typing drill." Each guide ends with a relevant drill.

**Admin `/admin`** [MVP-lite]
- Content CRUD, feature flags, user lookup, result review queue, feedback inbox.

### 4.4 Key flows
1. **First visit (P1):** land on test → results → "Your 3 weak spots" → drill (2 min) → retest → non-blocking save prompt.
2. **Programmer (P2):** choose "I code" → pick language → Programmer Baseline → Level 1 → analytics → daily plan.
3. **Returning:** dashboard → today's plan → drill → results → streak/goal update.

### 4.5 Results screen layout (mobile-first order)
Headline → graph → "What to fix" + Practice button → comparisons → details → save prompt.

### 4.6 Level map layout
Vertical path of 12 tiers; each tier shows 5 nodes (4 levels + boss); stars; locked/available states; "test out" button per tier; language skin chip at top.

---

## 5. Functional Requirements

Format: **ID [tag]** requirement. *AC:* acceptance criteria (MVP items). *Why:* pain point (PP) or science (SC).

### 5.1 ENG — Typing engine

- **ENG-01 [MVP]** Capture keydown/keyup with high-resolution timestamps and preserve event order, including overlapping keys. *AC:* a log replays to the exact final text; timestamps monotonic; unit tests use recorded fixtures. *Why:* SC-1, SC-2.
- **ENG-02 [MVP]** Render feedback within one frame with no network calls during a test. *AC (target):* input-to-paint p95 ≤ 16 ms on a reference laptop; measured in a CI harness. *Why:* PP-12.
- **ENG-03 [MVP]** Character states (correct/incorrect/extra/missed) and error modes: **free**, **must-correct**, **stop-on-error**. *[V1]* no-backspace (exam), word-locked. *AC:* unit tests per mode.
- **ENG-04 [MVP]** Start on first keystroke; end by timer/words/final char; handle focus loss and hidden-tab timer throttling using timestamps, not intervals. *AC:* backgrounding a tab cannot inflate speed.
- **ENG-05 [MVP]** One shared TypeScript metrics library used by client and server. *AC:* golden test vectors match on both.
- **ENG-06 [MVP]** Layout-aware input using `event.code`/`event.key`; dead keys; Caps/Shift; documented IME limits. *AC:* passes QWERTY (US/UK), Dvorak, Colemak, AZERTY, QWERTZ suites.
- **ENG-07 [MVP]** Verified sessions ignore `isTrusted=false` events and block paste/drop/autofill. *Why:* PP-08.
- **ENG-08 [MVP]** Basic replay from the log with speed control and error markers. *[V1]* heatmap overlay. *Why:* PP-11.
- **ENG-09 [MVP]** Track **typed vs auto-inserted** characters; toggles for auto-indent and auto-pair (off / on / partial). *Why:* PP-26.
- **ENG-10 [MVP]** Disable smart quotes/dash/autocorrect/capitalization in typing surfaces. *AC:* raw characters preserved.
- **ENG-11 [V1]** Optional editing-key realism (Ctrl+Backspace, Ctrl+Arrows) with efficiency metrics.
- **ENG-12 [V1]** Ghost caret (vs PB, friend, replay).
- **ENG-13 [V1]** Mobile soft-keyboard mode (experimental; separate metrics and leaderboards).

### 5.2 MOD — Test modes

- **MOD-01 [MVP]** **Classic:** time (15/30/60/120/custom), words, quotes, custom text (local paste/import). *Why:* table stakes.
- **MOD-02 [MVP]** **Real-World Prose:** mixed case, punctuation, digits, names, URLs; content from license-cleared or original sources; difficulty band shown. *Why:* PP-07.
- **MOD-03 [MVP]** **Code:** real structured snippets in 3–5 languages (initial: JavaScript/TypeScript/JSX, Python, Java, SQL, HTML/CSS); IDE-realism options (PRG-09). *Why:* PP-19.
- **MOD-04 [MVP]** **Numbers & Symbols:** digit rows/numpad, mixed alphanumerics, symbol rows.
- **MOD-05 [MVP]** **Baseline tests:** general (3 min) and programmer (10 min); results feed placement and efficacy tracking.
- **MOD-06 [V1]** **Composition:** prompt-based writing (email reply, explain-a-concept); measures composition speed, pauses, backspace rate; text not stored unless opted in. *Why:* PP-15, SC-7.
- **MOD-07 [V1]** **Endurance:** 5/10/30-minute sessions with fatigue curve.
- **MOD-08 [V1]** **Split-pane copying:** source pane + your pane (simulates copying from a document).
- **MOD-09 [V1]** Presets (save/share modes and settings).
- **MOD-10 [V2]** Dictation/transcription mode.
- **MOD-11 [LATER]** Exam simulator (rule packs). *Requires validation.*

### 5.3 LRN — Learning and adaptive practice

- **LRN-01 [MVP]** **Placement test** (≤ 3 min) with skip-ahead so adults aren't forced through beginner drills. *Why:* PP-03.
- **LRN-02 [MVP]** **Adaptive engine:** per-key and per-bigram proficiency; select **natural sentences** that maximize coverage of the user's weak items (pseudo-words optional); user can influence which items are prioritized; keep targeting weakest items after all keys are unlocked. *Why:* PP-04, PP-05; Keybr requests `[Keybr-Issues]`.
- **LRN-03 [MVP]** **Gradual unlocking** of capitals, punctuation, digits, symbols (max 2 new items at once by default) with **separate averages per content type**, so harder text doesn't "hose" your baseline. *Why:* PP-06.
- **LRN-04 [MVP]** **Flexible mastery:** thresholds adjustable; mastery = best 3 of last 5; "almost there" state; no-timer and auto-advance options. *Why:* PP-02, PP-20.
- **LRN-05 [MVP]** **Learn from errors:** list of confusions (typed vs expected), **typo arrows on the keyboard** map, one-click drill. *Why:* PP-11.
- **LRN-06 [MVP]** **Goals:** pick a target and weekly commitment; ETA from trend. *[V1]* reminders (opt-in). *Why:* SC-8.
- **LRN-07 [V1]** Beginner course (home row → all rows → numbers → symbols) with adult tone; games optional.
- **LRN-08 [V1]** Targeted drills: same-finger bigrams, hand-alternation, row jumps, shift combos. *Why:* SC-1.
- **LRN-09 [V1]** Burst and rhythm training (short sprints, pyramids).
- **LRN-10 [V1]** Plateau detection with reasoned suggestions.
- **LRN-11 [V1]** Daily plan generator (10/20/30 min).
- **LRN-12 [V1]** Spaced repetition for weak items.
- **LRN-13 [V2] [H]** **Rollover Lab (experimental):** drills that encourage overlapping keypresses on alternating bigrams for n-key-rollover keyboards; measured via rollover ratio. *Why:* SC-2 (training effect unproven).
- **LRN-14 [LATER]** AI coach grounded in the user's own stats; no medical claims.

### 5.4 PRG — Programmer track (design in §7)

**Platform**
- **PRG-01 [MVP]** **Token-aware engine:** tokenize snippets client-side (Tree-sitter WASM or lexer); log per-token timing, errors, class. *AC:* every keystroke maps to a token; per-class results available for ≥ 3 languages at MVP. `[Tech]`
- **PRG-02 [MVP]** **Language packs:** initial 3–5 languages; add via grammars.
- **PRG-03 [MVP]** **Layout-aware symbol maps** including Shift/AltGr layers; OS profiles (Ctrl vs Cmd, `/` vs `\`). *Why:* PP-25.
- **PRG-04 [MVP]** **Safety:** snippets display-only; sanitized rendering; **never execute** user or library code.
- **PRG-05 [MVP]** **Positioning guardrail:** UI/marketing copy never claims improved programming ability or hiring outcomes; claims limited to "input fluency and less friction."

**Modes (idea numbers from v0.2 in parentheses)**
- **PRG-10 [MVP]** Symbol Gym (ID-02): categories, multi-char "chords," symbol-of-the-day, weakness weighting.
- **PRG-11 [MVP]** Bracket Balance (ID-03): nesting ladder; open→close latency; auto-pair off/on/partial.
- **PRG-12 [MVP]** Strings & Escapes (ID-06).
- **PRG-13 [MVP]** Numbers (ID-10) and **Number Systems & IDs** (ID-07, ID-09): decimal/float/scientific/underscored, hex/binary/octal/colors; deterministic synthetic UUID/SHA/base64/IP/CIDR/MAC/ISO dates/semver. *No real secrets.*
- **PRG-14 [MVP]** Naming Style Switcher (ID-12): snake/camel/Pascal/kebab/SCREAMING/dot notation; switch-cost metric.
- **PRG-15 [MVP]** IDE-Realism view (ID-15): multi-line editor, syntax highlighting on/off, monospace fonts/ligatures, indent guides, auto-indent toggle. *Why:* PP-19.
- **PRG-16 [MVP-lite → V1]** Recall Mode (ID-25): show snippet for N seconds, hide, type from memory; **V1** adds spaced-repetition scheduling.
- **PRG-17 [MVP]** Programmer Baseline (ID-42) with 30-day retest.
- **PRG-18 [MVP]** Levels 1–30 (§7.3) with boss levels, stars, placement, test-out.
- **PRG-19 [V1]** Levels 31–60; **Terminal Mode** (ID-18); **Data-Format Mode** (ID-19); **Autocomplete-Aware Mode** (ID-16); **Stack Packs** (ID-34); **Train on Your Own Code** (ID-33, local-only, secret-scanned, ephemeral by default); **Polyglot Relay** (ID-30); **Error Fingerprints** (ID-43); **Compile-Safe Rate** (ID-45); **Dev Prose Pack** (ID-46); **Template Blitz** (ID-26); **Layout Lab** (ID-36); Chord Trainer (ID-04); Regex Gym (ID-05); Convention Packs (ID-13).
- **PRG-20 [V2]** **Edit Tasks** (editor-agnostic; VS Code/JetBrains/Vim keymaps; par scoring) and **Situational Shortcuts** (ID-21, ID-22); Bug Hunt (ID-27); Vim/Emacs Gym (ID-23); Snippet Expansion (ID-17); Style-Guide Drills (ID-14); Config & DevOps files (ID-20); Encodings (ID-11); Bit-Twiddle Typing (ID-08).
- **PRG-21 [LATER]** Assessment Simulator (ID-29, practice only); Layout Advisor (ID-37); Ergonomic Load View (ID-38); Community Packs (ID-35); Pair Race/Relay (ID-39); Language Leagues (ID-40); Bootcamp mode (ID-41); AI Symbol Coach (ID-44).

### 5.5 ANA — Analytics and insights

- **ANA-01 [MVP]** Results screen per §4.3 (net WPM, accuracy, difficulty band, graph, weak spots, comparisons).
- **ANA-02 [MVP]** **Keyboard heatmaps:** per-key speed and error rate; per-finger/hand (standard map, adjustable); Shift/AltGr layers; **typo arrows** (intended → typed key). *Why:* PP-05, PP-11.
- **ANA-03 [MVP]** **Bigram/trigram table:** slowest and most error-prone sequences; same-hand vs alternate-hand comparison. *Why:* SC-1.
- **ANA-04 [MVP]** **Trends:** rolling averages **per content type**, PB history, practice minutes; show a noise band (median of last 5) so users don't over-read one test.
- **ANA-05 [MVP]** **Token-class dashboard:** speed and accuracy per class; Symbol Fluency Ratio; symbol error rate + confusion matrix (§6.4).
- **ANA-06 [MVP]** **Level Ladder**, **skill radar**, and **Next Best Drill** (weakest dimension weighted by frequency in the chosen language/stack).
- **ANA-07 [MVP]** Goal tracking with ETA from trend.
- **ANA-08 [MVP]** Export (CSV/JSON) and full deletion. *Why:* PP-23.
- **ANA-09 [MVP]** **Efficacy instrumentation:** day-0 baseline, day-30 retest (matched difficulty), optional holdout assignment, anonymized aggregate reporting. *Why:* §1.3.
- **ANA-10 [V1]** Error taxonomy: substitution (adjacent-key vs other), omission, insertion, transposition, capitalization, punctuation.
- **ANA-11 [V1]** IKI distribution, correction-time share, pause analysis, fatigue curve. *(KSPC and rollover ratio are MVP details.)*
- **ANA-12 [V1]** Percentiles vs a similar-level cohort (aggregated; note sample bias).
- **ANA-13 [V1]** Weekly report (in-app; email opt-in).
- **ANA-14 [V1]** Programmer extras: bracket pair latency, indentation drift, naming switch cost, language-switch cost, compile-safe rate, think/type ratio.
- **ANA-15 [LATER]** Public read API, webhooks, embeddable badges.

### 5.6 CNT — Content system

- **CNT-01 [MVP]** Corpus pipeline with **license tracked per item**, dedupe, sensitive-content filter, tags (mode, language, difficulty, domain).
- **CNT-02 [MVP]** **Typability score (prose) → difficulty band** (§6.2), validated against our own users' speeds.
- **CNT-03 [MVP]** **Weakness-targeted selection by retrieval** (pick natural sentences that cover the user's weak items). *Why:* PP-06.
- **CNT-04 [MVP]** **Code snippet library:** permissive licenses only (MIT/Apache/BSD/public domain), attribution stored, syntax-validated, size-bounded, language-tagged.
- **CNT-05 [MVP]** Seeded generators for numbers, IDs, naming, bracket structures, strings (Tiers 1–7). *No real data.*
- **CNT-06 [MVP]** Attribution page and takedown process.
- **CNT-07 [MVP policy]** Do **not** import Monkeytype word lists/quotes (GPL-3.0) unless the project itself is GPL-compatible; use original, public-domain, or permissively licensed content. `[MT-License]`
- **CNT-08 [V1]** Real-world business text (emails, chat, tickets, README/commit style): original or synthetic, human-reviewed.
- **CNT-09 [V1]** User-submitted content with moderation queue; private custom text stays local.
- **CNT-10 [V1]** Freshness: track seen items per user; daily passage.
- **CNT-11 [LATER]** Domain packs (legal, medical, transcription).

### 5.7 INT — Integrity (anti-cheat; design in §9.6)

- **INT-01 [MVP]** Server **recomputes** metrics from the raw log; reject mismatches.
- **INT-02 [MVP]** Plausibility checks: physical key-rate limits, minimum IKIs, impossible rollover, timing-distribution tests.
- **INT-03 [MVP]** **Signed sessions:** server issues seed/nonce/text hash at start; submissions must arrive within a TTL.
- **INT-04 [MVP]** Rate limiting and abuse protection per IP/account/device.
- **INT-05 [V1]** Risk-scoring workers; flagged results held off boards with visible "under review" status.
- **INT-06 [V1]** Verification re-test (fresh text) or video proof for top ranks/records.
- **INT-07 [V1]** Public policy, categorized reasons, appeal form; track false-positive rate. *Why:* PP-08.
- **INT-08 [V1]** Separate **ranked** (strict rules) from **practice** modes.
- **INT-09 [LATER]** Community reports; moderator replay-review UI; ML on IKI features.
- **INT-10 [Policy]** **No public leaderboards until INT-05 to INT-08 are live.** Before that, boards are personal or friends-only.

### 5.8 CMP — Competition and social (all V1+)

- **CMP-01 [V1]** Leaderboards: daily/weekly/all-time; segmented by mode, difficulty tier, language; verified results only; accuracy floor; percentile for non-top users.
- **CMP-02 [V1]** Real-time races (2–5 players): quick match by bracket, private rooms, reconnect.
- **CMP-03 [V1]** Ghost races (PB, friend, top replay).
- **CMP-04 [V1]** Accuracy-aware racing: winner by net speed above an accuracy floor; post-race coaching. *Why:* PP-09.
- **CMP-05 [V1]** Friends and challenge links (same text seed).
- **CMP-06 [V1]** Daily challenge (same text for all).
- **CMP-07 [V1]** Shareable result cards.
- **CMP-08 [V2]** Leagues/clubs with skill brackets.
- **CMP-09 [V2]** Tournaments with oversight tools.

### 5.9 MOT — Motivation

- **MOT-01 [MVP]** Streaks with grace/freeze; a day counts at ≥ 5 focused minutes. *Why:* PP-18.
- **MOT-02 [MVP]** Session summary: what improved, what regressed, what to do next.
- **MOT-03 [MVP policy]** No pay-to-win; paid items are cosmetic. *Why:* PP-10.
- **MOT-04 [V1]** XP/levels/badges rewarding improvement quality (e.g., "≥ 98% accuracy on Real-World, 5 times"), not just volume.
- **MOT-05 [LATER]** Optional adult-friendly mini-games (off by default). *Why:* PP-03.

### 5.10 USR — Accounts, profile, privacy

- **USR-01 [MVP]** **Guest-first:** full core use with local storage; non-blocking prompt to save. *Why:* PP-13.
- **USR-02 [MVP]** Sign-up/login (email, Google, GitHub); password reset; session management.
- **USR-03 [MVP]** Profile with privacy toggles (public/private/hidden from boards).
- **USR-04 [MVP]** **Privacy controls:** opt-in consent for research/calibration use, export/delete, default retention limits for raw keystroke logs. *Why:* PP-23, SC-9.
- **USR-05 [V1]** Cross-device sync with conflict handling.
- **USR-06 [MVP]** Age policy: **18+ only at launch** (India's DPDP Act defines a child as under 18 and requires verifiable parental consent); age gate + notice; no child-directed features. Allowing under-18s requires a parental-consent workflow and counsel review.
- **USR-07 [V2]** Organizations/classes.

### 5.11 CUS and A11Y — UX customization and accessibility

- **CUS-01 [MVP]** Instant start; no ads/popups/modals on the typing surface. *Why:* PP-01.
- **CUS-02 [MVP]** Themes (light/dark + presets), font choice/size (including a dyslexia-friendly option), caret style, focus mode, live-stats toggle.
- **CUS-03 [MVP]** Full keyboard navigation and shortcuts.
- **CUS-04 [V1]** On-screen keyboard/hand overlay, theme builder, sound packs, command palette.
- **A11Y-01 [MVP]** WCAG 2.2 AA for non-test UI; typing surface has adequate contrast, text scalable to 200%, respects reduced-motion/color-scheme preferences.
- **A11Y-02 [MVP]** No-timer practice and adjustable targets (also fixes PP-20).
- **A11Y-03 [V1]** Screen-reader-friendly guided mode with audio cues.
- **A11Y-04 [V1]** One-handed learning tracks.
- **A11Y-05 [V1]** High-contrast and color-blind-safe palettes (including heatmaps).
- **A11Y-06 [V2]** Audio feedback options and captions for any video.

### 5.12 LOC — Layouts and languages

- **LOC-01 [MVP]** Layouts: QWERTY (US/UK), Dvorak, Colemak/Colemak-DH, AZERTY, QWERTZ; layout-aware finger map.
- **LOC-02 [V1]** Custom layout/keymap import (JSON) and symbol layers.
- **LOC-03 [V1]** Languages as content packs (Spanish, French, German, Hindi…).
- **LOC-04 [V1]** Locale-appropriate number/date/currency formats in real-world text.
- **LOC-05 [LATER]** Indic scripts, Inscript/Remington layouts, exam rules (validate demand first).

### 5.13 MOB — Mobile and offline

- **MOB-01 [MVP]** Responsive site; on phones, be honest that physical keyboards are the primary target.
- **MOB-02 [V1]** PWA: installable, offline practice with cached content, sync when online. *Why:* PP-17.
- **MOB-03 [V1]** Mobile thumb-typing mode with separate metrics and boards.
- **MOB-04 [LATER]** Native wrapper if demand exists.

### 5.14 WEL — Wellbeing and ergonomics

- **WEL-01 [V1]** Configurable break reminders and session guidance.
- **WEL-02 [V1]** Fatigue detection: suggest stopping if accuracy/consistency drops sharply mid-session.
- **WEL-03 [V1]** Ergonomics tips (no medical claims).
- **WEL-04 [V2]** Healthy-competition guardrails (optional daily race caps).

### 5.15 BIZ — Business

- **BIZ-01 [MVP]** Free core: all modes, analytics, and progress history; no interstitial ads or upsell popups. *Why:* PP-01, PP-13.
- **BIZ-02 [V1]** Supporters (donation/one-time/recurring) with cosmetic perks. `[Pricing]`
- **BIZ-03 [V1 test]** Pro (deep analytics, cloud replays, own-code drills, packs); transparent pricing, one-click cancel, renewal reminders. *Why:* PP-10.
- **BIZ-04 [V2 pilot]** Teams/coach dashboards, piloted with 1–2 bootcamps/colleges.
- **BIZ-05 [V2 validate]** Verified certificates/assessments (re-test). *Risk:* unclear real-world value (PP-21).
- **BIZ-06 [Policy]** No dark patterns (hidden trials, surprise renewals, guilt-based cancel flows).

### 5.16 OPS — Operations, legal, support

- **OPS-01 [MVP]** Onboarding: goal, level, layout, languages; skippable; produces a starting plan.
- **OPS-02 [MVP]** Legal: Terms, Privacy, Cookies, DMCA/takedown, content licenses.
- **OPS-03 [MVP-lite]** Marketing/SEO pages, docs, "How we calculate."
- **OPS-04 [MVP]** In-app feedback widget, public roadmap, changelog. *Why:* PP-22.
- **OPS-05 [MVP]** Backups with a tested restore; data-retention job (expires raw logs).
- **OPS-06 [MVP]** **Metric-model versioning:** stamp every result with the model version; recalculation policy; public changelog.
- **OPS-07 [MVP]** Physical keyboard/OS quirks: ANSI vs ISO, Mac vs Windows modifiers, layout auto-detection with manual override.
- **OPS-08 [V1]** Notifications (email/push) with preferences and quiet hours.
- **OPS-09 [V1]** Billing: cards + UPI/regional methods, invoices/tax, refunds, dunning, regional pricing.
- **OPS-10 [V1]** Support desk, help center, community channels, moderation policy.
- **OPS-11 [V1]** Account security: 2FA, device/session list, recovery.
- **OPS-12 [V1]** Status page and incident runbook.
- **OPS-13 [MVP]** Privacy-friendly analytics; no third-party trackers in the test flow.
- **OPS-14 [V1]** Accessibility statement and periodic audits.

### 5.17 ADM — Admin and experimentation

- **ADM-01 [MVP-lite]** Admin console: content CRUD, feature flags, user lookup, result review queue, feedback inbox.
- **ADM-02 [V1]** Moderation tools, audit log.
- **ADM-03 [V1]** Experimentation framework with guardrail metrics.
- **ADM-04 [V1]** Content ops workflow (review → QA → publish).

### 5.18 EXT — Integrations (all LATER)

- **EXT-01** Public API with personal keys; Discord bot.
- **EXT-02 [H]** Opt-in browser extension measuring everyday typing (local-only timing aggregates; **no content capture**).
- **EXT-03** IDE plugins for code-typing stats (local-only).
- **EXT-04** Embeddable widgets.

---

## 6. Metrics Specification

> Proposals to implement and then **calibrate with data**. Publish every definition on `/how-we-calculate` and version it (OPS-06).

### 6.1 Core definitions
- **Word** = 5 characters (including spaces and punctuation).
- **Raw WPM** = (printable keystrokes ÷ 5) ÷ minutes.
- **Net WPM** (headline) = (correct characters in the final text ÷ 5) ÷ minutes. Correction time is included because the clock keeps running.
- **Gross WPM** = (characters in the final text ÷ 5) ÷ minutes. Shown in details; used in research.
- **Keystroke accuracy** = correct keystrokes ÷ total printable keystrokes (corrected mistakes still count).
- **Final accuracy** = correct characters ÷ total characters at the end.
- **KSPC** = total keystrokes (including Backspace) ÷ characters in the final text. `[Aalto-CHI18]`
- **Rollover ratio** = keystrokes typed while the previous key was still down ÷ total keystrokes. `[Aalto-CHI18]`
- **Consistency** (proposal) = 100 × (1 − CV) of per-second net speed (CV = σ ÷ μ), excluding the first 2 s, clamped to 0–100.
- **Burst WPM** = best rolling 5-second window.
- **IKI** = time between consecutive keydowns; exclude gaps > 5 s from IKI statistics. `[Aalto-CHI18]`
- **Timing precision:** use `event.timeStamp`/`performance.now()`. Software precision is ~1 ms, but keyboard/USB/OS effects add ~10 ms of noise; don't over-interpret differences below ~10 ms.
- **Error classes:** substitution, omission, insertion, transposition via alignment.

### 6.2 Difficulty and normalization (staged)
**Stage A — Difficulty band [MVP].**
- Compute a transparent **typability score** for prose using feature families shown to predict speed: share of lowercase among non-space characters, share of high-frequency words, mean bigram frequency, share of right-side keys (easier); total keystrokes, syllables per word, symbol share, share of non-dictionary words (harder). `[Typability-2026]`
- Output **Easy / Typical / Hard** bands. **No score multiplication yet.**
- Validate by checking that our users' within-user speeds rank texts the same way.
- *Limits:* the published model was trained on English prose sentences ≤ 70 characters with simple punctuation and few digits. It does **not** cover code or symbol-heavy text.

**Stage B — rWPM (beta) [V1, only after data].**
- `rWPM = Net WPM × exp(β × (T_ref − T_text))`, where `T` is the typability z-score and `β` is fitted from **our own** within-user data.
- Ship only if the fit is good (publish fit statistics, minimum sample sizes such as ≥ N tests from ≥ M users, chosen before analysis).
- Always show classic WPM alongside; label "beta"; version-stamp.

**Stage C — Code/symbol difficulty [V2].**
- The public 136M dataset contains **no code**; build a per-token-class cost model from our own data. Until then, show token-class stats instead of a single normalized number.

**Data and licensing:** the 136M-keystroke dataset is "released for scientific use" — verify terms before any commercial use; the Typability Index paper is CC BY 4.0 (check code/data-list licenses before reuse). `[Aalto-CHI18]` `[Typability-2026]`

### 6.3 Companion metrics
- **Composition WPM** = characters in the final composed text ÷ 5 ÷ total minutes (includes thinking).
- **Burst speed in composition** = speed during active runs (pauses < 2 s).
- **Transfer ratio** = composition WPM ÷ copy net WPM at a matched difficulty band. *(Directional; see SC-7.)*
- **Sustained WPM** = net WPM over a 10-minute endurance test.
- **Correction cost** = share of session time spent correcting.

### 6.4 Programmer metrics
Measurement rules: tokenize with the language grammar; **per-token time** = first key of the token to its last key; exclude auto-inserted characters; report **active typing** separately from thinking pauses.

| Metric | Definition | Tag |
|---|---|---|
| **Token-class speed/accuracy** | Time and error rate per class (identifiers, keywords, operators, brackets, strings, numbers, comments, whitespace) | MVP |
| **Symbol Fluency Ratio (SFR)** | Net speed on symbol-dense drills ÷ your prose net speed (same session or baseline; use median of 3 to reduce noise) | MVP |
| **Symbol Error Rate (SER)** + **confusion matrix** | Errors per symbol; which symbols get swapped (`=`/`==`, `[`/`{`, `'`/`"`, `-`/`_`, `/`/`\`) | MVP |
| **Number-literal accuracy by base** | Errors in decimal/hex/binary/octal; digit transposition | MVP |
| **Naming-style switch cost** | Time/error delta when style changes mid-stream | MVP |
| **Recall accuracy & latency** | First-attempt recall %, time to first keystroke, hint use | MVP-lite |
| **Bracket pair latency (BPL)** | Median time from an opening bracket to its match; imbalance rate | MVP |
| **Shift/AltGr penalty** | Extra ms for characters needing Shift/AltGr vs neutral keys, by hand | V1 |
| **Indentation drift** | Indent errors per 100 lines | V1 |
| **Compile-safe rate** | % of outputs that parse cleanly (tolerant parse) | V1 |
| **Language-switch cost** | Performance drop in the first 60 s after switching language | V1 |
| **Think/type ratio** | Pause time vs active typing in composition sprints | V1 |
| **Dev prose speed** | Speed on commit/PR/README text | V1 |

### 6.5 Level pass rules (defaults, adjustable)
A level passes when **best 3 of the last 5** attempts meet: accuracy target, speed target (fraction of your own prose baseline, i.e., SFR), and mode-specific checks.

| Tiers | Accuracy | SFR target (ramps within group) |
|---|---|---|
| 1–3 | ≥ 95% | 0.50 → 0.65 |
| 4–6 | ≥ 96% | 0.60 → 0.75 |
| 7–9 | ≥ 96% | 0.65 → 0.80 |
| 10–12 | mode-specific | Edit efficiency 0.60 → 0.85; first-try recall ≥ 85% |

*All numbers are starting guesses to calibrate.*

### 6.6 Efficacy measurement (built in)
- **Design:** day-0 baseline → day-30 retest with different text of the same difficulty band; optional opt-in holdout (adaptive drills vs random text of matched difficulty).
- **Outcomes:** net WPM and accuracy per content type; symbol error rate; weakness-score change.
- **Guards:** report medians and intervals; watch for regression to the mean and novelty effects; publish anonymized aggregates with plain-language caveats ("not a clinical trial").
- **Why it matters:** the public evidence for app-based typing training is thin (§1.3), so our own data is both a product proof and a differentiator.

### 6.7 Ranking rules (V1)
Verified results only; accuracy floor (tunable, e.g., ≥ 92%); segmented by mode/difficulty/language; race winner by net speed among finishers above the floor.

### 6.8 Composite index (PTI)
**Deferred.** Show a profile (radar + level ladder) first. Consider a single index only after calibration, with a published formula and version.

---

## 7. Programmer Track (Language-Agnostic Design)

**Core idea:** every language is built from the same small set of **token classes**. Train the classes once (language-agnostic), then apply them to any language via **skins**.

**Honest promise:** *less friction between your thoughts and your editor* (symbol/number accuracy, syntax recall, editing fluency). **Not** "become a better programmer." (PRG-05)

### 7.1 Universal token classes
| # | Class | Examples |
|---|---|---|
| 1 | Brackets & pairs | `() [] {} <>` |
| 2 | Operators | `+ - * / % ** == != === <= >= && \|\| ! & \| ^ ~ << >>` |
| 3 | Multi-char "chords" | `=> -> :: ?. ?? ... ++ += <<=` |
| 4 | Quotes, strings, escapes | `' " \``, `\n \t \\`, `${x}` |
| 5 | Numbers | `42 -3.14 1e-9 1_000_000` |
| 6 | Number systems & IDs | `0xFF 0b1010 0o755 #FF00AA`, UUID/SHA/IP/CIDR |
| 7 | Identifiers by style | `user_id userId UserId user-id USER_ID` |
| 8 | Keywords | `if else for while return async await` |
| 9 | Whitespace & structure | indentation, newlines, blocks |
| 10 | Comments & docs | `// # /* */ """` |
| 11 | Paths, URLs, flags | `./src/app.js`, `--force`, `C:\dir`, `https://…` |
| 12 | Data & markup | JSON, YAML, HTML tags, SQL, regex |

### 7.2 Skins and packs
- **Language skins:** JavaScript/TypeScript/JSX, Python, Java, SQL, HTML/CSS (MVP 3–5); then C/C++, C#, Go, Rust, PHP, Ruby, Kotlin, Swift, Bash, YAML/JSON [V1+].
- **Stack Packs [V1]:** MERN (Express routes, React components/hooks, Mongoose schemas), Spring Boot (annotations, controllers, JPA), Django/FastAPI, Next.js, Kubernetes YAML, SQL analytics.
- **OS profiles:** Windows/Linux vs macOS modifiers and path separators.

### 7.3 The 60-level ladder
12 tiers × 5 levels; level 5 of each tier is a **boss** (mixed test + review of earlier tiers). Each level has 3 stars: ★ pass, ★★ high accuracy, ★★★ speed target. **MVP = Levels 1–30**, shipped in two slices: **Alpha L1–15**, **Beta L16–30**.

| Tier | Levels | Focus (sample content) |
|---|---|---|
| 1 Brackets & Pairs | 1–5 | Single pairs → content → nesting depth 2 → mixed nesting with balance → **Boss: Bracket Gauntlet** |
| 2 Operators & Chords | 6–10 | Arithmetic → comparison/assignment → logical/bitwise → chords (`-> => :: ?. ??`) → **Boss: Operator Soup** |
| 3 Quotes, Strings, Escapes | 11–15 | Quote pairs → escapes → templates/interpolation → regex basics → **Boss** |
| 4 Numbers I | 16–20 | Digit row vs numpad → negatives/decimals/separators → scientific/underscored → expressions/indices → **Boss: Numeric Data Entry** |
| 5 Number Systems & IDs | 21–25 | Hex → binary/octal → bitmasks/shifts → UUID/SHA/IPv4/IPv6/CIDR/MAC/ports/ISO dates/semver → **Boss: Number Systems Lab** |
| 6 Naming Styles | 26–30 | snake/SCREAMING → camel/Pascal → kebab/dot/namespace → convert between styles → **Boss: Mixed-Convention Codebase** |
| 7 Whitespace & Structure [V1] | 31–35 | Auto-indent on → manual indent → multi-line blocks → comments/docstrings → **Boss: Full function/class** |
| 8 Syntax Families [V1] | 36–40 | C-like → indentation-based → markup/styles → data formats → **Boss: Polyglot Relay** |
| 9 Terminal & Tooling [V1] | 41–45 | Paths/URLs/flags → git/package managers → pipes/redirects/globs/env → container/cloud CLI → **Boss: Command-line session** |
| 10 Editing & Navigation [V2] | 46–50 | Essential shortcuts → navigation/multi-cursor → refactor moves → optional Vim/Emacs → **Boss: Edit Tasks** |
| 11 Recall & Templates [V1/V2] | 51–55 | Idioms from memory → algorithm/data-structure templates → union-find/graph/DP skeletons/SQL patterns → stack-pack boilerplate → **Boss: Template Blitz** |
| 12 Composition & Mastery [V2] | 56–60 | Pseudo-code → code → Bug Hunt → composition sprints → endurance → **Boss: Assessment-style capstone** |

**Mechanics**
- **Placement** + **test-out** per tier; "almost there" state; no single-attempt gating.
- **Skill decay + refresh:** untouched tiers dim after ~30–60 days and offer a 5-minute refresher.
- **Interleaving:** bosses include review items.
- **Language skins:** replay any tier in another language.
- **Ranks (fun, optional):** based on the profile, not a single index (PTI deferred).

### 7.4 Content generation per tier
| Tiers | Method | Why |
|---|---|---|
| 1–6 | **Seeded generators** + curated snippets | Cheap, reproducible, no license issues |
| 7–8 | Curated real snippets (permissive licenses) + templates | Realism |
| 9 | Curated command sets (never executed) | Safety |
| 10 | Editor tasks (V2) | Requires editor component |
| 11 | Curated templates per skin/stack pack | Quality control |
| 12 | Prompts + composition scoring | Later |

### 7.5 Programmer Baseline Test (10 min, day 0/30/60)
| Segment | Length | Measures |
|---|---|---|
| Prose | 30 s | Prose baseline for SFR |
| Symbols | 60 s | Symbol speed, SER, confusion matrix |
| Numbers & IDs | 60 s | Literal accuracy by base |
| Naming | 60 s | Style accuracy, switch cost |
| Code snippet | 90 s | Token-class mix under realistic structure |
| Recall (optional) | 90 s | First-try recall and latency |

Output: **Code Skill Profile** (radar) + top 3 fixes + recommended level path. Retest uses different text of matched difficulty.

### 7.6 Progress views
Skill radar · Level ladder · keyboard symbol heatmap (Shift/AltGr layers) · token-class heatmap · confusion matrix · 14/30/90-day trends · language/stack panel · **Next Best Drill** · weekly report · goal ETA · baseline vs retest.

### 7.7 Honest-measurement rules
Active typing vs pauses reported separately; auto-inserted characters counted separately; smart quotes/autocorrect off; no comparison of code WPM to prose WPM without SFR context. `[Prog-Articles]`

### 7.8 Validation gates for the programmer track
- Before building L31+: evidence that L1–30 gets weekly use (H7) and interviews show P2 demand.
- "Train on your code" and Stack Packs: ask in interviews and waitlist before building.
- Edit Tasks: build only with a clear angle beyond VimGolf (editor-agnostic, guided, browser-based). `[VimGolf]`

---

## 8. Non-Functional Requirements

| ID | Area | Requirement (targets are proposals) |
|---|---|---|
| NFR-01 | Input latency | p95 input-to-paint ≤ 16 ms on a desktop reference; measured in CI |
| NFR-02 | Load | Typing page interactive ≤ 1.5 s on mid-range phone over 4G; test-page JS ≤ ~200 KB gzip; editor/parsers lazy-loaded |
| NFR-03 | Offline safety | Core tests run if the backend is down; results queue and sync |
| NFR-04 | API latency | Result submit p95 ≤ 500 ms; [V1] leaderboard read p95 ≤ 200 ms |
| NFR-05 | Realtime [V1] | Race message latency p95 ≤ 100 ms (same region) |
| NFR-06 | Availability | 99.9% monthly for API after MVP; graceful degradation |
| NFR-07 | Scale | MVP ~10k MAU; design for 100k DAU × 5 tests/day (~6 writes/s avg, ~60/s peak) |
| NFR-08 | Security | OWASP ASVS L1→L2; strict CSP; rate limiting; dependency scanning; hashed passwords or delegated OAuth |
| NFR-09 | Privacy | GDPR + India DPDP-aware; minimization; opt-in research consent; no third-party trackers in test flow |
| NFR-10 | Compatibility | Latest 2 versions of Chrome, Edge, Firefox, Safari; iOS Safari/Chrome |
| NFR-11 | Accessibility | WCAG 2.2 AA (non-test UI) |
| NFR-12 | Testing | Golden tests, property tests, Playwright e2e, latency harness, [V1] load tests |
| NFR-13 | Observability | Structured logs, metrics, error tracking, dashboards, alerting |
| NFR-14 | i18n | Externalized strings; RTL-ready design |
| NFR-15 | Docs | Public "How we calculate", privacy, anti-cheat policy, changelog |
| NFR-16 | Bundle budget | CI fails if budgets are exceeded |
| NFR-17 | Data integrity | Versioned schemas and migrations; tested backups |

**Storage estimate [A]:** a 60 s test at ~80 WPM ≈ 400 keystrokes; delta-encoded and compressed ≈ 2–3 KB. At 500k tests/day ≈ 1.5 GB/day raw; ~45 GB for a 30-day window. Mitigation: keep raw logs only for verified/ranked/flagged results; expire the rest; keep aggregates.

---

## 9. Architecture, Data, Security, Reuse

### 9.1 Stack by phase ("boring first")
| Layer | MVP | V1 additions |
|---|---|---|
| Frontend | React + TypeScript + Vite SPA; CSS variables for themes; small state store | PWA; Next.js only if SEO pages need it |
| Engine | Framework-agnostic TS package shared with server | — |
| Editor/parsing (lazy) | CodeMirror 6 + Tree-sitter WASM grammars `[Tech]` | Vim keymap plugin [V2] |
| API | Node.js + Express/Fastify (TS); Zod schemas shared with client | ts-rest/tRPC optional |
| Database | MongoDB (Atlas) | — |
| Cache/queues | None (scheduled jobs for aggregates) | Redis (leaderboard sorted sets, rate limits, race state); BullMQ workers |
| Realtime | — | Socket.IO/ws |
| Auth | Auth.js/Passport + JWT, or Firebase Auth | 2FA |
| Storage | — | S3/R2 for replays and backups |
| Infra | Static hosting + one API service; GitHub Actions | Autoscaling; managed Redis |
| Monitoring | Error tracking + uptime | Metrics dashboards |
| Payments | — | Stripe/Razorpay |

Reference: Monkeytype runs Node/Express, MongoDB, Redis, BullMQ and Firebase Auth. `[MT-Arch]` We don't need Redis/queues until leaderboards and races exist.

### 9.2 Reuse and licensing
| Asset | Terms | Decision |
|---|---|---|
| Monkeytype code, word lists, quotes | **GPL-3.0** `[MT-License]` | Don't copy into closed-source; reuse only if the project is GPL-compatible |
| Keybr | AGPL-3.0 (verify) | Same, plus network-use clause |
| SpeedTyper.dev | MIT `[SpeedTyper]` | Reusable with notice |
| CodeMirror 6, Tree-sitter | Permissive (verify) `[Tech]` | OK |
| codemirror-vim | Verify | Verify before use |
| 136M-keystroke dataset | "Released for scientific use" `[Aalto-CHI18]` | Ask authors before commercial use |
| Typability Index | Paper CC BY 4.0; check code/data licenses `[Typability-2026]` | Reimplement with attribution |
| Frequency lists/dictionaries | Varies | Check each; prefer permissive |
| OSS code snippets | Per repo | Permissive only; keep attribution |

**Decision:** clean-room build using own/permissive/public-domain content, unless you deliberately choose a GPL/AGPL project (§10.4).

### 9.3 Data model (collections)
| Collection | Key fields | Notes |
|---|---|---|
| `users` | id, auth ids, display name, privacy flags, settings, layout, consent flags | Minimal PII |
| `sessions` | id, userId?, mode, seed, nonce, textHash, expiresAt | Signed test sessions |
| `results` | id, userId?, mode, contentType, durationMs, wpm/raw/net, accuracy, consistency, kspc, rollover, difficultyBand, modelVersion, verified, flags | Summary only |
| `keystroke_logs` | resultId, encoded events, TTL | Short retention |
| `key_stats` | userId, per-key/bigram/trigram rolling aggregates | Powers heatmaps/drills |
| `token_stats` | userId, class, language, aggregates | Programmer analytics |
| `progress` | userId, level states/stars/decay, goals, streaks | |
| `recall_items` | userId, item, schedule state | SR (V1) |
| `content` | id, type, language, text, source, license, difficulty, tags, status | License required |
| `packs` | id, name, items, license | Stack packs |
| `experiments` | userId, arm, assignedAt | Holdouts |
| `model_versions` | name, version, params, changelog | OPS-06 |
| `feedback` | userId?, text, page, createdAt | |
| `races`, `leaderboards`, `reports`, `appeals` | — | V1 |

**Keystroke event encoding (proposal):** `[deltaMs, keyIndex, flags]` (flags: down/up, modifiers, correctness, auto-inserted). Sign with the session nonce; gzip before upload.

**Result example**
```json
{
  "mode": "realworld-prose", "contentType": "prose",
  "durationMs": 60000,
  "wpm": 62.4, "raw": 68.1, "net": 60.9,
  "accuracy": 96.2, "consistency": 81.5,
  "kspc": 1.14, "rollover": 0.22,
  "difficultyBand": "typical",
  "modelVersion": "diff-0.1", "verified": true
}
```

### 9.4 API sketch
**MVP:** `POST /sessions` · `POST /results` · `GET /me/stats|keys|bigrams|tokens|trends` · `GET /content/next?mode=&difficulty=&weakness=1&lang=` · `POST /levels/:n/attempt` · `GET /me/export` · `DELETE /me` · `POST /feedback` · `GET /experiments/assignment`
**V1:** `GET /leaderboards/:board` · WebSocket `/race` · `POST /reports` · `POST /appeals` · billing webhooks

### 9.5 Race protocol [V1]
Server creates room + seed and sets a **server-authoritative start time** → clients send progress every 100–250 ms → server checks monotonicity → final log upload and recompute → standings → reconnect grace window.

### 9.6 Anti-cheat design
**Facts:** cheat tools exist for 10FastFingers and Monkeytype (including tools that defeat image-based checks), and paid bots are sold for Nitro Type. `[Cheat-Tools]` `[NT-Reviews]` TypeRacer's team also discusses cheater handling. `[TypeRacer-Blog]`

| Threat | Example |
|---|---|
| T1 Script/extension injection | Userscripts that type for you |
| T2 Forged submissions | Direct API calls with made-up results |
| T3 Assisted typing | OCR + automation |
| T4 Humanized bots | Random jitter and a "target WPM" dial |
| T5 Multi-accounting | Farming boards or race points |

**Layers**
1. **Raise cost [MVP]:** signed sessions, TTL, single-use nonces, trusted events, no paste. (T2, lazy T1)
2. **Deterministic checks [MVP]:** server recompute; physical key-rate limits; impossible rollover; minimum IKIs.
3. **Statistical checks [V1]:** human IKI depends on bigram type and skill; bots that ignore this or show unnaturally low variance stand out. `[Aalto-CHI18]` (T4)
4. **Account behavior [V1]:** sudden jumps, device/IP patterns. (T5)
5. **Human review [V1]:** replay review; verification re-test/video for records.
6. **Policy [V1]:** public rules, reason categories, appeals; hold flagged scores rather than instant permanent bans when unsure.

**Expectation:** no system is perfect (T3/T4). Goals: make cheating costly, keep false positives very low (measure them), and be transparent. **Reduce the incentive first:** no public boards at MVP (INT-10).

### 9.7 Privacy and security engineering
- Treat keystroke logs as **sensitive** (timing can identify people). `[Aalto-CHI18]`
- Default raw-log retention proposal: **30 days**, except verified/ranked/flagged results; aggregates kept until deletion.
- Encryption in transit and at rest; role-based admin access with audit logs.
- Research/calibration use only with explicit **opt-in**; anonymize; never sell or share raw logs.
- Composition text is **not stored** unless the user opts in.
- Personal-code import is **client-side only** with secret scanning; no upload.
- Sanitize all rendered snippets; strict CSP; never execute code (PRG-04).
- Dependency and secret scanning in CI; OWASP ASVS L1→L2.

### 9.8 Testing and QA
- **Unit:** metrics golden vectors, error alignment, tokenization.
- **Property tests:** random keystroke streams → invariants (monotonic time, accuracy bounds).
- **E2E:** Playwright with synthetic keys **plus** a manual real-keyboard matrix (Windows/Mac/Linux × Chrome/Firefox/Safari/Edge × layouts).
- **Latency harness** in CI; **bundle budgets**.
- **Security:** XSS tests on snippets/packs; dependency scans.
- **Accessibility:** automated audits + manual screen-reader passes.
- **Calibration checks:** difficulty-band ranking vs real speeds.
- **Load tests [V1]** for races.

---

## 10. Business Model and Go-to-Market

### 10.1 Reality check on willingness to pay
| Signal | Source |
|---|---|
| Ratatype ad-free ≈ $5 | `[Ratatype-CS]` |
| Keybr ad-free ≈ $14 lifetime (competitor-blog claim) | `[Pricing]` |
| TypingClub premium ≈ $8.50/mo (competitor-blog claim; other listings differ) | `[Pricing]` |
| KeyCombiner ≈ $3/mo (listing) | `[KeyCombiner]` |
| Monkeytype: optional ads, donations, Patreon, merchandise | `[Pricing]` `[MT-Reviews]` |
| Premium features criticized as low-value (e.g., replays) | `[Pricing]` |

**Reading:** consumers rarely pay much for typing tools; ad-removal and donations dominate. Assume **low consumer revenue** and keep costs small.

### 10.2 Options
| Option | Notes | Risk |
|---|---|---|
| A. Free + supporters | Goodwill; low revenue | Sustainability |
| B. Pro subscription | Deep analytics, own-code drills, packs, cloud replays | Low conversion |
| C. B2B (bootcamps, colleges, L&D) | Coach dashboards, assigned plans, verified progress | Sales effort |
| D. Certificates/assessments | Verified re-test | Unclear recognition (PP-21) |

**Recommendation:** MVP free with no ads → supporters at V1 → run a Pro pricing test with the waitlist → pilot B2B after V1. Decide only after data.

### 10.3 Go-to-market
- **Launch surfaces:** developer and typing communities, GitHub (if open-sourcing), Product Hunt/Hacker News-style launches, dev YouTubers.
- **SEO guides** that end in a drill ("typing test for programmers", "typing hex and binary literals", "naming conventions typing drill").
- **Content marketing:** publish an **efficacy report** from the beta (with caveats).
- **Community:** Discord, public roadmap, changelog, feedback loop.
- **Partnerships:** bootcamps/colleges for pilots.

### 10.4 Open-source decision
| Option | Pros | Cons |
|---|---|---|
| Fully open (permissive or GPL/AGPL) | Trust, contributions, reuse of GPL content | Cloning; copyleft obligations |
| **Open-core** (engine + metrics library permissive; hosted service closed) | Trust in "How we calculate"; keeps service edge | Split maintenance |
| Closed | Control | Lower trust; can't reuse GPL assets |

*Lean (not decided):* open-source the engine/metrics library to earn trust; decide at R0.

---

## 11. Roadmap, Definition of Done, Launch Checklist

*Assumes 1 full-time developer; part-time = multiply by ~2–3.*

| Phase | Weeks | Deliverables | Exit gate |
|---|---|---|---|
| **R0 Validate** | 0–2 | Interviews, waitlist, latency prototype, license decision, data plan | Go/no-go against §1.8 thresholds |
| **R1 MVP** | 3–12 | §3.2 list; Levels 1–30 (Alpha then Beta); efficacy instrumentation | Loop works end-to-end; beta invites |
| **R1.5 Beta** | 13–16 | 50–100 users; day-30 retests begin; bug fixes | Baseline/retest pipeline validated |
| **R2 V1** | 17–30 | Verified leaderboards, races, PWA, composition mode, daily plan, stack packs, terminal/data-format modes, supporters, notifications, billing (if needed) | INT-05…08 live before boards |
| **R3 V2** | 31+ | Teams/coach, certificates (if validated), edit tasks, more languages, rWPM (if calibrated) | Based on data |

**Definition of Done (every feature):** reviewed code · unit + e2e tests · accessibility check · performance budget met · `/how-we-calculate` updated if metrics changed · privacy review · feature flag + rollback plan · analytics events (no keystroke content).

**Launch checklist:** legal pages · attribution/licenses page · backups + restore test · monitoring + status page · feedback widget · support inbox · cross-browser/layout matrix · security review · rate limits · moderation policy · changelog · efficacy disclaimer · community posts.

---

## 12. Risks

| # | Risk | Mitigation | Early warning |
|---|---|---|---|
| 1 | Crowded market; free incumbents | Differentiate on loop, programmer depth, honesty; validate first | Interviews say "Monkeytype is enough" |
| 2 | **Efficacy unproven / training effect small** | Built-in A/B + baseline; modest claims; publish results | No A/B difference |
| 3 | Low willingness to pay | Low-cost infra; supporters; B2B pilot | Waitlist won't pay/support |
| 4 | Difficulty score confuses or is inaccurate | Bands first; show classic WPM; publish methods | Comprehension test fails |
| 5 | No code/symbol dataset for normalization | Token-class stats first; collect own data | Poor fit in calibration |
| 6 | **License contamination (GPL/AGPL)** | Clean-room; license register per asset | Any copied snippet lacking provenance |
| 7 | Cheating | No public boards until INT-05…08 | High flag rate in beta |
| 8 | Keystroke privacy | Minimization, expiry, opt-in research | Low consent rates; complaints |
| 9 | Scope creep | MVP cut rule; kill list | Backlog growing faster than shipping |
| 10 | Solo-dev capacity | Boring stack; managed services; slices | Slipping weekly |
| 11 | Latency/IME/browser quirks | Early prototype; matrix testing | p95 > 16 ms |
| 12 | Content licensing (code, quotes) | Permissive/original only; attribution; takedown | Takedown requests |
| 13 | Monetization backlash | Anti-goals; transparent billing | Negative feedback |
| 14 | Programmer demand uncertain | Waitlist by persona; L31+ gated | P2 weekly use low |
| 15 | Benchmarks biased upward (self-selected samples) | Label benchmarks; use own cohorts later | User confusion about "average" |

---

## 13. Validation Plan

| # | Experiment | Method | Decide before running |
|---|---|---|---|
| E1 | Problem interviews | 10–15 (mix P1/P2) | Share who would switch/pay |
| E2 | Waitlist | 3 hero concepts (Diagnose→Drill, Programmer Symbols/Numbers, Train-on-your-code) | Signup rate per concept |
| E3 | Latency prototype | Engine + 4 browsers + layouts | p95 ≤ 16 ms? |
| E4 | Concierge loop | 10 users; manual analysis + recommended drills | Perceived value; repeat use |
| E5 | Score comprehension | Show difficulty band vs rWPM mockups | % who explain it correctly |
| E6 | Difficulty ranking check | Compare band vs within-user speed | Rank correlation threshold |
| E7 | Efficacy A/B (beta) | Adaptive vs random text, matched difficulty | Effect size / CI |
| E8 | Anti-cheat false positives | Recruit known fast typists | FP rate ceiling |
| E9 | Support/pay test | Supporter link; Pro waitlist pricing | Conversion floor |
| E10 | B2B outreach | 5 bootcamps/colleges | Pilot commitments |

**Interview script (starter)**
1. What do you use to practice typing now, and why?
2. What made you stop using ones you quit?
3. Does your test WPM match your typing at work/study?
4. After a test, what do you do to improve? What's missing?
5. Have you seen cheating? How did it affect your trust?
6. If you code: which symbols/numbers/keys slow you down? Which languages?
7. Do you practice syntax or templates from memory? How?
8. What would make you pay or support? What would make you leave?
9. Would you accept anonymized keystroke research if you could opt out anytime?
10. What would you expect after 30 days of use?

**Monthly friction survey (in-app):** "How often does typing slow you down?" (1–5) · "Which keys/symbols?" · "Did practice help?" (optional).

---

## 14. Open Decisions
1. Name/domain/brand.
2. Open-source stance (§10.4) and license.
3. Age policy: **decided as 18+ at launch**; revisit only with a parental-consent plan.
4. Raw-log retention (30 vs 90 days).
5. Auth provider (Firebase vs Auth.js).
6. Initial language skins (choose 3–5).
7. Whether to include an exam/Indic module (validate first).
8. Use of LLMs (content, coach, both, neither) and cost caps.
9. Hosting region (race latency).
10. Data-sharing terms for the 136M dataset (contact authors) vs own-data-only.

---

## Appendix A — Pain Point → Requirement Traceability
| Pain point | Requirements |
|---|---|
| PP-01 | CUS-01, BIZ-01, BIZ-06 |
| PP-02 | LRN-04 |
| PP-03 | LRN-01, LRN-07, MOT-05 |
| PP-04 | LRN-02, LRN-08, LRN-11 |
| PP-05 | LRN-02, LRN-05, ANA-02, ANA-03 |
| PP-06 | LRN-03, CNT-03 |
| PP-07 | CNT-02, §6.2, MOD-02/03/04 |
| PP-08 | INT-01…INT-10, CMP-01 |
| PP-09 | CMP-04, LRN-05, MOT-02 |
| PP-10 | MOT-03, BIZ-03, BIZ-06 |
| PP-11 | ENG-08, LRN-05, ANA-02 |
| PP-12 | ENG-02, NFR-01, NFR-02 |
| PP-13 | USR-01, BIZ-01, ANA-04 |
| PP-14 | CMP-02, CMP-03 |
| PP-15 | MOD-06, MOD-08, §6.3 |
| PP-16 | A11Y-01…A11Y-06 |
| PP-17 | MOB-02, NFR-03 |
| PP-18 | MOT-01, WEL-04, CMP-08 |
| PP-19 | MOD-03, PRG-15, CNT-04 |
| PP-20 | LRN-04, A11Y-02 |
| PP-21 | BIZ-05 (validate) |
| PP-22 | OPS-04 |
| PP-23 | USR-04, ANA-08, NFR-09, §9.7 |
| PP-24 | PRG-10…PRG-14, PRG-18 |
| PP-25 | PRG-03, LOC-01, LOC-02, Layout Lab (PRG-19) |
| PP-26 | ENG-09, ENG-10, §7.7 |

## Appendix B — Glossary
- **WPM:** words per minute (1 word = 5 characters). **Net WPM:** correct characters only (headline).
- **IKI:** inter-key interval. **KSPC:** keystrokes per character. **Rollover:** pressing the next key before releasing the previous one.
- **Typability:** how hard a text is to type. **Difficulty band:** Easy/Typical/Hard label from a typability score.
- **rWPM:** difficulty-adjusted net WPM (beta, later).
- **SFR:** Symbol Fluency Ratio. **SER:** Symbol Error Rate. **BPL:** Bracket Pair Latency.
- **Token class:** category of code token (bracket, operator, number, identifier…).
- **Skin:** language-specific rendering of token-class drills.
- **Boss:** final level of a tier (mixed test + review).
- **PWA:** progressive web app. **Holdout:** users randomly given a control experience to measure efficacy.

## Appendix C — Sources
*(Third-party pages of varying dates; verify before relying on prices, ratings, and licenses. Vendor/competitor sources are marked.)*

**Science**
- `[Aalto-CHI18]` Dhakal et al., *Observations on Typing from 136 Million Keystrokes* (CHI 2018): https://userinterfaces.aalto.fi/136Mkeystrokes/ · paper PDF: https://userinterfaces.aalto.fi/136Mkeystrokes/resources/chi-18-analysis.pdf
- `[Typability-2026]` Williams et al., *The Typability Index* (Behavior Research Methods, 2026, open access): https://link.springer.com/article/10.3758/s13428-025-02877-y · code: https://github.com/EA-Williams/The-Typability-Index/ · web app: https://emily-a-williams.shinyapps.io/the-typability-index-web-app/
- `[Karat-1999]` Karat et al. (CHI '99) as summarized by secondary sources: https://www.humanfactors.com/newsletters/human_interaction_speeds.asp · https://en.wikipedia.org/wiki/Words_per_minute
- `[KeithEricsson-2007]` Keith & Ericsson, *A deliberate practice account of typing proficiency in everyday typists*: https://pubmed.ncbi.nlm.nih.gov/17924799/

**Competitors, reviews, feedback**
- `[MT-Reviews]` https://cosmickeys.app/en/blog/monkeytype-review · https://www.geniusfirms.com/blog/is-monkeytype-good-for-typing-practice-honest-review/
- `[MT-7114]` IDE-style code mode request: https://github.com/monkeytypegame/monkeytype/discussions/7114
- `[MT-7452]` Multiplayer request (Jan 2026): https://github.com/monkeytypegame/monkeytype/discussions/7452 · `[MT-4314]` Tribe beta mention: https://github.com/monkeytypegame/monkeytype/discussions/4314
- `[MT-License]` GPL-3.0: https://context7.com/monkeytypegame/monkeytype · https://github.com/MStonehouse/monkeytype-offline-linux
- `[MT-Arch]` https://www.mintlify.com/monkeytypegame/monkeytype/architecture/overview
- `[Keybr-Group-2018]` https://groups.google.com/g/keybr/c/5DcHT3oySXU · `[Keybr-Issues]` https://github.com/aradzie/keybr.com/issues · https://github.com/aradzie/keybr.com/issues/36 · `[Keybr-Reviews]` https://www.educatorstechnology.com/2022/11/keybr-review-tests-to-improve-typing.html · https://alternativeto.net/software/keybr/about
- `[TC-Reviews]` https://uk.trustpilot.com/review/www.typingclub.com · https://www.trustpilot.com/review/www.typingclub.com?page=2 · https://www.smartcustomer.com/reviews/typingclub.com · https://www.commonsensemedia.org/website-reviews/typingclub/user-reviews/adult
- `[Ratatype-TP]` https://www.trustpilot.com/review/ratatype.com · `[Ratatype-CS]` https://www.commonsense.org/education/reviews/ratatype
- `[NT-Reviews]` https://www.trustpilot.com/review/nitrotype.com · https://www.commonsense.org/education/reviews/nitro-type/teacher-reviews/4135741 · https://www.smartcustomer.com/reviews/nitrotype.com
- `[10FF-Reviews]` https://cosmickeys.app/en/blog/10fastfingers-review · https://typingdonewell.com/blog/10fastfingers-review-website-only-for-typing-tests-or-something-more/
- `[Cheat-Tools]` https://github.com/FarisHijazi/10FastFingers_BotAntiAntiCheat · https://github.com/topics/monkeytype-cheat
- `[TypeRacer-Blog]` https://blog.typeracer.com/2015/08/04/bad-news-for-cheaters-on-typeracer-and-other-new-improvements/
- `[Typing.io]` https://typing.io/ · `[SpeedTyper]` https://www.speedtyper.dev/ · https://github.com/codicocodes/speedtyper.dev · `[SpeedCoder]` https://www.speedcoder.net/ · `[SpeedTCode]` https://github.com/imrahnf/speedtcode
- `[Code-Sites]` (small code-drill sites; some vendor) https://typer.training/typing-exercises-for-programmers · https://online-typing.com/practice/code-typing-practice · https://typingtest.now/for-programmers/ · https://www.typequicker.com/code-typing-practice
- `[VimGolf]` https://www.vimgolf.com/ · https://changelog.com/posts/the-fewest-keystrokes-wins-in-vim
- `[KeyCombiner]` https://keycombiner.com/ · https://alternativeto.net/software/keycombiner/about/ · ShortcutFoo: https://www.shortcutfoo.com/
- `[Layouts]` https://github.com/renerocksai/real-prog-qwerty · https://www.athoughtabroad.com/2014/01/07/programmer-friendly-german-keyboard-layout-on-gnu-linux
- `[Pricing]` (competitor blog; treat as unverified) https://www.typequicker.com/compare/typingclub-alternatives
- `[Prog-Articles]` (mixed vendor/non-vendor) https://www.typingspeedrpg.com/blog/typing-speed-for-programmers/ · https://keysandtype.com/blog/typing-practice-for-coding/ · https://www.typespeedtest.com/blog/typing-speed-for-programmers/
- `[Tech]` https://github.com/wenkokke/web-tree-sitter · https://github.com/replit/codemirror-vim

*Vendor sources with voice-dictation or typing-tool interests (Blabby, VoiceDash, Voibe, TypingFastest, TypingTestGo) were used only for context and are not relied on for requirements.*
