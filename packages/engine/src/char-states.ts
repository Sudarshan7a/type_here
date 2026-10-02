/**
 * RealType typing engine (open-core, MIT) — character states (ENG-03).
 *
 * The typing surface must paint five states per character: untyped, correct,
 * incorrect, extra and missed. The derivation lives here rather than in the view
 * for three reasons:
 *
 *  - AGENTS.md rule 3 keeps metric *definitions* in this package; a character
 *    state is the same kind of decision (which position is right), and a view that
 *    recomputed it could disagree with the engine that scored the test.
 *  - The weakness model, the confusion matrix and the future replay viewer all
 *    need exactly this classification, so deriving it once removes a whole class
 *    of "the replay disagrees with the live run" bugs.
 *  - It is pure and DOM-free, so every edge is unit-testable in Node rather than
 *    only through a browser.
 *
 * "Missed" is the state that needs care. While a test is running, an unreached
 * character is simply untyped — nothing is known yet, and calling it missed would
 * be a false statement about a test still in progress. It becomes missed only
 * once the attempt is over (`finished`), which is the only moment the omission
 * is a fact.
 */
import { correctCharsInFinalText, segmentGraphemes, type TextModel } from "./text-model.js";

export const CHAR_STATES = ["untyped", "correct", "incorrect", "extra", "missed"] as const;

export type CharState = (typeof CHAR_STATES)[number];

export interface CharStateOptions {
  /** True once the attempt is over, which is what makes "missed" knowable. */
  finished: boolean;
}

/**
 * One state per visible character.
 *
 * The array covers the target text plus any characters the user produced beyond
 * its end, so the surface renders exactly as many entries as it has characters
 * and never has to guess whether a trailing character is extra or not yet typed.
 */
export function deriveCharStates(
  target: string,
  buffer: readonly string[],
  options: CharStateOptions,
): CharState[] {
  // Grapheme iteration: one entry per user-perceived character, so a ZWJ emoji
  // or a decomposed accent is one entry, not several broken halves (chapter 4
  // E6). `buffer` already holds one grapheme per press (the text model enforces
  // it); the target is segmented here for the same unit.
  const produced = [...buffer];
  const intended = segmentGraphemes(target);
  const total = Math.max(intended.length, produced.length);
  const out: CharState[] = [];

  for (let i = 0; i < total; i++) {
    const typed = produced[i];
    if (typed === undefined) {
      out.push(options.finished ? "missed" : "untyped");
      continue;
    }
    const expected = intended[i];
    if (expected === undefined) {
      // Past the end of the target there is no position to be right or wrong
      // against, so the character is extra (chapter 4 E2).
      out.push("extra");
      continue;
    }
    out.push(typed === expected ? "correct" : "incorrect");
  }
  return out;
}

/**
 * The states for a live text model, using the model's own buffer.
 *
 * Convenience for the surface, which holds a TextModel rather than a raw array,
 * and it also pins the invariant that matters most: the number of characters the
 * surface paints "correct" is the number the engine counts as correct in the
 * final text. A view that could paint a character correct that the engine counts
 * wrong would be showing the user a lie about their own result.
 */
export function charStatesForModel(model: TextModel, options: CharStateOptions): CharState[] {
  return deriveCharStates(model.target, model.buffer, options);
}

/**
 * Cross-check for tests and for the surface's own assertions: how many
 * characters the states call correct, which must equal the engine's count.
 */
export function correctStateCount(model: TextModel, options: CharStateOptions): number {
  const states = charStatesForModel(model, options);
  const painted = states.filter((s) => s === "correct").length;
  return painted === correctCharsInFinalText(model) ? painted : -1;
}
