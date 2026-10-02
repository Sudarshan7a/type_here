import { buildLog, keyDown, keyUp, typingText, type FixtureExpectation } from "./helpers.js";

/**
 * ENG-FIXTURE-E01-rollover-detection (chapter-4 deep-dive §4.6).
 *
 * Target `fj`: j's keydown (60 ms) precedes f's keyup (110 ms) → the one
 * transition IS rollover → ratio 1.0 (transition-based reading; see
 * PROVENANCE.md Ambiguity A1). Both keydown AND keyup are recorded — the
 * proof that keyup capture is mandatory.
 */
export const FIXTURE_ID = "ENG-FIXTURE-E01-rollover-detection";

export const targetText = "fj";

export const text = typingText("fixture-e01", targetText);

export const log = buildLog({
  events: [keyDown("f", 0), keyDown("j", 60), keyUp("f", 110), keyUp("j", 150)],
  textId: text.id,
  textHash: "e91347915e81731107c58a37b2dce7f230467f19faa945c7ad0f45453fd36589",
  errorMode: "free",
});

export const expected: FixtureExpectation = {
  summary: {
    rawWpm: 400,
    grossWpm: 400,
    netWpm: 400,
    keystrokeAccuracy: 100,
    finalAccuracy: 100,
    kspc: 1,
    rolloverRatio: 1,
    consistency: null,
    burstWpm: 4.8,
    ikiMeanMs: 60,
    modelVersion: "1.1.0",
    difficultyBand: null,
    verified: false,
    flags: [],
  },
  tolerance: 1e-6,
  details: {
    durationMs: 60,
    printableKeystrokes: 2,
    correctKeystrokes: 2,
    overlappedPresses: 1,
    rolloverTransitions: 1,
    ikiSampleCount: 1,
    burstWindowChars: 2,
  },
  notes: [
    "§4.6 worked example; rollover 1 rollover ÷ 1 transition = 100%, IKI 60 ms — chapter agrees.",
    "Duration is 60 ms (last accepted keydown − first), so WPMs are 400 — linear scaling of a 2-char test; burst 4.8 (2 inserts ÷ 5 ÷ 1/12 min).",
  ],
};
