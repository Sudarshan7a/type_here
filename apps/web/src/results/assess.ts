/**
 * What the results screen has to admit (ANA-01).
 *
 * The honest states are not an afterthought on this screen — they are most of
 * it. A run can be short, can carry integrity flags, can finish with the
 * connection gone, and can always be unverified. Each is decided here, from the
 * engine's own result object, by a pure function with no thresholds invented in
 * the view: `MIN_CONSISTENCY_DURATION_MS` is imported from the engine rather
 * than restated, so "short" means exactly what the engine means by it.
 *
 * Two states deliberately have no quiet version:
 *
 *  - There is NO "nothing to report" path. A clean run does not say "no notes" —
 *    it simply has no notice. Announcing the absence of a problem is a claim the
 *    client cannot make: the plausibility checks in the engine are threshold-free
 *    by design (packages/engine/src/plausibility.ts) and run server-side with
 *    injected floors, so this screen has genuinely not looked.
 *  - There is no congratulation anywhere in this file, and none is wanted. The
 *    project's anti-goals forbid single-attempt gating and guilt copy, and a
 *    result screen is exactly where that pressure shows up.
 */

import { MIN_CONSISTENCY_DURATION_MS, type EngineResult } from "@realtype/engine";

import { COPY } from "../copy";
import { formatSeconds } from "./format";

/**
 * Below this scored duration the engine reports no consistency figure, so the
 * screen says so. Read from the engine rather than copied: if the engine changes
 * its floor, this threshold moves with it in the same commit.
 */
export const SHORT_TEST_MS = MIN_CONSISTENCY_DURATION_MS;

export interface ResultAssessment {
  /** Scored duration, exactly as the engine reported it. */
  readonly scoredMs: number;
  /** True when the run is shorter than the engine's own consistency floor. */
  readonly short: boolean;
  /** Integrity flag codes, verbatim from the engine. Never reinterpreted here. */
  readonly flags: readonly string[];
  /** The engine's difficulty band, or null while nothing rates passages. */
  readonly difficulty: "easy" | "typical" | "hard" | null;
}

/** Read a result and decide which honest states apply. Pure. */
export function assessResult(result: EngineResult): ResultAssessment {
  return {
    scoredMs: result.details.scoredDurationMs,
    short: result.details.scoredDurationMs < SHORT_TEST_MS,
    flags: [...result.summary.flags],
    difficulty: result.summary.difficultyBand,
  };
}

/**
 * The flag codes, as the words the string table gives for them.
 *
 * A code with no wording is passed through unchanged rather than dropped. An
 * unrecognised flag is a fact the engine produced; hiding it because this file
 * is behind would make the screen look cleaner than the run was, which is the
 * opposite of what it is for.
 */
export function flagNotes(flags: readonly string[]): string {
  return flags.map((code) => COPY.resultsFlagWords[code] ?? code).join(", ");
}

/**
 * The short-run sentence. Both durations are formatted by the shared formatter,
 * so the number in the sentence is the engine's scored duration at the same
 * precision as every other figure — not a value computed for the sentence.
 */
export function shortNotice(assessment: ResultAssessment): string {
  const ran = formatSeconds(assessment.scoredMs) ?? "0.0";
  const minimum = formatSeconds(SHORT_TEST_MS) ?? "0.0";
  return COPY.resultsShortBody(ran, minimum);
}
