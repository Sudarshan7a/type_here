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
} as const;
