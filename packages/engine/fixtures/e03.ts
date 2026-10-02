import { buildLog, keyDown, keyUp, typingText, type FixtureExpectation } from "./helpers.js";

/**
 * ENG-FIXTURE-E03-full-rollover-passage (chapter-4 deep-dive §4.13 #12).
 *
 * Companion to E01: every transition overlaps (simulated maximally fast
 * rollover typist) — rollover ratio must be EXACTLY 1. `fjdksl`, keydowns at
 * 60 ms spacing; each key's keyup at +110 ms, i.e. strictly after the NEXT
 * keydown, so every one of the 5 transitions is rollover (PROVENANCE.md).
 */
export const FIXTURE_ID = "ENG-FIXTURE-E03-full-rollover-passage";

export const targetText = "fjdksl";

export const text = typingText("fixture-e03", targetText);

export const log = buildLog({
  events: [
    keyDown("f", 0),
    keyDown("j", 60),
    keyDown("d", 120),
    keyDown("k", 180),
    keyDown("s", 240),
    keyDown("l", 300),
    keyUp("f", 110),
    keyUp("j", 170),
    keyUp("d", 230),
    keyUp("k", 290),
    keyUp("s", 350),
    keyUp("l", 400),
  ].sort((a, b) => a.t - b.t),
  textId: text.id,
  textHash: "bad94e208f54128dd2683c6473f9591a9f47beee9237a8995a4f4b0e786cf90f",
  errorMode: "free",
});

export const expected: FixtureExpectation = {
  summary: {
    rawWpm: 240,
    grossWpm: 240,
    netWpm: 240,
    keystrokeAccuracy: 100,
    finalAccuracy: 100,
    kspc: 1,
    rolloverRatio: 1,
    consistency: null,
    burstWpm: 14.4,
    ikiMeanMs: 60,
    modelVersion: "1.1.0",
    difficultyBand: null,
    verified: false,
    flags: [],
  },
  tolerance: 1e-6,
  details: {
    durationMs: 300,
    printableKeystrokes: 6,
    overlappedPresses: 5,
    rolloverTransitions: 5,
    burstWindowChars: 6,
  },
  notes: [
    "§4.13 catalog #12 (E03): every transition overlaps → ratio exactly 1 (asserted with toBe).",
  ],
};
