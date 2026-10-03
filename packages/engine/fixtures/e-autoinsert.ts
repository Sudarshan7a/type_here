import { buildLog, keyDown, keyUp, typingText, type FixtureExpectation } from "./helpers.js";

/**
 * ENG-FIXTURE-E-AUTOINSERT-auto-pair-excluded-from-counts (ENG-09, D-M5-5).
 *
 * An auto-paired `)` (auto:true) lands in the produced text but is excluded
 * from every typed count. Target `ab()`, free mode:
 *
 *   a down@0/up@100, b down@500/up@600, `(` down@1000/up@1100,
 *   auto `)` down@1150 (no keyup — the app inserted it, nobody pressed it).
 *
 * Hand computation (spec §6.1; perMinuteWpm = chars/5/(ms/60000)):
 * - scoringPresses = a, b, `(` (the auto press goes to the `auto` bucket +
 *   textAffecting only). printable = 3. totalAttempts = 3 (the auto branch
 *   returns before the attempt counter).
 * - buffer = a, b, `(`, auto-`)` = "ab()": final length 4, all correct.
 *   correctPrintable (typed inserts) = 3.
 * - duration = last scoring press − first = 1000 − 0 = 1000 ms. The auto
 *   press at 1150 arrives after the attempt's last typed key and extends no
 *   clock: auto-inserted characters are excluded from typed counts (D-M5-4).
 * - raw = 3/5/(1000/60000) = 36.0. gross = 4/5/(1000/60000) = 48.0
 *   (final text carries the auto char). net = 4/5/(1000/60000) = 48.0.
 * - ksAcc = 3/3 = 100. finalAcc = 4/4 = 100.
 * - KSPC = (inserts 3 + backspaces 0)/final 4 = 0.75 — the pin: the auto
 *   char is in the text (denominator) but never a keystroke (numerator).
 * - IKI over scoring gaps 500, 500 → mean 500.0, 2 samples, 0 excluded.
 * - burst: user inserts at 0/500/1000, best 5 s window from 0 holds all 3 →
 *   3/5/(5000/60000) = 7.2, chars 3. (Auto never counts.)
 * - rollover: a↑100 < b@500, b↑600 < (@1000 → 0 overlaps / 2 transitions.
 * - consistency null (1 s < 10 s minimum). autoInserts 1. flags
 *   ["auto-events-present"] (the integrity flag records that auto input
 *   occurred — it flags, never bans).
 */
export const FIXTURE_ID = "ENG-FIXTURE-E-AUTOINSERT-auto-pair-excluded-from-counts";

export const targetText = "ab()";

const events = [
  keyDown("a", 0),
  keyUp("a", 100),
  keyDown("b", 500),
  keyUp("b", 600),
  keyDown("(", 1000, { code: "Digit9", shift: true }),
  keyUp("(", 1100, { code: "Digit9" }),
  // The app's auto-pair closing bracket: inserted, never pressed.
  keyDown(")", 1150, { code: "Digit0", shift: true, auto: true }),
];

export const text = typingText("fixture-e-autoinsert", targetText);

export const log = buildLog({
  events,
  textId: text.id,
  textHash: "9f3a5c1d8e2b4a6f0c7d9e1b3a5f7c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1b",
  errorMode: "free",
});

export const expected: FixtureExpectation = {
  summary: {
    rawWpm: 36.0,
    grossWpm: 48.0,
    netWpm: 48.0,
    keystrokeAccuracy: 100,
    finalAccuracy: 100,
    kspc: 0.75,
    rolloverRatio: 0,
    consistency: null,
    burstWpm: 7.2,
    ikiMeanMs: 500.0,
    modelVersion: "1.1.0",
    difficultyBand: null,
    verified: false,
    flags: ["auto-events-present"],
  },
  tolerance: 1e-6,
  details: {
    durationMs: 1000,
    printableKeystrokes: 3,
    correctKeystrokes: 3,
    correctCharsInFinalText: 4,
    finalTextLength: 4,
    bufferInserts: 3,
    totalAttempts: 3,
    autoInserts: 1,
    rolloverTransitions: 2,
    ikiSampleCount: 2,
    burstWindowChars: 3,
  },
  notes: [
    "ENG-09 D-M5-5: the auto-paired bracket is in the text (gross counts it) but excluded from every typed count (raw, attempts, KSPC numerator, IKI, burst). KSPC 0.75 is the pin.",
  ],
};
