/**
 * RealType typing engine (open-core, MIT) — text model and error modes (E4).
 *
 * The buffer models what the user has actually produced, character by
 * character, with must-correct rejection (chapter 4 §4.5). Pure logic, no DOM.
 */
import type { KeyEvent } from "@realtype/schemas";

/**
 * Engine-internal error modes.
 *
 * `no-backspace` is implemented here but is NOT yet in the public contract:
 * `packages/schemas` still declares a three-value `errorMode` enum, so a
 * `no-backspace` InputLog cannot be constructed or validated yet. The engine
 * behaviour is complete and unit-tested; the enum extension is registered as
 * `EXTERNAL DECISION REQUIRED` in HUMAN-ACTIONS.md with the proposed bump to
 * CONTRACT_VERSION 1.3.0. Until the human decides, the public surface keeps
 * exactly the three modes it has always accepted.
 */
export type ErrorMode = "free" | "must-correct" | "stop-on-error" | "no-backspace";

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
  return model.target[model.buffer.length] === key;
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

  // stop-on-error (D02): the run already ended at the first error. Later
  // presses are real physical keystrokes, but they are past the end of the
  // attempt, so counting them would inflate the denominator and let someone
  // "finish" a halted test by typing on.
  if (model.halted) return "ignored";

  if (event.auto) {
    // Auto-inserted characters are part of the produced text (auto-pair), but
    // they are never counted as user keystrokes.
    if ([...event.key].length === 1 && model.rejected === null) {
      model.buffer.push(event.key);
      model.autoInserts += 1;
    }
    return "inserted";
  }

  if ([...event.key].length !== 1 && event.key !== "Backspace") return "ignored";

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
  return model.buffer.slice(0, model.target.length).join("");
}

/** Positions where the final text matches the target. */
export function correctCharsInFinalText(model: TextModel): number {
  const final = finalText(model);
  let correct = 0;
  for (let i = 0; i < final.length; i++) {
    if (final[i] === model.target[i]) correct += 1;
  }
  return correct;
}
