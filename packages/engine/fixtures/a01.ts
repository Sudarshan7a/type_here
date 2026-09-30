import { buildLog, keyDown, typingText, withKeyups, type FixtureExpectation } from "./helpers.js";

/**
 * ENG-FIXTURE-A01-perfect-even-typing (chapter-4 deep-dive §4.2).
 *
 * Target `the cat sat`, 11 perfectly even keystrokes over 5 454 ms, zero
 * errors. Chapter lists keydowns only; keyups constructed at +100 ms
 * (PROVENANCE.md). Consistency is null: 5.454 s < the documented 10 s
 * minimum scored duration (chapter's "≈99–100" is a known illustration
 * error; see PROVENANCE.md).
 */
export const FIXTURE_ID = "ENG-FIXTURE-A01-perfect-even-typing";

export const targetText = "the cat sat";

const downs = [
  keyDown("t", 0),
  keyDown("h", 545),
  keyDown("e", 1090),
  keyDown(" ", 1636),
  keyDown("c", 2181),
  keyDown("a", 2727),
  keyDown("t", 3272),
  keyDown(" ", 3818),
  keyDown("s", 4363),
  keyDown("a", 4909),
  keyDown("t", 5454),
];

export const text = typingText("fixture-a01", targetText);

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
    netWpm: 24.202420242,
    keystrokeAccuracy: 100,
    finalAccuracy: 100,
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
    correctKeystrokes: 11,
    correctCharsInFinalText: 11,
    finalTextLength: 11,
    bufferInserts: 11,
    rejectedAttempts: 0,
    totalAttempts: 11,
  },
  notes: [
    "§4.2 worked example; gross/net 24.2, ksAcc/finalAcc 100%, KSPC 1.00, IKI 545.4 all agree with the chapter.",
    "Consistency corrected to null (chapter says ≈99–100): 5.454 s < 10 s minimum scored duration.",
    "Burst 24.0 = 10 inserts in the best 5 s window (chapter silent).",
  ],
};
