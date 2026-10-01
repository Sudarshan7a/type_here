/**
 * RealType typing engine (open-core, MIT) — live metrics for the typing surface
 * (E3).
 *
 * The surface shows net WPM and accuracy while the user is still typing. That
 * number must come from here and not from the view: AGENTS.md rule 3 keeps metric
 * definitions in one package, and a view with its own copy of the formula would
 * be a second metric wearing the same name. The test that pins this is
 * `eng-live-summary.test.ts`, which compares every live figure against
 * `computeFromEvents` over the same events.
 *
 * Two rules from chapter 4 shape the whole file:
 *
 *  - E9: with nothing typed there is no data, so every speed figure is null.
 *    Never 0 — 0 WPM says the user tried and failed, which is a different claim.
 *  - D02: in stop-on-error the run halts at the first error, so the live clock
 *    freezes there. Keystrokes after the halt are real but unscored, and letting
 *    them extend the duration would let a halted test be dragged out by typing on.
 */
import type { KeyEvent } from "@realtype/schemas";

import { filterEvents } from "./input-filter.js";
import { ENGINE_MODEL_VERSION } from "./metrics.js";
import type { ErrorMode } from "./text-model.js";
import { applyPress, correctCharsInFinalText, createTextModel, finalText } from "./text-model.js";
import { perMinuteWpm } from "./wpm.js";

export interface LiveSummaryOptions {
  /**
   * The current clock reading, on the SAME scale as the event timestamps.
   *
   * Injected rather than read from `performance.now()` so the engine stays DOM-
   * free and testable, and so the surface can pass the same clock it stamps events
   * with. This is what makes the live figure move while the user pauses: elapsed
   * time is measured to *now*, not to the last keystroke.
   */
  nowMs: number;
}

export interface LiveSummary {
  /** False when there is nothing to report (E9: no keystroke produced any text). */
  hasData: boolean;
  /** Net WPM so far, or null when there is no data (never 0 as a stand-in). */
  netWpm: number | null;
  /** Keystroke accuracy % so far, or null when there is no data. */
  keystrokeAccuracy: number | null;
  /** Final accuracy % so far, or null when there is no data. */
  finalAccuracy: number | null;
  /** Milliseconds since the first accepted keystroke. */
  elapsedMs: number;
  /** Characters of the target produced so far. */
  typedChars: number;
  /** Of those, how many match the target. */
  correctChars: number;
  modelVersion: string;
}

export function computeLiveSummary(
  target: string,
  events: readonly KeyEvent[],
  errorMode: ErrorMode,
  options: LiveSummaryOptions,
): LiveSummary {
  const filtered = filterEvents([...events]);
  const model = createTextModel(target, errorMode);
  // `textAffecting`, not `scoringPresses` — the same list computeFromEvents
  // replays, so an auto-inserted character is in the live buffer exactly as it
  // is in the finished result (ENG-09).
  for (const press of filtered.textAffecting) {
    applyPress(model, press);
  }

  const haltedAtT = model.haltedAtT;
  const presses =
    haltedAtT === null
      ? filtered.scoringPresses
      : filtered.scoringPresses.filter((p) => p.t <= haltedAtT);

  const final = finalText(model);
  const correctFinal = correctCharsInFinalText(model);
  const printable = presses.filter((p) => p.key !== "Backspace");
  const correctPrintable = model.inserts.filter((i) => i.correct).length;

  const first = presses[0];

  // Elapsed runs from the first accepted keystroke to NOW, not to the last
  // keystroke: a user who stops mid-test must see their speed fall, because that
  // is what happened. With nothing typed yet there is no clock at all (E9).
  //
  // The one exception is a halted run. In stop-on-error the attempt ended at the
  // halting press, and `summarise` scores it from first press to halt — so the
  // live clock has to stop there too, or the figure would keep drifting after the
  // attempt was over and would not match the number finally reported (D02).
  const clockEnd = haltedAtT === null ? options.nowMs : Math.min(options.nowMs, haltedAtT);
  const elapsedMs = first === undefined ? 0 : Math.max(0, clockEnd - first.t);

  // No character of the text was produced, so there is no speed to report. A
  // Backspace on an empty buffer, or a must-correct rejection, both land here.
  const hasData = final.length > 0;

  if (!hasData) {
    return {
      hasData: false,
      netWpm: null,
      keystrokeAccuracy: null,
      finalAccuracy: null,
      elapsedMs,
      typedChars: 0,
      correctChars: 0,
      modelVersion: ENGINE_MODEL_VERSION,
    };
  }

  const netWpm = perMinuteWpm(correctFinal, elapsedMs);
  const keystrokeAccuracy =
    printable.length === 0 ? 0 : (correctPrintable / printable.length) * 100;
  const finalAccuracy = (correctFinal / final.length) * 100;

  return {
    hasData: true,
    netWpm,
    keystrokeAccuracy,
    finalAccuracy,
    elapsedMs,
    typedChars: final.length,
    correctChars: correctFinal,
    modelVersion: ENGINE_MODEL_VERSION,
  };
}
