/**
 * The one automatic announcement on a finished test (ANA-01, a11y.announce).
 *
 * It is derived from the finished result, which the surface sets exactly once,
 * so it fires once per test and never per keystroke. That property does not
 * depend on this module being careful — it depends on there being exactly ONE
 * live region and exactly ONE thing that changes it, both of which
 * `tests/results-panel.test.tsx` and `e2e/results-states.spec.ts` pin.
 *
 * WHAT GOES IN IT. The two headline figures, spoken at whole numbers, plus a
 * note when the engine flagged the run. A flagged run is not announced as a
 * result without qualification, and the qualification is part of the same
 * sentence — a second live region for it would be a second announcement.
 */

import type { EngineResult } from "@realtype/engine";

import { COPY } from "../copy";
import { assessResult } from "./assess";
import { formatSpeech } from "./format";

/** The sentence the live region carries for a finished test. */
export function buildAnnouncement(result: EngineResult): string {
  const flagged = assessResult(result).flags.length > 0;
  return COPY.announceTestFinished(
    formatSpeech(result.summary.netWpm),
    formatSpeech(result.summary.finalAccuracy),
    flagged ? ` ${COPY.resultsFlagsAnnounce}` : undefined,
  );
}
