import { buildLog, keyDown, keyUp, typingText, type FixtureExpectation } from "./helpers.js";

/**
 * ENG-FIXTURE-E-DUALKEY-code-aware-attribution (master spec ENG-06, chapter 4
 * E8 + Group 8 ENG-PARITY-03).
 *
 * The E8 case: the SAME character typed on two different physical keys must
 * attribute to the key that was actually pressed (`event.code`), never to a
 * canonical "the" key for that character. `s` lives on KeyS (left ring) on
 * QWERTY but on the Semicolon key (right pinky) on Dvorak — a char-based
 * lookup can only ever give one of those answers, so it is wrong for one
 * layout by construction. The code-aware path (fingerTagForEvents) gives
 * both correctly.
 *
 * Main log (dvorak, target `sa`): `s` via Semicolon@0, `a` via KeyA@60, each
 * keyup at +110 ms so the one transition overlaps exactly (the E01 skeleton:
 * keyup 110 > next keydown 60). Metrics are therefore E01-identical by
 * construction — duration 60 ms, WPMs 400, rollover 1/1 — which the
 * independently recomputed expectations below pin; the NEW content is the
 * attribution (Semicolon→rp, KeyA→lp: cross-hand, different fingers).
 *
 * Companion log (azerty, target `@a`): `@` via AltGr+Digit0@0 (mods alt:true,
 * the Windows AltGr shape; mods never affect scoring per E3), `a` via
 * KeyQ@400 (AZERTY puts `a` where QWERTY puts `q`), keyups at +100 ms so
 * nothing overlaps. The E8 contrast pin: char-based fingerTag('@','a') is
 * "unknown" (existing pin, unchanged), while the code-aware path reads
 * Digit0→rp, KeyQ→lp — cross-hand, different fingers.
 *
 * Synthetic text only, no GPL content. Keyups are explicit (rollover needs
 * them); the AltGr press's code (Digit0) is a verified production per
 * docs/levels-04 §2.2, recorded in VERIFIED_PRODUCTIONS.
 *
 * Arithmetic recomputed independently from the master-spec §6.1 formulas
 * (Word = 5 chars; duration = last scoring press t − first scoring press t):
 *
 *   main log ("sa", dvorak)
 *   scoring presses   2 printable (s, a)
 *   duration          60 − 0                            → 60 ms
 *   final text        "sa" (2 chars, 2 correct)
 *   raw/gross/net     2 / 5 / (60/60000)               → 400.0
 *   keystroke acc     2 / 2                             → 100%
 *   final accuracy    2 / 2                             → 100%
 *   KSPC              (2 inserts + 0 backspaces) / 2    → 1.00
 *   total attempts    2, rejected 0                     → rate 0%
 *   burst             best window holds 2 inserts       → 2/5/(5/60) = 4.8
 *   IKI               60 / 1 gap                        → 60.0 ms
 *   rollover          1 overlapped / 1 transition       → 1.0
 *                     (s-up@110 past a-down@60, matched by code Semicolon)
 *   consistency       null (scored duration 60 ms < 10 s)
 *
 *   companion log ("@a", azerty)
 *   scoring presses   2 printable (@, a; the alt mod never scores per E3)
 *   duration          400 − 0                           → 400 ms
 *   final text        "@a" (2 chars, 2 correct)
 *   raw/gross/net     2 / 5 / (400/60000)               → 60.0
 *   keystroke acc     2 / 2                             → 100%
 *   final accuracy    2 / 2                             → 100%
 *   KSPC              (2 inserts + 0 backspaces) / 2    → 1.00
 *   total attempts    2, rejected 0                     → rate 0%
 *   burst             best window holds 2 inserts       → 2/5/(5/60) = 4.8
 *   IKI               400 / 1 gap                       → 400.0 ms
 *   rollover          0 overlapped / 1 transition       → 0
 *                     (@-up@100 strictly before a-down@400)
 *   consistency       null (scored duration 400 ms < 10 s)
 */
export const FIXTURE_ID = "ENG-FIXTURE-E-DUALKEY-code-aware-attribution";

export const targetText = "sa";

const downs = [
  // Dvorak `s` lives on the Semicolon key — NOT the canonical KeyS.
  keyDown("s", 0, { code: "Semicolon" }),
  keyDown("a", 60, { code: "KeyA" }),
];

const events = [
  ...downs,
  keyUp("s", 110, { code: "Semicolon" }),
  keyUp("a", 170, { code: "KeyA" }),
].sort((a, b) => a.t - b.t);

export const text = typingText("fixture-e-dualkey", targetText);

export const log = buildLog({
  events,
  textId: text.id,
  textHash: "4cf6829aa93728e8f3c97df913fb1bfa95fe5810e2933a05943f8312a98d9cf2",
  errorMode: "free",
  layout: "dvorak",
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
    correctCharsInFinalText: 2,
    finalTextLength: 2,
    bufferInserts: 2,
    backspaces: 0,
    rejectedAttempts: 0,
    totalAttempts: 2,
    rejectedAttemptRate: 0,
    overlappedPresses: 1,
    rolloverTransitions: 1,
    ikiSampleCount: 1,
    burstWindowChars: 2,
  },
  notes: [
    "The E8 pin: `s` arrives on the Semicolon key (right pinky on Dvorak), not the canonical KeyS (left ring on QWERTY) — attribution must read the code, and the 1/1 code-matched rollover proves the keyups pair by code.",
    "Same E01 skeleton (60 ms, one overlap), so every metric number matches E01 exactly; only the codes — and therefore the fingers — differ.",
  ],
};

export const FIXTURE_ID_ALT = "ENG-FIXTURE-E-DUALKEY-altgr-production";

export const targetTextAlt = "@a";

const downsAlt = [
  // AZERTY `@` is AltGr+Digit0 (verified production, levels-04 §2.2).
  keyDown("@", 0, { code: "Digit0", alt: true }),
  // AZERTY `a` is where QWERTY puts `q`.
  keyDown("a", 400, { code: "KeyQ" }),
];

const eventsAlt = [
  ...downsAlt,
  keyUp("@", 100, { code: "Digit0" }),
  keyUp("a", 500, { code: "KeyQ" }),
].sort((a, b) => a.t - b.t);

export const textAlt = typingText("fixture-e-dualkey-alt", targetTextAlt);

export const logAlt = buildLog({
  events: eventsAlt,
  textId: textAlt.id,
  textHash: "5e75a6ff1b5e0c61679cd6edf83e8af6c7a72a4e7858b930ba312783d47c2e0c",
  errorMode: "free",
  layout: "azerty",
});

export const expectedAlt: FixtureExpectation = {
  summary: {
    rawWpm: 60,
    grossWpm: 60,
    netWpm: 60,
    keystrokeAccuracy: 100,
    finalAccuracy: 100,
    kspc: 1,
    rolloverRatio: 0,
    consistency: null,
    burstWpm: 4.8,
    ikiMeanMs: 400,
    modelVersion: "1.1.0",
    difficultyBand: null,
    verified: false,
    flags: [],
  },
  tolerance: 1e-6,
  details: {
    durationMs: 400,
    printableKeystrokes: 2,
    correctKeystrokes: 2,
    correctCharsInFinalText: 2,
    finalTextLength: 2,
    bufferInserts: 2,
    backspaces: 0,
    rejectedAttempts: 0,
    totalAttempts: 2,
    rejectedAttemptRate: 0,
    overlappedPresses: 0,
    rolloverTransitions: 1,
    ikiSampleCount: 1,
    burstWindowChars: 2,
  },
  notes: [
    "The AltGr pin: `@` arrives on Digit0 (right pinky) with the AltGr mod shape — char-based lookup stays unknown (existing pin), code-aware attribution reads cross-hand.",
    "The alt mod never affects scoring (E3 precedent): 2 printable presses, 60.0 WPM over 400 ms, rollover exactly 0.",
  ],
};
