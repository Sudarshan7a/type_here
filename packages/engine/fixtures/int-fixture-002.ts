import { keyDown } from "./helpers.js";

/**
 * INT-FIXTURE-002-single-outlier-detection (chapter-10 §10.3.1).
 *
 * A two-hundred-press log at a human-plausible base pace (150 ms between
 * presses) with exactly one anomalous pair: presses 100 and 101 are `f`
 * (KeyF) then `r` (KeyR) — both left-index on the grid, so a same-finger
 * pair — separated by only 4 ms, the chapter's worked automation artifact
 * (two synthetic events dispatched in one event-loop tick).
 *
 * Construction (times in ms, press k of 200):
 *
 *   t(k) = 150 × k            for every k except 101
 *   t(101) = 150 × 100 + 4    = 15004 (the outlier: 4 ms after press 100)
 *
 * The log is deliberately NOT re-anchored after the outlier, so the recovery
 * gap (press 101 → 102: 15300 − 15004 = 296 ms) is part of the data, exactly
 * as a real capture would show it.
 *
 * Hand-computed gap inventory (199 gaps total, recomputed independently by
 * recompute.mjs, which imports nothing from packages/engine):
 *
 *   197 gaps × 150 ms, one 4 ms gap (pair index 101), one 296 ms gap
 *   span check: 197 × 150 + 4 + 296 = 29550 + 300 = 29850 = t(199) − t(0) ✓
 *
 * Hand-computed sustained-window picture (ten-gap windows, 190 of them):
 *
 *   worst window (starts at press 91: nine 150 ms gaps + the 4 ms gap)
 *     (9 × 150 + 4) / 10 = 1354 / 10                          → 135.4
 *   every other window is at 150.0 or above (the recovery-gap window holds
 *   eight 150 ms gaps plus the 4 ms and 296 ms gaps → 150.0 exactly)
 *
 * The chapter's point, pinned here as data for the test to judge: no
 * ten-gap window mean comes near an implausible sustained rate (minimum
 * 135.4), so the sustained-rate check alone passes this log — yet pair 101
 * is a 4 ms same-finger interval, which the single-pair scan must flag. The
 * two checks are complementary, not redundant. Verdicts live in the test,
 * next to the injected floor values.
 *
 * Privacy: press times and physical codes only — no text, no content.
 */
export const FIXTURE_ID = "INT-FIXTURE-002-single-outlier-detection";

const PRESS_COUNT = 200;
const BASE_GAP_MS = 150;
const OUTLIER_INDEX = 101;
const OUTLIER_GAP_MS = 4;

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

function keyFor(k: number): string {
  if (k === OUTLIER_INDEX - 1) return "f";
  if (k === OUTLIER_INDEX) return "r";
  return LETTERS[k % LETTERS.length]!;
}

function timeFor(k: number): number {
  if (k === OUTLIER_INDEX) return (OUTLIER_INDEX - 1) * BASE_GAP_MS + OUTLIER_GAP_MS;
  return k * BASE_GAP_MS;
}

export const logDowns = Array.from({ length: PRESS_COUNT }, (_, k) =>
  keyDown(keyFor(k), timeFor(k)),
);

/** Hand-computed: the anomalous pair ends at press index 101. */
export const OUTLIER_PAIR_INDEX = 101;

/** Hand-computed: t(101) − t(100) = 15004 − 15000 = 4 ms. */
export const OUTLIER_IKI_MS = 4;

/** Hand-computed: minimum ten-gap window mean is 135.4 (window at press 91). */
export const MIN_WINDOW_MEAN = 135.4;

/** Construction pins, exported so the test cannot drift from this comment. */
export { BASE_GAP_MS, OUTLIER_GAP_MS, OUTLIER_INDEX, PRESS_COUNT };
