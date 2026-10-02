import { buildLog, keyDown, keyUp, typingText, type FixtureExpectation } from "./helpers.js";

/**
 * ENG-FIXTURE-E3-caps-lock-case-errors (master spec ENG-06, chapter 4 E3).
 *
 * Target `ab 12`, typed with Caps Lock on: `A` (via Shift) and `B` (via
 * Caps Lock, no modifiers) are wrong-case for `a`/`b`, while ` `, `1`, `2`
 * are correct — Caps Lock does not touch non-letters, which is the
 * adversarial pin (a caps model that upper-cased the digits would score
 * `!`/`@` here instead of the correct `1`/`2`).
 *
 * Scoring contract pinned by this fixture:
 * - a wrong-case keystroke is a substitution like any other: the engine
 *   compares the PRODUCED character (`event.key`), never the physical key, so
 *   `A` against `a` is incorrect at press and in the final text;
 * - attribution runs on the PHYSICAL key (`event.code`): both presses carry
 *   `KeyA`/`KeyB`, so per-key/per-finger analytics (chapter 4 E3/E8) still
 *   attribute them to the A/B keys rather than to nonsense. The two paths to
 *   a capital — Shift-held (`A`, shift:true) and Caps-Lock (`B`, no mods) —
 *   produce the same character and score identically; modifiers never affect
 *   correctness, only the produced `key` does.
 *
 * Case-error subtype rule (for the downstream confusion matrix / alignment,
 * which consumes positions, not codes): a substitution is a CASE error iff
 * the typed and intended units differ only by case AND the press's `code` is
 * the physical key of the intended letter. Positions 0–1 below satisfy both;
 * a `Q`-for-`a` press would satisfy neither.
 *
 * Keyups at +100 ms (minimum press gap 500 ms), so rollover is exactly 0.
 *
 * Arithmetic recomputed independently from the master-spec §6.1 formulas
 * (Word = 5 chars; duration = last scoring press t − first scoring press t):
 *
 *   scoring presses   5 printable (Caps/Shift affect `key`, never scoring)
 *   duration          2000 − 0                          → 2000 ms
 *   final text        "AB 12" (5 chars, 3 correct)
 *   raw WPM           5 / 5 / (2000/60000)              → 30.0
 *   gross WPM         5 / 5 / (2000/60000)              → 30.0
 *   net WPM           3 / 5 / (2000/60000)              → 18.0
 *   keystroke acc     3 correct / 5 printable           → 60%
 *   final accuracy    3 / 5                             → 60%
 *   KSPC              (5 inserts + 0 backspaces) / 5    → 1.00
 *   total attempts    5, rejected 0                     → rate 0%
 *   burst             best window holds 5 inserts       → 5/5/(5/60) = 12.0
 *   IKI               2000 / 4 gaps                     → 500.0 ms
 *   rollover          0 / 4 transitions                 → 0
 *   consistency       null (scored duration 2000 ms < 10 s)
 */
export const FIXTURE_ID = "ENG-FIXTURE-E3-caps-lock-case-errors";

export const targetText = "ab 12";

const downs = [
  // Shift-held capital: the produced char is wrong-case, the code is KeyA.
  keyDown("A", 0, { shift: true }),
  // Caps-Lock capital: same produced char, no modifiers, code still KeyB.
  keyDown("B", 500),
  keyDown(" ", 1000),
  // Caps Lock leaves digits alone — both correct (adversarial pin).
  keyDown("1", 1500),
  keyDown("2", 2000),
];

const events = [...downs, ...downs.map((d) => keyUp(d.key, d.t + 100, { code: d.code }))].sort(
  (a, b) => a.t - b.t,
);

export const text = typingText("fixture-e-caps", targetText);

export const log = buildLog({
  events,
  textId: text.id,
  textHash: "2757396cdb294921c785b037ff3e1143a9b01e24c236df7fefc87de4a3b1d24b",
  errorMode: "free",
});

export const expected: FixtureExpectation = {
  summary: {
    rawWpm: 30,
    grossWpm: 30,
    netWpm: 18,
    keystrokeAccuracy: 60,
    finalAccuracy: 60,
    kspc: 1,
    rolloverRatio: 0,
    consistency: null,
    burstWpm: 12,
    ikiMeanMs: 500,
    modelVersion: "1.1.0",
    difficultyBand: null,
    verified: false,
    flags: [],
  },
  tolerance: 1e-6,
  details: {
    durationMs: 2000,
    printableKeystrokes: 5,
    correctKeystrokes: 3,
    correctCharsInFinalText: 3,
    finalTextLength: 5,
    bufferInserts: 5,
    backspaces: 0,
    rejectedAttempts: 0,
    totalAttempts: 5,
    rejectedAttemptRate: 0,
  },
  notes: [
    "The E3 pin: wrong-case presses are ordinary substitutions (60% accuracy), while their codes (KeyA/KeyB) preserve physical-key attribution for layout analytics.",
    "Shift-held and Caps-Lock capitals score identically — modifiers never affect correctness, only the produced key does; Caps Lock leaves digits and space untouched.",
  ],
};
