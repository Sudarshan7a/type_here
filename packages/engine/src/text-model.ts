/**
 * RealType typing engine (open-core, MIT) — text model and error modes (E4).
 *
 * The buffer models what the user has actually produced, character by
 * character, with must-correct rejection (chapter 4 §4.5). Pure logic, no DOM.
 */
import type { ErrorMode as SchemaErrorMode, KeyEvent } from "@realtype/schemas";

/**
 * The comparison unit for the whole engine (M1-03, chapter 4 E6): the
 * user-perceived character (grapheme cluster), not the code point or the
 * UTF-16 code unit. A single emoji (one grapheme, many code points) is one
 * unit, so it can never be scored "half correct, half missing"; a decomposed
 * `e` + combining acute is likewise one unit. `Intl.Segmenter` is a language
 * builtin, not a dependency, so the license gate is unaffected.
 *
 * ASCII text segments to one unit per character, which is why every
 * pre-existing fixture behaves byte-identically under this change.
 */
const graphemeSegmenter: Intl.Segmenter | null =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

/** Split text into grapheme clusters (falls back to code points without ICU). */
export function segmentGraphemes(text: string): string[] {
  if (graphemeSegmenter !== null) {
    const out: string[] = [];
    for (const { segment } of graphemeSegmenter.segment(text)) out.push(segment);
    return out;
  }
  return [...text];
}

/** How many user-perceived characters a key value holds (printable ⇔ exactly 1). */
export function graphemeLength(text: string): number {
  return segmentGraphemes(text).length;
}

/**
 * Error modes.
 *
 * Derived from the public `errorMode` enum in `@realtype/schemas` rather than
 * written out by hand, so the engine and the contract cannot drift apart: a new
 * mode added to the schema and forgotten here is a typecheck failure instead of
 * a runtime surprise. `no-backspace` (D03) and `word-locked` (D04) joined the
 * contract in CONTRACT_VERSION 1.3.0.
 */
export type ErrorMode = SchemaErrorMode;

export interface TextModel {
  /** The target text being typed. */
  target: string;
  mode: ErrorMode;
  /** What the user has produced so far. */
  buffer: string[];
  /** A wrong character awaiting correction (must-correct / stop-on-error). */
  rejected: KeyEvent | null;
  /**
   * stop-on-error: the first error ended the run (chapter 4 D02). Time freezes
   * here and every later press is unscored. This is what separates D02 from
   * D01 — must-correct opens a correction path and the test continues.
   */
  halted: boolean;
  /** Timestamp of the halting error, or null. The frozen end of the attempt. */
  haltedAtT: number | null;
  /** Accepted user inserts, with the time they landed (burst/IKI/consistency). */
  inserts: { key: string; t: number; correct: boolean }[];
  /** Accepted Backspaces (the KSPC numerator includes them). */
  backspaces: number;
  /** Presses rejected by must-correct (counted as attempts, never as text). */
  rejectedAttempts: number;
  /** Every scoring press seen, accepted or not. */
  totalAttempts: number;
  /** App auto-inserted characters (auto-pair): in the text, out of the metrics. */
  autoInserts: number;
}

export function createTextModel(target: string, mode: ErrorMode): TextModel {
  return {
    target,
    mode,
    buffer: [],
    rejected: null,
    halted: false,
    haltedAtT: null,
    inserts: [],
    backspaces: 0,
    rejectedAttempts: 0,
    totalAttempts: 0,
    autoInserts: 0,
  };
}

function isCorrectPress(model: TextModel, key: string): boolean {
  // Unit-indexed, not string-indexed: for astral-plane targets `target[i]` would
  // be a lone surrogate half, which can never equal a produced grapheme.
  return segmentGraphemes(model.target)[model.buffer.length] === key;
}

/**
 * Index one past the last character of the word the caret is currently in.
 * A text with no trailing space therefore ends at `target.length`, which is why
 * the last word is locked by the same rule as every other one.
 */
function wordEndFor(target: string, index: number): number {
  // `index` counts produced graphemes, so the search must run over units too:
  // for astral-plane targets a UTF-16 offset and a unit offset disagree.
  const units = segmentGraphemes(target);
  const space = units.indexOf(" ", index);
  return space === -1 ? units.length : space;
}

/**
 * D04 (word-locked): the caret may not leave the current word until every
 * character of it is correct (chapter 4 part 2, fixture ENG-FIXTURE-D04).
 *
 * The mode deliberately does NOT reject a wrong key the way must-correct does.
 * The typo is kept and visible, and Backspace keeps working, so the user can see
 * the mistake and fix it — what they cannot do is carry the mistake into the
 * next word. Those two halves are the whole point of the mode, so this returns
 * false for any caret still inside the word.
 */
function wordLockedAtBoundary(model: TextModel): boolean {
  if (model.mode !== "word-locked") return false;

  const end = wordEndFor(model.target, model.buffer.length);
  if (model.buffer.length < end) return false; // still inside the word

  // Both sides sliced by units: a UTF-16 slice of the target would cut an
  // astral-plane character in half and the lock would never agree with itself.
  const produced = model.buffer.slice(0, end).join("");
  const intended = segmentGraphemes(model.target).slice(0, end).join("");
  return produced !== intended;
}

export type PressOutcome = "inserted" | "corrected" | "rejected" | "cleared" | "ignored";

/**
 * Apply one scoring press. Printable keys advance the buffer (or are rejected
 * in must-correct mode); Backspace pops, or clears a pending rejection without
 * touching the buffer (chapter 4 D01 — the wrong char never entered the text).
 */
export function applyPress(model: TextModel, event: KeyEvent): PressOutcome {
  if (event.type !== "down" || event.repeat) return "ignored";
  if (event.isTrusted === false) return "ignored";
  // IME guard (ENG-06, M1-04 §6): a composition partial is a reading, not a
  // keystroke. It is ignored outright — never buffered, never counted — while
  // the committed text arrives as an ordinary (non-composition) press and
  // scores exactly once. The filter drops these too; this guard covers direct
  // applyPress callers (e.g. the live surface replaying `textAffecting`).
  if (event.composition === true) return "ignored";

  // stop-on-error (D02): the run already ended at the first error. Later
  // presses are real physical keystrokes, but they are past the end of the
  // attempt, so counting them would inflate the denominator and let someone
  // "finish" a halted test by typing on.
  if (model.halted) return "ignored";

  if (event.auto) {
    // Auto-inserted characters are part of the produced text (auto-pair), but
    // they are never counted as user keystrokes.
    if (graphemeLength(event.key) === 1 && model.rejected === null) {
      model.buffer.push(event.key);
      model.autoInserts += 1;
    }
    return "inserted";
  }

  // One press is at most one grapheme: a decomposed `e` + combining acute or a
  // ZWJ emoji sequence in a single key value is one unit (E5/E6), while a
  // multi-grapheme commit must be split by the input adapter into one press
  // per grapheme (M1-04) — scoring it whole would double-count one keystroke.
  // `Dead` (4 graphemes) and every modifier name fail this gate, which is what
  // keeps a dead-key press from ever scoring on its own (chapter 4 E5).
  if (graphemeLength(event.key) !== 1 && event.key !== "Backspace") return "ignored";

  // D03 (exam, no-backspace): Backspace is not a correction, it is simply not a
  // key. It is ignored outright — never inserted, never counted as a
  // keystroke, never allowed to pop the buffer. The check must come BEFORE
  // totalAttempts is incremented, or a held-down Backspace would inflate the
  // attempt count. KSPC is therefore unaffected, which is the point: an
  // exam-mode result must not be improvable with a key the candidate may not
  // use.
  if (event.key === "Backspace" && model.mode === "no-backspace") return "ignored";

  model.totalAttempts += 1;

  if (event.key === "Backspace") {
    if (model.rejected !== null) {
      // D01: Backspace clears the pending error without popping the buffer
      // (the wrong char never entered the text). It is still an accepted
      // physical keystroke, so it counts toward KSPC.
      model.rejected = null;
      model.backspaces += 1;
      return "cleared";
    }
    if (model.buffer.length > 0) {
      model.buffer.pop();
      model.backspaces += 1;
      return "corrected";
    }
    // Backspace on an empty buffer changes nothing and is not counted (KSPC).
    return "ignored";
  }

  if (model.rejected !== null) {
    // must-correct / stop-on-error: the caret cannot advance past a wrong
    // character; further presses are rejected attempts (real physical
    // presses, so they count as attempts but never touch the buffer).
    model.rejectedAttempts += 1;
    return "rejected";
  }

  if (model.mode === "stop-on-error" && !isCorrectPress(model, event.key)) {
    // D02: the first error IS the end of the run. The press is a real physical
    // keystroke, so totalAttempts counts it, but it is not inserted and it does
    // not open a pending rejection — there is no correction path in this mode.
    model.halted = true;
    model.haltedAtT = event.t;
    return "rejected";
  }

  if (model.mode === "must-correct" && !isCorrectPress(model, event.key)) {
    // First wrong press in must-correct mode: it is NOT inserted; it opens
    // the pending-error state that Backspace (or the correct key) clears.
    model.rejected = event;
    model.rejectedAttempts += 1;
    return "rejected";
  }

  if (wordLockedAtBoundary(model)) {
    // D04: the current word is finished and it is wrong. Every forward press is
    // refused, including the correct space, so the mistake cannot be carried
    // into the next word. Backspace never reaches this point: it is handled
    // above, which is what makes correction within the word possible.
    model.rejectedAttempts += 1;
    return "rejected";
  }

  const correct = isCorrectPress(model, event.key);
  model.buffer.push(event.key);
  model.inserts.push({ key: event.key, t: event.t, correct });
  return "inserted";
}

/** The text the user has produced so far. */
export function bufferText(model: TextModel): string {
  return model.buffer.join("");
}

/**
 * The FINAL text after processing: the produced buffer with any characters
 * past the target's length removed, matching how a typing surface displays
 * the finished attempt (chapter 4 §4.4: net WPM counts correct characters in
 * the final text).
 */
export function finalText(model: TextModel): string {
  // Sliced by grapheme count, not UTF-16 length: the buffer holds one entry
  // per press, so the cap is a unit count. (ASCII: identical.)
  return model.buffer.slice(0, segmentGraphemes(model.target).length).join("");
}

/** Positions where the final text matches the target. */
export function correctCharsInFinalText(model: TextModel): number {
  // Unit-by-unit: comparing UTF-16 code units would credit a lone surrogate
  // half (e.g. a piecemeal emoji part against the full grapheme) as "correct".
  const produced = model.buffer.slice(0, segmentGraphemes(model.target).length);
  const intended = segmentGraphemes(model.target);
  let correct = 0;
  for (let i = 0; i < produced.length; i++) {
    if (produced[i] === intended[i]) correct += 1;
  }
  return correct;
}
