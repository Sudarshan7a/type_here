import { buildLog, keyDown, typingText, withKeyups, type FixtureExpectation } from "./helpers.js";

/**
 * ENG-FIXTURE-B01-single-corrected-error (chapter-4 deep-dive §4.3).
 *
 * Target `the cat sat`; user mistypes `x` for `c`, backspaces, retypes `c`.
 * Corrected chapter values (verified by recompute.mjs; PROVENANCE.md):
 * raw WPM counts PRINTABLE keystrokes only → 12 → 24.6 (chapter 26.6);
 * keystroke accuracy = 11/12 = 91.7% (chapter 84.6% = 11/13);
 * KSPC = 13/11 = 1.18 stays (KSPC counts Backspace).
 */
export const FIXTURE_ID = "ENG-FIXTURE-B01-single-corrected-error";

export const targetText = "the cat sat";

const downs = [
  keyDown("t", 0),
  keyDown("h", 545),
  keyDown("e", 1090),
  keyDown(" ", 1636),
  keyDown("x", 2181),
  keyDown("Backspace", 2400),
  keyDown("c", 2581),
  keyDown("a", 3127),
  keyDown("t", 3672),
  keyDown(" ", 4218),
  keyDown("s", 4763),
  keyDown("a", 5309),
  keyDown("t", 5854),
];

export const text = typingText("fixture-b01", targetText);

export const log = buildLog({
  events: withKeyups(downs),
  textId: text.id,
  textHash: "77255f02a3435d1feb590482a2f1ebc8895eec0b4264d4f59ad8a9ba0c1cfadf",
  errorMode: "free",
});

export const expected: FixtureExpectation = {
  summary: {
    rawWpm: 24.5985650837,
    grossWpm: 22.5486846601,
    netWpm: 22.5486846601,
    keystrokeAccuracy: 91.6666666667,
    finalAccuracy: 100,
    kspc: 1.1818181818,
    rolloverRatio: 0,
    consistency: null,
    burstWpm: 24,
    ikiMeanMs: 487.8333333333,
    modelVersion: "1.1.0",
    difficultyBand: null,
    verified: false,
    flags: [],
  },
  tolerance: 1e-6,
  details: {
    durationMs: 5854,
    printableKeystrokes: 12,
    correctKeystrokes: 11,
    correctCharsInFinalText: 11,
    finalTextLength: 11,
    bufferInserts: 12,
    backspaces: 1,
    rejectedAttempts: 0,
    totalAttempts: 13,
  },
  notes: [
    "§4.3 worked example. Corrected (known chapter errors, independently verified): raw 24.6 not 26.6 (printable-only counting); keystroke accuracy 11/12 = 91.7% not 84.6% (Backspace is not printable).",
    "KSPC 13/11 = 1.18 stays: KSPC counts Backspace (chapter agrees).",
    "Gross = net = 22.5: net WPM does not double-penalize corrected errors — the correction time already lowered the speed.",
    "raw−net gap ≈ 2.05 WPM = correction overhead diagnostic despite finalAccuracy 100%.",
  ],
};
