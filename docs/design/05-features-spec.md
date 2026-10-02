# 05 — Features Spec (with Acceptance Criteria)

Priority: **P0** = launch blocker · **P1** = launch+30 days · **P2** = later.
Each feature: ID, description, acceptance criteria (AC). Agents must satisfy every AC.

---
## F-TEST — Typing Test (core)
**F-TEST-1 (P0) Modes:** time (15/30/60/120/custom), words (10/25/50/100/custom), quote (short/medium/long/thicc), zen (no target, finish with Shift+Enter), custom text.
- AC: switching mode/length restarts instantly with no layout shift; last mode persisted; URL deep link works.
**F-TEST-2 (P0) Content toggles:** punctuation, numbers, symbols (density slider 0–60%), capitals (mixed-case %), **difficulty presets**: *Warm-up* (top-1k words) · *Standard* (top-5k) · **Real** (default: top-20k + names + numerics + punctuation) · *Brutal* (rare words, dense symbols, mixed case).
- AC: each preset documented in tooltip; Honest-WPM badge shown when preset ≥ Real.
**F-TEST-3 (P0) Live feedback:** per-char correct/incorrect/extra/missed colouring, live WPM (1s smoothed), accuracy, timer; each independently hideable. Optional "Focus: hide all live stats".
**F-TEST-4 (P0) Error modes:** Natural (continue, errors counted) · Stop-on-error (cannot advance until correct) · Forced-correct (must backspace to fix at word boundary) · No-backspace.
- AC: mode shown in result; results are comparable only within same error mode (leaderboards segregate).
**F-TEST-5 (P0) Caret styles:** bar/block/underline/outline; smooth caret on/off; colour token.
**F-TEST-6 (P1) Funbox-style modifiers (curated, ≤12):** Mirror layout, Hex-only, Binary-only, Symbols-only, Numpad-only, No-space (CamelCase run), Backward words, Blind (hidden typed text), Memory (words fade), Rhythm lock (metronome). Non-standard modifiers don't submit PBs unless tagged.
**F-TEST-7 (P0) Restart:** `Tab` then `Enter`, or click restart; `Esc` command palette; repeat last test (`Enter` on result).
**F-TEST-8 (P1) Ghost:** overlay PB/last/avg ghost caret in field.

## F-RES — Results & Replay
**F-RES-1 (P0):** Net WPM, Raw WPM, Accuracy, Consistency, errors by type, time, chars (correct/incorrect/extra/missed), key spread.
**F-RES-2 (P0):** WPM chart (per-second raw+net), error markers, slowest keys, costly pairs, Cadence Ribbon.
**F-RES-3 (P0) Replay:** play back keystrokes at 0.5×–4×; scrub bar; error highlights; show inter-key delay on hover.
- AC: replay deterministically reproduces final text from stored events; <2MB per 10-min test (delta-encoded).
**F-RES-4 (P1) Share image:** PNG card (canvas): stats + ribbon + theme, no email/PII.
**F-RES-5 (P0) PB detection:** per mode/length/layout/error-mode/difficulty; subtle PB flourish (11 §9).

## F-COACH — "What to fix next"
**F-COACH-1 (P0):** After each test/lesson compute ranked recommendations (max 3) with **expected gain estimate** and a one-click drill.
- Inputs: slowest keys/pairs weighted by frequency in real text (impact = freq × excess time), error taxonomy, shift-slip rate, rhythm instability, fatigue decay.
- AC: recommendations are explainable ("Why?" popover shows the data), never repeat the same advice 3 sessions in a row unless unresolved.
**F-COACH-2 (P1) Daily plan:** 10-minute plan = warm-up (60s) + 2 targeted drills + 1 real-world test. Adjustable duration 5/10/20/30.

## F-LEARN — Structured Learning
**F-LEARN-1 (P0):** Tracks & levels (07). Progressive key unlock, step-based lessons, gates (speed+accuracy), placement skip.
**F-LEARN-2 (P0):** Virtual keyboard w/ finger colours, next-key highlight, press animation; hands overlay toggle; **"hide keyboard" challenge** after level N.
**F-LEARN-3 (P1):** Layout-aware curriculum (QWERTY/Dvorak/Colemak/Colemak-DH/Workman/AZERTY/QWERTZ + custom). Layout switch trainer (re-learn plan).
**F-LEARN-4 (P1):** Stars (1–3) per level; replay for better stars; no punishment for 1★.
**F-LEARN-5 (P2):** Posture/technique micro-lessons (text + SVG).

## F-PRAC — Targeted Practice
**F-PRAC-1 (P0) Weak-key drill:** adaptive text biased to weakest keys (07 §2).
**F-PRAC-2 (P0) Costly-pair drill:** generates words/non-words rich in selected bigrams/trigrams.
**F-PRAC-3 (P1) Problem-word drill:** words you mistype most (from history) in sentences.
**F-PRAC-4 (P0) Symbols/Numbers/Shift drills.**
**F-PRAC-5 (P1) Accuracy-only mode:** score = accuracy at fixed comfortable speed; speed ignored.
**F-PRAC-6 (P1) Rhythm drill:** metronome (visual + optional audio), measure σ of inter-key intervals; targets 60–120 BPM chars.
**F-PRAC-7 (P1) Speed burst:** 10s sprints on easy text to push ceiling, then 30s calm.

## F-CODE — Programmer Track (differentiator)
**F-CODE-1 (P0) Symbols Lab:** 12 levels from `; : ' " , . / -` → `( ) [ ] { } < >` → `= + * & | ^ ! ~ ? @ # $ % \ _` → multi-char operators. Language-agnostic content; shows symbol → key + modifier map for chosen layout.
**F-CODE-2 (P0) Brackets & Pairs:** matched nesting generator (depth 1–6), quote/escape handling, "close what you open" accuracy metric.
**F-CODE-3 (P0) Numbers & Bases:** dec, bin (`0b1010`), oct (`0o17`), hex (`0xFF3A`), mixed; byte/word grouping; IPv4/IPv6/MAC; timestamps; units (`16KiB`, `3.3V`); arithmetic expressions; ASCII/Unicode escapes (`\u00e9`, `\x41`); progression from 1-digit to 32-char hex.
**F-CODE-4 (P0) Naming Styles:** camelCase, PascalCase, snake_case, SCREAMING_SNAKE, kebab-case, dot.case, path/like/this; **style-conversion typing** (see `getUserName` → type `get_user_name`) to train switch-style fluency.
**F-CODE-5 (P1) Operators & Idioms:** `=>`, `->`, `::`, `?.`, `??`, `...`, `===`, `!==`, `<=`, `>=`, `&&`, `||`, `++`, `--`, `+=`, `<<=`, `>>>`, template literals, regex tokens, generics `<T>`, lambdas.
**F-CODE-6 (P1) Shell/Git/SQL/Regex/JSON/YAML/HTML-CSS packs:** real command patterns, flags, pipes, quoting.
**F-CODE-7 (P1) Language Packs:** curated snippets per language (licence-verified: MIT/Apache/BSD/public domain; store attribution). Difficulty-graded; keywords/stdlib idioms.
**F-CODE-8 (P0) Code Runner settings:** auto-pair (default **off**), auto-indent (off/on), tab policy, show whitespace, line numbers, syntax tint, case-sensitive always.
**F-CODE-9 (P0) Symbol WPM + Code WPM:** characters/5 for all; **Symbol WPM** counts only non-alphanumeric chars; show both, don't mix in prose leaderboards.
**F-CODE-10 (P2) "Type the diff":** git diff / PR-style snippets with +/- lines.
**F-CODE-11 (P2) Keyboard shortcut trainer:** editor/terminal shortcuts (VS Code, vim motions, tmux) — modifier chords scoring.

## F-REAL — Real-World Scenarios
**F-REAL-1 (P1) Transcribe:** two-pane; source scrolls; track look-away time (visibility+blur heuristic).
**F-REAL-2 (P1) Email/Docs:** realistic paragraphs with names (diverse), dates, currency, addresses; no auto-capitalisation.
**F-REAL-3 (P1) Credentials/IDs:** random mixed strings (length 12–32); masked entry optional.
**F-REAL-4 (P1) Data entry:** numeric tables (tab/enter navigation).
**F-REAL-5 (P1) Fatigue run:** 10/20/30 min; WPM per minute curve, accuracy decay, recommended break cadence.
**F-REAL-6 (P2) Interruptions:** timed pauses/switch prompts; recovery time metric.

## F-STATS — Diagnostics Lab
**F-STATS-1 (P0) Overview KPIs & trends.**
**F-STATS-2 (P0) Key heatmap (speed/error/frequency/confidence).**
**F-STATS-3 (P0) Pair/bigram analysis; top costly transitions; transition classes (same-finger, scissor, alternation, row jump, hand switch).**
**F-STATS-4 (P0) Error taxonomy:** substitution (adjacent-key vs far), transposition, omission, insertion, shift-slip (case error), repeated-key doubling, space errors.
**F-STATS-5 (P1) Rhythm & flow:** Cadence Ribbon aggregates; burst/pause histograms; flow-state % (CV of interval < threshold for ≥ 5s).
**F-STATS-6 (P1) Finger load:** per-finger keystroke share, effort estimate (distance model), left/right balance.
**F-STATS-7 (P1) Time-of-day & session-length effects.**
**F-STATS-8 (P0) Export (CSV/JSON) and import.**
**F-STATS-9 (P2) Comparative percentile** (opt-in, anonymised).

## F-GAM — Motivation (calm, honest)
**F-GAM-1 (P1) XP & levels:** XP = minutes × quality factor (accuracy/consistency) — rewards *deliberate* practice not spam.
**F-GAM-2 (P1) Streaks with freezes:** 2 free freezes/month; no loss-shaming copy.
**F-GAM-3 (P1) Daily challenge:** one shared seed/day; leaderboard; 1–3 min.
**F-GAM-4 (P1) Badges:** milestone-based, quiet (e.g. "First 1000 symbols", "Hex Reader"), max 40 at launch.
**F-GAM-5 (P2) Seasons/leagues.**

## F-RACE — Racing
**F-RACE-1 (P1) Ghost race (solo).** **F-RACE-2 (P2) Live quick race (2–5).** **F-RACE-3 (P2) Private rooms with link.** AC: server-authoritative progress, anti-cheat checks (06 §10), spectator mode.

## F-LB — Leaderboards
**F-LB-1 (P1):** per mode+length+difficulty+error-mode+layout; daily/weekly/all-time; accounts only; minimum accuracy 90% (configurable); verified-run flag via server-side plausibility checks (06 §10).

## F-SET — Settings & Personalisation
**F-SET-1 (P0):** All settings in 04 §4.9; searchable settings (`/` focuses search); instant preview; **Presets** (Beginner, Balanced, Hardcore, Developer, Accessibility).
**F-SET-2 (P1) Themes:** ≥ 40 curated at launch (dark/light/contrast/colour-blind-safe), custom builder, import/export code, **auto theme by system**, per-time-of-day (optional).
**F-SET-3 (P1) Fonts:** JetBrains Mono (default), Geist Mono, IBM Plex Mono, Fira Code, Source Code Pro, Commit Mono, Atkinson Hyperlegible Mono, Lexend (proportional), OpenDyslexic option; **ligatures off by default** in typing (you must type the real chars).
**F-SET-4 (P1) Sound:** packs (soft membrane, linear thock, clicky blue, typewriter, bubble, silent); per-key pitch variance; error tick; volume; pre-decoded Web Audio; ≤ 20ms trigger latency.
**F-SET-5 (P0) Keyboard layouts:** QWERTY (ANSI/ISO), Dvorak, Colemak, Colemak-DH, Workman, AZERTY, QWERTZ, Neo2, Programmer Dvorak, custom JSON layout import; physical-vs-logical key mapping (06 §4). Indian-language layouts (Hindi InScript, Kannada, etc.) **P2**.
**F-SET-6 (P0) Accessibility:** see 13.

## F-DATA — Data, Sync & Privacy
**F-DATA-1 (P0) Local-first IndexedDB.** **F-DATA-2 (P1) Account sync.** **F-DATA-3 (P0) Export/import/delete.** **F-DATA-4 (P1) Public/unlisted/private profile.** **F-DATA-5 (P0) No tracking of keystroke *content* server-side** beyond what's needed for leaderboards/replays you opt into; replay text for custom texts stays local unless shared.

## F-PLAT — Platform
**F-PLAT-1 (P0) PWA:** installable, offline test + lessons cached. **F-PLAT-2 (P0) Responsive:** full mobile layout; mobile typing supported with caveats shown (touch typing metrics flagged "mobile"). **F-PLAT-3 (P1) i18n:** UI strings in ICU message format; content languages: English first, then Hindi/Spanish/German/French/Portuguese word lists. **F-PLAT-4 (P1) Command palette.** **F-PLAT-5 (P1) Keyboard shortcut cheat-sheet (`?`).**

## F-CONT — Content system
**F-CONT-1 (P0)** Word lists: top-1k/5k/20k English, names, tech terms, numbers; frequency-ranked; stored as compressed JSON; per-list licensing noted.
**F-CONT-2 (P1)** Quotes (public domain / permissive; no lyrics/copyrighted text).
**F-CONT-3 (P1)** Code corpus pipeline: fetch repo → licence check → AST-lite chunking (30–400 chars) → difficulty score (symbol density, nesting, line length) → tag.
**F-CONT-4 (P1)** Custom text import with sanitiser (strip control chars, normalise quotes optional), saved library, tags.

## Feature dependency order (build order)
`F-TEST + engine (06)` → `F-RES` → `F-SET (core)` → `F-STATS (basic) + local DB` → `F-PRAC + F-COACH` → `F-LEARN` → `F-CODE` → `F-REAL` → `F-SET themes/sound` → `F-LB/F-RACE/sync` → polish (11/13).
