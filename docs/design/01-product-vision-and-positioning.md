# 01 — Product Vision & Positioning

## 1. Problem statement
Most typing sites optimise for **a satisfying WPM number**, not **useful real-world skill**:
- Tests use common English words → inflated WPM that collapses when you type emails, names, passwords, numbers, code.
- Tutors (TypingClub-style) are slow-paced, gamified for kids, and stop teaching at the alphabet.
- Adaptive trainers (Keybr-style) model *single keys* but not *transitions* (bigrams/trigrams), and use pseudo-words only.
- Almost none train **symbols, numbers, number systems, brackets, shift/AltGr, naming conventions**, and few measure backspace/correction cost honestly.
- Analytics stop at WPM/accuracy graphs. Users don't learn *what to fix next*.

## 2. Target users (priority order)
1. **Student/fresher developers** (primary; e.g. final-year CS students preparing for SDE roles) — need symbols, brackets, camelCase/snake_case, number bases, shell/git/SQL/regex fluency.
2. **Working developers/sysadmins/data folks** — plateau at 60–80 WPM on prose, much lower on code.
3. **Knowledge workers/writers/support staff** — want accuracy + sustained speed on real text.
4. **Typing enthusiasts/keyboard hobbyists** — love themes, sounds, layouts (Colemak/Dvorak/Workman), stats depth.
5. **Beginners** — need a gentle on-ramp that does not feel childish.

## 3. Promise (one line)
> **"Type like you actually work."** Train the keys, pairs, symbols and rhythm that real work demands — and see exactly what to fix next.

## 4. Product principles (decision filters)
1. **Honest numbers.** Never inflate. Show Net WPM, raw WPM, accuracy, consistency; errors cost you. Separate "prose WPM" from "code WPM" from "symbol WPM".
2. **Practice is the homepage.** Time-to-first-keystroke ≤ 2 seconds, no login, no modal.
3. **Show the why.** Every result ends with 1–3 concrete, ranked "fix this next" recommendations.
4. **Hard by default, gentle by choice.** Default difficulty is real-world; a "Warm-up" mode exists but is never the default.
5. **Language-agnostic for coding.** Symbols/numbers/styles are taught independent of any language, *then* mapped onto languages.
6. **Local-first, private.** Typing data is yours: works offline, exports as JSON/CSV, delete-all button. No ads in the typing path.
7. **Calm tech.** No guilt streaks, no dark patterns, no confetti spam. Delight is reserved for real milestones.
8. **Craft is a feature.** 60fps, sub-16ms input-to-paint, accessible, themeable, beautiful. (See 13.)

## 5. Differentiators (what must exist at launch to justify the product)
| # | Differentiator | Why it beats competitors |
|---|----------------|--------------------------|
| D1 | **Transition-aware adaptive engine** (keys + bigrams + trigrams + finger/hand mechanics) | Keybr models single keys only; transitions are what limit real speed |
| D2 | **Programmer Track**: symbols, brackets, numbers, bases (bin/oct/dec/hex), naming styles, shell/git/SQL/regex, real open-source snippets | typing.io/SpeedCoder have code but not a language-agnostic, levelled, adaptive curriculum |
| D3 | **Real-World mode**: transcription from a side pane, no-autocorrect emails, passwords, addresses, mixed numerics, fatigue (10–30 min), interruption/recovery | Mainstream tests are easy word lists |
| D4 | **Diagnostics lab**: per-key/bigram heatmaps, error taxonomy (adjacent-key, transposition, omission, insertion, shift-slip), finger load, rhythm "Cadence Ribbon", flow state detection | Others show only WPM/accuracy over time |
| D5 | **Replay + Ghost**: replay any test keystroke-by-keystroke; race your own ghost or a past self | Motivation + debugging |
| D6 | **Award-level UI/UX/motion** with themes + custom theme builder | Most trainers look utilitarian or dated |
| D7 | **Offline-first PWA + data ownership** | Trust + reliability |

## 6. Non-goals (v1)
- Kids' games/cartoons. Teacher/classroom admin (v2 maybe). Native mobile apps (PWA only). Voice dictation. Ads inside practice screens. Pay-to-win features. AI chatbot tutor (optional later; never blocks core).

## 7. Success metrics
- **Activation:** ≥ 60% of landing visitors complete one test. ≥ 35% of those start a lesson/drill within a session.
- **Retention:** D7 ≥ 25% for registered users; median 3+ practice sessions/week among retained.
- **Outcome (north star):** median **+12 Net WPM and −30% error rate over 30 days** among users with ≥ 10 sessions `[Recommendation — validate with real cohort data]`.
- **Craft:** Lighthouse ≥ 95 all categories; INP < 100 ms; typing input→paint p95 < 16 ms.

## 8. Monetisation guardrails `[Recommendation]`
Free core forever (test, learn, drills, stats). Optional "Supporter" for cloud-sync history > 1 year, extra sound packs, custom theme sharing, profile flair. Never sell data. Never put ads in typing view.

## 9. Naming/brand placeholders
- Working name: **Cadence** (rhythm of typing). Alternatives to evaluate: *Keystroke Lab*, *Tempo*, *Thock*, *Home Row*. Domain/trademark check required before launch.
- Voice: plain, confident, a little dry. See `08` §7 and `12` §8.
