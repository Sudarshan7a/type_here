/**
 * Every user-visible string the typing surface renders, bound to its key in
 * docs/content-ui-copy-string-tables.md.
 *
 * The keys are the contract: `tests/copy-tables.test.ts` re-reads that document
 * and fails if any text here has drifted from it, so copy cannot quietly diverge
 * from the table the way a hard-coded literal in a component would.
 */

export const COPY = {
  /** brand.tagline — the one-line product statement beside the wordmark. */
  brandTagline: "A typing trainer that shows its work.",

  /**
   * toolbar.group.{test,display,typing} — the three settings groups. Single
   * plain nouns: they name what lives inside, never what it will do for the
   * reader, so there is nothing here the claims ban could touch.
   */
  toolbarGroups: {
    test: "Test",
    display: "Display",
    typing: "Typing",
  } as const,

  /** home.hint.firstVisit — the unfocused prompt (STEER-2 criterion 4). */
  focusPrompt: "Click here to start typing.",

  /** settings.caretStyle.label — STEER-6. */
  caretStyleLabel: "Caret",

  /** settings.caretStyle.{line,block,underline} — STEER-6, default line. */
  caretStyleOptions: {
    line: "Line",
    block: "Block",
    underline: "Underline",
  },

  /**
   * settings.theme.label — CUS-02. Night Ink (the `:root` default) and Daylight
   * (the `data-theme="daylight"` palette) are the two palettes tokens.css
   * already defines. The default is whatever the visitor already sees: Night
   * Ink, unless their OS asks for light and they have never chosen — the CSS
   * `prefers-color-scheme` mapping, which the switcher does not override until
   * a selection is made. No outcome is promised.
   */
  themeLabel: "Theme",

  /** settings.theme.{nightInk,daylight} — CUS-02, the two shipped palettes. */
  themeOptions: {
    "night-ink": "Night Ink",
    daylight: "Daylight",
  } as const,

  /**
   * settings.uiFont.label — CUS-02. The INTERFACE face only. The typing face
   * stays JetBrains Mono whatever is selected here — the two faces are
   * independent by design, so this choice can never silently restyle the text
   * being typed. Factual only: what changes and what does not. No outcome —
   * readability, accessibility or speed — is promised.
   */
  uiFontLabel: "Interface font",

  /** settings.uiFont.{geist,system,atkinson} — CUS-02, default Geist. */
  uiFontOptions: {
    geist: "Geist (default)",
    system: "System",
    atkinson: "Atkinson Hyperlegible",
  } as const,

  /**
   * settings.uiFont.note — CUS-02. Factual only: what the option changes, which
   * face does the typing, and that nothing about legibility, accessibility or
   * speed is claimed. "A highly legible face" describes the typeface; it is
   * not a statement about any reader.
   */
  uiFontNote:
    "An interface face option for the app chrome. The typing text always stays in JetBrains Mono, whatever is selected here.",

  /**
   * settings.focusMode.label / settings.focusMode.note — CUS-02. Factual only:
   * what is hidden, what is softened, and what stays fully usable. Never
   * activates on its own; the toggle below is the only way in.
   */
  focusModeLabel: "Focus mode",
  focusModeNote:
    "Hides the title, settings and notes, and softens the readout around the text. The passage, results and replay stay fully usable.",

  /**
   * settings.layout.label — LOC-01 (M2-06 §2). The selector is a plain labelled
   * control beside the passage picker, always visible, never covering the text.
   */
  layoutLabel: "Keyboard layout",

  /** settings.layout.{option} — the six contract layouts, roadmap build order. */
  layoutOptions: {
    "qwerty-us": "QWERTY (US)",
    "qwerty-uk": "QWERTY (UK)",
    dvorak: "Dvorak",
    "colemak-dh": "Colemak-DH",
    azerty: "AZERTY",
    qwertz: "QWERTZ",
  } as const,

  /**
   * First-run layout prompt (M2-06 §2). Names the guess as a guess: detection
   * reads the browser language only, which is weak evidence for hardware.
   */
  layoutFirstRun:
    "New here? Confirm the keyboard you type on. We guess from your browser language, and the guess can be wrong — you can change it any time.",

  /**
   * Why the layout choice matters (M2-06 §2). Factual only: what the value is
   * used for, and the honest MVP limit that passages stay English whatever is
   * selected. No outcome is promised.
   */
  layoutWhy:
    "Your layout decides which finger map a result is read against. It does not change the passages, which are English for now.",

  /**
   * IME notice (M1-04 §6). Shown beside the settings, never over the text:
   * partial input is never scored, so it says so rather than mis-scoring
   * silently. Names carry no keystroke content (keystroke-privacy skill).
   */
  imeNotice:
    "Typing with an IME (for example Chinese, Japanese, or Korean entry): suggestions shown while you compose are never scored. Only the text you confirm counts.",

  /**
   * settings.autoIndent.label / settings.autoPair.label (ENG-09, D-M5-5).
   * Factual only: what the toggles arm. No producer exists in prose mode, so
   * the note says plainly that these matter to code passages (WAVE 3), not to
   * the English passages on screen — an armed toggle that did nothing silently
   * would be the dishonest version.
   */
  autoIndentLabel: "Auto-indent",
  autoPairLabel: "Auto-pair",
  autoNote:
    "These arm automatic insertions for code passages. Prose passages produce no automatic insertions, so the toggles change nothing here — the choice is carried into each result for when code passages arrive.",

  /**
   * help.shortcuts.* (CUS-03). The keyboard list. Every entry names a binding
   * the app actually honors — Tab-to-restart, Escape-to-leave, native control
   * keys, replay scrub keys — pinned by e2e/keyboard-flow.spec.ts. Adding a
   * binding here without a test is how a shortcuts list starts lying.
   */
  shortcutsTitle: "Keyboard shortcuts",
  shortcutsIntro: "Everything here works without a mouse.",
  shortcuts: [
    "Tab, while typing: restart the test.",
    "Escape, while typing: leave the typing field. Tab then moves on.",
    "Escape, in the results: close the replay, or return to the passage.",
    "Enter or Space: activate the focused button, select, checkbox, or link.",
    "Arrow keys: move through the replay, when its slider is focused. Home and End jump to the ends.",
    "Letters and punctuation: type the passage, while the field is focused.",
  ] as const,

  /** home.hint.restart */
  hintRestart: "Press Tab to restart",

  /** a11y.instructions.typingSurface — the key sink's accessible name. */
  typingSurfaceInstructions:
    "Type the text shown. Press Tab to restart. Press Escape to leave this area.",

  /**
   * Live readout labels, read at a glance so they stay short.
   *
   * "Keystroke accuracy" and not "Accuracy": the live figure is keystroke
   * accuracy (correct keystrokes ÷ printable keystrokes) and the finished
   * headline is final accuracy (correct characters in the text produced ÷ its
   * length). One word for two different measures, on one screen, is how the
   * owner came to see 98.9% beside 100.0% and read it as a contradiction. The
   * word now names the measure. Logged as a spec amendment in HUMAN-ACTIONS.md:
   * docs/content-ui-copy-string-tables.md §home.live.accuracy is changed to match.
   */
  liveNetWpmLabel: "Net WPM",
  liveAccuracyLabel: "Keystroke accuracy",

  /** home.live.timeRemaining — shown only in a timed test (MOD-01). */
  liveTimeRemainingLabel: "Time left",

  /**
   * MOD-01: the classic test setup. Mode names and option labels only — each
   * one names what the test IS, never what it will do for the reader, so the
   * claims ban has nothing to catch here. The durations are the contract's
   * 15/30/60/120 (120s labelled "2 minutes" rather than "120s", because that
   * is what the string table asks for and because "120s" reads as a stopwatch,
   * not a promise).
   */
  testSetup: {
    modeLabel: "Test length",
    modeOptions: {
      // MOD-02: the default home mode. Real-world prose is the whole library —
      // mixed case, punctuation, digits, names and URLs across five domains
      // — with the engine's own difficulty band shown beside each passage.
      prose: "Real-world prose",
      time: "Timed",
      words: "Word count",
      quotes: "Quotes",
      custom: "Custom text",
      numbers: "Numbers & symbols",
    },
    modeNotes: {
      // MOD-02: every feature named here is verified to exist in the shippable
      // prose pool by tests/test-config.test.ts. The library carries NO
      // passages with a URL (0 of 300), so the note does not claim one — a
      // copy claim the content cannot back is exactly what the claims ban
      // exists to stop.
      prose: "Real-world prose: mixed case, punctuation, digits, names and symbols. No clock.",
      time: "Type as much as you can before the clock runs out.",
      words: "Type the first N words of a passage.",
      quotes: "Type a quote from the content library.",
      custom: "Paste or type your own text to practise on.",
      numbers: "Digit rows, symbol rows and mixed alphanumerics. No clock.",
    },
    durationLabel: "Time limit",
    durationOptions: {
      15: "15s",
      30: "30s",
      60: "60s",
      120: "2 minutes",
    } as const,
    wordCountLabel: "Words",
    wordCountOptions: {
      15: "15 words",
      30: "30 words",
      60: "60 words",
    } as const,
    quoteAction: "Next quote",
    customLabel: "Your text",
    customLimitNote: "Up to 2000 characters. Nothing you type here is stored or sent anywhere.",
    // MOD-04: numbers and symbols. Each names what the drill IS — a row of
    // digits, a row of symbols — never what it will do for the reader.
    drillLabel: "Drill",
    drillOptions: {
      digits: "Digit rows",
      decimals: "Decimals and separators",
      symbols: "Symbol rows",
      mixed: "Mixed alphanumerics",
    },
    drillAction: "New drill",
    drillNote: "Synthetic material, generated from a seed — the same drill is always reproducible.",
  },

  /** Shown while the test is paused by focus loss (chapter 4 E4). */
  paused: "Paused — click here to continue when you're ready.",

  /** action.restart */
  actionRestart: "Restart",

  /** action.newPassage */
  newPassage: "New passage",

  /** results.title — heading of the finished panel; visually hidden, for the landmark name. */
  resultsTitle: "Results",

  /**
   * The one and only automatic announcement (a11y.announce.testFinished).
   *
   * The trailing `note` is the flagged-run sentence and nothing else. It rides
   * on this one string rather than becoming a second live region, so a flagged
   * run is still announced exactly once — and a clean run appends nothing,
   * rather than announcing the absence of something.
   */
  announceTestFinished: (wpm: string, accuracy: string, note?: string): string =>
    `Test finished. ${wpm} words per minute, ${accuracy} percent accuracy.${note ?? ""}`,

  /**
   * The focused headline shows the metric plus its unit, so the number is never
   * ambiguous on screen ("97.0" could be anything). The live readout carries the
   * bare number because its label sits directly beside it.
   */
  headlineNetWpm: (value: number): string => `${value.toFixed(1)} WPM`,

  /** results.headline.accuracy */
  headlineAccuracy: (value: number): string => `${value.toFixed(1)}% accuracy`,

  /**
   * results.headline.classicWpm — §4.3 item 1 asks for classic WPM shown
   * alongside net WPM, per the transparency rule. Filled with the engine's GROSS
   * figure: every character produced, with no error subtraction, which is what
   * "classic WPM" means on a test page. results/format.ts does the formatting,
   * at the same precision as the headline beside it.
   */
  resultsClassicWpm: (value: string): string => `Classic WPM: ${value}`,

  /** results.details.title — the heading for the figures list. */
  resultsDetailsTitle: "Details",

  /**
   * results.details.* — the figures list. These take an ALREADY formatted
   * string, not a number: precision is chosen once in results/format.ts and
   * applied once, so no row can quietly disagree with another about how many
   * decimals a figure gets. `tests/results-metrics.test.ts` pins each of these
   * against the value the engine produced.
   */
  resultsDetailsRaw: (value: string): string => `Raw: ${value} WPM`,
  resultsDetailsConsistency: (value: string): string => `Consistency: ${value}`,
  resultsDetailsKspc: (value: string): string => `Keystrokes per character: ${value}`,
  resultsDetailsRollover: (value: string): string => `Rollover: ${value}%`,
  resultsDetailsBurst: (value: string): string => `Best 5-second burst: ${value} WPM`,

  /**
   * results.details.notReported — what a figure reads as when the engine has no
   * value for it. Words, never a dash and never 0: a dash hides the gap, and a 0
   * is a claim about the user that nothing measured (chapter 4 E9).
   */
  resultsDetailsNotReported: "Not reported for this test",

  /** results.unverified.label — the standing state, because nothing is verified yet. */
  resultsUnverifiedLabel: "Practice result (not verified)",

  /**
   * results.unverified.local — WHY it is unverified. Deliberately not
   * `results.unverified.tooltip`, which says the result is saved: nothing is
   * saved at MVP, and a sentence the screen cannot keep is worse than none.
   */
  resultsUnverifiedLocal:
    "Calculated in this browser from the keystrokes you produced. Nothing was sent anywhere and nothing was saved.",

  /**
   * results.short.* — a run below the engine's own consistency floor. The notice
   * names the measurement limit and its size. It is not a verdict on the
   * attempt, and nothing about it is allowed to read as one.
   */
  resultsShortTitle: "Short test",
  resultsShortBody: (seconds: string, minimum: string): string =>
    `This test ran for ${seconds} seconds. Figures that need at least ${minimum} seconds of it are left out.`,

  /**
   * results.flags.* — integrity flags in words. A flag is a note to read, not an
   * accusation: the wording says what the engine recorded and nothing about who
   * did what, and it states that the figures come from the same keystrokes, so
   * the note cannot read as "these numbers are void".
   */
  resultsFlagsTitle: "Notes on this test",
  resultsFlagsBody: (notes: string): string =>
    `The engine recorded ${notes} while this test ran. The figures above come from the same keystrokes.`,
  resultsFlagsAnnounce: "This test has notes.",
  /** The engine's opaque flag codes, named in words. A code this table does not name is shown as-is. */
  resultsFlagWords: {
    "untrusted-events": "input the browser did not mark as trusted",
    "auto-events-present": "characters inserted automatically",
    "verified-invalid-input": "input that would disqualify a verified result",
  } as Record<string, string>,

  /**
   * results.offline.label / results.offline.note — what actually happened,
   * without the promise the global `state.offline` line makes. There is no sync
   * to promise at MVP.
   */
  resultsOfflineLabel: "Offline",
  resultsOfflineNote:
    "You're offline. This result was calculated in this browser and has not been sent anywhere.",

  /**
   * results.pending — the two §4.3 fields nothing produces yet, named in one
   * sentence: the engine returns `difficultyBand: null` and nothing is stored,
   * so there is no history to compare against. Naming the hole is the honest
   * alternative to leaving a blank where a card should be.
   */
  resultsPending:
    "There is no difficulty rating for this passage and no result history to compare against yet.",

  /** footer.howWeCalculate is the permanent home of this; shown small here. */
  engineStamp: (modelVersion: string): string =>
    `Scores from the RealType engine, model ${modelVersion}`,

  /** results.replay.cta — offered on the finished panel; replays the retained attempt. */
  replayWatch: "Watch replay",

  /** results.replay.play / results.replay.pause — the single playback toggle. */
  replayPlay: "Play replay",
  replayPause: "Pause replay",

  /** results.replay.restart — restarts playback from the first frame. */
  replayRestart: "Restart replay",

  /** results.replay.close — hides the viewer; the finished panel stays. */
  replayClose: "Close replay",

  /** results.replay.speed — label for the time-scale control (display only). */
  replaySpeedLabel: "Replay speed",

  /** results.replay.seek — accessible label for the scrub control and time readout. */
  replaySeekLabel: "Move through the replay",

  /** results.replay.time — the timestamp readout; both slots are seconds. */
  replayTime: (current: string, total: string): string => `${current}s of ${total}s`,

  /** results.replay.errorsNone — static text summary beside an error-free replay. */
  replayErrorsNone: "Replay: no errors.",

  /**
   * results.replay.errorsSome — static text summary naming the error positions
   * in words ({detail} is "position 5" or "positions 5, 9"), so the summary
   * never depends on colour alone.
   */
  replayErrorsSome: (count: number, detail: string): string =>
    count === 1 ? `Replay: 1 error (${detail}).` : `Replay: ${count} errors (${detail}).`,

  /**
   * results.replay.corrupted — shown when the retained log fails the
   * final-text-exact check. Factual only: what happened and that the scores
   * above are unaffected. No outcome is promised.
   */
  replayCorrupted:
    "This replay doesn't match the finished text, so it may be incomplete. The scores above are unaffected.",

  /** results.replay.unavailable — shown when no in-memory log was retained. */
  replayUnavailable: "No replay is kept for this test.",

  /**
   * onboarding.* — OPS-01, the first-run panel.
   *
   * Every string here is bound to a row in section 5 of
   * docs/content-ui-copy-string-tables.md, and `tests/onboarding-copy.test.ts`
   * re-reads that document and fails on any drift.
   *
   * TWO RULES SHAPE EVERY WORD IN THIS BLOCK.
   *
   * 1. NO PROMISES (AGENTS.md rule 9, PRG-05). The goal options state what the
   *    visitor said they want, never what they will get: no magnitude, no
   *    deadline, no delivery verb. `tools/eslint-plugin-copy-claims.mjs` checks
   *    every string below on every `pnpm lint`, and `tests/onboarding-claims.test.ts`
   *    proves the check by injecting an outcome-phrased sentence and showing it
   *    fails.
   * 2. NO GATE, NO SHAME. Nothing here is required, nothing is asked about
   *    streaks or daily quotas (that question belongs to RET-M-08, M5, and would
   *    have nothing honest to point at), and the provisional line is stated every
   *    time the plan is shown — collapsed row included — so it can never be read
   *    as a measurement.
   */
  onboarding: {
    /** onboarding.panel.title */
    title: "A few things, if you want them",

    /**
     * onboarding.panel.intro. The sentence that does the product work: it says
     * the field is usable now, which is what makes "skippable" true rather than
     * a promise.
     */
    intro: "None of this is required. You can start typing now, and change any of it later.",

    /** onboarding.panel.submit — names the output (a plan), never a result. */
    submit: "Make my starting plan",

    /**
     * action.skip — the global "optional step" label, bound here so the panel does
     * not invent its own wording for the control that makes it skippable. It is
     * deliberately an equal, full-size button with its own label: not an "X", not
     * a small link, and not placed after a "next" step so that skipping reads as
     * the harder route.
     */
    skip: "Skip for now",

    /** onboarding.goal.prompt */
    goalPrompt: "What would you like to work toward?",

    /**
     * onboarding.goal.{everyday,mistakes,symbols,writing,unsure}.
     *
     * Deliberately NOT the older `onboarding.goal.preset*` wording from the
     * string table. Those rows are the WAVE-4 drafts; these are the strings that
     * pass PRG-05 with no table-key exemption at all, so the lint rule has to
     * accept them on their own merits rather than on a key-scoped allowlist
     * entry. `unsure` is a first-class answer, not a skip button: the plan is
     * emitted either way.
     */
    goalOptions: {
      everyday: "Everyday typing, more smoothly",
      mistakes: "Fewer mistakes",
      symbols: "Symbols and numbers",
      writing: "Longer writing sessions",
      unsure: "Not sure yet",
    } as const,

    /** onboarding.level.prompt — a self-report question, never a result. */
    levelPrompt: "Where does touch typing stand for you today?",

    /**
     * onboarding.level.{new,partway,returning,comfortable,unsure}.
     *
     * `returning` exists because the retention playbook §9.5 names adult
     * re-learners as their own segment: someone who typed for years and stopped
     * must not be pushed to call themselves a beginner, and `unsure` exists
     * because declining to answer has to be an answer the plan can be built from.
     */
    levelOptions: {
      new: "I'm new to it",
      partway: "I'm partway there",
      returning: "I'm coming back to it",
      comfortable: "I type without looking",
      unsure: "I'd rather not say",
    } as const,

    /** onboarding.languages.prompt */
    languagesPrompt: "Which languages do you type?",

    /**
     * onboarding.languages.note. Factual: what the answer does (records an
     * interest) and what it does not (change any passage today).
     */
    languagesNote:
      "Passages are English for now, so nothing on screen changes. This is recorded for the programmer track.",

    /** onboarding.layout.label */
    layoutLabel: "Keyboard layout",

    /**
     * onboarding.layout.guess / onboarding.layout.confirmed.
     *
     * The panel does not ask for the layout — LOC-01 already decided it and the
     * override is always visible in Settings beside the typing field. It STATES
     * the decision, names the guess as a guess when it is one, and points at the
     * control that changes it. Two sentences for two states, because "guessed"
     * and "you chose this" are different facts and flattening them would make the
     * panel quietly overstate what the app knows.
     */
    layoutGuess: (name: string): string =>
      `We've set the keyboard to ${name}, guessed from your browser language. Change it in Settings whenever you like.`,
    layoutConfirmed: (name: string): string =>
      `Keyboard set to ${name}. You can change it in Settings.`,

    /** onboarding.plan.title */
    planTitle: "Your starting plan",

    /**
     * onboarding.plan.provisional. The honesty line, shown in the panel AND
     * beside the collapsed row: a one-line summary that dropped this sentence
     * would read as a measurement, which it is not.
     */
    planProvisional:
      "This is a starting point, not a measurement. Your first test is what measures.",

    /** onboarding.plan.row.{focus,content,level,layout,languages} */
    planRows: {
      focus: "Focus",
      content: "What you'll type",
      level: "Starting level",
      layout: "Keyboard",
      languages: "Languages",
    } as const,

    /**
     * onboarding.plan.focus.* — the one line that varies by goal.
     *
     * `symbols` is the load-bearing one: the goal is recorded, and the sentence
     * says in words that no symbol or code passage is selectable yet. A goal the
     * app cannot act on has to be visible in the output, not quietly dropped.
     */
    planFocus: {
      everyday: "Prose, read at your own pace",
      mistakes: "Prose, with each mistake marked as it happens",
      symbols: "Symbols and numbers, once code passages exist. Not available yet.",
      writing: "Longer prose passages",
      unsure: "A short prose test, then whatever your test points at",
    } as const,

    /**
     * onboarding.plan.value.prose — {band} is one of CNT-02's three labels, and
     * the labels are the whole contract: master-spec §6.2 Stage A publishes a
     * band and no score, so there is nothing else this row could honestly say.
     */
    planProseValue: (band: string): string => `English prose at ${band} difficulty`,

    /**
     * onboarding.plan.value.bandNote. Said on the panel rather than left for the
     * reader to discover: CNT-02 deliberately scores prose and quotes only, and
     * a plan that mentioned a band without this would read as if it covered code.
     */
    planBandNote: "Difficulty bands cover prose and quotes. Code snippets carry no band yet.",

    /** onboarding.plan.band.{easy,typical,hard} — CNT-02's closed enum, in words. */
    planBandNames: {
      easy: "Easy",
      typical: "Typical",
      hard: "Hard",
    } as const,

    /** onboarding.plan.value.{levelSelfReported,languagesSelfReported} */
    planSelfReported: (answer: string): string => `You said: ${answer}`,

    /** onboarding.plan.value.levelNone */
    planLevelNone: "Not said, and not needed",

    /** onboarding.plan.value.languagesNone */
    planLanguagesNone: "None chosen",

    /** onboarding.plan.value.layout — {source} names where the value came from. */
    planLayoutValue: (name: string, source: string): string => `${name} — ${source}`,

    /**
     * The two layout sources, as words. These are the same two states LOC-01
     * already distinguishes (`readStoredLayout() !== null`), so the panel cannot
     * describe a layout the app has not actually chosen.
     */
    planLayoutSource: {
      guessed: "guessed from your browser language",
      confirmed: "set by you",
    } as const,

    /**
     * onboarding.plan.languagesNote. States what exists (grammar maps in the
     * engine, for JavaScript/TypeScript and Python) and what does not (passages
     * in any of them), because "recorded" is otherwise the kind of word that
     * implies a queue the reader is now waiting on.
     */
    planLanguagesNote:
      "Your languages are recorded. Passages in them arrive with the programmer track: JavaScript and Python have grammar maps already, the others do not.",

    /**
     * onboarding.plan.pending. The pending list in words. The requirement IDs
     * behind it live in the typed plan (`plan.ts`), never in the copy — a user is
     * not helped by "MOD-05".
     */
    planPending:
      "Still to come: a measured baseline, the placement test, and the level track. Your first test starts filling these in.",

    /** onboarding.plan.change */
    planChange: "Change this",
  } as const,
} as const;
