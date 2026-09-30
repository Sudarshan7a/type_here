import { buildLog, keyDown, typingText, withKeyups, type FixtureExpectation } from "./helpers.js";

/**
 * ENG-FIXTURE-C01-single-uncorrected-error (chapter-4 deep-dive §4.4).
 *
 * Target `the cat sat`; user types `the cot sat` (o for a) and never fixes
 * it. The chapter gives no keystroke table ("same timing skeleton as Example
 * A"), so timestamps are constructed as A's 11 keystrokes with `o` at
 * 2 727 ms (PROVENANCE.md). Net WPM's numerator must use correct characters
 * in the final text (10), not the final-text length (11).
 */
export const FIXTURE_ID = "ENG-FIXTURE-C01-single-uncorrected-error";

export const targetText = "the cat sat";

const downs = [
  keyDown("t", 0),
  keyDown("h", 545),
  keyDown("e", 1090),
  keyDown(" ", 1636),
  keyDown("c", 2181),
  keyDown("o", 2727),
  keyDown("t", 3272),
  keyDown(" ", 3818),
  keyDown("s", 4363),
  keyDown("a", 4909),
  keyDown("t", 5454),
];

export const text = typingText("fixture-c01", targetText);

export const log = buildLog({
  events: withKeyups(downs),
  textId: text.id,
  textHash: "77255f02a3435d1feb590482a2f1ebc8895eec0b4264d4f59ad8a9ba0c1cfadf",
  errorMode: "free",
});

export const expected: FixtureExpectation = {
  summary: {
    rawWpm: 24.202420242,
    grossWpm: 24.202420242,
    netWpm: 22.00220022,
    keystrokeAccuracy: 90.9090909091,
    finalAccuracy: 90.9090909091,
    kspc: 1,
    rolloverRatio: 0,
    consistency: null,
    burstWpm: 24,
    ikiMeanMs: 545.4,
    modelVersion: "1.0.0",
    difficultyBand: null,
    verified: false,
    flags: [],
  },
  tolerance: 1e-6,
  details: {
    durationMs: 5454,
    printableKeystrokes: 11,
    correctKeystrokes: 10,
    correctCharsInFinalText: 10,
    finalTextLength: 11,
    bufferInserts: 11,
    rejectedAttempts: 0,
    totalAttempts: 11,
  },
  notes: [
    "§4.4 worked example; chapter values (net 22.0, raw 24.2, accuracies 90.9%) all agree with the recompute.",
    "The raw−net gap of 2.2 WPM is the uncorrected-error diagnostic (distinct from B01's correction-overhead gap).",
    "Timestamps constructed (chapter underdetermined): A's skeleton with o replacing the a at 2 727 ms.",
  ],
};
