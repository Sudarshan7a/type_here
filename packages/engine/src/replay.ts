/**
 * RealType typing engine (open-core, MIT) — deterministic replay (ENG-08).
 *
 * A replay consumes a captured log and yields one frame per text-affecting
 * event, so a viewer can step through the attempt exactly as it happened.
 * Pure logic, no DOM: the browser viewer and any future server consumer share
 * this code, which is what keeps "the replay disagrees with the live run" bugs
 * from existing.
 *
 * Frame semantics (implementation guide M1-10):
 *  - text: the produced buffer after this frame's event, as a string.
 *  - caret: the buffer length — the insertion point the surface paints.
 *  - keysDown: physical keys held at this frame's timestamp, by `code`.
 *  - errorIndices / errorCount: positions the engine paints incorrect or
 *    extra (the same derivation the live surface uses).
 *  - t: the event's own timestamp, so speed control is a display concern
 *    (scale time) and never touches scoring.
 *
 * Corruption rule (M1-10 §3): replay must reproduce the final text exactly.
 * When the caller supplies `expectedFinalText` and the folded buffer differs,
 * the result is marked corrupted rather than silently showing a wrong replay.
 * Out-of-order text-affecting timestamps are likewise corruption: a capture
 * writes non-decreasing `t`, so a decrease means the log was edited or merged
 * badly (M1-12 §8). Without an expectation and with ordered time, a log is
 * taken at face value — there is nothing to disagree with.
 */

import type { KeyEvent } from "@realtype/schemas";

import { deriveCharStates, type CharState } from "./char-states.js";
import { filterEvents } from "./input-filter.js";
import { applyPress, bufferText, createTextModel, type ErrorMode } from "./text-model.js";

/** One paintable moment of a finished attempt. */
export interface ReplayFrame {
  /** The event's own timestamp (ms, origin-relative like every log time). */
  t: number;
  /** The produced buffer after this frame's event. */
  text: string;
  /** Per-character paint states for `text` against the target. */
  states: CharState[];
  /** The insertion point: the buffer length. */
  caret: number;
  /** Physical keys held at `t`, by `code`, sorted for determinism. */
  keysDown: string[];
  /** Positions painted incorrect or extra. */
  errorIndices: number[];
  /** `errorIndices.length`, kept beside the list for summary copy. */
  errorCount: number;
}

export interface ReplayOptions {
  /**
   * The finished text the replay must reproduce. When supplied and different
   * from the folded buffer, `corrupted` is true.
   */
  expectedFinalText?: string;
  /**
   * Whether the last frame is a finished attempt (unreached characters paint
   * missed rather than untyped). Defaults to true: a replay shows a test that
   * is over.
   */
  finished?: boolean;
}

export interface ReplayResult {
  /** The initial empty state, then one frame per text-affecting event. */
  frames: ReplayFrame[];
  /** The folded buffer of the whole log. */
  finalText: string;
  /** True when the log cannot reproduce the expected text or is out of order. */
  corrupted: boolean;
  /** The final frame's error count (0 when there are no frames beyond initial). */
  errorCount: number;
}

/**
 * Fold a log's text-affecting events into paintable frames.
 *
 * The fold replays `filterEvents(events).textAffecting` through `applyPress`
 * on a fresh text model — the same list and the same function the live
 * surface (`mirrorBuffer`) and the metrics (`computeFromEvents`) use, so the
 * three can never disagree about what was typed.
 */
export function framesForLog(
  target: string,
  events: readonly KeyEvent[],
  errorMode: ErrorMode,
  options: ReplayOptions = {},
): ReplayResult {
  const finished = options.finished ?? true;
  const filtered = filterEvents(events);
  const affecting = filtered.textAffecting;

  const initial: ReplayFrame = {
    t: 0,
    text: "",
    states: deriveCharStates(target, [], { finished: false }),
    caret: 0,
    keysDown: [],
    errorIndices: [],
    errorCount: 0,
  };

  const model = createTextModel(target, errorMode);
  const frames: ReplayFrame[] = [initial];
  let ordered = true;
  let previousT = -Infinity;

  for (let i = 0; i < affecting.length; i++) {
    const event = affecting[i]!;
    if (event.t < previousT) ordered = false;
    previousT = event.t;
    applyPress(model, event);
    const buffer = [...model.buffer];
    const isLast = i === affecting.length - 1;
    const states = deriveCharStates(target, buffer, { finished: finished && isLast });
    const errorIndices: number[] = [];
    for (let s = 0; s < states.length; s++) {
      if (states[s] === "incorrect" || states[s] === "extra") errorIndices.push(s);
    }
    frames.push({
      t: event.t,
      text: buffer.join(""),
      states,
      caret: buffer.length,
      keysDown: keysDownAt(events, event.t),
      errorIndices,
      errorCount: errorIndices.length,
    });
  }

  const finalText = bufferText(model);
  const corrupted =
    !ordered ||
    (options.expectedFinalText !== undefined && finalText !== options.expectedFinalText);

  return {
    frames,
    finalText,
    corrupted,
    errorCount: frames[frames.length - 1]!.errorCount,
  };
}

/**
 * Physical keys held at time `t`: every keydown at or before `t` whose keyup
 * has not yet arrived, read in capture order so a down/up pair at the same
 * timestamp resolves to released.
 */
function keysDownAt(events: readonly KeyEvent[], t: number): string[] {
  const held = new Set<string>();
  for (const event of events) {
    if (event.t > t) continue;
    if (event.type === "down") held.add(event.code);
    else held.delete(event.code);
  }
  return [...held].sort();
}
