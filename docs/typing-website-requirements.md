# RealType — Product Requirements Document (PRD)

**Working title:** RealType (rename freely)
**Version:** 0.1 (draft for validation) · **Date:** 19 Sep 2026
**Built from:** the earlier typing-website analysis + new research on user reviews/complaints, academic typing research, and how existing platforms are built.

**Legend**
- **P0** = MVP · **P1** = V1 (after MVP) · **P2** = later / needs validation
- **PP-xx** = a user pain point (Section 2.3) · **SC-x** = a science finding (Section 2.4)
- **[S#]** = source (Appendix D) · **[G]** = general knowledge / my assumption · **[H]** = hypothesis to validate before building

**Contents**
1. Executive summary
2. Research findings
3. Users & personas
4. Product principles & anti-goals
5. Scope & release plan
6. Functional requirements (modules ENG → EXT)
7. Metrics spec (WPM, accuracy, Real-World Score)
8. Non-functional requirements
9. Architecture & tech stack
10. Data model & API sketch
11. Anti-cheat design
12. UX / screens
13. KPIs & analytics
14. Monetization
15. Roadmap
16. Risks
17. Validation plan & open decisions
- Appendix A: Pain point → requirement traceability
- Appendix B: Capability gap table
- Appendix C: Glossary
- Appendix D: Sources

---

## 1. Executive Summary

**One-liner:** A typing trainer that measures and trains the typing you *actually do* — emails, code, numbers, and writing from your own head — with honest metrics, adaptive coaching, and leaderboards you can trust.

**Why this could work (3 findings)**
1. Popular sites are either **tests** (Monkeytype, 10FastFingers, TypeRacer) or **fixed courses** (TypingClub, Ratatype). Very few combine *measurement + adaptive training + realistic tasks* in one product. [S14]
2. Default test text is easier than real work (common words, often no punctuation), and real work involves *composing*, which is slower than copying. One widely cited figure puts average transcription at ~33 WPM vs ~19 WPM for composition. [S12]
3. The loudest user complaints aren't about typing science. They're about **friction and trust**: ads, rigid pass/fail gates, cheaters, confusing billing. [S4, S6, S7, S8]

**Reality check (important)**
"Existing sites are too easy" is only *partly* true. Monkeytype already has punctuation, numbers, quotes, custom text, stricter difficulty levels, and a "practice missed/slow words" option. [S3] *(Correction to my earlier report, which listed Monkeytype as not adaptive at all. It's partial.)* So the gap is mostly **defaults, coaching, realistic tasks, and trust**, not the absence of hard text. If we only build "Monkeytype but harder", we lose. The product must win on these five pillars:

| # | Pillar | What it means |
|---|---|---|
| 1 | **Real-world tasks** | Email/chat, code, numbers, split-pane copying, and free composition |
| 2 | **Honest metrics** | Difficulty-normalized score so easy word lists can't inflate you |
| 3 | **Coaching loop** | Test → diagnose (per key/finger/bigram) → targeted drill → retest |
| 4 | **Trusted competition** | Server-verified results, transparent anti-cheat, appeals |
| 5 | **Respectful UX** | No ads/popups in the typing flow, no pay-to-win, no dark patterns |

---

## 2. Research Findings

### 2.1 Method and confidence
- **Sources:** product docs/architecture pages, Trustpilot / SmartCustomer / Common Sense reviews, AlternativeTo comments, GitHub repos (cheat scripts, keybr), forums, academic paper (Dhakal et al., CHI 2018), and vendor comparison blogs.
- **Caveats (read these):**
  - Review sites skew negative, and TypingClub/Nitro Type reviewers are often *school-assigned kids*. Adult power users are under-represented.
  - Several comparison blogs are written by competitors (TypingFastest, TypeQuicker, TypingTestGo). I used them only for *ideas*, not as proof.
  - Sources conflict in places (e.g., whether Monkeytype has multiplayer). Those are marked **[verify]**.
  - Prices change often. Verify before using any number.

### 2.2 Market snapshot (what people like / repeatedly complain about)

| Site | People like | Recurring complaint |
|---|---|---|
| Monkeytype | Clean, fast, customizable, free, no ads [S3] | Doesn't teach; no finger guidance or per-finger stats [S3] |
| Keybr | Adaptive per-key lessons, free [S5] | Punctuation/caps added all at once; pseudo-words feel unnatural [S5] |
| TypingClub | Structured, works for beginners, accessible [S4, S10] | Ads, rigid pass marks, kid-oriented, upsell prompts [S4] |
| 10FastFingers | Quick benchmark, competitions | Easy word list inflates WPM; bots/cheat scripts [S6] |
| TypeRacer | Real quotes, live racing | Cheating disputes, banned-legit-user complaints [S7] |
| Nitro Type | Very motivating, teams, cars | No teaching, cheaters, monetization complaints [S8] |
| Typing.io | Real code with symbols | Narrow, fixed snippets [S9] |
| Ratatype | Free, certificate | Fixed lessons, basic stats [S14] |

Public ratings seen: TypingClub ~1.3/5 (12 reviews, SmartCustomer), Nitro Type ~2.2–2.4/5 (~110 reviews, SmartCustomer), Monkeytype ~4.4/5 (Trustpilot, per one blog). Treat as directional only.

### 2.3 Pain-point catalog (what users complain about → what we build)

| ID | Pain point | Seen in |
|---|---|---|
| PP-01 | Ads/upsell prompts interrupt practice | TypingClub, Nitro Type [S4, S8] |
| PP-02 | Rigid pass thresholds; single attempt decides mastery (e.g., marked down for 39 vs 40 WPM; very high minimums on later lessons) | TypingClub [S4] |
| PP-03 | Childish/boring content for adults; forced games | TypingClub [S4, S13] |
| PP-04 | Fixed curriculum, not adaptive | TypingClub, Ratatype |
| PP-05 | Tests measure but don't teach; no technique guidance; no per-finger analytics | Monkeytype [S3] |
| PP-06 | Punctuation/capitals dumped in all at once; pseudo-words feel unnatural | Keybr [S5] |
| PP-07 | Easy defaults inflate scores; scores not comparable across sites (forum estimates of 10–30% inflation are anecdotal) | 10FastFingers, Monkeytype defaults [S6, S3] |
| PP-08 | Cheating/bots destroy leaderboard trust; bans feel arbitrary | 10FF, TypeRacer, Nitro Type [S6, S7, S8] |
| PP-09 | Racing rewards speed over accuracy; teaches nothing | Nitro Type [S8] |
| PP-10 | Monetization friction: perk-heavy paid tiers, surprise recurring charges | Nitro Type, TypingClub [S4, S8] |
| PP-11 | Weak post-test feedback: can't see what you typed; stats lost on retry | TypingClub [S4] |
| PP-12 | Lag/heavy pages (ads load fine, typing lags) | TypingClub [S4] |
| PP-13 | Progress tracking hidden behind account/premium | TypingClub [S4] |
| PP-14 | No integrated races on the clean minimal sites **[verify: sources conflict for Monkeytype]** | Monkeytype [S13] |
| PP-15 | Transcription ≠ real work; transfer to composition unmeasured | All [S12] |
| PP-16 | Accessibility patchy outside school-focused tools | Most test sites [S10] |
| PP-17 | No offline mode | TypingClub [S4] |
| PP-18 | Competitive design causes frustration/over-use | Nitro Type [S8] |
| PP-19 | Code typing tools narrow or dated | Typing.io [S9] |
| PP-20 | Exam-specific typing (net speed formulas, backspace rules, Indic layouts) served by many small fragmented sites | India exam sites [S11] |
| PP-21 | No place to give feedback | TypingClub [S4] |
| PP-22 | Keystroke timing is sensitive data; little transparency **[G]** | Industry-wide |

### 2.4 What the science says (and how it shapes the product)

| ID | Finding | Design implication |
|---|---|---|
| SC-1 | 136M keystrokes from 168k volunteers: letter pairs typed by **different hands/fingers** predict speed better than repeated letters [S1] | Track **bigram-level timing**; build drills around same-finger and hand-alternation pairs |
| SC-2 | **Rollover typing** (pressing the next key before releasing the last) is surprisingly common; typists cluster into ~8 distinct styles [S1] | Log keydown *and* keyup; don't assume one "correct" technique |
| SC-3 | Typists who make and correct fewer errors tend to be faster [S1] | Make **net** speed (including correction time) the headline number |
| SC-4 | Finger-count findings are mixed: fast typists use more fingers on average [S1], yet self-taught typists can match trained ones [S12] | Technique coaching is **optional and outcome-based**, not dogma |
| SC-5 | Copy typing is faster than composing (thinking pauses) [S12] | Add **composition mode** and a **transfer ratio** metric |
| SC-6 | "Typability" of text varies and matters even in copy tasks [S12] | Score every text for difficulty; normalize results |
| SC-7 | Keystroke latency patterns can identify people (used in biometrics research) [S1, G] | Treat keystroke logs as sensitive: minimize, expire, consent |

### 2.5 Gap analysis (short)
- **Real-world tasks:** mostly missing (quotes and code exist, but no composition, split-pane, or mixed business text).
- **Difficulty-normalized score:** none found.
- **Coaching loop:** Keybr is strongest, but weak on punctuation/real text; Monkeytype has partial weak-word practice.
- **Trust:** every popular competitive site has cheating complaints.
- **Accessibility:** strong in school tools, thin elsewhere.
- **Niche opportunity:** exam-style typing (India) is crowded with small tools; possible later module **[H]**.

### 2.6 Opportunity statement
> Typists at 30–80 WPM who type for work (students, developers, analysts, support/back-office) don't have one place that tells them **what is slowing them down in real tasks**, gives them **a plan**, and shows **progress they can trust**.

---

## 3. Users & Personas

| ID | Persona | Needs | Priority |
|---|---|---|---|
| P1 | **The Upgrader** (30–70 WPM, types for study/work) | Real-world speed, plateau-breaking, 15–30 min/day | **Primary** |
| P2 | **The Developer** (types code + prose; timed coding assessments) | Symbols, brackets, indentation, realistic code | **Primary** |
| P3 | **Adult re-learner** (hunt-and-peck) | Adult-friendly structured path, skip-ahead | Secondary |
| P4 | **Competitor** (100+ WPM) | Trusted leaderboards, deep analytics, races | Secondary |
| P5 | **Exam aspirant / transcriptionist** | Net-speed formulas, backspace rules, layouts | Later [H] |
| P6 | **Accessibility-first user** | One-handed tracks, screen reader, dyslexia support | Cross-cutting |
| P7 | **Coach/teacher/employer** | Assign plans, view progress, verified results | Later (B2B) |

**MVP focus:** P1 + P2. Everything else must not slow these two down.

---

## 4. Product Principles & Anti-Goals

**Principles**
1. **Type first.** Landing page *is* the test. No signup wall, no modal, no ad.
2. **Honest numbers.** Show classic WPM *and* real-world score; explain both.
3. **Diagnose, then prescribe.** Every result ends with "here's what to practice next."
4. **Fair play is a feature.** Verified results, visible policy, appeals.
5. **Your data is yours.** Export/delete anytime; minimal retention.
6. **Accessible by default.**
7. **Fast.** Input feels instant; core test works even if the backend is down.

**Anti-goals (we will NOT)**
- ❌ Show ads or upsell popups during typing or between exercises
- ❌ Sell paid competitive advantages (pay-to-win)
- ❌ Gate mastery on one attempt or one WPM point
- ❌ Force kid-themed games on adults
- ❌ Shame users for missed streaks
- ❌ Sell or share raw keystroke data
- ❌ Hide progress tracking behind a paywall

---

## 5. Scope & Release Plan (Summary)

| Release | Theme | Headline contents |
|---|---|---|
| **MVP (P0)** | *"Measure real typing, show what to fix"* | Engine, classic + real-world + code + numbers modes, results & heatmaps, basic adaptive drills, guest + accounts, server verification, history |
| **V1 (P1)** | *"Train, compete, stay consistent"* | Composition mode, races, leaderboards, daily plan, streaks, PWA/offline, accessibility pass, Pro plan |
| **V2 (P2)** | *"Scale and specialize"* | Teams/coach dashboards, certificates, API, more languages, exam module, extensions |

---

## 6. Functional Requirements

Format: **ID [priority]** requirement. *AC:* acceptance criteria. *Why:* pain point / science link.

### 6.1 ENG — Typing engine (core)

- **ENG-01 [P0]** Capture keydown/keyup with `performance.now()` timestamps and preserve event order. *AC:* log replays to the exact final text; timestamps are monotonic; overlapping keys (rollover) are recorded. *Why:* SC-1, SC-2.
- **ENG-02 [P0]** Render typing feedback within one display frame. *AC (target):* input-to-paint p95 ≤ 16 ms on a reference laptop (Chrome, 60 Hz); no network calls during a test; no layout thrash. *Why:* PP-12.
- **ENG-03 [P0]** Per-character states: correct / incorrect / extra / missed, at letter and word level. Configurable error modes: **free** (backspace allowed), **must-correct** (can't advance past an error), **stop-on-error**, **no-backspace** (exam style), **word-locked** (can't go back). *AC:* each mode has unit tests.
- **ENG-04 [P0]** Test starts on first keystroke and ends by timer/word count/final character. Losing focus pauses practice tests and invalidates ranked tests.
- **ENG-05 [P0]** All metrics computed by one **shared TypeScript library** run on both client and server. *AC:* golden test vectors give identical results on both.
- **ENG-06 [P0]** Layout-aware input using `event.code` vs `event.key`; handle dead keys, Caps Lock, Shift state, Unicode normalization; IME composition events handled or clearly unsupported. *AC:* passes QWERTY, Dvorak, Colemak, AZERTY test suites.
- **ENG-07 [P0]** Ranked mode ignores untrusted events (`isTrusted=false`), blocks paste/drop/autofill. *Why:* PP-08.
- **ENG-08 [P1]** Deterministic **replay** of any test with speed control, error markers, and heatmap overlay. *Why:* PP-11.
- **ENG-09 [P1]** Optional real-world editing keys in some modes (Ctrl+Backspace, Ctrl+Arrows); measure editing efficiency.
- **ENG-10 [P1]** **Ghost caret** racing your PB, a friend, or a top replay.
- **ENG-11 [P2]** Optional self-reported hardware profile (keyboard, switch type) for analytics.

### 6.2 MOD — Test modes

- **MOD-01 [P0]** **Classic:** time (15/30/60/120/custom), words (10/25/50/100/custom), quotes (short/medium/long), custom text.
- **MOD-02 [P0]** **Real-World Email/Chat:** realistic messages with mixed case, punctuation, names, URLs, digits. Short/medium/long variants. *Why:* PP-07, PP-15.
- **MOD-03 [P0]** **Code:** real snippets in JavaScript/TypeScript/JSX, Java, Python, SQL, HTML/CSS (initial set). Options: auto-indent on/off, auto-close-brackets on/off, tab handling. *AC:* symbols and indentation counted; results labeled per language. *Why:* PP-19.
- **MOD-04 [P0]** **Numbers & symbols:** IDs, dates, amounts, phone numbers, table-style rows; numpad option.
- **MOD-05 [P1]** **Composition mode:** prompt-based free writing (reply to an email, explain a concept, summarize a paragraph). Measures composition WPM, thinking pauses, backspace rate. No target text. *AC:* text not stored unless the user opts in. *Why:* PP-15, SC-5.
- **MOD-06 [P1]** **Endurance:** 5/10/30-minute sessions with a fatigue curve and optional rest.
- **MOD-07 [P1]** **Dictation/transcription:** listen (TTS or recorded audio) and type; adjustable playback speed.
- **MOD-08 [P1]** **Split-pane copying:** source text in one pane, your text in another (simulates copying from a doc/PDF; forces eyes-off-keyboard and context switching). *Why:* PP-15.
- **MOD-09 [P1]** Difficulty tiers (Normal / Strict / Master) and **presets** users can save and share.
- **MOD-10 [P2]** **Exam simulator:** rule packs (net speed formulas, backspace rules, timers, layouts, e.g., SSC/CPCT-style). Depends on validation. *Why:* PP-20.
- **MOD-11 [P1]** One-click **"practice my weak items"** mode (see LRN-02).

### 6.3 LRN — Learning & training

- **LRN-01 [P0]** **Placement test (≤ 3 min):** estimates speed, accuracy, hand-alternation efficiency; outputs a level and a plan; **skip-ahead** so adults aren't forced through beginner lessons. *Why:* PP-03.
- **LRN-02 [P0]** **Adaptive practice engine:** tracks per-key and per-bigram proficiency; generates practice from real sentences (and optional pseudo-words) weighted to weak items; user-set target speed. *Why:* PP-04, SC-1.
- **LRN-03 [P0]** **Gradual unlocking** of capitals, punctuation, digits, symbols, one or two at a time based on proficiency (default max 2 new keys at once). *Why:* PP-06.
- **LRN-04 [P1]** **Beginner course** (home row → all rows → numbers → symbols) with finger diagrams and posture tips; adult tone; games optional.
- **LRN-05 [P0]** **Flexible mastery:** thresholds user-adjustable; mastery based on trailing average (e.g., best 3 of last 5), not one attempt; "almost there" state instead of hard fail. *Why:* PP-02.
- **LRN-06 [P1]** **Targeted drills:** same-finger bigrams, hand-alternation, rollover trigrams, row jumps, reach keys, shift combos, punctuation neighbors. *Why:* SC-1.
- **LRN-07 [P1]** **Burst and rhythm training:** short sprints (10 words / 15 s), metronome cues, consistency drills, slow-to-fast pyramids.
- **LRN-08 [P1]** **Plateau detection:** flag stagnation (e.g., no trend improvement over 14 days) and recommend an intervention with reasons (harder text, accuracy focus, burst work).
- **LRN-09 [P1]** **Daily plan generator:** 10/20/30-minute sessions (warm-up → focus block → real-world block → cool-down) from weaknesses + goal.
- **LRN-10 [P1]** **Spaced repetition** for weak bigrams/words.
- **LRN-11 [P2]** **AI coach:** explains your analytics in plain language and suggests plans. Grounded only in the user's own stats; no medical claims.
- **LRN-12 [P0]** **Learn from errors:** after each test, list "you typed X, expected Y", top confusions (e.g., adjacent-key), and a one-click "practice these". *Why:* PP-05, PP-09, PP-11.

### 6.4 ANA — Analytics & insights

- **ANA-01 [P0]** **Results screen:** WPM, raw, net, accuracy, consistency, **rWPM** (Section 7), per-second graph, error markers, comparison to PB and trailing average.
- **ANA-02 [P0]** **Keyboard heatmaps:** per-key speed and error rate; per-finger and per-hand stats (standard finger map, user-adjustable). *Why:* PP-05.
- **ANA-03 [P0]** **Bigram/trigram table:** slowest and most error-prone sequences; same-hand vs alternate-hand comparison. *Why:* SC-1.
- **ANA-04 [P0]** **Trend charts:** 7/30-day rolling averages, PB history, practice minutes. Default view uses averages, not just PBs. *Why:* PP-13.
- **ANA-05 [P1]** **Error taxonomy:** substitution (adjacent-key vs other), omission, insertion, transposition, capitalization, punctuation.
- **ANA-06 [P1]** Inter-key-interval (IKI) distribution, rollover rate, correction-time share, pause analysis (pre-word and mid-word), fatigue curve.
- **ANA-07 [P1]** **Skill profile:** Burst, Sustained, Accuracy, Consistency, Code, Numbers, Composition, Transfer ratio.
- **ANA-08 [P1]** **Percentiles** vs a cohort at similar level (aggregated; privacy-safe).
- **ANA-09 [P1]** **Goal tracking:** target rWPM/WPM by a date with projected ETA from trend.
- **ANA-10 [P0]** **Export** (CSV/JSON) and full data deletion. *Why:* PP-22.
- **ANA-11 [P2]** Read-only public API, webhooks, embeddable badges.
- **ANA-12 [P1]** Weekly summary (in-app; email opt-in).

### 6.5 CNT — Content system

- **CNT-01 [P0]** Corpus pipeline with **license tracked per item**, dedupe, sensitive-content filter, tags (mode, language, difficulty, domain).
- **CNT-02 [P0]** **Typability score** per text (bigram/finger/shift/punctuation/digit features), used for difficulty bands and the rWPM normalization. *Why:* PP-07, SC-6.
- **CNT-03 [P0]** **Weakness-targeted selection by retrieval:** pick natural sentences that cover the user's weak bigrams (cheaper and more natural than generating gibberish). *Why:* PP-06.
- **CNT-04 [P0]** **Code snippet library:** permissive licenses only, attribution retained, syntax-validated, size-bounded, language-tagged.
- **CNT-05 [P1]** **Business/real-world corpora:** emails, chat, support tickets, meeting notes, invoices/tables (original or synthetic content, human-reviewed).
- **CNT-06 [P1]** User-submitted quotes/texts (moderation queue, rating, reporting); private custom text import (local-only option).
- **CNT-07 [P1]** Freshness: track seen items per user to avoid repeats; "daily passage".
- **CNT-08 [P2]** Domain packs (legal, medical terminology, transcription vocab, exam passages).
- **CNT-09 [P0]** Attribution page and takedown process.

### 6.6 CMP — Competition & social

- **CMP-01 [P1]** **Leaderboards:** daily/weekly/all-time; segmented by mode, difficulty tier, language; **verified results only** with an accuracy floor; show percentile for non-top users. *Why:* PP-08.
- **CMP-02 [P1]** **Real-time races** (2–5 players): quick match by skill bracket, private rooms by code, reconnect support. *Why:* PP-14.
- **CMP-03 [P1]** **Ghost races** vs PB/friends/top replays.
- **CMP-04 [P1]** **Accuracy-aware racing:** ranking by net speed, minimum accuracy to win, accuracy shown prominently, post-race coaching. *Why:* PP-09.
- **CMP-05 [P1]** Friends/follow; challenge links that use the same text seed.
- **CMP-06 [P2]** Leagues/seasons with skill brackets; clubs/teams.
- **CMP-07 [P2]** Tournaments with oversight tools and spectating.
- **CMP-08 [P1]** Shareable result cards (image/link).
- **CMP-09 [P1]** **Daily challenge** (same text for everyone).

### 6.7 MOT — Motivation & gamification

- **MOT-01 [P0]** **Streaks with grace/freeze;** a streak day = ≥ 5 focused minutes (not spam-clicking). *Why:* PP-18.
- **MOT-02 [P1]** XP/levels for practice quality and improvement, not just volume; badges for real skill (e.g., "≥ 98% accuracy on real-world mode, 5 times").
- **MOT-03 [P1]** **No pay-to-win:** paid items are cosmetic only. *Why:* PP-10.
- **MOT-04 [P0]** **Session summary:** what improved, what regressed, what to do next. *Why:* PP-09.
- **MOT-05 [P2]** Optional adult-friendly mini-games reinforcing drills; always toggle-off. *Why:* PP-03.

### 6.8 INT — Integrity / anti-cheat (details in Section 11)

- **INT-01 [P0]** Server **recomputes** all metrics from the raw log; reject mismatches.
- **INT-02 [P0]** Plausibility checks: physical key-rate limits, minimum IKIs, impossible rollover, timing-distribution tests, machine-like regularity.
- **INT-03 [P0]** **Signed test sessions:** server issues seed/nonce/text hash at start; submissions must arrive within a TTL; prevents replaying old logs.
- **INT-04 [P1]** Risk-scoring workers; flagged results **held off leaderboards** pending review, with user-visible "under review" status.
- **INT-05 [P1]** **Verification re-test** for top-N or suspicious results (fresh text, tolerance band); optional video proof for top ranks.
- **INT-06 [P1]** **Appeals and transparency:** public policy, reason categories, appeal form; track false-positive rate. *Why:* PP-08 (banned-legit-user complaints).
- **INT-07 [P1]** Separate **ranked** (strict rules) from **practice** (relaxed) modes.
- **INT-08 [P2]** Community reports, moderator replay-review UI, ML on IKI features trained on known bot traces.
- **INT-09 [P0]** Rate limiting and abuse protection (per IP/account/device); CAPTCHA only as an anomaly fallback, never in the normal flow.

### 6.9 USR — Accounts, profile, privacy

- **USR-01 [P0]** **Guest mode:** full core experience with no signup; history in local storage; non-blocking prompt to save. *Why:* PP-13.
- **USR-02 [P0]** Sign-up/login: email + OAuth (Google, GitHub); password reset; session management.
- **USR-03 [P0]** Profile: stats, PBs, activity calendar, badges; privacy toggles (public/private, hide from leaderboards).
- **USR-04 [P0]** **Privacy controls:** consent for research use, export/delete, default retention limits for raw keystroke logs. *Why:* PP-22, SC-7.
- **USR-05 [P1]** Cross-device sync for settings/progress with conflict handling.
- **USR-06 [P1]** Age policy: **superseded by the master spec: 18+ only at launch.**
- **USR-07 [P2]** Organizations/classes (see BIZ-04).

### 6.10 CUS — Customization & UX

- **CUS-01 [P0]** **Instant start:** the home page is the test; no ads/popups/modals on the typing surface. *Why:* PP-01.
- **CUS-02 [P0]** Light/dark themes plus a few presets, font choice/size, caret style, focus mode, live-stats toggle.
- **CUS-03 [P1]** Theme builder, sound packs (key clicks), smooth caret, animation toggle.
- **CUS-04 [P1]** Full keyboard navigation and shortcuts (restart, next test); saved presets.
- **CUS-05 [P1]** Optional on-screen keyboard/hand overlay for learners. *Why:* PP-05.
- **CUS-06 [P2]** Command palette (Ctrl/Cmd+K).

### 6.11 A11 — Accessibility

- **A11-01 [P0]** WCAG 2.2 AA for all non-test UI; typing surface has adequate contrast, text scalable to 200%, respects reduced-motion and color-scheme preferences.
- **A11-02 [P1]** Screen-reader-friendly guided mode with audio cues; careful use of ARIA live regions.
- **A11-03 [P1]** **One-handed learning tracks** (left/right). *Why:* set by Typing.com / TypingTraining [S10].
- **A11-04 [P1]** Dyslexia-friendly font option, adjustable spacing, high-contrast and color-blind-safe palettes (including heatmaps).
- **A11-05 [P1]** No-timer practice, adjustable targets, sticky-keys support, no penalty for slow input.
- **A11-06 [P2]** Audio feedback options and captions for any video content.

### 6.12 LOC — Layouts & languages

- **LOC-01 [P0]** Layouts: QWERTY (US/UK), Dvorak, Colemak/Colemak-DH, AZERTY, QWERTZ; layout-aware finger mapping; custom layout via JSON.
- **LOC-02 [P1]** Languages as content packs (English first; then Spanish, French, German, Hindi, etc.).
- **LOC-03 [P2]** Indic scripts with Inscript / Remington GAIL / Krutidev layouts and exam rules [S11]. *Why:* PP-20.
- **LOC-04 [P1]** Locale-appropriate number/date/currency formats in real-world text.

### 6.13 MOB — Mobile & offline

- **MOB-01 [P0]** Responsive site; on phones, be honest that physical keyboards are the primary target.
- **MOB-02 [P1]** **PWA:** installable, offline practice with cached content, results sync when online. *Why:* PP-17.
- **MOB-03 [P1]** Separate **mobile thumb-typing** mode and leaderboard (autocorrect handling; separate metrics).
- **MOB-04 [P2]** Native wrapper if demand exists.

### 6.14 WEL — Wellbeing & ergonomics

- **WEL-01 [P1]** Configurable break reminders and session-length guidance.
- **WEL-02 [P1]** **Fatigue detection:** if accuracy/consistency drops sharply mid-session, suggest stopping.
- **WEL-03 [P1]** Ergonomics tips/checklist (no medical claims).
- **WEL-04 [P2]** Healthy-competition guardrails: optional daily race caps, "session complete" screens. *Why:* PP-18.

### 6.15 BIZ — Monetization & business

- **BIZ-01 [P0]** **Free core:** all test modes, basic analytics, and progress history free. No interstitial ads or upsell popups in flow. *Why:* PP-01, PP-13.
- **BIZ-02 [P1]** **Pro:** deep analytics, exports, AI coach, unlimited custom drills, cloud replays. Transparent pricing, one-click cancel, renewal reminder emails. *Why:* PP-10.
- **BIZ-03 [P1]** **Verified certificate** (shareable URL) with re-test/proctored option.
- **BIZ-04 [P2]** Teams/classes: coach assigns plans, sees progress, exports; SSO.
- **BIZ-05 [P2]** Employer typing assessment via invite links with integrity checks.
- **BIZ-06 [P2]** Donations/sponsors (community model).

### 6.16 ADM — Admin & operations

- **ADM-01 [P0]** Admin console: content CRUD, feature flags, user lookup, result review, cheat-flag queue.
- **ADM-02 [P1]** Moderation tools for user content/quotes, report handling, audit log.
- **ADM-03 [P1]** In-app **feedback widget**, public roadmap, and changelog. *Why:* PP-21.
- **ADM-04 [P1]** A/B experimentation framework with guardrail metrics.

### 6.17 EXT — Integrations & extensions

- **EXT-01 [P2]** Public API with personal API keys (rate-limited); Discord bot.
- **EXT-02 [P2]** **Opt-in browser extension** measuring real-world typing in web apps: local-only, timing aggregates only, **no content capture**. Privacy-critical **[H]**.
- **EXT-03 [P2]** VS Code / JetBrains plugin for code-typing stats (local-only). *Why:* PP-19.
- **EXT-04 [P2]** Embeddable widgets for blogs/LMS.

---

## 7. Metrics Spec (Proposed)

> These are **proposals**. Define exact formulas in code, publish them on a public "How we calculate" page, and calibrate with real data.

### 7.1 Core definitions
- **Word:** 5 characters (including spaces and punctuation).
- **Raw WPM** = (all printable keystrokes ÷ 5) ÷ minutes.
- **Gross WPM** = (characters in the final typed text ÷ 5) ÷ minutes.
- **Net WPM** = (*correct* characters in the final text ÷ 5) ÷ minutes. Correction time is included automatically because the clock keeps running.
- **Keystroke accuracy** = correct keystrokes ÷ total keystrokes (corrected mistakes still count as mistakes).
- **Final accuracy** = correct characters ÷ total characters at test end.
- **Consistency** (proposal) = 100 × (1 − CV) of per-second net speed, where CV = standard deviation ÷ mean, clamped to 0–100.
- **Burst WPM** = best rolling 5-second window.
- **Exam net speed** (exam mode only): follows the exam's own published formula (e.g., character-based net speed used by several Indian government exams [S11]). Rules vary by notification; always verify.

### 7.2 Real-World Score (rWPM) — the differentiator
**Goal:** one number comparable across modes and text types, so easy word lists can't inflate you and hard code isn't unfairly punished.

- **rWPM = Net WPM × D**
- **D (difficulty factor)** = expected typing time for a *reference real-world prose sample* ÷ expected typing time for *this* text, both estimated by a bigram-level timing model.
  - D < 1 for easy text (e.g., top-200 lowercase words) → discount.
  - D ≈ 1 for normal mixed-case business prose.
  - D > 1 for code/symbol-heavy text → credit.
- **Timing model:** start with a feature model (bigram class: same-finger, same-hand, alternate-hand; shift; punctuation; digits; symbols). Seed it from the public dataset released with the CHI 2018 study (**check license/terms first**) [S1], then refit on our own data.
- **Display:** always show classic WPM *next to* rWPM. Tooltip explains the difference. (Risk: harder text lowers numbers and can feel bad. Mitigate with framing: "your real-world level".)
- **Publish:** formula, model version, and changelog. Version the model so old scores stay comparable.

### 7.3 Companion metrics
- **Composition WPM (cWPM)** = characters in final composed text ÷ 5 ÷ total minutes (including thinking).
- **Typing-burst WPM in composition** = speed during active bursts (pauses < 2 s).
- **Transfer ratio** = cWPM ÷ copy-typing rWPM. Shows how much thinking, not fingers, is your bottleneck. [S12, SC-5]
- **Sustained WPM** = rWPM over a 10-minute endurance test.
- **Correction cost** = share of time spent on errors and backspacing.

### 7.4 Ranking rules
- Leaderboards use **verified** results only, an **accuracy floor** (e.g., ≥ 92%, tunable), and segment by mode/difficulty tier.
- Races: winner by net speed among finishers above the accuracy floor.

---

## 8. Non-Functional Requirements

| ID | Area | Requirement (targets are my proposals) |
|---|---|---|
| NFR-01 | Input latency | p95 input-to-paint ≤ 16 ms (desktop reference); measured in CI with a synthetic harness |
| NFR-02 | Load | Typing page interactive ≤ 1.5 s on a mid-range phone over 4G; test-page JS ≤ ~200 KB gzip |
| NFR-03 | Offline safety | Core tests run even if the backend is down; results queue and sync later |
| NFR-04 | API latency | Result submit p95 ≤ 500 ms; leaderboard read p95 ≤ 200 ms |
| NFR-05 | Realtime | Race message latency p95 ≤ 100 ms (same region) |
| NFR-06 | Availability | 99.9% monthly for API (after MVP) |
| NFR-07 | Scalability | Design for 100k DAU × 5 tests/day (~6 writes/s average, ~60/s peak); see storage note below |
| NFR-08 | Security | OWASP ASVS L1→L2, HTTPS + HSTS, strict CSP, rate limiting, dependency scanning, hashed passwords (argon2/bcrypt) or delegated OAuth |
| NFR-09 | Privacy | GDPR + India DPDP-aware; no third-party trackers in the test flow; privacy-friendly analytics; consent for research use |
| NFR-10 | Compatibility | Latest 2 versions of Chrome, Edge, Firefox, Safari; iOS Safari/Chrome on mobile |
| NFR-11 | Accessibility | WCAG 2.2 AA (non-test UI) |
| NFR-12 | Testing | Unit + property tests for metrics; Playwright e2e with synthetic keystrokes; load tests for races (k6/Artillery); visual regression |
| NFR-13 | Observability | Structured logs, metrics, tracing, error tracking (e.g., Sentry), dashboards, alerting |
| NFR-14 | i18n | Externalized strings; RTL-ready design |
| NFR-15 | Docs | Public "How we calculate", privacy page, anti-cheat policy, API docs |

**Storage estimate [G]:** a 60 s test at ~80 WPM ≈ 400 keystrokes; delta-encoded and compressed, roughly 2–3 KB. At 500k tests/day that's ~1.5 GB/day raw, ~135 GB for a 90-day window. Mitigation: keep raw logs only for ranked/flagged/top results, expire the rest, and keep aggregates forever.

---

## 9. Architecture & Tech Stack

### 9.1 Reference: how Monkeytype is built [S2]
Frontend in TypeScript; backend Node.js/Express; **MongoDB** for users/results/configs; **Redis** for caching, leaderboards, and rate limiting (with Lua scripts for atomic ops); **BullMQ** background jobs; Firebase Auth; Zod schemas and ts-rest contracts shared between client and server; a dedicated anti-cheat module in the backend. This is very close to a MERN + TypeScript setup, which is good news.

### 9.2 Recommended stack (MERN-compatible)
| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + TypeScript + Vite | Next.js only if you want SEO landing pages |
| Typing engine | Framework-agnostic TS package | Pure functions, shared with server for validation |
| Rendering | DOM spans first; canvas only if profiling demands | Avoid re-rendering the whole text per keystroke |
| State | Zustand (or Redux Toolkit) | Keep engine state outside React render loop |
| Styling | Tailwind + CSS variables | Variables make theming easy |
| Charts | Recharts / Chart.js / visx | Heatmaps via SVG |
| Offline | Service worker + IndexedDB (Dexie) | PWA |
| Heavy analysis | Web Workers | Keep UI thread free |
| API | Node.js + Express or Fastify + TypeScript | Shared Zod schemas; ts-rest or tRPC |
| DB | MongoDB (Atlas) | users, results, progress, content |
| Cache/realtime state | Redis | Sorted sets for leaderboards, rate limits, race rooms, pub/sub |
| Realtime | Socket.IO or `ws` | Server-authoritative race start |
| Jobs | BullMQ workers | Anti-cheat scoring, aggregates, emails |
| Auth | Firebase Auth or Auth.js/Passport + JWT | Google + GitHub OAuth |
| Storage | S3 / Cloudflare R2 | Replay blobs, backups |
| Infra | Vercel/Cloudflare (web), Render/Fly/AWS (API), GitHub Actions CI | Start simple |
| Monitoring | Sentry + Prometheus/Grafana (or managed) | |

### 9.3 High-level diagram
```
[Browser SPA / PWA]
  ├─ Typing engine (TS lib)        ── shared with server
  ├─ IndexedDB (offline results)
  ├─ HTTPS ──────────────►  [API: Node/Express/TS] ─► [MongoDB]
  │                              ├─► [Redis]  leaderboards, rate limits, cache
  │                              └─► [Queue: BullMQ] ─► [Workers]
  │                                                     ├─ anti-cheat scoring
  │                                                     ├─ stats aggregation
  │                                                     └─ email / weekly summaries
  └─ WebSocket ──────────►  [Realtime service] ◄─► Redis pub/sub
                                             └─► [Object storage] replay blobs
```

### 9.4 Race protocol (sketch)
1. Server creates room, picks text + seed, sets a **server-authoritative start time**.
2. Clients send progress (char index + timestamp) every 100–250 ms.
3. Server checks monotonicity/plausibility and broadcasts positions.
4. On finish, client uploads the full keystroke log; server recomputes results (INT-01) and posts final standings.
5. Reconnect: client resumes from last acknowledged index within a grace window.

---

## 10. Data Model & API Sketch

### 10.1 Collections
| Collection | Key fields | Notes |
|---|---|---|
| `users` | id, auth ids, display name, privacy flags, settings, layout, consent flags, createdAt | Minimal PII |
| `results` | id, userId, mode, textId/textHash, durationMs, wpm, raw, net, accuracy, consistency, rWPM, diffFactor, modelVersion, verified, flags, createdAt | Summary only |
| `keystroke_logs` | resultId, encoded events, sessionNonce, TTL | Short TTL (e.g., 30–90 days); object storage for large volumes |
| `key_stats` | userId, per-key/bigram/trigram aggregates (rolling) | Powers heatmaps and drills |
| `progress` | userId, lesson/proficiency state, goals, streaks | |
| `content` | id, type, language, text, source, license, difficulty, tags, status | Moderation state |
| `races` | id, players, seed, startAt, results | |
| `leaderboards` | snapshot documents; live data in Redis sorted sets | |
| `achievements` | userId, badge, awardedAt | |
| `reports` / `reviews` | result/user reports, moderator decisions, appeals | Audit trail |
| `feedback` | userId?, text, page, createdAt | |

### 10.2 Keystroke event encoding (proposal)
`[deltaMs, keyIndex, flags]` where flags carry down/up, modifiers, and correctness. Sign the payload with the session nonce; gzip before upload.

### 10.3 Result document (example)
```json
{
  "userId": "u_123",
  "mode": "realworld-email",
  "durationMs": 60000,
  "wpm": 62.4, "raw": 68.1, "net": 60.9,
  "accuracy": 96.2, "consistency": 81.5,
  "diffFactor": 1.08, "rWPM": 65.8, "modelVersion": "d-0.1",
  "verified": true, "flags": []
}
```

### 10.4 API surface (sketch)
- `POST /sessions` → start signed session (seed, nonce, text ref, TTL)
- `POST /results` → submit log; server recomputes, returns result + coaching
- `GET /me/stats`, `GET /me/keys`, `GET /me/bigrams`, `GET /me/trends`
- `GET /content/next?mode=&difficulty=&weakness=1`
- `POST /lessons/:id/attempt`
- `GET /leaderboards/:board`, `POST /reports`, `POST /appeals`
- `GET /me/export`, `DELETE /me`
- WebSocket `/race`: `join`, `progress`, `finish`, `standings`

---

## 11. Anti-Cheat Design

**Why it matters:** Cheating is the #1 trust complaint across competitive sites. Public scripts auto-type on 10FastFingers and even defeat its image-based check with OCR. Commercial Nitro Type bots are sold openly, advertising "human-like" timing and adjustable speed. TypeRacer users argue about both missed cheaters and wrongly banned typists. [S6, S7, S8]

**Threat model**
| Threat | Example |
|---|---|
| T1 Script/extension injection | Userscripts that type for you |
| T2 Forged submissions | Calling the API directly with made-up results |
| T3 Assisted typing | OCR + automation tools |
| T4 Humanized bots | Bots with random jitter and a "target WPM" dial |
| T5 Multi-accounting / boosting | Farming leaderboards or race points |

**Defense in depth**
1. **Raise the cost:** signed sessions, TTL, single-use nonces, trusted-event checks, no paste. (Stops T2 and lazy T1.)
2. **Deterministic checks:** server recompute; physical key-rate limits; impossible rollover; minimum IKIs.
3. **Statistical checks:** human IKI distributions are right-skewed and depend on bigram type (hand-alternation vs same-hand differ measurably) [S1]. Many bots ignore this dependence or show unnaturally low variance. Flag those. (Targets T4.)
4. **Account behavior:** sudden jumps vs history, device/IP patterns, race-farming patterns. (Targets T5.)
5. **Human review:** replay review for top ranks and flagged results; **verification re-test** or video for record-level claims.
6. **Policy:** public rules, categorized ban reasons, appeals; shadow-hold flagged scores rather than instant permanent bans when unsure.

**Honest expectation:** no system is perfect (T3/T4 can't be fully stopped). Goals: make cheating expensive, keep false positives very low (measure it), and be transparent so honest fast typists trust the board.

---

## 12. UX / Screens

**Key screens:** Home/Test · Results · Replay · Dashboard (Today's plan, Progress, Weakness map) · Learn (path) · Practice (mode picker) · Race lobby · Leaderboards · Profile · Settings · Content submission · Admin.

**Core flow (guest → habit)**
1. Land on the test → start typing immediately.
2. Results: WPM + rWPM + accuracy + **"Your 3 weak spots"** + one-click practice.
3. Non-blocking prompt to save progress (account).
4. Dashboard: today's 15-minute plan.
5. Return next day: streak + trend + new goal ETA.

**Results screen layout (mobile-first order)**
1. Headline: rWPM and WPM, accuracy
2. Per-second speed graph with error markers
3. "What to fix" card (top keys/bigrams/error types) + Practice button
4. Comparison vs PB / 7-day average
5. Details (raw, consistency, burst, replay link)

**Defaults**
- Default test: **60 s Real-World mixed text**; **Classic (common words)** is one click away.
- Live stats hidden by default in focus mode (toggle on).

---

## 13. KPIs & Analytics

| Type | Metric |
|---|---|
| **North star** | Median 30-day rWPM gain among users practicing ≥ 3 days/week |
| Activation | % of visitors completing a first test; % viewing weak-spot report |
| Engagement | Weekly practicing users; avg focused minutes/week; drill completion rate |
| Retention | D1 / D7 / D30 |
| Quality | Test completion rate; replay views; goal attainment |
| Integrity | % results flagged; false-positive rate (from appeals/verification) |
| Performance | Input-to-paint p95; API p95; crash-free sessions |
| Business | Free→Pro conversion; refund/cancel rate; support tickets per 1k users |
| Satisfaction | NPS / in-app rating; feedback themes |

Use privacy-friendly analytics; never track keystroke *content* for product analytics.

---

## 14. Monetization

**Model:** free core (no ads in flow) + optional Pro + later B2B.

| Tier | Contents |
|---|---|
| **Free** | All modes, basic analytics, progress history, races, daily plan |
| **Pro** | Deep bigram/trigram analytics, exports, AI coach, unlimited custom drills, cloud replays, cosmetic perks |
| **Teams/Orgs** | Coach dashboards, assigned plans, SSO, verified assessments |
| **Certificates** | Verified shareable certificate; proctored/re-test option |

**Price context (directional, verify):** TypingClub Premium ≈ $78/yr on one listing; Nitro Type Gold ≈ $9.99/yr per one review site, ≈ $2.99/mo per a reviewer; Typing.io from ≈ $9.99/mo on one listing; TypeQuicker from ≈ $12.50/mo (vendor). Set price only after willingness-to-pay research.

**Rules:** transparent billing, easy cancellation, renewal reminder emails, no pay-to-win.

**Open-source question:** Monkeytype and Keybr are open-source and community-loved. Consider open-sourcing the typing engine/metrics library to earn trust and contributions while keeping hosted services/premium closed **[decision]**.

---

## 15. Roadmap (rough, assumes 1 full-time dev; a part-time student should multiply by ~2–3)

| Phase | Weeks | Deliverables |
|---|---|---|
| **0. Validate** | 0–2 | 10–15 user interviews; survey; usage teardown of competitors; landing page + waitlist; spikes: input latency, keystroke logging, metrics library, rWPM prototype |
| **1. MVP (P0)** | 3–10 | Engine + classic/real-world/code/numbers modes; results + heatmaps + bigram table; placement test; basic adaptive drills; guest + accounts; signed sessions + server verification; history; deploy |
| **2. V1 (P1)** | 11–18 | Composition mode; races + leaderboards + daily challenge; daily plan + streaks; PWA/offline; accessibility pass; Pro plan; feedback widget/roadmap |
| **3. V2 (P2)** | 19–30 | Teams/coach; certificates; public API; more languages; exam module (if validated); extensions |

**MVP cut rule:** if a feature isn't needed to test the "real-world measure + diagnose + drill" loop, it's not MVP.

---

## 16. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Crowded market; Monkeytype is strong and free** | Low adoption | Differentiate on real-world tasks, rWPM, coaching loop; validate with interviews before building |
| **rWPM feels confusing or demotivating** | Churn | Show classic WPM alongside; clear explanation; A/B test framing |
| **rWPM model is inaccurate** | Trust loss | Seed with public data, refit, publish versions, allow feedback |
| **Cheating on leaderboards** | Trust loss | Section 11; ship verification before public leaderboards |
| **Cold start (empty boards/races)** | Feels dead | Ghost races, daily challenge, personal progress first |
| **Content licensing/copyright** | Legal | Track license per item; permissive/public-domain/original content; takedown flow |
| **Keystroke data privacy** | Legal/trust | Minimize, expire, consent, no content capture, export/delete |
| **Input latency/IME edge cases** | Bad feel | Measure early; browser test matrix; document unsupported IME cases |
| **Scope creep** | Never ships | MVP cut rule; roadmap gates |
| **Monetization backlash** | Reputation | Anti-goals in Section 4; transparent billing |
| **LLM cost/quality** (if used for content or coach) | Cost/quality | Prefer retrieval over generation; cache; human review; cap usage |
| **Solo-dev burnout** | Delays | Small phases; automate tests; use managed services |

---

## 17. Validation Plan & Open Decisions

### 17.1 Hypotheses to test
- **H1:** Users understand and value rWPM vs plain WPM. *Test:* prototype + 10 interviews.
- **H2:** Real-sentence weakness drills improve weak-bigram speed faster than random text. *Test:* A/B over 2–4 weeks.
- **H3:** Composition metrics correlate with users' self-reported work typing and aren't just noise. *Test:* n ≥ 50 beta users.
- **H4:** Anti-cheat false positives stay under a set threshold (e.g., < 0.5%) for legit fast typists. *Test:* recruit known high-WPM typists.
- **H5:** Users will accept a real-world default text (lower numbers) if guidance is good. *Test:* default-mode A/B.
- **H6:** Willingness to pay for Pro exists. *Test:* waitlist pricing test.

### 17.2 Interview questions (starter)
1. What do you use to practice typing today, and why?
2. What made you stop using the ones you quit?
3. Do you feel your test WPM matches your real typing at work/study? Why or why not?
4. What do you do after a test to improve? What's missing?
5. Have you seen cheating? How did it affect your trust?
6. What would make you pay for a typing tool? What would make you leave?
7. Do you code? Which symbols/keys slow you down most?

### 17.3 Open decisions
1. Final name, domain, branding.
2. Open-source (engine only / whole project) vs closed.
3. Target age range (adult-first vs teens).
4. Exam/Indic-language module: yes/no/when.
5. Use of LLMs: content generation, coaching, both, neither.
6. Raw keystroke log retention period (30 vs 90 days).
7. Mobile scope for MVP.
8. Hosting/region (latency for races).

---

## Appendix A — Pain Point → Requirement Traceability

| Pain point | Requirements |
|---|---|
| PP-01 Ads/upsell | CUS-01, BIZ-01, BIZ-02 |
| PP-02 Rigid pass marks | LRN-05, A11-05 |
| PP-03 Childish for adults | LRN-01, LRN-04, MOT-05 |
| PP-04 Fixed curriculum | LRN-02, LRN-06, LRN-09 |
| PP-05 Tests don't teach | ANA-02, ANA-03, LRN-08, LRN-12, CUS-05 |
| PP-06 Keybr punctuation/pseudo-words | LRN-03, CNT-03 |
| PP-07 Inflated easy tests | CNT-02, §7.2 (rWPM), MOD-02/03/04/09 |
| PP-08 Cheating/bans | INT-01…INT-09, CMP-01 |
| PP-09 Speed over accuracy | CMP-04, LRN-12, MOT-04 |
| PP-10 Monetization friction | MOT-03, BIZ-02 |
| PP-11 Weak feedback | ENG-08, LRN-12, ANA-01, ANA-05 |
| PP-12 Lag | ENG-02, NFR-01, NFR-02 |
| PP-13 Progress gated | USR-01, BIZ-01, ANA-04 |
| PP-14 No integrated races | CMP-02, CMP-03 |
| PP-15 Transcription ≠ real work | MOD-02, MOD-05, MOD-08, ANA-07, §7.3 |
| PP-16 Accessibility | A11-01…A11-06 |
| PP-17 No offline | MOB-02, NFR-03 |
| PP-18 Over-competitive/frustration | MOT-01, WEL-04, CMP-06 |
| PP-19 Code tools narrow | MOD-03, CNT-04, EXT-03 |
| PP-20 Exam niche | MOD-10, LOC-03 |
| PP-21 No feedback channel | ADM-03 |
| PP-22 Keystroke privacy | USR-04, ANA-10, NFR-09 |

## Appendix B — Capability Gap Table (from public information; verify before relying)

| Capability | Who does it today | Gap / opportunity |
|---|---|---|
| Teach touch typing from zero | TypingClub, Ratatype, Keybr | Adult-friendly, adaptive, skip-ahead in one product |
| Adaptive weak-key practice | Keybr; Monkeytype (partial: missed/slow words) | Real sentences, punctuation/caps progression, bigram-level |
| Realistic mixed text | Quotes (TypeRacer/Nitro Type), code (Typing.io) | Email/chat/business, composition, split-pane |
| Difficulty-normalized score | None found | rWPM |
| Race/compete | TypeRacer, Nitro Type; Monkeytype **[verify]** | Accuracy-aware, verified, coaching after races |
| Visible anti-cheat | 10FF (image test, bypassable), Nitro Type (claims auto-ban) | Layered, transparent, appealable |
| Code typing | Typing.io | Modern languages, editor-realistic options |
| Accessibility | TypingClub, Typing.com | Make it standard everywhere |
| Offline | Not found | PWA |
| Exam-style rules | Many small India-focused sites | Optional module, one polished product |

## Appendix C — Glossary
- **WPM:** words per minute (1 word = 5 characters).
- **Raw / Gross / Net WPM:** see §7.1.
- **rWPM:** Real-World Score, difficulty-normalized net WPM (§7.2).
- **IKI:** inter-key interval, time between consecutive keystrokes.
- **Bigram/Trigram:** sequence of 2/3 characters.
- **Rollover:** pressing the next key before releasing the previous one.
- **Consistency:** stability of speed within a test (§7.1).
- **Typability:** how hard a given text is to type.
- **Ranked vs Practice:** strict verified mode vs relaxed mode.
- **PWA:** progressive web app (installable, offline-capable).

## Appendix D — Sources

**Research and architecture**
- [S1] Dhakal et al., *Observations on Typing from 136 Million Keystrokes* (CHI 2018): https://userinterfaces.aalto.fi/136Mkeystrokes/ and https://research.aalto.fi/en/publications/observations-on-typing-from-136-million-keystrokes/
- [S2] Monkeytype architecture docs (community-maintained): https://www.mintlify.com/monkeytypegame/monkeytype/architecture/overview · /architecture/database · /architecture/backend

**Reviews and feedback**
- [S3] Monkeytype reviews/critiques: https://cosmickeys.app/en/blog/monkeytype-review · https://www.geniusfirms.com/blog/is-monkeytype-good-for-typing-practice-honest-review/ · Monkeytype site (practice missed/slow words option): https://monkeytype.com/
- [S4] TypingClub reviews: https://uk.trustpilot.com/review/www.typingclub.com · https://www.trustpilot.com/review/www.typingclub.com?page=2 · https://www.smartcustomer.com/reviews/typingclub.com · https://www.commonsensemedia.org/website-reviews/typingclub/user-reviews/adult · https://screenwiseapp.com/media/typing-club-app
- [S5] Keybr feedback (AlternativeTo): https://alternativeto.net/software/keybr/about · method: https://github.com/mibac138/keybr.com
- [S6] 10FastFingers cheating tools and score-inflation discussion: https://github.com/FarisHijazi/10FastFingers_BotAntiAntiCheat · https://github.com/hackermancool/TypeCheat · https://forums.anandtech.com/threads/how-fast-do-you-type.2333087/post-35310008
- [S7] TypeRacer cheating/ban discussion: https://blog.typeracer.com/2015/08/04/bad-news-for-cheaters-on-typeracer-and-other-new-improvements/
- [S8] Nitro Type reviews: https://www.trustpilot.com/review/nitrotype.com · https://www.commonsense.org/education/reviews/nitro-type/teacher-reviews/4135741 · https://www.smartcustomer.com/reviews/nitrotype.com · support page: https://www.nitrotype.com/support · example paid bot listing: https://prabhakar101.gumroad.com/l/nitrotypehack
- [S9] Typing.io: https://typing.io/
- [S10] Accessibility: https://www.typing.com/whats-new/1752764463/empower-every-learner-introducing-enhanced-accessibility-options · https://typingtraining.com/one-handed-typing.html · https://www.monmouthshire.gov.uk/touchtyping · TypingClub accessibility overview (WSSB): https://www.wssb.wa.gov/sites/default/files/2021-08/AccessibleTypingClub.docx
- [S11] India exam typing sites: https://multityping.in/test · https://typingsikho.com/ · https://www.typekaksha.in/practice/hindi · https://www.easyhindityping.com/typing/hindi-typing-test
- [S12] Composition vs transcription and typability: https://en.wikipedia.org/wiki/Typing · https://pmc.ncbi.nlm.nih.gov/articles/PMC12901113/
- [S13] Vendor/competitor comparison blogs (treat as biased): https://typingfastest.com/blog/best-monkeytype-alternatives-2026-tested-7-sites · https://www.typequicker.com/compare/typingclub-alternatives · https://typingtestgo.com/guides/typing-test-comparison · https://tooldex.org/pages/monkeytype
- [S14] My earlier report: *typing-websites-analysis.md* (site-by-site comparison)

*Note: figures such as ratings, prices, and thresholds come from third-party pages of varying dates and may have changed. Latency, capacity, and score-formula numbers in this document are **proposed targets**, not measured facts.*
