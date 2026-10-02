import { buildLog, keyDown, keyUp, typingText, type FixtureExpectation } from "./helpers.js";

/**
 * ENG-FIXTURE-G01-key-repeat-filtering (chapter-4 deep-dive §4.8) —
 * CRITICAL severity.
 *
 * Target `aa`. The OS key-repeat fires a second `a` keydown at 520 ms
 * (repeat: true) while the key is still held. The repeat event must be
 * dropped before it ever reaches the buffer or the metrics pipeline: final
 * text `aa` (NOT `aaa`), 2 scoring keystrokes, KSPC 1.00. If not filtered,
 * a pure engine bug would be scored as a user error.
 */
export const FIXTURE_ID = "ENG-FIXTURE-G01-key-repeat-filtering";

export const targetText = "aa";

export const text = typingText("fixture-g01", targetText);

export const log = buildLog({
  events: [
    keyDown("a", 0),
    keyDown("a", 520, { repeat: true }),
    keyUp("a", 540),
    keyDown("a", 900),
    keyUp("a", 950),
  ],
  textId: text.id,
  textHash: "961b6dd3ede3cb8ecbaacbd68de040cd78eb2ed5889130cceb4c49268ea4d506",
  errorMode: "free",
});

export const expected: FixtureExpectation = {
  summary: {
    rawWpm: 26.6666666667,
    grossWpm: 26.6666666667,
    netWpm: 26.6666666667,
    keystrokeAccuracy: 100,
    finalAccuracy: 100,
    kspc: 1,
    rolloverRatio: 0,
    consistency: null,
    burstWpm: 4.8,
    ikiMeanMs: 900,
    modelVersion: "1.1.0",
    difficultyBand: null,
    verified: false,
    flags: [],
  },
  tolerance: 1e-6,
  details: {
    durationMs: 900,
    printableKeystrokes: 2,
    correctKeystrokes: 2,
    correctCharsInFinalText: 2,
    finalTextLength: 2,
    bufferInserts: 2,
    rejectedAttempts: 0,
    totalAttempts: 2,
    ikiSampleCount: 1,
  },
  notes: [
    "§4.8 worked example; final text `aa`, KSPC 1.00 — chapter agrees.",
    "The repeat event at 520 ms is dropped from metric counting entirely: 2 printable keystrokes (not 3), IKI = the single 900 ms interval between the two real presses, no `untrusted-events`/other flags (repeat filtering is normal behavior, not flagged).",
    "Duration 900 ms (last real keydown − first), so WPMs are 26.67.",
  ],
};
