import { buildLog, keyDown, typingText, withKeyups, type FixtureExpectation } from "./helpers.js";

/**
 * ENG-FIXTURE-F01-long-pause-burst-divergence (chapter-4 deep-dive §4.7).
 *
 * 44 characters: chars 1–22 evenly across [0, 4 000] ms, an 8 000 ms
 * thinking pause (4 000 → 12 000, no blur — it is NOT excluded from net
 * WPM), chars 23–44 evenly across [12 000, 16 000] ms with the LAST
 * KEYSTROKE AT EXACTLY 16 000 ms.
 *
 * Spacing = 4000/21 ≈ 190.476 ms (the chapter's "≈182 ms" is the 4000/22
 * figure; its own naive-IKI value "roughly 372 ms" equals
 * (42 × 190.476 + 8000)/43 exactly, corroborating this construction).
 *
 * Target text: the chapter prints the 43-char pangram but states "44
 * characters" and "characters 23–44" (22 chars) — only the pangram WITH a
 * trailing period makes every stated total exact (44 chars, 22+22 split,
 * net 33.0, elapsed 16 000 ms). See PROVENANCE.md (flagged for
 * docs/CHAPTER-ARITHMETIC-CORRECTIONS.md).
 *
 * Corrected burst: the chapter's 64.8 assumed 27 chars in a 5 s window, but
 * each fast region holds only 22 chars → best window = 22 → 22/5 ÷ (5/60)
 * = 52.8 WPM. Guard burst > 1.5 × net still holds: 52.8 > 49.5.
 */
export const FIXTURE_ID = "ENG-FIXTURE-F01-long-pause-burst-divergence";

export const targetText = "the quick brown fox jumps over the lazy dog.";

/** 22 chars across [0, 4000] inclusive of both endpoints. */
function burst1Time(k: number): number {
  return (k * 4000) / 21;
}

/** 22 chars across [12000, 16000], last keystroke exactly at 16000. */
function burst2Time(m: number): number {
  return 12000 + (m * 4000) / 21;
}

const downs = [...targetText].map((ch, k) =>
  keyDown(ch, k < 22 ? burst1Time(k) : burst2Time(k - 22)),
);

export const text = typingText("fixture-f01", targetText);

export const log = buildLog({
  events: withKeyups(downs),
  textId: text.id,
  textHash: "18e8d559417db8a93707c11b11bb90b56638049a5994006ed4b2705e4d86587f",
  errorMode: "free",
});

export const expected: FixtureExpectation = {
  summary: {
    rawWpm: 33,
    grossWpm: 33,
    netWpm: 33,
    keystrokeAccuracy: 100,
    finalAccuracy: 100,
    kspc: 1,
    rolloverRatio: 0,
    consistency: 0,
    burstWpm: 52.8,
    ikiMeanMs: 190.4761904762,
    modelVersion: "1.1.0",
    difficultyBand: null,
    verified: false,
    flags: [],
  },
  tolerance: 1e-6,
  details: {
    durationMs: 16000,
    printableKeystrokes: 44,
    correctKeystrokes: 44,
    correctCharsInFinalText: 44,
    finalTextLength: 44,
    bufferInserts: 44,
    rejectedAttempts: 0,
    totalAttempts: 44,
    overlappedPresses: 0,
    rolloverTransitions: 43,
    ikiSampleCount: 42,
    ikiExcludedGaps: 1,
    burstWindowChars: 22,
  },
  notes: [
    "§4.7 worked example. Net 33.0 agrees (44 chars in 16 s — requires the 44-char text, see module doc).",
    "Burst corrected to 52.8 (chapter 64.8): each fast region has only 22 chars, so no 5 s window can hold 27.",
    "IKI mean 190.476 ms: the single 8 000 ms gap is excluded (43 intervals, 42 samples). The naive mean would be 372.09 ms — exactly the chapter's own bug-case figure.",
    "Consistency 0 (clamped; CV ≈ 1.102 across per-second buckets 2–15): the pause is NOT excluded from consistency, unlike IKI — chapter's qualitative claim holds.",
    "Regression guard asserted in the test: burstWpm > 1.5 × netWpm.",
  ],
};
