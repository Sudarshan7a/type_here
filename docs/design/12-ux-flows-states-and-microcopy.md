# 12 — UX Flows, States & Microcopy

## 1. Core user flows (each must be testable end-to-end)
### Flow A — First visit → first test → insight
1. Land on `/` → field auto-focused, caret blinking, no modal.
2. User starts typing → chrome fades.
3. Test ends → in-place Result Sheet (4.2) → Coach card shows 1–3 fixes.
4. CTA row: `Next test` (primary) · `Take the 3-minute placement` (secondary, appears after 1st result only).
5. Placement → plan reveal → `Start today's plan` (10 min).
6. After 3 sessions: soft banner "Keep your progress on every device" (dismissible, never returns for 14 days).
**Success state:** user completes second test or starts plan within same session.

### Flow B — Daily practice (returning)
Open `/` → Coach card "Today's plan · 10 min" → `Start plan` → [warm-up 60s → drill 1 → drill 2 → real-world test] with a thin progress rail → completion summary: minutes, accuracy trend, what improved, tomorrow's focus → optional share.

### Flow C — Learn level
`/learn` → current level expands → `Start` → steps 1–5 with inline mini-results → gate evaluation → level complete (★) → next-level preview → `Continue` or `Back to map`.
Failure: gate not met → "Almost — 33 WPM, need 35. Try again, or practise the weakest key (r)." buttons: `Try again` · `Drill r` · `Skip with placement`.

### Flow D — Developer path
Hero chip "Typing for code" → `/code` → choose Symbols/Numbers/Naming → runner (auto-pair off, tooltip explains why) → result shows Code WPM + Symbol WPM + top costly symbol transitions → `Drill these symbols`.

### Flow E — Customise
`/settings` quick presets → theme tile click previews live in-place with undo toast → fonts/size sliders show live preview line → "Reset section" always available.

### Flow F — Import custom text / theme
Paste or drop `.txt/.md/.json` → validation summary (chars, lines, unsupported chars) → choose text type → save → start. Errors specific ("Line 14: unexpected token").

### Flow G — Share
Result → `Share image` → modal with preview + toggles (hide handle, show ribbon) → `Download PNG` / `Copy link` (unlisted result page, opt-in).

### Flow H — Account & sync
`Sign in` → email magic link or OAuth (GitHub/Google) → "Merge local progress?" (default Yes, shows counts) → synced state indicator (cloud icon: synced · syncing · offline queue n).

### Flow I — Data export/delete
Settings → Data → `Export all data` (JSON/CSV zip) · `Delete everything` (type phrase `delete my data` to confirm, shows what's removed, final irreversible warning).

## 2. Interaction principles
- **Keyboard-first everywhere** (Tab order logical, `Esc` closes, `Enter` confirms primary). Global shortcuts listed in `?` sheet. Never trap focus except in modals (and always restore it).
- **Instant response (<100ms feedback)** for every action; optimistic UI for saves.
- **Undo over confirm:** prefer reversible actions with undo toast (10s) to confirmation dialogs; use hold-to-confirm for destructive ones.
- **Progressive disclosure:** presets first, advanced behind "Advanced" disclosure; settings searchable.
- **Never lose typed data:** accidental navigation during a test prompts only when > 20s elapsed; settings changes persist immediately.
- **Predictability:** same action → same name & outcome across the app (see §8).

## 3. State inventory per major screen
| Screen | Loading | Empty | Error | Offline | Partial |
|---|---|---|---|---|---|
| Test | none (instant; fonts preloaded) | n/a | "Couldn't load the word list. Using the built-in set." | works | custom text too short → hint |
| Result | skeleton chart <300ms | n/a | chart failed → data table fallback | works | |
| Learn | skeleton trail | first visit: plan prompt | "Couldn't load your progress" + retry | cached | some tracks locked |
| Stats | skeleton KPIs | "No data yet. Finish a test…" with button | retry + export local | local-only badge | < 50 keystrokes: "Not enough data for pairs yet (need 500)" |
| Leaderboards | skeleton rows | "No runs yet for this mode." | retry | "Online only" | |
| Race | connecting spinner | no rooms: create one | "Connection lost. Reconnecting…" | disabled message | |
| Themes | skeleton tiles | n/a | import invalid → inline error | cached | |

## 4. Onboarding principles
No forced tour. Contextual **one-time hints** (dismissible, max 1 per session): first time hovering restart (`Tab+Enter`), first time Code Lab (auto-pair note), first Stats visit (what heatmap colours mean). Hints stored; accessible via `Help → Replay hints`.

## 5. Notifications policy
No push in v1. Email (opt-in, weekly summary only). In-app toasts only for results of user actions. Never "You'll lose your streak!" — use "Streak freeze used" informationally.

## 6. Settings UX
- Search box at top; each setting has a 1-line explanation and a "Reset" icon when changed.
- Live preview strip pinned at top of Appearance (real TypingField with current theme/font/size/caret).
- Presets apply bundles and show a diff "Changes: error mode → Stop on error, …" with `Undo`.

## 7. Empty / error / success copy patterns
- **Empty:** what this area is + the one action that fills it. "No history yet. Finish a test and your results show up here." `[Start a test]`
- **Error:** what happened + how to fix + keep user's work. "We couldn't save that theme. Your changes are still here — try again, or export the code." `[Try again]`
- **Success:** confirm what changed; same noun/verb as the action. `Save theme` → toast "Theme saved".
- **Never:** "Oops", "Something went wrong" alone, exclamation marks, apologies, jokes in errors.
- **Numbers:** include units (`87 WPM`, `41 ms`), use thin spacing; percentages with one decimal when < 100.

## 8. Voice & vocabulary (consistency table)
| Concept | Use | Avoid |
|---|---|---|
| Typing speed | WPM (Net WPM on first mention) | score, points |
| Correctness | Accuracy | precision |
| Evenness | Consistency / Rhythm | stability |
| Hard pair | Costly pair | bad bigram |
| Guidance | Coach / Next fix | AI tutor |
| Level work | Level, Drill, Test | quest, mission |
| Save | Save | Submit |
| Remove data | Delete | Wipe, nuke |
Buttons: verb + object. Labels: sentence case. Tone: plain, confident, dry. Reading level ≤ grade 8.

## 9. Microcopy snippets (ready to use)
- Hero hint: "Start typing. Press Esc for commands."
- Focus lost: "Click or press any key to continue."
- Result headline: "{net} net WPM · {acc}% accurate"
- Coach rationale: "Based on {n} keystrokes. {pair} costs you {ms} ms more than your average."
- Placement CTA: "Take the 3-minute placement" / sub: "Find your starting level in prose, numbers, symbols and code."
- Auto-pair note: "Auto-pairing is off so you practise typing both brackets. You can turn it on in Settings."
- Honest WPM tooltip: "Counts only characters that are correct in the final text. Corrected mistakes cost the time they took."
- Offline: "You're offline. Tests still work and results sync later."
- Leaderboard ineligible: "This run isn't eligible for the leaderboard (paste or timing check)."
- Delete confirm: "This permanently deletes {n} results and all settings. Type "delete my data" to confirm."

## 10. Gesture & input map
Desktop: click/Enter/Space activate; arrow keys within groups; `Tab+Enter` restart; `Esc` palette; `?` shortcuts; `/` search. Touch: tap, swipe-to-dismiss toasts/sheets, long-press for key info on virtual keyboard. Pointer: hover only enhances, never required.

## 11. Edge cases to design explicitly
Caps Lock on (banner "Caps Lock is on" in field) · dead keys/compose · layout mismatch warning · very slow typists (min 5 WPM tests valid; hide "consistency" until ≥ 5s data) · very long idle (auto-pause) · browser zoom 200% · window resize mid-test (re-measure, never jump caret) · tab switch (pause) · screen readers (announce verbosity) · Sticky Keys users (modifier handling) · one-handed mode (setting reduces transitions).
