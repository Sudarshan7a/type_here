import { buildLog, keyDown, keyUp, typingText, type FixtureExpectation } from "./helpers.js";

/**
 * ENG-FIXTURE-E5-dead-key-sequence (master spec ENG-06; chapter 4 E5 + M1-04 §6).
 *
 * Target `naïve café` (10 graphemes, all single-code-point — so this fixture
 * isolates input semantics from grapheme handling, which is E6's job). Two
 * composed characters arrive by two different platform paths, plus every
 * adversarial shape the IME guard must survive:
 *
 * - `ï` via DEAD KEYS (Windows/Linux path): `Dead`@1300 (code Quote) then the
 *   completing `ï`@1500 (code KeyI). The pair scores as ONE character: the
 *   dead press lands in the filter's `deadKeys` bucket — never a press, never
 *   text — and the completion inserts once. The combined time cost is the IKI
 *   gap `a`@900 → `ï`@1500 = 600 ms, which spans the dead interval
 *   1300 → 1500; it is NOT two fast keystrokes (no 200 ms gap is ever scored).
 * - `é` via IME COMPOSITION (macOS/IME path): partials `e`@4200 and `é`@4350
 *   flagged `composition: true`, then the commit `é`@4500 with
 *   `composition: false`. The partials land in `compositionDrops` — never
 *   scored, never text, never the clock start — and the commit scores exactly
 *   ONCE. Its IKI gap `f`@3900 → `é`@4500 = 600 ms spans the whole
 *   partial-to-commit interval, paralleling the dead-key combined span.
 *
 * Adversarial construction in this log:
 * - an ABANDONED composition up front: partials `i`@0, `ï`@150 with
 *   `composition: true`, cancelled by `Escape`@300. None of it scores, and —
 *   the E1 interplay — none of it starts the clock (first scoring press is
 *   `n`@500, not the partial at t=0);
 * - a composition-flagged Backspace@4600 (IME partial correction): dropped
 *   like any partial, so it neither pops the buffer nor counts toward KSPC;
 * - an EMPTY composition commit (`""`@4700, `composition: false`): zero
 *   graphemes, so the text model ignores it — no crash, no insert, no count;
 * - a LONE `Dead`@4900 with no completion (trailing fat-finger): inert in
 *   `deadKeys`, and — the proof it is truly unscored — it does NOT extend the
 *   scored duration, which still ends at the `é` commit (t=4500).
 *
 * All keyups at +80 ms (minimum press gap 100 ms), so rollover is exactly 0;
 * partial/completion keyups share codes with their presses (helpers carry the
 * code over), which is what the code-matched rollover check requires.
 *
 * Arithmetic recomputed independently from the master-spec §6.1 formulas
 * (Word = 5 chars; duration = last scoring press t − first scoring press t):
 *
 *   scoring presses   10 printable: n,a,ï,v,e,space,c,a,f,é (dead keys,
 *                     composition partials, Escape and the empty commit are
 *                     never scoring — see buckets below)
 *   duration          4500 − 500                        → 4000 ms
 *   final text        "naïve café" (10 chars, 10 correct)
 *   raw WPM           10 / 5 / (4000/60000)             → 30.0
 *   gross WPM         10 / 5 / (4000/60000)             → 30.0
 *   net WPM           10 / 5 / (4000/60000)             → 30.0
 *   keystroke acc     10 correct / 10 printable         → 100%
 *   final accuracy    10 / 10                           → 100%
 *   KSPC              (10 inserts + 0 backspaces) / 10  → 1.00
 *   total attempts    10, rejected 0                    → rate 0%
 *   burst             best window holds 10 inserts      → 10/5/(5/60) = 24.0
 *   IKI               gaps 400,600,400,400,400,400,400,400,600 → 4000/9
 *                                                   → 444.4444444444 ms
 *                     (the two 600 ms gaps are the combined spans: 900→1500
 *                     holds Dead@1300→ï@1500; 3900→4500 holds the é partials
 *                     4200→4350 and the commit@4500)
 *   rollover          0 / 9 transitions                 → 0
 *   consistency       null (scored duration 4000 ms < 10 s)
 *
 * Filter buckets (asserted in the test, not in the summary): scoringPresses
 * 10, compositionDrops 5 (i, ï, e, é partials + composition Backspace),
 * deadKeys 2 (Dead@1300, lone Dead@4900), ignored 2 (Escape, empty commit).
 */
export const FIXTURE_ID = "ENG-FIXTURE-E5-dead-key-sequence";

export const targetText = "naïve café";

const downs = [
  // Abandoned IME composition: partials, then Escape cancels. None scores.
  keyDown("i", 0, { code: "KeyI", composition: true }),
  keyDown("ï", 150, { code: "KeyI", composition: true }),
  keyDown("Escape", 300, { code: "Escape" }),
  keyDown("n", 500),
  keyDown("a", 900),
  // Dead-key sequence for ï: Dead never scores; the completion inserts once.
  keyDown("Dead", 1300, { code: "Quote" }),
  keyDown("ï", 1500, { code: "KeyI" }),
  keyDown("v", 1900),
  keyDown("e", 2300),
  keyDown(" ", 2700),
  keyDown("c", 3100),
  keyDown("a", 3500),
  keyDown("f", 3900),
  // IME composition for é: partials never score; the commit scores once.
  keyDown("e", 4200, { code: "KeyE", composition: true }),
  keyDown("é", 4350, { code: "KeyE", composition: true }),
  keyDown("é", 4500, { code: "KeyE", composition: false }),
  // Composition-flagged Backspace: a partial correction, dropped entirely.
  keyDown("Backspace", 4600, { code: "Backspace", composition: true }),
  // Empty composition commit: zero graphemes — ignored, never a crash.
  keyDown("", 4700, { code: "Unidentified", composition: false }),
  // Lone dead key with no completion: inert, and does not extend the clock.
  keyDown("Dead", 4900, { code: "Quote" }),
];

const events = [...downs, ...downs.map((d) => keyUp(d.key, d.t + 80, { code: d.code }))].sort(
  (a, b) => a.t - b.t,
);

export const text = typingText("fixture-e-deadkey", targetText);

export const log = buildLog({
  events,
  textId: text.id,
  textHash: "28e86ad89c14d1298f1961e890fc980ac80a0288e949e02557b3bfd04a5efc02",
  errorMode: "free",
});

export const expected: FixtureExpectation = {
  summary: {
    rawWpm: 30,
    grossWpm: 30,
    netWpm: 30,
    keystrokeAccuracy: 100,
    finalAccuracy: 100,
    kspc: 1,
    rolloverRatio: 0,
    consistency: null,
    burstWpm: 24,
    ikiMeanMs: 444.4444444444,
    modelVersion: "1.1.0",
    difficultyBand: null,
    verified: false,
    flags: [],
  },
  tolerance: 1e-6,
  details: {
    durationMs: 4000,
    printableKeystrokes: 10,
    correctKeystrokes: 10,
    correctCharsInFinalText: 10,
    finalTextLength: 10,
    bufferInserts: 10,
    backspaces: 0,
    rejectedAttempts: 0,
    totalAttempts: 10,
    rejectedAttemptRate: 0,
  },
  notes: [
    "The E5 pin: a dead-key sequence is ONE character — Dead@1300 never scores and the ï completion inserts once, with the 600 ms IKI gap carrying the combined dead-to-completion span instead of two fast keystrokes.",
    "The IME pin: four composition partials plus a composition Backspace never score (not even the clock start at t=0), and the é commit with composition:false scores exactly once.",
    "Adversarials: abandoned composition + Escape, an empty string commit, and a trailing lone Dead that is inert and does not extend the scored duration past t=4500.",
  ],
};
