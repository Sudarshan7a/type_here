import { buildLog, keyDown, typingText, withKeyups, type FixtureExpectation } from "./helpers.js";

/**
 * ENG-FIXTURE-E02-zero-rollover-passage (chapter-4 deep-dive §4.13 #11).
 *
 * Companion to E01: a full-length passage with zero overlapping keys
 * anywhere — rollover ratio must be EXACTLY 0, not a floating-point artifact
 * like 0.0001%. `the quick brown fox` (19 chars), keydowns at 150 ms
 * spacing, constructed keyups at +75 ms (PROVENANCE.md).
 */
export const FIXTURE_ID = "ENG-FIXTURE-E02-zero-rollover-passage";

export const targetText = "the quick brown fox";

const downs = [...targetText].map((ch, k) => keyDown(ch, k * 150));

export const text = typingText("fixture-e02", targetText);

export const log = buildLog({
  events: withKeyups(downs, 75),
  textId: text.id,
  textHash: "9ecb36561341d18eb65484e833efea61edc74b84cf5e6ae1b81c63533e25fc8f",
  errorMode: "free",
});

export const expected: FixtureExpectation = {
  summary: {
    rawWpm: 84.4444444444,
    grossWpm: 84.4444444444,
    netWpm: 84.4444444444,
    keystrokeAccuracy: 100,
    finalAccuracy: 100,
    kspc: 1,
    rolloverRatio: 0,
    consistency: null,
    burstWpm: 45.6,
    ikiMeanMs: 150,
    modelVersion: "1.1.0",
    difficultyBand: null,
    verified: false,
    flags: [],
  },
  tolerance: 1e-6,
  details: {
    durationMs: 2700,
    printableKeystrokes: 19,
    overlappedPresses: 0,
    rolloverTransitions: 18,
  },
  notes: [
    "§4.13 catalog #11 (E02): zero overlaps → ratio exactly 0 (asserted with toBe, not closeTo).",
  ],
};
