# 03 — Information Architecture & Sitemap

## 1. Navigation model
- **Primary nav (top bar, collapses to icon rail while typing):** Test · Learn · Practice · Code Lab · Real-World · Race · Stats
- **Secondary (right cluster):** Theme quick-switch · Sound toggle · Settings · Account/Avatar (or "Sign in" ghost button)
- **Footer (marketing pages only):** About · Changelog · Docs/Help · Privacy · Terms · GitHub/Community · Support
- **Mobile:** bottom tab bar (Test · Learn · Practice · Code · Stats) + "More" sheet. Typing view hides the tab bar.
- **Keyboard-first:** global command palette `Cmd/Ctrl+K` (and `Esc` to open during tests, `Tab+Enter` restart like Monkeytype). All nav reachable by palette.

## 2. Sitemap (URL → page → access)
| URL | Page | Auth | Priority |
|-----|------|------|----------|
| `/` | **Test (home)** — live typing test is the hero | none | P0 |
| `/test/[mode]` | Preset test deep links (`time-30`, `words-50`, `quote`, `zen`, `custom`) | none | P0 |
| `/learn` | Learn map: tracks → levels | none (progress local) | P0 |
| `/learn/[track]/[level]` | Lesson player | none | P0 |
| `/practice` | Practice hub: Weak keys, Bigrams, Words, Symbols, Numbers, Shift/AltGr, Speed bursts, Accuracy drills | none | P0 |
| `/practice/[drill]` | Drill runner | none | P0 |
| `/code` | Code Lab hub | none | P0 |
| `/code/symbols` · `/code/brackets` · `/code/numbers` · `/code/styles` · `/code/shell` · `/code/sql` · `/code/regex` · `/code/lang/[language]` | Code Lab sub-pages | none | P0/P1 |
| `/real-world` | Scenario hub | none | P1 |
| `/real-world/[scenario]` | Transcription, Email, Passwords & IDs, Numbers & Data entry, Fatigue run, Interrupted typing | none | P1 |
| `/race` | Lobby: Ghost race (solo, P0), Quick race, Private room (P1/P2) | none for ghost; auth for live | P1 |
| `/race/[roomId]` | Race room | auth | P2 |
| `/challenges` | Daily/Weekly challenge | none | P1 |
| `/leaderboards` | Boards by mode/day/week/all-time/language | none to view | P1 |
| `/stats` | Dashboard (Overview · Keys · Pairs · Errors · Rhythm · Fingers · Time) | none (local) | P0 |
| `/stats/test/[id]` | Single result + **replay** | local/auth | P0 |
| `/profile/[handle]` | Public profile | public | P1 |
| `/settings` (tabs `/settings/typing` `/appearance` `/sound` `/keyboard` `/accessibility` `/data` `/account`) | Settings | none/auth | P0 |
| `/themes` | Theme gallery + custom theme builder | none | P1 |
| `/layouts` | Keyboard layout picker + layout trainer | none | P1 |
| `/text` | Custom text: paste/import/URL(no)/file, saved texts | none | P1 |
| `/onboarding` | Placement test (3 min) | none | P0 |
| `/sign-in` · `/sign-up` · `/reset` | Auth | — | P1 |
| `/about` · `/method` · `/changelog` · `/help` · `/privacy` · `/terms` · `/support` | Content | none | P1 |
| `/offline` · `/404` · `/500` | System pages | — | P0 |

## 3. Page hierarchy diagram
```
Cadence
├── Test (home)
│   ├── Result sheet (overlay → /stats/test/[id])
│   └── Replay
├── Learn
│   ├── Track: Foundations (home row → full alphabet)
│   ├── Track: Fluency (words, bigrams, speed gates)
│   ├── Track: Symbols & Numbers
│   ├── Track: Real-World Prose
│   ├── Track: Programmer Core
│   └── Track: Language Packs (JS/TS, Python, Java, C/C++, Go, Rust, SQL, Shell…)
├── Practice (targeted drills)
├── Code Lab (symbols · brackets · numbers/bases · naming styles · shell/git · SQL · regex · languages)
├── Real-World (scenarios)
├── Race (ghost · quick · private)
├── Stats (overview · keys · pairs · errors · rhythm · fingers · time)
├── Challenges · Leaderboards · Profile
└── Settings · Themes · Layouts · Custom text · Help
```

## 4. Entry paths (design for these first)
1. **Cold visitor → types immediately** (hero test). After 1st result → soft prompt "See what to fix next" → placement test → personalised Learn plan.
2. **Returning user → lands on Test with last mode restored**; Coach card shows today's recommended 10-minute plan.
3. **Developer → Code Lab** from hero chip "Typing for code".
4. **Keyboard hobbyist → Themes/Sound** from nav quick-switch.

## 5. State & persistence model (what survives a refresh)
- Anonymous: everything stored in IndexedDB (Dexie). Banner after 3 sessions: "Save your progress across devices" (non-blocking).
- Signed-in: local-first, background sync (see 14). Conflict policy: append-only events, last-write-wins on settings.
- URL encodes shareable state: mode, length, language, theme (optional), text hash (custom).

## 6. Content model (for static/marketing pages)
- Markdown/MDX in repo (`/content`): method, help articles, changelog, about. Frontmatter: title, description, updated, readingTime.
- Method page explains scoring (Net WPM formula, consistency, error taxonomy) to build trust.
