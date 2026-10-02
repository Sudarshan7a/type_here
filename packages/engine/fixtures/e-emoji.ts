import { buildLog, keyDown, keyUp, typingText, type FixtureExpectation } from "./helpers.js";

/**
 * ENG-FIXTURE-E6-emoji-grapheme-unit (master spec ENG-06, chapter 4 E6).
 *
 * Target `ok 👨‍👩‍👧‍👦!`: 5 grapheme clusters (o, k, space, family, !) in 15
 * UTF-16 code units. The family emoji is ONE unit of 7 code points
 * (man + ZWJ + woman + ZWJ + girl + ZWJ + boy), typed as ONE key event with no
 * physical key (code `Unidentified`, as synthesized commit/picker events use).
 *
 * Grapheme contract pinned by this fixture:
 * - the target is segmented into graphemes for comparison, so the family is
 *   position 3 — one unit, never "half correct, half missing";
 * - one press inserts at most one grapheme: the full family event inserts once
 *   and is correct; the piecemeal `👨`@1200 (one grapheme on its own) is its
 *   own press and is WRONG against the family unit, then Backspace pops the
 *   whole grapheme — Backspace never strands half a character;
 * - character states derive per grapheme: 5 states for 5 units, and the count
 *   painted correct equals the engine's own correct-unit count.
 *
 * KNOWN WART (flagged for the metrics slice, Slices 2/3): `metrics.ts` is
 * frozen in this slice, and it counts string UTF-16 length for the final-text
 * denominators. The COMPARISON is grapheme-correct (5/5 units right), but the
 * summary divides by 15 UTF-16 units: finalAccuracy pins at 5/15 = 33.33%
 * (not 100%), gross/net WPM count 15 "chars", and KSPC pins at 7/15 < 1. Those
 * numbers are exact under the frozen formula and must be recomputed when the
 * denominators move to grapheme counts (with a modelVersion bump per AGENTS.md
 * rule 3). They are NOT user-facing claims — no UI copy may cite them.
 *
 * Keyups at +80 ms (minimum press gap 200 ms), so rollover is exactly 0; the
 * piecemeal `👨` release@1280 precedes Backspace@1400 (no false overlap), and
 * keyups inherit their press's code for the code-matched rollover check.
 *
 * Arithmetic recomputed independently from the master-spec §6.1 formulas
 * (Word = 5 chars; duration = last scoring press t − first scoring press t;
 * final-text denominators in UTF-16 units per the frozen metrics.ts):
 *
 *   scoring presses   6 printable (o,k,space,👨,family,!) + 1 Backspace
 *   duration          2200 − 0                          → 2200 ms
 *   final text        "ok 👨‍👩‍👧‍👦!" (5 units, 5 correct; string length 15)
 *   raw WPM           6 / 5 / (2200/60000)              → 32.7272727273
 *   gross WPM         15 / 5 / (2200/60000)             → 81.8181818182
 *   net WPM           5 / 5 / (2200/60000)              → 27.2727272727
 *   keystroke acc     5 correct / 6 printable           → 83.3333333333%
 *                     (o,k,space,family,! correct; piecemeal 👨 wrong)
 *   final accuracy    5 correct units / 15 UTF-16 units → 33.3333333333%
 *                     (WART — see above; comparison itself is 5/5)
 *   KSPC              (6 inserts + 1 backspace) / 15    → 0.4666666667
 *                     (WART — numerator counts graphemes, denominator UTF-16)
 *   total attempts    7, rejected 0                     → rate 0%
 *   burst             best window holds 6 inserts       → 6/5/(5/60) = 14.4
 *                     (the later-deleted piecemeal 👨 still counts: typed)
 *   IKI               2200 / 6 gaps                     → 366.6666666667 ms
 *   rollover          0 / 6 transitions                 → 0
 *   consistency       null (scored duration 2200 ms < 10 s)
 */
export const FIXTURE_ID = "ENG-FIXTURE-E6-emoji-grapheme-unit";

export const targetText = "ok 👨‍👩‍👧‍👦!";

const downs = [
  keyDown("o", 0),
  keyDown("k", 400),
  keyDown(" ", 800),
  // Piecemeal emoji part: its own grapheme, wrong against the family unit.
  keyDown("👨", 1200, { code: "Unidentified" }),
  keyDown("Backspace", 1400),
  // The whole family in one event: one grapheme, correct at position 3.
  keyDown("👨‍👩‍👧‍👦", 1800, { code: "Unidentified" }),
  // Shift+1 on QWERTY-US produces "!": mods never affect scoring.
  keyDown("!", 2200, { code: "Digit1", shift: true }),
];

const events = [...downs, ...downs.map((d) => keyUp(d.key, d.t + 80, { code: d.code }))].sort(
  (a, b) => a.t - b.t,
);

export const text = typingText("fixture-e-emoji", targetText);

export const log = buildLog({
  events,
  textId: text.id,
  textHash: "ea629404dec54f0186ab60997c4497403a5699ef048b474d6b2f6ac510d8090b",
  errorMode: "free",
});

export const expected: FixtureExpectation = {
  summary: {
    rawWpm: 32.7272727273,
    grossWpm: 81.8181818182,
    netWpm: 27.2727272727,
    keystrokeAccuracy: 83.3333333333,
    finalAccuracy: 33.3333333333,
    kspc: 0.4666666667,
    rolloverRatio: 0,
    consistency: null,
    burstWpm: 14.4,
    ikiMeanMs: 366.6666666667,
    modelVersion: "1.1.0",
    difficultyBand: null,
    verified: false,
    flags: [],
  },
  tolerance: 1e-6,
  details: {
    durationMs: 2200,
    printableKeystrokes: 6,
    correctKeystrokes: 5,
    correctCharsInFinalText: 5,
    finalTextLength: 15,
    bufferInserts: 6,
    backspaces: 1,
    rejectedAttempts: 0,
    totalAttempts: 7,
    rejectedAttemptRate: 0,
  },
  notes: [
    "The E6 pin: the ZWJ family is ONE comparison unit — the whole-sequence event is correct at position 3 while the piecemeal 👨 is wrong there, and Backspace pops a whole grapheme.",
    "WART (metrics slice owns the fix): final-text denominators count UTF-16 units (15), so finalAccuracy pins at 33.33% for a 5/5-unit-correct text and KSPC at 0.47 — exact under the frozen formula, flagged for the grapheme-denominator change + modelVersion bump.",
  ],
};
