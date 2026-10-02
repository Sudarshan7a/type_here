import { buildLog, keyDown, keyUp, typingText, type FixtureExpectation } from "./helpers.js";

/**
 * ENG-FIXTURE-D04-word-locked-boundary-hold (master spec ENG-03, V1 mode D04).
 *
 * Target `the cat sat`, word-locked mode: the caret may not leave the current
 * word until every character of it is correct. Unlike must-correct (D01) the
 * wrong key is NOT rejected — `x` at t=2500 enters the text and stays visible
 * — and Backspace keeps working, so the user can see the mistake and fix it.
 * What they cannot do is carry it into the next word.
 *
 * Replay walk (buffer after each region):
 * - `the ` lands clean (t=0–1500); `c`@2000, `x`@2500 (wrong, kept),
 *   `t`@3000 (right letter, wrong word) → buffer `the cxt`. The word `cat`
 *   (target positions 4–6) is now complete and wrong.
 * - ` `@3500 refused at the boundary (hold pin 1); `s`@3700 — a forward press
 *   into the next word — refused too (hold pin 2). Both are real physical
 *   presses, so they count as attempts without touching the buffer.
 * - Backspace@3900 pops `t` → `the cx` (correction within the word IS
 *   allowed — the only way out). `a`@4100 retypes the wrong letter → `the cxa`;
 *   retyping wrong does not release the lock, so ` `@4300 is refused (pin 3).
 * - Backspace@4500/4700 → `the c`; `a`@4900, `t`@5400 land clean → `the cat`.
 *   The word is correct, so ` `@5900 is accepted (release pin) and `sat`
 *   completes the run at t=7400: final text `the cat sat`, 11/11 correct.
 *
 * A stray keyup with no matching keydown (`z` was never pressed) rides along
 * to prove unmatched keyups change nothing; all other keyups are at +100 ms
 * (minimum press gap 200 ms), so rollover is exactly 0.
 *
 * Arithmetic recomputed independently from the master-spec §6.1 formulas
 * (Word = 5 chars; duration = last scoring press t − first scoring press t):
 *
 *   scoring presses   20: 17 printable (incl. 3 refused) + 3 Backspace
 *   duration          7400 − 0                        → 7400 ms
 *   final text        "the cat sat" (11 chars, 11 correct)
 *   raw WPM           17 / 5 / (7400/60000)           → 27.567567567567565
 *   gross WPM         11 / 5 / (7400/60000)           → 17.83783783783784
 *   net WPM           11 / 5 / (7400/60000)           → 17.83783783783784
 *   keystroke acc     12 correct inserts / 17 print.  → 70.58823529411765%
 *                     (refused presses are real presses: they sit in the
 *                     denominator and can never be correct — D02 precedent)
 *   final accuracy    11 / 11                         → 100% (the correction
 *                     flow earns the clean text back; the cost stays visible
 *                     in keystroke accuracy and KSPC instead)
 *   KSPC              (14 inserts + 3 backspaces)/11  → 1.5454545454545454
 *   total attempts    20, rejected 3                  → rate 15%
 *   burst             best window holds 9 inserts     → 9/5/(5/60) = 21.6
 *   IKI               7400/19 gaps                    → 389.4736842105263 ms
 *   rollover          0 / 19 transitions              → 0
 *   consistency       null (scored duration 7400 ms < 10 s)
 */
export const FIXTURE_ID = "ENG-FIXTURE-D04-word-locked-boundary-hold";

export const targetText = "the cat sat";

const downs = [
  keyDown("t", 0),
  keyDown("h", 500),
  keyDown("e", 1000),
  keyDown(" ", 1500),
  keyDown("c", 2000),
  // Wrong, but kept and visible — word-locked never rejects a mid-word press.
  keyDown("x", 2500),
  keyDown("t", 3000),
  // The word "cat" is complete and wrong: the caret is held at the boundary.
  keyDown(" ", 3500),
  keyDown("s", 3700),
  // Backspace within the word is allowed — the only way out of the lock.
  keyDown("Backspace", 3900),
  // Retyping the wrong letter does not release the lock.
  keyDown("a", 4100),
  keyDown(" ", 4300),
  keyDown("Backspace", 4500),
  keyDown("Backspace", 4700),
  // The word typed properly: the lock releases.
  keyDown("a", 4900),
  keyDown("t", 5400),
  keyDown(" ", 5900),
  keyDown("s", 6400),
  keyDown("a", 6900),
  keyDown("t", 7400),
];

const events = [
  ...downs,
  ...downs.map((d) => keyUp(d.key, d.t + 100)),
  // Stray keyup with no matching keydown: matched by code, so it is inert.
  keyUp("z", 5550),
].sort((a, b) => a.t - b.t);

export const text = typingText("fixture-d04", targetText);

export const log = buildLog({
  events,
  textId: text.id,
  textHash: "77255f02a3435d1feb590482a2f1ebc8895eec0b4264d4f59ad8a9ba0c1cfadf",
  errorMode: "word-locked",
});

export const expected: FixtureExpectation = {
  summary: {
    rawWpm: 27.567567567567565,
    grossWpm: 17.83783783783784,
    netWpm: 17.83783783783784,
    keystrokeAccuracy: 70.58823529411765,
    finalAccuracy: 100,
    kspc: 1.5454545454545454,
    rolloverRatio: 0,
    consistency: null,
    burstWpm: 21.6,
    ikiMeanMs: 389.4736842105263,
    modelVersion: "1.1.0",
    difficultyBand: null,
    verified: false,
    flags: [],
  },
  tolerance: 1e-6,
  details: {
    durationMs: 7400,
    printableKeystrokes: 17,
    correctKeystrokes: 12,
    correctCharsInFinalText: 11,
    finalTextLength: 11,
    bufferInserts: 14,
    backspaces: 3,
    rejectedAttempts: 3,
    totalAttempts: 20,
    rejectedAttemptRate: 15,
  },
  notes: [
    "The D04 pin: 3 forward presses refused at the word boundary (space, next-word char, space again) while Backspace corrections inside the word are accepted and release the lock once the word is clean.",
    "Final accuracy is 100% and that is correct: the correction flow earned the clean text back. The cost of the error stays visible in keystroke accuracy (12/17) and KSPC (17/11), not in the final text.",
    "Refused presses are real physical presses: they count in printableKeystrokes and totalAttempts (D02 precedent) but never touch the buffer.",
    "Same target as D01/D02/D03 so all four modes compare press-for-press on one text.",
  ],
};
