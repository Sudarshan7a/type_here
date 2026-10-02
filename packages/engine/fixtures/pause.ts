import { buildLog, keyDown, typingText, withKeyups, type FixtureExpectation } from "./helpers.js";
import type { LogMarker } from "@realtype/schemas";

/**
 * Practice-mode blur pause — the chapter-4 part2 §4.10 worked
 * pause-time-exclusion example (the arithmetic half of ENG-STATE-02).
 *
 * User types for 3 000 ms, alt-tabs at 3 000 (blur marker; the tab-hide
 * visibilitychange fires too — both markers present, they must merge, not
 * double-count), returns at wall-clock 13 000 (focus + visible), types
 * another 2 000 ms. Scored duration must be 5 000 ms (3 000 + 2 000), never
 * 15 000 ms.
 */
export const FIXTURE_ID = "pause-blur-practice-4-10-worked-example";

export const targetText = "the cat sat";

const downs = [
  keyDown("t", 0),
  keyDown("h", 750),
  keyDown("e", 1500),
  keyDown(" ", 2250),
  keyDown("c", 3000),
  keyDown("a", 13000),
  keyDown("t", 13750),
  keyDown(" ", 14500),
  keyDown("s", 15000),
];

const markers: LogMarker[] = [
  { kind: "blur", t: 3000 },
  { kind: "visibility", t: 3000, detail: "hidden" },
  { kind: "focus", t: 13000 },
  { kind: "visibility", t: 13000, detail: "visible" },
];

export const text = typingText("fixture-pause", targetText);

export const log = buildLog({
  events: withKeyups(downs),
  markers,
  textId: text.id,
  textHash: "77255f02a3435d1feb590482a2f1ebc8895eec0b4264d4f59ad8a9ba0c1cfadf",
  errorMode: "free",
});

export const expected: FixtureExpectation = {
  summary: {
    // 9 chars, 4 correct-in-final (typed prefix "the c" minus... buffer is
    // "the cat s" — see notes; net uses correct chars in the final text).
    rawWpm: 21.6,
    grossWpm: 21.6,
    netWpm: 21.6,
    keystrokeAccuracy: 100,
    finalAccuracy: 100,
    kspc: 1,
    rolloverRatio: 0,
    consistency: null,
    burstWpm: 12,
    ikiMeanMs: 750,
    modelVersion: "1.1.0",
    difficultyBand: null,
    verified: false,
    flags: [],
  },
  tolerance: 1e-6,
  details: {
    durationMs: 5000,
    excludedMs: 10000,
    printableKeystrokes: 9,
    finalTextLength: 9,
  },
  notes: [
    "§4.10 worked pause-exclusion example: scored duration must be exactly 5 000 ms (3 000 typed + 2 000 typed), the 10 s blur excluded.",
    "blur + visibility(hidden) fire together at 3 000 and focus + visibility(visible) at 13 000 — overlapping excluded intervals must merge (not double-count to 20 000).",
    "Buffer = `the cat s` (9 chars typed, test not completed) — a prefix of the target, so all 9 are correct; 9/5 ÷ (5/60) = 21.6 WPM.",
    "IKI: 8 intervals of which the 10 000 ms blur gap is > 5 s and excluded → mean of the 7 remaining 750 ms samples = 750 ms.",
    "Burst: best raw-timeline 5 s window is [0, 5 000) with 5 inserts → 5/5 ÷ (5/60) = 12.0 WPM.",
  ],
};
