# UI Copy and Microcopy — String Tables

**Sourcing:** 100% original, written for this product. License: `original work — ours`.
**Purpose:** the voice guide (Implementation Guide §4.10, Templates `design-brief-and-critique.md` §6) states the *rules* — calm, adult, no guilt, no hype. This file is the actual **string table** implementing those rules: every screen's real copy, ready to load into an i18n/strings file. No local AI should be inventing onboarding or error copy from scratch when this exists.
**Format:** grouped by screen/flow, each string has a `key` (for the strings file), the actual text, and a note where tone or variables matter. `{variable}` marks a template slot.

---

## 1. Global / shared strings

| Key | Text | Notes |
|---|---|---|
| `app.name` | RealType | Working title — swap when D1 (name) is finalized |
| `brand.tagline` | A typing trainer that shows its work. | Beside the wordmark in the header. States transparency, promises no outcome |
| `nav.practice` | Practice | |
| `nav.learn` | Learn | |
| `nav.code` | Code | |
| `nav.dashboard` | Dashboard | |
| `nav.settings` | Settings | |
| `action.restart` | Restart | Also bound to Tab key |
| `action.newPassage` | New passage | Loads the next passage; the typing surface never reloads the same text back at the user |
| `action.next` | Next | |
| `action.skip` | Skip for now | Used wherever an optional step exists |
| `action.save` | Save | |
| `action.cancel` | Cancel | |
| `action.tryAgain` | Try again | |
| `action.dismiss` | Dismiss | |
| `state.loading` | One moment… | Generic loading; specific screens override this (see below) |
| `state.offline` | You're offline. Your test still works — results will sync when you're back online. | Never says "error" for offline; it's expected, not a failure |
| `state.genericError` | Something didn't work. Try again, or come back in a bit. | No jargon, no blame |
| `footer.howWeCalculate` | How we calculate your scores | |
| `footer.roadmap` | Roadmap | |
| `footer.changelog` | Changelog | |
| `footer.feedback` | Feedback | |
| `footer.privacy` | Privacy | |
| `footer.terms` | Terms | |

---

## 2. Home / Test screen

| Key | Text | Notes |
|---|---|---|
| `home.modeBar.classic` | Classic | |
| `home.modeBar.realWorld` | Real-World | Default selected mode |
| `home.modeBar.code` | Code | Hidden until programmer content exists |
| `home.modeBar.numbers` | Numbers & Symbols | |
| `home.duration.15s` | 15s | |
| `home.duration.30s` | 30s | |
| `home.duration.60s` | 60s | Default |
| `home.duration.120s` | 120s | |
| `home.duration.custom` | Custom | |
| `home.hint.firstVisit` | Start typing whenever you're ready. | Shown once, first visit only, fades after first keystroke |
| `home.hint.unfocused` | Click here to start typing. | The persistent unfocused prompt. Distinct from `home.hint.firstVisit`, which is a once-only hint: this one stays until the surface has focus |
| `home.hint.restart` | Press Tab to restart | Small, unobtrusive hint near the mode bar |
| `toolbar.group.test` | Test | Caption for the passage and caret controls |
| `toolbar.group.display` | Display | Caption for the theme, interface font and focus controls |
| `toolbar.group.typing` | Typing | Caption for the layout and auto-insertion controls |
| `home.live.netWpm` | Net WPM | Label beside the live figure while typing |
| `home.live.accuracy` | Keystroke accuracy | Label beside the live figure while typing. Names the measure: this is keystroke accuracy (correct keystrokes ÷ printable keystrokes), not the final accuracy the results headline shows (correct characters in the produced text ÷ its length) |
| `home.state.paused` | Paused — click here to continue when you're ready. | Practice mode pauses on focus loss; no timer is shown running |
| `home.difficultyBadge.easy` | Easy | |
| `home.difficultyBadge.typical` | Typical | |
| `home.difficultyBadge.hard` | Hard | |
| `home.focusMode.entering` | *(no text — chrome fades silently, no announcement)* | Deliberate: focus mode should feel invisible, not narrated |
| `home.length.modeLabel` | Test length | MOD-01: names the mode selector; the modes differ in when a test ends, never in how a keystroke is scored |
| `home.length.mode.prose` | Real-world prose | No clock; the default. MOD-02: the real-world pool — mixed case, punctuation, digits, names and URLs, with the engine's own difficulty band shown per passage |
| `home.length.mode.time` | Timed | MOD-01 |
| `home.length.mode.words` | Word count | MOD-01 |
| `home.length.mode.quotes` | Quotes | MOD-01; quotes come from the content library |
| `home.length.mode.custom` | Custom text | MOD-01; the user's own text, display-only and never stored |
| `home.length.note.prose` | Real-world prose: mixed case, punctuation, digits, names and URLs. No clock. | |
| `home.length.note.time` | Type as much as you can before the clock runs out. | |
| `home.length.note.words` | Type the first N words of a passage. | |
| `home.length.note.quotes` | Type a quote from the content library. | |
| `home.length.note.custom` | Paste or type your own text to practise on. | |
| `home.length.durationLabel` | Time limit | Shown in timed mode |
| `home.length.duration.15s` | 15s | |
| `home.length.duration.30s` | 30s | |
| `home.length.duration.60s` | 60s | Default timed length |
| `home.length.duration.120s` | 2 minutes | |
| `home.length.wordCountLabel` | Words | Shown in word-count mode |
| `home.length.wordCount.15` | 15 words | |
| `home.length.wordCount.30` | 30 words | |
| `home.length.wordCount.60` | 60 words | |
| `home.length.quoteAction` | Next quote | Loads another quote; the surface never reloads the same text back at the user |
| `home.length.customLabel` | Your text | Label for the custom-text field |
| `home.length.customLimitNote` | Up to 2000 characters. Nothing you type here is stored or sent anywhere. | States the limit and the privacy rule beside the field |
| `home.live.timeRemaining` | Time left | Shown only in a timed test; the ticking number is hidden from assistive tech, the outcome is announced once at the end |

---

## 3. Results screen

| Key | Text | Notes |
|---|---|---|
| `results.title` | Results | Heading of the results panel. Visually hidden: the KPI below it is the thing to read, and the heading is here so the landmark and the heading outline are real |
| `results.headline.netWpm` | {value} WPM | Large, primary number |
| `results.headline.accuracy` | {value}% accuracy | |
| `results.headline.classicWpmNote` | Classic WPM: {value} | Secondary, smaller, shown alongside net WPM per the spec's transparency rule |
| `results.difficultyNote` | This text was rated **{band}**. [Learn how we score difficulty] | Link goes to how-we-calculate |
| `results.unverified.label` | Practice result (not verified) | Shown when a session wasn't server-verified; neutral, not alarming |
| `results.unverified.tooltip` | This result didn't pass our verification check, so it won't count toward leaderboards. It's still saved as a private practice result. | Calm explanation, no accusation of cheating |
| `results.compare.vsPersonalBest` | {delta} vs. your personal best | `{delta}` formatted as "+3.2 WPM" or "−1.1 WPM" |
| `results.compare.vsRecentAverage` | {delta} vs. your last 5 tests | |
| `results.compare.noHistoryYet` | This is your first test in this mode — nothing to compare yet. | Replaces the comparison card when history is empty |
| `results.whatToFix.title` | What to work on | Deliberately not "Your weaknesses" — softer framing |
| `results.whatToFix.item` | {item} — {detail} | e.g., "th → e — about 40% slower than your average pair" |
| `results.whatToFix.notEnoughData` | We need a bit more typing from you before we can point to anything specific. Try a couple more tests. | Shown when the weakness profile isn't ready yet (cold start) |
| `results.whatToFix.ctaPracticeThese` | Practice these | Primary button on the "What to work on" card |
| `results.details.raw` | Raw: {value} WPM | |
| `results.details.consistency` | Consistency: {value} | |
| `results.details.kspc` | Keystrokes per character: {value} | |
| `results.details.rollover` | Rollover: {value}% | |
| `results.details.burst` | Best 5-second burst: {value} WPM | |
| `results.replay.cta` | Watch replay | |
| `results.replay.play` | Play replay | Starts stepping through the retained attempt |
| `results.replay.pause` | Pause replay | Pauses the stepping; the same button resumes |
| `results.replay.restart` | Restart replay | Returns playback to the first frame |
| `results.replay.close` | Close replay | Hides the viewer; the finished panel stays |
| `results.replay.speed` | Replay speed | Label for the time-scale control (display only, never scoring) |
| `results.replay.seek` | Move through the replay | Accessible label for the scrub control and time readout |
| `results.replay.time` | {current}s of {total}s | Timestamp readout; both slots are seconds with one decimal |
| `results.replay.errorsNone` | Replay: no errors. | Static text summary beside an error-free replay |
| `results.replay.errorsSome` | Replay: {count} errors ({detail}). | {detail} names positions in words ("position 5", "positions 5, 9"); never colour-only |
| `results.replay.corrupted` | This replay doesn't match the finished text, so it may be incomplete. The scores above are unaffected. | Shown when the log fails the final-text-exact check |
| `results.replay.unavailable` | No replay is kept for this test. | Shown when no in-memory log was retained |
| `results.savePrompt.title` | Save your progress? | |
| `results.savePrompt.body` | Create a free account to keep your history, track goals, and pick up where you left off on another device. | No pressure language, states the actual benefit |
| `results.savePrompt.cta` | Save my progress | |
| `results.savePrompt.dismiss` | Not now | Never "No thanks" (slightly guilt-adjacent) or a tiny unreadable link — a real, equal-weight button |
| `results.headline.classicWpm` | Classic WPM: {value} | The all-characters figure with no error subtraction, shown beside net WPM per §4.3's transparency rule |
| `results.details.title` | Details | Heading for the figures list (§4.3 item 5) |
| `results.details.notReported` | Not reported for this test | Stand-in for a figure the engine returns as null. A dash would hide the gap; the short-test notice beside it says why the gap is there |
| `results.unverified.local` | Calculated in this browser from the keystrokes you produced. Nothing was sent anywhere and nothing was saved. | Body under `results.unverified.label`. Deliberately NOT `results.unverified.tooltip`: that line says the result "is still saved as a private practice result", and at MVP nothing is saved. A sentence the screen cannot keep is worse than no sentence |
| `results.short.title` | Short test | Label for the notice on a run below the engine's own MIN_CONSISTENCY_DURATION_MS. A measurement limit named in words, never as a failure |
| `results.short.body` | This test ran for {seconds} seconds. Figures that need at least {minimum} seconds of it are left out. | Both slots are seconds, formatted once by the results formatter, and the unit is spelled out rather than left to a reader's guess |
| `results.flags.title` | Notes on this test | Label when the engine returned integrity flags. Neutral wording: a flag is something to read, not an accusation |
| `results.flags.body` | The engine recorded {notes} while this test ran. The figures above come from the same keystrokes. | `{notes}` is the flag list in words. A code this table does not name is shown verbatim rather than hidden |
| `results.flags.untrusted` | input the browser did not mark as trusted | Wording for the engine's `untrusted-events` flag |
| `results.flags.auto` | characters inserted automatically | Wording for the `auto-events-present` flag (ENG-09) |
| `results.flags.verifiedInvalid` | input that would disqualify a verified result | Wording for the `verified-invalid-input` flag |
| `results.flags.announce` | This test has notes. | Appended to the finished-test announcement when flags exist. Still ONE announcement per finished test — the note rides on it rather than becoming a second one |
| `results.offline.label` | Offline | The tone label on the offline notice. The word the reader needs, and the panel's own non-colour cue for it |
| `results.offline.note` | You're offline. This result was calculated in this browser and has not been sent anywhere. | Deliberately NOT `state.offline`: that line promises results will sync when the connection returns, and at MVP there is no sync to promise. What actually happened is said instead |
| `results.pending` | There is no difficulty rating for this passage and no result history to compare against yet. | Names the two §4.3 fields nothing produces yet (the engine returns `difficultyBand: null`; nothing is stored). One sentence, rather than a silent hole where a card should be |

---

## 4. Diagnose / Weakness views

| Key | Text | Notes |
|---|---|---|
| `weakness.heatmap.title` | Your keyboard | |
| `weakness.heatmap.legend.speed` | Speed | |
| `weakness.heatmap.legend.errors` | Errors | |
| `weakness.heatmap.tableAlternativeLabel` | View as a table instead | Accessibility requirement — always present, not hidden in a menu |
| `weakness.typoArrow.tooltip` | You typed {typedKey} when the text needed {intendedKey}, {count} times. | |
| `weakness.transitionTable.title` | Letter pairs | |
| `weakness.transitionTable.column.pair` | Pair | |
| `weakness.transitionTable.column.samples` | Samples | |
| `weakness.transitionTable.column.speed` | Your speed | |
| `weakness.transitionTable.column.trend` | Trend | |
| `weakness.transitionTable.lowConfidence` | Still learning this one — {count} samples so far. | Shown instead of a hard "weak" label when sample size is thin |
| `weakness.errorPanel.title` | What tripped you up | |
| `weakness.errorPanel.substitution` | You typed {wrong} instead of {right} | |
| `weakness.errorPanel.omission` | You skipped {letter} | |
| `weakness.errorPanel.insertion` | You added an extra {letter} | |
| `weakness.errorPanel.transposition` | You swapped {a} and {b} | |

---

## 5. Onboarding / First-session flow

| Key | Text | Notes |
|---|---|---|
| `onboarding.welcome.title` | Let's see where you're starting from. | Precedes the first test; framed as discovery, not a judgment |
| `onboarding.panel.title` | A few things, if you want them | OPS-01. Heading of the first-run panel. An offer, not a gate: the panel sits above the typing field, never over it, and the field is usable before anything here is answered |
| `onboarding.panel.intro` | None of this is required. You can start typing now, and change any of it later. | Says the plain thing rather than implying a commitment |
| `onboarding.panel.submit` | Make my starting plan | Primary action. Names the output (a plan), not a result |
| `onboarding.goal.everyday` | Everyday typing, more smoothly | An aspiration the user reported, not a promise the product makes. No magnitude, no deadline |
| `onboarding.goal.mistakes` | Fewer mistakes | As above |
| `onboarding.goal.symbols` | Symbols and numbers | As above. Carries the honest limit: no symbol or code passage is selectable at MVP, so the plan says so in words rather than implying one |
| `onboarding.goal.writing` | Longer writing sessions | As above |
| `onboarding.goal.unsure` | Not sure yet | A first-class answer, not a skip: the plan still comes out |
| `onboarding.level.prompt` | Where does touch typing stand for you today? | Self-report, never a placement result. Deliberately includes "coming back to it" so an adult re-learner is not asked to call themselves a beginner |
| `onboarding.level.new` | I'm new to it | |
| `onboarding.level.partway` | I'm partway there | |
| `onboarding.level.returning` | I'm coming back to it | |
| `onboarding.level.comfortable` | I type without looking | |
| `onboarding.level.unsure` | I'd rather not say | Answering this is never required, and "I'd rather not say" is a complete answer |
| `onboarding.languages.prompt` | Which languages do you type? | Optional multi-select |
| `onboarding.languages.note` | Passages are English for now, so nothing on screen changes. This is recorded for the programmer track. | Factual: what the answer does and does not do today. No outcome promised |
| `onboarding.layout.label` | Keyboard layout | The panel does not re-ask this: it states what LOC-01 already decided and points at the always-visible override |
| `onboarding.layout.guess` | We've set the keyboard to {layout}, guessed from your browser language. Change it in Settings whenever you like. | {layout} is the display name. Names the guess as a guess and never contradicts it |
| `onboarding.layout.confirmed` | Keyboard set to {layout}. You can change it in Settings. | The visitor has already chosen; no guessing language |
| `onboarding.plan.title` | Your starting plan | Heading of the emitted plan. "Starting" and "plan", never a target or a forecast |
| `onboarding.plan.provisional` | This is a starting point, not a measurement. Your first test is what measures. | The honesty line. Stated once, in the panel, and repeated in the collapsed row's accessible name |
| `onboarding.plan.row.focus` | Focus | |
| `onboarding.plan.row.content` | What you'll type | |
| `onboarding.plan.row.level` | Starting level | |
| `onboarding.plan.row.layout` | Keyboard | |
| `onboarding.plan.row.languages` | Languages | |
| `onboarding.plan.focus.everyday` | Prose, read at your own pace | "Your own pace" is a description of the surface, which has no timer, not a promise about results |
| `onboarding.plan.focus.mistakes` | Prose, with each mistake marked as it happens | What the free error mode does |
| `onboarding.plan.focus.symbols` | Symbols and numbers, once code passages exist. Not available yet. | The honest half of the answer: the goal is recorded and the capability is named as missing rather than implied |
| `onboarding.plan.focus.writing` | Longer prose passages | |
| `onboarding.plan.focus.unsure` | A short prose test, then whatever your test points at | |
| `onboarding.plan.value.prose` | English prose at {band} difficulty | {band} is one of CNT-02's three labels. Code snippets carry no band and never will until the model covers them, so this row never promises one |
| `onboarding.plan.value.bandNote` | Difficulty bands cover prose and quotes. Code snippets carry no band yet. | Said on the panel rather than left for the reader to discover |
| `onboarding.plan.band.easy` | Easy | CNT-02's closed enum in words. The plan may only ever name one of these three |
| `onboarding.plan.band.typical` | Typical | CNT-02's closed enum in words |
| `onboarding.plan.band.hard` | Hard | CNT-02's closed enum in words |
| `onboarding.plan.value.levelSelfReported` | You said: {answer} | Never presented as a measurement, and never as a placement result |
| `onboarding.plan.value.languagesSelfReported` | You said: {answer} | |
| `onboarding.plan.value.levelNone` | Not said, and not needed | A complete plan without a level answer. Reads as a choice the visitor made, never as a gap or a prompt to return |
| `onboarding.plan.value.languagesNone` | None chosen | A complete plan, not a hole |
| `onboarding.plan.value.layout` | {layout} — {source} | {source} is "guessed from your browser language" or "set by you" |
| `onboarding.plan.value.layoutSource.guessed` | guessed from your browser language | The two layout sources LOC-01 already distinguishes, in words. A guess and a choice are different facts and flattening them would make the plan overstate what the app knows |
| `onboarding.plan.value.layoutSource.confirmed` | set by you | |
| `onboarding.plan.languagesNote` | Your languages are recorded. Passages in them arrive with the programmer track: JavaScript and Python have grammar maps already, the others do not. | States what exists today (grammar maps in the engine) and what does not (passages). CNT-02 scores prose and quotes only |
| `onboarding.plan.pending` | Still to come: a measured baseline, the placement test, and the level track. Your first test starts filling these in. | The pending list, in words, on the panel. Named requirement IDs live in the typed plan, not in the copy |
| `onboarding.plan.change` | Change this | Reopens the panel. Focus returns here when it closes again |
| `onboarding.postDrill.delta.improved` | Nice — {item} is {percent}% faster than it was a minute ago. | |
| `onboarding.postDrill.delta.steady` | Still steady on {item}. That's fine — some things take a few more rounds. | Used when change is within the noise band; never framed as failure |
| `onboarding.goal.prompt` | What would you like to work toward? | |
| `onboarding.goal.presetSpeed` | Get faster at everyday typing | |
| `onboarding.goal.presetAccuracy` | Make fewer mistakes | |
| `onboarding.goal.presetSymbols` | Get comfortable with symbols and numbers | Programmer-leaning preset |
| `onboarding.goal.presetWriting` | Write more, more easily | Writer-leaning preset |
| `onboarding.goal.presetSkip` | I'll decide later | |
| `onboarding.plan.prompt` | When do you think you'll practice next? | If-then plan step |
| `onboarding.plan.optionMorning` | After my morning coffee | |
| `onboarding.plan.optionCommute` | During a break at work or school | |
| `onboarding.plan.optionEvening` | Before bed | |
| `onboarding.plan.optionCustom` | Something else | Opens a free-text or time-picker field |
| `onboarding.plan.optionSkip` | I'll figure it out | Always allow skipping this step |
| `onboarding.tomorrowPlan.preview` | Tomorrow: a quick {duration}-minute session on {focusArea}. | Shown at the end of onboarding so the next step is concrete |
| `onboarding.gamificationChoice.prompt` | How do you feel about streaks and daily goals? | |
| `onboarding.gamificationChoice.full` | I like the extra motivation — streaks, goals, all of it | Maps to "Full" gamification level |
| `onboarding.gamificationChoice.light` | Just the basics — track my progress, skip the pressure | Maps to "Light" (default) |
| `onboarding.gamificationChoice.off` | Just show me my results, nothing else | Maps to "Off" |

**What OPS-01 ships and what it deliberately leaves alone.** The `onboarding.panel.*`,
`onboarding.goal.*` (everyday/mistakes/symbols/writing/unsure), `onboarding.level.*`,
`onboarding.languages.*`, `onboarding.layout.*` and `onboarding.plan.*` rows above ship at MVP as
the first-run panel; they supersede the older `onboarding.goal.preset*` family, which is left in
the table as the WAVE-4 wording and is not rendered. The panel's dismiss control is the global
`action.skip` from section 1 — an equal, full-size button with its own label, never an "X", never a
small link, and never placed after a "next" step so that skipping reads as the harder route.
`onboarding.plan.prompt` / `onboarding.plan.option*`
(the if-then plan) and `onboarding.gamificationChoice.*` are **not** asked by OPS-01: they belong to
RET-M-08 (M5), and a question about streaks has nothing honest to point at until the streak system
exists. `onboarding.postDrill.*` belongs to the post-drill delta slice.

---

## 6. Dashboard / Today card

| Key | Text | Notes |
|---|---|---|
| `dashboard.today.notYetPracticed` | Ready when you are. | Neutral, not a nag |
| `dashboard.today.practicedToday` | You practiced today. Want to do a bit more, or call it done? | |
| `dashboard.today.restDay` | Today's a rest day — that's part of the plan too. | Shown only if the user has set a rest day |
| `dashboard.today.startCta` | Start today's session | |
| `dashboard.streak.weeklyProgress` | {practiced} of {goal} days this week | |
| `dashboard.streak.weekComplete` | You hit your goal for the week. | No exclamation-point hype required; calm confirmation is enough |
| `dashboard.streak.freezeUsed` | A freeze covered last week. You're still on track. | Never frames a freeze as a failure averted — frames it as the system working as intended |
| `dashboard.streak.freshStart` | New week, fresh start. | Used instead of any "you lost your streak" language after a genuine reset |
| `dashboard.streak.pauseActive` | Your streak is paused until {date}. Nothing to worry about. | |
| `dashboard.goal.eta` | At your current pace, about {rangeLow}–{rangeHigh} weeks to your goal. | Always a range, never a single confident date |
| `dashboard.goal.etaFlat` | Your pace has been steady rather than climbing lately — that's normal, and still counts as consistent practice. | Used when the trend is flat, instead of hiding the ETA silently |
| `dashboard.goal.etaInsufficientData` | A little more data and we can estimate your pace. | |
| `dashboard.weeklyReview.title` | Your week | |
| `dashboard.weeklyReview.topImprovement` | Biggest improvement: {item} | |
| `dashboard.weeklyReview.weakestSpot` | Worth a look: {item} | |

---

## 7. Settings

| Key | Text | Notes |
|---|---|---|
| `settings.section.typing` | Typing | |
| `settings.section.appearance` | Appearance | |
| `settings.section.layout` | Layout & Keyboard | |
| `settings.section.accessibility` | Accessibility | |
| `settings.section.privacy` | Data & Privacy | |
| `settings.caretStyle.label` | Caret | STEER-6. The caret is a display preference; it changes no metric and no `modelVersion`, so a recorded test stays comparable across the three. |
| `settings.caretStyle.line` | Line | The design-pack default: a thin bar sized to the letter. |
| `settings.caretStyle.block` | Block | A tinted block over the character, with a solid edge marking the insertion point. |
| `settings.caretStyle.underline` | Underline | A short rule under the character, clearing the descenders. |
| `settings.theme.label` | Theme | CUS-02. Night Ink is the default; Daylight is the light palette. Both palettes already live in tokens.css — the switcher only selects. |
| `settings.theme.nightInk` | Night Ink | The default dark palette. |
| `settings.theme.daylight` | Daylight | The light palette. |
| `settings.uiFont.label` | Interface font | CUS-02. The interface face only — never the typing face. |
| `settings.uiFont.geist` | Geist (default) | The default interface face. |
| `settings.uiFont.system` | System | The device's own interface face. |
| `settings.uiFont.atkinson` | Atkinson Hyperlegible | A highly legible face. Names the typeface; claims nothing about any reader. |
| `settings.uiFont.note` | An interface face option for the app chrome. The typing text always stays in JetBrains Mono, whatever is selected here. | Factual only: what changes and what does not. No readability, accessibility or speed outcome is promised. |
| `settings.focusMode.label` | Focus mode | CUS-02. User toggle only — never activates on its own. |
| `settings.focusMode.note` | Hides the title, settings and notes, and softens the readout around the text. The passage, results and replay stay fully usable. | Factual only: what hides, what softens, what stays. |
| `settings.errorMode.free.label` | Free (default) | |
| `settings.errorMode.free.description` | Type naturally; mistakes are marked but don't block you. | |
| `settings.errorMode.mustCorrect.label` | Must-correct | |
| `settings.errorMode.mustCorrect.description` | You'll need to fix a mistake before moving past it. Good for accuracy-focused practice. | |
| `settings.reducedMotion.label` | Reduce motion | |
| `settings.reducedMotion.description` | Turns off animations and celebrations. You'll still see clear feedback, just without the movement. | |
| `settings.autoIndent.label` | Auto-indent | ENG-09. Arms automatic indentation for code passages; prose passages produce no automatic insertions. |
| `settings.autoPair.label` | Auto-pair | ENG-09. Arms automatic bracket pairing for code passages; prose passages produce no automatic insertions. |
| `settings.autoNote` | These arm automatic insertions for code passages. Prose passages produce no automatic insertions, so the toggles change nothing here — the choice is carried into each result for when code passages arrive. | Factual only: what the toggles arm and the honest MVP limit. No outcome is promised. |
| `help.shortcuts.title` | Keyboard shortcuts | CUS-03. Native disclosure beside the settings; every entry names a binding the app honors, each exercised in e2e. |
| `help.shortcuts.intro` | Everything here works without a mouse. | |
| `help.shortcuts.tab` | Tab, while typing: restart the test. | |
| `help.shortcuts.escape` | Escape, while typing: leave the typing field. Tab then moves on. | |
| `help.shortcuts.resultsEscape` | Escape, in the results: close the replay, or return to the passage. | ANA-01. One binding for both: with the replay open it closes it and puts focus back on its button; with the replay closed it returns to the typing field |
| `help.shortcuts.activate` | Enter or Space: activate the focused button, select, checkbox, or link. | |
| `help.shortcuts.replay` | Arrow keys: move through the replay, when its slider is focused. Home and End jump to the ends. | |
| `help.shortcuts.type` | Letters and punctuation: type the passage, while the field is focused. | |
| `settings.noTimerPractice.label` | No-timer practice | |
| `settings.noTimerPractice.description` | Practice without a countdown. Take all the time you need. | |
| `settings.dataPrivacy.exportCta` | Export my data | |
| `settings.dataPrivacy.deleteCta` | Delete my account | |
| `settings.dataPrivacy.deleteConfirm.title` | Delete your account? | |
| `settings.dataPrivacy.deleteConfirm.body` | This removes your results, progress, and settings. It can't be undone after {gracePeriod} days. | Honest about the grace period, no scare tactics |
| `settings.dataPrivacy.researchConsent.label` | Help us understand what works | |
| `settings.dataPrivacy.researchConsent.description` | With your permission, we'll include your (anonymous) practice data in studies about whether our training actually helps. You can turn this off anytime. | |

---

## 8. Programmer track (Code hub, Levels)

| Key | Text | Notes |
|---|---|---|
| `code.hub.title` | Programmer track | |
| `code.hub.subtitle` | Get comfortable with symbols, numbers, and syntax — in any language. | Deliberately does NOT say "become a better programmer" (positioning guardrail) |
| `code.baseline.cta` | Take the 10-minute baseline | |
| `code.baseline.result.title` | Your code skill profile | |
| `code.levelMap.tierLocked` | Complete {previousTier} to unlock | |
| `code.levelMap.testOutCta` | Think you know this already? Test out. | |
| `code.level.almostThere` | Almost there — {detail} | e.g., "Almost there — just a bit more accuracy on brackets" |
| `code.level.passed` | Level complete. | Calm, not a fanfare-heavy phrase |
| `code.level.starEarned` | {stars} of 3 stars | |
| `code.boss.intro` | This one mixes everything from this tier, plus a couple of things from before. | |
| `code.recall.hidden` | Text hidden — type what you remember. | |
| `code.recall.reveal` | Here's what it actually was: | Shown after the attempt, comparing what they typed |

---

## 9. Error and edge-case copy

| Key | Text | Notes |
|---|---|---|
| `error.network.submitFailed` | We couldn't save that just now. It's safe on your device — we'll try again automatically. | |
| `error.network.retryManual` | Try saving again | |
| `error.session.expired` | This test session timed out. Your result is still here, just not verified — you can try a fresh one anytime. | |
| `error.session.invalidVerified` | Looks like you switched tabs mid-test, so this one can't be verified. It's saved as a practice result. | Neutral, not accusatory (even though this can also happen from cheating attempts) |
| `error.content.unavailable` | We couldn't load new text right now. Here's something from your device instead. | Used when falling back to bundled offline content |
| `error.generic.reportCta` | Something look wrong? Let us know | Links to feedback widget |
| `empty.history.noResultsYet` | Nothing here yet — your results will show up after your first test. | |
| `empty.leaderboard.notLive` | Leaderboards aren't open yet — we're making sure they're fair first. | Honest about the integrity-first sequencing from the spec |
| `empty.friends.none` | No friends added yet. | |

---

## 10. Notification copy (V1)

| Key | Text | Notes |
|---|---|---|
| `notification.practiceCue` | Your {duration}-minute session is ready whenever you are. | Neutral, matches the user's own chosen if-then plan; never guilt |
| `notification.streakSave` | Your streak for this week is still open — a quick session keeps it going. | Only sent if the user opted into this specific notification type |
| `notification.weeklyReview` | Your week in typing is ready to look at. | |
| `notification.bannedExample.doNotUse1` | ~~We miss you! Come back before it's too late!~~ | **Explicitly banned** — shown here as a negative example, not a real string |
| `notification.bannedExample.doNotUse2` | ~~You're about to lose everything!~~ | **Explicitly banned** — negative example |

---

## 11. Accessibility-specific announced strings (live region content)

| Key | Text | Notes |
|---|---|---|
| `a11y.announce.testFinished` | Test finished. {wpm} words per minute, {accuracy} percent accuracy. | The ONLY thing announced automatically — never per-keystroke |
| `a11y.announce.levelPassed` | Level passed with {stars} stars. | |
| `a11y.announce.settingChanged` | {settingName} set to {value}. | |
| `a11y.instructions.typingSurface` | Type the text shown. Press Tab to restart. Press Escape to leave this area. | The accessible name/instructions for the hidden input element |

---

## 12. Register entry for this file

| Field | Value |
|---|---|
| type | ui-copy |
| license | original work — ours |
| status | draft — ready for direct use in an i18n strings file; needs a native-English copy-editor pass before "reviewed" |
| coverage | Global, Home, Results, Weakness views, Onboarding, Dashboard, Settings, Programmer track, Errors, Notifications, Accessibility — 12 sections, ~140 strings |
| what's NOT covered yet | Legal page body text (Terms/Privacy — those need actual legal drafting, not UX microcopy), marketing/SEO page copy, V1 social features (clubs/leagues) copy, billing/Pro-tier copy |
