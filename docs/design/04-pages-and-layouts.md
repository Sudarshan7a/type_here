# 04 — Pages & Layouts (wireframes + rules)

Conventions: `[ ]` = interactive, `░` = muted text, `█` = emphasis. Max content width tokens from `09` (`--w-type: 68ch`, `--w-page: 1200px`). Grid: 12-col desktop, 8-col tablet, 4-col mobile, 24px gutters desktop / 16px mobile.

Breakpoints: `xs <480` · `sm 480–767` · `md 768–1023` · `lg 1024–1439` · `xl ≥1440`.

---
## 4.1 Home / Test (the hero) — `/`
**Intent:** the product *is* the hero. Zero scroll to start typing.
```
┌────────────────────────────────────────────────────────────────────────────┐
│ ◉ Cadence    Test  Learn  Practice  Code  Real-World  Race  Stats    ◐ ♪ ⚙ ☺ │  ← top bar (fades to 15% on typing)
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│        [ time 15 30 60 120 ]  [ words 25 50 100 ]  [ quote ] [ zen ]  [ ⚙ ] │  ← mode bar (centered, pill group)
│        [ ☐ punctuation ] [ ☐ numbers ] [ ☐ symbols ] [ difficulty: Real ▾ ]│
│                                                                            │
│                                  24                                        │  ← live timer / words (large, tabular nums)
│                                                                            │
│      the ░░░░░ quick ░░░░░ brown ░░░░ fox ░░░░░ jumps ░░░░░ over ░░░░░     │  ← typing field (3 visible lines, ≤68ch)
│      ░░░░░ lazy dog and █ then ░░░░░ words ░░░░░ continue ░░░░░░░░░░░░     │     caret = amber bar
│      ░░░░░░░░░░ ░░░░░░░░ ░░░░░░░░░░ ░░░░░░░ ░░░░░░ ░░░░░░░░░░ ░░░░░░      │
│                                                                            │
│              ┌ Cadence Ribbon (live rhythm, 48px tall, optional) ┐          │
│                                                                            │
│                    [ ⟲ restart ]   (Tab + Enter)                           │
│                                                                            │
│   Press Tab+Enter to restart · Esc for commands                            │
├────────────────────────────────────────────────────────────────────────────┤
│  ▼ below fold (revealed on scroll, never blocks typing):                   │
│   Coach card · Daily challenge · Your last 7 sessions sparkline · Why Cadence│
└────────────────────────────────────────────────────────────────────────────┘
```
**Rules**
- Typing field is vertically centred in viewport minus top bar; **no layout shift** when modes change.
- While typing: top bar, mode bar, footer hint → opacity .15 (200ms); mouse movement restores.
- Result replaces the field **in place** (no route change) — see 4.2.
- Below-fold content is lazy; first paint contains only the test.
- Mobile: hidden input + on-screen keyboard; field gets 40% viewport height; mode bar becomes a horizontally scrollable chip row; hint text hidden.

## 4.2 Result Sheet (end of test)
```
┌──────────────────────────────────────────────────────────────┐
│  NET WPM   87        ACCURACY 96.4%      CONSISTENCY 81%     │
│  ████ count-up      raw 94 · errors 11   rhythm σ 38ms       │
│ ┌────────────────────────────────────────────────────────┐   │
│ │  WPM over time (line) + errors (dots) + burst markers   │   │  ← chart
│ └────────────────────────────────────────────────────────┘   │
│ ┌ Cadence Ribbon (full test, inter-key intervals) ────────┐   │
│ └─────────────────────────────────────────────────────────┘   │
│  Slowest keys: [ q ] [ p ] [ ; ]   Costly pairs: [ ou ] [ ,  ]│
│  Error types: adjacent 5 · transposition 3 · omission 2 · … │
│ ┌ Coach ──────────────────────────────────────────────────┐   │
│ │ 1. Drill "ou, ei" transitions (≈ +3 WPM) [ Start 4 min ] │   │
│ │ 2. Shift-slips on capitals (6)           [ Start ]       │   │
│ └─────────────────────────────────────────────────────────┘   │
│ [ Next test ↵ ]  [ Replay ]  [ Save ]  [ Share image ] [ ⋯ ]│
└──────────────────────────────────────────────────────────────┘
```
Rules: primary action `Next test` focused by default (Enter). Share generates a PNG card via canvas (no PII). Numbers use tabular figures. Chart is accessible (data table toggle, see 13).

## 4.3 Learn Map — `/learn`
```
┌ Track tabs: [Foundations][Fluency][Symbols & Numbers][Real-World][Programmer Core][Languages] ┐
│  Left rail (≥lg): Your path · XP · streak (soft) · Daily goal ring                       │
│  Main: Level path as a vertical "trail" with nodes                                       │
│        ●━━━●━━━●━━━◐━━━○━━━○   (done ● · current ◐ pulse once · locked ○)                │
│        Each node: title, new keys (keycap chips), target (e.g. 35 WPM / 95%), est. time  │
│  Right panel (≥xl): Keyboard visual showing unlocked keys (lit) and next key (outlined)  │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```
Rules: current level node expands inline (accordion) with `Start`; locked nodes show unlock requirement in plain words, **but** "Skip with placement test" is always available (no hard walls).
Mobile: single column trail; keyboard visual in a bottom sheet.

## 4.4 Lesson Player — `/learn/[track]/[level]`
```
┌ ‹ Back   Level 7 · Add "r" and "u"              ▮▮▮▯▯ step 3/5   ✕ ┐
│                                                                    │
│     Target 35 WPM · 95%        Focus key:  [ r ]                   │
│                                                                    │
│          jur rud urd drur rudu uru dur rad                         │  ← typing field (same engine)
│                                                                    │
│   ┌ Virtual keyboard (on by default for Foundations; toggle) ┐     │
│   │ finger colour-coding, next key glows, press animation     │     │
│   └──────────────────────────────────────────────────────────┘     │
│   Hands guide (SVG) · posture tip (collapsible)                     │
└────────────────────────────────────────────────────────────────────┘
```
End of step → mini result (inline, 1.5s) → auto-advance; end of lesson → Lesson Complete sheet (stars optional ★ based on speed+accuracy, XP, next key preview).

## 4.5 Practice Hub — `/practice`
Card grid (3×N lg, 2×N md, 1 col mobile). Card = icon, title, 1-line promise, last score, `Start`.
Cards: **Weak keys** · **Costly pairs** · **Problem words** · **Capitals & Shift** · **Numbers row** · **Number pad** · **Punctuation** · **Symbols (top-row)** · **Accuracy (no speed)** · **Speed bursts** · **Rhythm (metronome)** · **Warm-up (60s)**.
Top of page: **Today's plan** (auto-generated 10 min = 3 drills) with one `Start plan` button.

## 4.6 Code Lab — `/code`
```
┌ Hero strip: "Type code, not just words" — language-agnostic first, then your language ┐
│ Section A  Symbols Lab       [ levels 1–12 ]  heatmap of symbol keys                    │
│ Section B  Brackets & Pairs  ()[]{}<> · quotes · nesting depth drills                   │
│ Section C  Numbers & Bases   dec · bin · oct · hex · units · IP/MAC · timestamps         │
│ Section D  Naming Styles     camelCase · PascalCase · snake_case · kebab-case · CONSTANT │
│ Section E  Operators & Idioms  => -> :: ?. ?? ... !== <= >= && || ++ -- += etc.         │
│ Section F  Shell · Git · SQL · Regex · JSON · YAML · HTML/CSS                           │
│ Section G  Language Packs    [JS/TS][Python][Java][C/C++][Go][Rust][C#][PHP][Kotlin]…   │
│ Section H  Real snippets     "Type this PR" (curated open-source, licence-checked)       │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```
Code Runner view additions: **line numbers**, **indent guides**, **tab/space policy**, **auto-pair policy** (default off), **syntax tint** (subtle, toggleable, never reduces contrast), **whitespace marks** toggle, **Enter+auto-indent** mode (types newline then expects indentation or auto-indents per setting), live **Symbol WPM** chip.

## 4.7 Real-World — `/real-world`
Scenario cards: **Transcribe** (source pane left, input pane right, source can scroll, no auto-highlighting of your place) · **Email** (names, dates, numbers, signature) · **Passwords & IDs** (mixed case + symbols; masked option) · **Data entry** (numbers, decimals, currency, tab-separated) · **Fatigue run** (10/20/30 min, WPM decay graph) · **Interruptions** (random pauses/context shift; measures recovery).
Transcribe layout:
```
┌ Source (read-only, scroll) ┬ Your typing (input) ┐
│ Dear Ms. Rao, the invoice… │ Dear Ms. R|          │
└────────────────────────────┴──────────────────────┘
 Metrics bar: Net WPM · Accuracy · Look-away time · Corrections
```

## 4.8 Stats Dashboard — `/stats`
Tabs: **Overview · Keys · Pairs · Errors · Rhythm · Fingers · Time**
- Overview: KPI strip (7d Net WPM median, best, accuracy, consistency, minutes practiced), progress line (7/30/90/all) with PB markers, calendar heatmap (practice minutes), mode breakdown.
- Keys: keyboard heatmap (toggle metric: speed ms / error % / frequency / confidence), table sortable.
- Pairs: bigram matrix (26×26 + symbols collapsed), top-20 costly transitions, finger-pair categories (same finger, same hand, alternation, row jumps).
- Errors: taxonomy donut, "most confused pairs" (typed→expected), shift-slip rate, correction cost (ms lost per error).
- Rhythm: Cadence Ribbon averages, burstiness, pause distribution, flow-state share.
- Fingers: hand/finger load bars, left/right balance, pinky workload.
- Time: time-of-day performance, session length vs decay (fatigue), best practice window.
Filters: date range, mode, language, layout, text type. Export button (CSV/JSON).

## 4.9 Settings — `/settings/*`
Left tab list (≥md) / accordion (mobile). Tabs & key controls (details in 05 F-SET):
- **Typing:** error mode (Natural / Stop-on-error / Forced-correct / No-backspace), caret style (bar/block/underline/outline) + smooth caret, word-level vs char-level correction, pairing policy, tab/space, difficulty presets, text source, live stats visibility, **chrome-fade**.
- **Appearance:** theme, font family, font size (14–40px), line height, letter spacing, text width, caret colour, flip test colours, reduce motion override.
- **Sound:** pack, volume, error sound, per-key variation, latency note.
- **Keyboard:** layout (QWERTY… custom), physical type (ANSI/ISO/JIS/ortho/split), show virtual keyboard, finger colours.
- **Accessibility:** dyslexia-friendly font option, high-contrast, large-text, screen-reader announcements verbosity, motion, colour-blind safe palettes.
- **Data:** export, import, delete, sync status. **Account:** email, handle, avatar, delete account.

## 4.10 Themes — `/themes`
Gallery grid of theme tiles that **render a live mini-test** in each theme. Filters: dark/light, contrast level, colour family. Builder: 10-token editor with live preview + WCAG contrast checker + share code (base64 JSON) + import.

## 4.11 Profile — `/profile/[handle]`
Header (avatar, handle, joined, favourite layout) · PB cards by mode · activity heatmap · badges (earned, quiet) · recent public results · Cadence Ribbon of best test. Privacy toggle: public/unlisted/private.

## 4.12 Race — `/race`
Solo **Ghost race** (P1): race your PB, last test, or a "pace car" at X WPM. Lanes view: 2–5 horizontal tracks with avatar caret blocks; countdown 3-2-1; photo-finish result. Live multiplayer (P2) via WebSocket rooms.

## 4.13 Onboarding / Placement — `/onboarding`
3 screens: (1) choose goal chips (Speed · Accuracy · Programming · Real-world · Switch layout) (2) 3-minute adaptive placement (prose → numbers → symbols → code snippet) (3) personalised plan reveal (ranked tracks, weekly target). Skippable at every step. No account required.

## 4.14 Marketing/Content pages (About, Method, Changelog, Help)
Single column prose (≤ 68ch), generous whitespace, in-page TOC (≥lg), GSAP/scroll reveals **only here**. Method page includes interactive WPM formula explainer.

## 4.15 System pages
- **404:** a typing prompt ("Type the path you wanted: /____") with playful but useful suggestions; keyboard-first.
- **Offline:** shows cached Test + queue notice "Results sync when you're back online".
- **500:** plain explanation + retry + status link.

## 5. Global layout rules
1. Content never shifts during typing; reserve space for all dynamic elements.
2. Single scroll container per view; no nested scroll traps (except code source pane).
3. Max line length 68ch in test field; 80ch for prose pages.
4. Touch targets ≥ 44×44 px; mouse hit areas ≥ 32px with 8px spacing.
5. Safe-area insets honoured on mobile; sticky bars use `env(safe-area-inset-*)`.
6. Dark and light parity: every layout verified in both and in the 4 core themes.
