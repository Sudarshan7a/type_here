import { buildLog, keyDown, typingText, withKeyups, type FixtureExpectation } from "./helpers.js";

/**
 * ENG-FIXTURE-D02-stop-on-error-halt (chapter-4 deep-dive §4.5, edge case D02).
 *
 * Target `the cat sat`, stop-on-error mode: `t`,`h`,`e`,` ` land, then `x` is
 * wrong at t=2181 and the run HALTS there. Elapsed time freezes at 2181 ms and
 * every later press in the log is ignored — the capture keeps recording, but
 * nothing after the error can be scored.
 *
 * This is the whole point of the mode, and it is what distinguishes it from
 * must-correct (D01). D01 rejects the wrong press, the user corrects it with
 * Backspace, and the test continues to completion. D02 has no correction path:
 * the attempt is over at the first error.
 *
 * Arithmetic recomputed independently from the master-spec §6.1 formulas
 * (Word = 5 chars; duration = last scoring press t − first scoring press t):
 *
 *   scoring presses   t=0, 545, 1090, 1636, 2181        → 5 (the wrong one included)
 *   duration          2181 − 0                          → 2181 ms  (frozen at the halt)
 *   raw WPM           5 / 5 / (2181/60000)              → 27.5103163686
 *   gross WPM         4 / 5 / (2181/60000)              → 22.0082530949   (buffer "the ")
 *   net WPM           4 / 5 / (2181/60000)              → 22.0082530949
 *   keystroke acc     4 correct / 5 printable           → 80%
 *   final accuracy    4 / 4                             → 100%  (see note 2)
 *   KSPC              (4 inserts + 0 backspaces) / 4    → 1.00
 *   burst             window [0, 5000) holds all 4 inserts → (4/5)/(5/60) = 9.6
 *   IKI               gaps 545,545,546,545 → 2181/4     → 545.25 ms
 *   consistency       null (scored duration 2181 ms < 10 s)
 *
 * Arithmetic note (the protocol earning its keep): the first hand-computed
 * values here were wrong twice — IKI written as 545 (it is 545.25; 2181/4 has
 * no remainder) and raw/gross/net each off in the 4th decimal. Both were caught
 * because the values are recomputed from the §6.1 formulas by a script that
 * imports nothing from packages/engine, and then compared against the engine.
 * The engine was right in both cases, so the FIXTURE was corrected, not the
 * engine. (D01 hides this class of error: 5954/13 = 458.0 exactly.)
 */
export const FIXTURE_ID = "ENG-FIXTURE-D02-stop-on-error-halt";

export const targetText = "the cat sat";

const downs = [
  keyDown("t", 0),
  keyDown("h", 545),
  keyDown("e", 1090),
  keyDown(" ", 1636),
  // Wrong: the run halts here. Everything below is post-halt and unscored.
  keyDown("x", 2181),
  keyDown("c", 2400),
  keyDown("a", 2600),
  keyDown("t", 2800),
  keyDown(" ", 3000),
  keyDown("s", 3200),
  keyDown("a", 3400),
  keyDown("t", 3600),
  keyDown("Backspace", 3800),
];

export const text = typingText("fixture-d02", targetText);

export const log = buildLog({
  events: withKeyups(downs),
  textId: text.id,
  textHash: "77255f02a3435d1feb590482a2f1ebc8895eec0b4264d4f59ad8a9ba0c1cfadf",
  errorMode: "stop-on-error",
});

export const expected: FixtureExpectation = {
  summary: {
    rawWpm: 27.510316368638,
    grossWpm: 22.00825309491,
    netWpm: 22.00825309491,
    keystrokeAccuracy: 80,
    finalAccuracy: 100,
    kspc: 1,
    rolloverRatio: 0,
    consistency: null,
    burstWpm: 9.6,
    ikiMeanMs: 545.25,
    modelVersion: "1.0.0",
    difficultyBand: null,
    verified: false,
    flags: [],
  },
  tolerance: 1e-6,
  details: {
    durationMs: 2181,
    printableKeystrokes: 5,
    correctKeystrokes: 4,
    correctCharsInFinalText: 4,
    finalTextLength: 4,
    bufferInserts: 4,
    backspaces: 0,
    rejectedAttempts: 0,
    totalAttempts: 5,
    rejectedAttemptRate: 0,
  },
  notes: [
    "The run halts at the first error: duration freezes at 2181 ms and the 9 later presses in the log are ignored, so the test scores as a 4-character attempt rather than a completed one.",
    "finalAccuracy is 100% and that is correct, not a bug: the buffer 'the ' is a clean prefix of the target. The failure is reported by the halt itself, not by final accuracy. Folding 'did the run finish' into finalAccuracy would change the meaning of that metric everywhere, so it stays a text-comparison metric.",
    "rejectedAttempts is 0, unlike D01. In must-correct the wrong press is *rejected* and a correction follows; in stop-on-error there is nothing to reject because nothing continues. The wrong press is still a real physical press, so it counts in printableKeystrokes and in keystroke accuracy (4/5 = 80%).",
    "This is the mode that distinguishes D02 from D01. D01 continues to 5954 ms and 11 characters; D02 stops at 2181 ms and 4 characters on the same target.",
  ],
};
