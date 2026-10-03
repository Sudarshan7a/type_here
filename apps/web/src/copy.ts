/**
 * Every user-visible string the typing surface renders, bound to its key in
 * docs/content-ui-copy-string-tables.md.
 *
 * The keys are the contract: `tests/copy-tables.test.ts` re-reads that document
 * and fails if any text here has drifted from it, so copy cannot quietly diverge
 * from the table the way a hard-coded literal in a component would.
 */

export const COPY = {
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

  /** Shown while the test is paused by focus loss (chapter 4 E4). */
  paused: "Paused — click here to continue when you're ready.",

  /** action.restart */
  actionRestart: "Restart",

  /** action.newPassage */
  newPassage: "New passage",

  /** Heading of the finished panel; visually hidden, for the landmark name. */
  resultsTitle: "Results",

  /** The one and only automatic announcement (a11y.announce.testFinished). */
  announceTestFinished: (wpm: string, accuracy: string): string =>
    `Test finished. ${wpm} words per minute, ${accuracy} percent accuracy.`,

  /**
   * The focused headline shows the metric plus its unit, so the number is never
   * ambiguous on screen ("97.0" could be anything). The live readout carries the
   * bare number because its label sits directly beside it.
   */
  headlineNetWpm: (value: number): string => `${value.toFixed(1)} WPM`,

  /** results.headline.accuracy */
  headlineAccuracy: (value: number): string => `${value.toFixed(1)}% accuracy`,

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
} as const;
