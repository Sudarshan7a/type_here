import type { EngineResult } from "@realtype/engine";

import { placementFromResult, type Placement } from "./placement";
import { baselineRecord, writeBaselineRecord, type BaselineRecord } from "./storage";

/**
 * What a finished baseline DOES (MOD-05).
 *
 * Split out of the App so the interesting half — measure, derive, store, report
 * — is a pure function with a clock passed in, rather than an effect buried in
 * a component. The engine's own modules are pure for the same reason: a server
 * recompute must be able to reproduce a client result exactly, and that is
 * impossible when the logic that produces it lives inside a render cycle.
 */

export interface BaselineOutcome {
  /** What the visitor is told. */
  readonly placement: Placement;
  /** What is written, and with it the card's retest line. */
  readonly record: BaselineRecord;
}

/**
 * Turn a finished baseline result into an outcome.
 *
 * Pure: the timestamp is a parameter, not `Date.now()`, so a test can pin the
 * retest date. The band stored in the record is re-derived here from the
 * measured WPM rather than taken from the placement, which means the stored
 * value cannot drift from the rule even if one of them changes later.
 */
export function outcomeFor(result: EngineResult, takenAtMs: number): BaselineOutcome {
  const placement = placementFromResult(result);
  return {
    placement,
    record: baselineRecord(placement.netWpm, placement.finalAccuracy, takenAtMs),
  };
}

/**
 * The App's finish handler for the baseline mode.
 *
 * Returns whether the record was WRITTEN, honestly: a storage that silently
 * drops the value must not be reported as a success, or the app would show a
 * retest date for a measurement it never kept.
 */
export function recordBaseline(result: EngineResult, now: () => number): Placement | null {
  const outcome = outcomeFor(result, now());
  writeBaselineRecord(outcome.record);
  return outcome.placement;
}
