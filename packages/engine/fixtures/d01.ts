import { buildLog, keyDown, typingText, withKeyups, type FixtureExpectation } from "./helpers.js";

/**
 * ENG-FIXTURE-D01-must-correct-rejected-attempts (chapter-4 deep-dive §4.5).
 *
 * Target `the cat sat`, must-correct mode: `x` (wrong) and the following `a`
 * are rejected — logged, but they never touch the buffer; Backspace clears
 * the pending error without popping the buffer; `c` retries into position 4.
 * Chapter-agreed: KSPC 12/11 = 1.09 (rejected attempts excluded), net 22.2,
 * final accuracy 100% (the must-correct invariant), rejected rate 2/14 =
 * 14.3%. Our documented decisions where the chapter is silent: raw WPM
 * counts the 13 printable presses (incl. both rejected attempts) → 26.2;
 * keystroke accuracy = 11/13 = 84.6%.
 */
export const FIXTURE_ID = "ENG-FIXTURE-D01-must-correct-rejected-attempts";

export const targetText = "the cat sat";

const downs = [
  keyDown("t", 0),
  keyDown("h", 545),
  keyDown("e", 1090),
  keyDown(" ", 1636),
  keyDown("x", 2181),
  keyDown("a", 2350),
  keyDown("Backspace", 2500),
  keyDown("c", 2681),
  keyDown("a", 3227),
  keyDown("t", 3772),
  keyDown(" ", 4318),
  keyDown("s", 4863),
  keyDown("a", 5409),
  keyDown("t", 5954),
];

export const text = typingText("fixture-d01", targetText);

export const log = buildLog({
  events: withKeyups(downs),
  textId: text.id,
  textHash: "77255f02a3435d1feb590482a2f1ebc8895eec0b4264d4f59ad8a9ba0c1cfadf",
  errorMode: "must-correct",
});

export const expected: FixtureExpectation = {
  summary: {
    rawWpm: 26.2008733624,
    grossWpm: 22.1699697682,
    netWpm: 22.1699697682,
    keystrokeAccuracy: 84.6153846154,
    finalAccuracy: 100,
    kspc: 1.0909090909,
    rolloverRatio: 0,
    consistency: null,
    burstWpm: 21.6,
    ikiMeanMs: 458,
    modelVersion: "1.0.0",
    difficultyBand: null,
    verified: false,
    flags: [],
  },
  tolerance: 1e-6,
  details: {
    durationMs: 5954,
    printableKeystrokes: 13,
    correctKeystrokes: 11,
    correctCharsInFinalText: 11,
    finalTextLength: 11,
    bufferInserts: 11,
    backspaces: 1,
    rejectedAttempts: 2,
    totalAttempts: 14,
    rejectedAttemptRate: 14.2857142857,
  },
  notes: [
    "§4.5 worked example; KSPC 1.09 (12/11), net 22.2, finalAccuracy 100%, rejected rate 2/14 = 14.3% agree with the chapter.",
    "Rejected attempts count toward raw attempts and keystroke accuracy (they are real printable presses) but NOT toward KSPC (they never touched the buffer) — chapter rule, our application of it to raw/ksAcc is a documented decision (chapter silent).",
    "Backspace-with-pending-error clears the error without popping the buffer — required for the chapter's 12/11 KSPC to be consistent.",
  ],
};
