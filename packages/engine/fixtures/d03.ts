import { buildLog, keyDown, keyUp, typingText, type FixtureExpectation } from "./helpers.js";

/**
 * ENG-FIXTURE-D03-no-backspace-ignored (master spec ENG-03, V1 mode D03).
 *
 * Target `the cat sat`, no-backspace (exam) mode: `x` is wrong for `c` at
 * t=2000 and it is KEPT — there is no correction path in this mode, so the
 * test runs to completion with the error in the text (`the xat sat`). The two
 * Backspace presses at t=2200/2400 are ignored outright: they never touch the
 * buffer, are never counted as keystrokes, and leave KSPC at exactly 1.00.
 *
 * This is what distinguishes D03 from D01 and D02 on the same target. D01
 * (must-correct) rejects the wrong press and continues to a clean 100% text;
 * D02 (stop-on-error) halts at the error with a 4-character buffer; D03
 * finishes all 11 characters with the mistake still in them.
 *
 * Adversarial construction in this log:
 * - two Backspace attempts under no-backspace (ignored, not counted);
 * - one overlapping pair: the `a`@2600 keyup is delayed to t=3150, past the
 *   next press (`t`@3100), so exactly one rollover transition overlaps;
 * - a keyup with no matching keydown (`z` was never pressed), deliberately
 *   appended out of array order to prove keyups match by code/t, not position.
 *
 * Arithmetic recomputed independently from the master-spec §6.1 formulas
 * (Word = 5 chars; duration = last scoring press t − first scoring press t):
 *
 *   scoring presses   13: 11 printable + 2 Backspace (filter level; the mode
 *                     ignore happens later, so they still bound the duration —
 *                     the same precedent as Backspace-on-empty-buffer in free
 *                     mode, PROVENANCE.md)
 *   duration          5100 − 0                        → 5100 ms
 *   final text        "the xat sat" (11 chars, 10 correct)
 *   raw WPM           11 / 5 / (5100/60000)           → 25.88235294117647
 *   gross WPM         11 / 5 / (5100/60000)           → 25.88235294117647
 *   net WPM           10 / 5 / (5100/60000)           → 23.52941176470588
 *   keystroke acc     10 correct / 11 printable       → 90.9090909090909%
 *   final accuracy    10 / 11                         → 90.9090909090909%
 *   KSPC              (11 inserts + 0 backspaces)/11  → 1.00 (the D03 pin:
 *                     ignored Backspaces must not move this)
 *   total attempts    11 (the 2 Backspaces excluded)  → rejected 0, rate 0%
 *   burst             best window holds 10 inserts    → 10/5/(5/60) = 24.0
 *   IKI               5100/12 gaps                    → 425.0 ms
 *   rollover          1 overlapped / 12 transitions   → 0.08333333333333333
 *   consistency       null (scored duration 5100 ms < 10 s)
 */
export const FIXTURE_ID = "ENG-FIXTURE-D03-no-backspace-ignored";

export const targetText = "the cat sat";

const downs = [
  keyDown("t", 0),
  keyDown("h", 500),
  keyDown("e", 1000),
  keyDown(" ", 1500),
  // Wrong for "c": kept in the text — no correction path exists in this mode.
  keyDown("x", 2000),
  // Exam-mode attempts at correction: ignored outright, never counted.
  keyDown("Backspace", 2200),
  keyDown("Backspace", 2400),
  keyDown("a", 2600),
  keyDown("t", 3100),
  keyDown(" ", 3600),
  keyDown("s", 4100),
  keyDown("a", 4600),
  keyDown("t", 5100),
];

// Keyups at +100 ms, except the `a`@2600 whose release waits until t=3150 —
// past the next press — so exactly one rollover transition overlaps.
const ups = downs.map((d) => keyUp(d.key, d.t + (d.key === "a" && d.t === 2600 ? 550 : 100)));

const events = [...downs, ...ups].sort((a, b) => a.t - b.t);

// Stray keyup with no matching keydown, out of array order on purpose: the
// engine matches keyups by code/t, so this changes nothing.
events.push(keyUp("z", 4205));

export const text = typingText("fixture-d03", targetText);

export const log = buildLog({
  events,
  textId: text.id,
  textHash: "77255f02a3435d1feb590482a2f1ebc8895eec0b4264d4f59ad8a9ba0c1cfadf",
  errorMode: "no-backspace",
});

export const expected: FixtureExpectation = {
  summary: {
    rawWpm: 25.88235294117647,
    grossWpm: 25.88235294117647,
    netWpm: 23.52941176470588,
    keystrokeAccuracy: 90.9090909090909,
    finalAccuracy: 90.9090909090909,
    kspc: 1,
    rolloverRatio: 0.08333333333333333,
    consistency: null,
    burstWpm: 24,
    ikiMeanMs: 425,
    modelVersion: "1.1.0",
    difficultyBand: null,
    verified: false,
    flags: [],
  },
  tolerance: 1e-6,
  details: {
    durationMs: 5100,
    printableKeystrokes: 11,
    correctKeystrokes: 10,
    correctCharsInFinalText: 10,
    finalTextLength: 11,
    bufferInserts: 11,
    backspaces: 0,
    rejectedAttempts: 0,
    totalAttempts: 11,
    rejectedAttemptRate: 0,
  },
  notes: [
    "The D03 pin: two Backspace presses are ignored outright — backspaces 0, totalAttempts 11, KSPC exactly 1.00, final text 'the xat sat' with the error kept.",
    "Ignored-in-mode Backspaces still bound the scored duration (filter-level scoring presses), the same precedent as Backspace-on-empty-buffer in free mode.",
    "Exactly one rollover transition overlaps (the delayed `a` release); the stray `z` keyup matches no press and changes nothing.",
    "Same target as D01/D02 so the three modes can be compared press-for-press: D01 ends 100% at 5954 ms, D02 halts at 2181 ms, D03 finishes 10/11 at 5100 ms.",
  ],
};
