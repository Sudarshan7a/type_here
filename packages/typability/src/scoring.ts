/**
 * The scoring core (CNT-02). INTERNAL: nothing here is re-exported from
 * `./index.ts`, and that is the enforcement mechanism for master-spec §6.2
 * Stage A's "no score multiplication yet".
 *
 * Why the score does not leave the package:
 *
 *   - The product-facing entry point (`typabilityBand`) returns a band label, a
 *     reason, the declared band and the model version. There is no score field
 *     on that object, so no caller can multiply a speed by it even by mistake.
 *   - The number exists only inside this module, plus one deliberately named
 *     audit entry point (`explainTypabilityBand`) whose return type says
 *     `score` and is consumed by exactly one thing: the calibration/audit CLI in
 *     `scripts/check-typability.mjs`. A product surface has no reason to call it,
 *     and `packages/typability/tests/stage-a.test.ts` asserts that no file
 *     outside this package imports it.
 *
 * Stage B (master-spec §6.2) is where multiplication becomes legal, and it is
 * deliberately NOT half-built here: rWPM needs a fitted beta from our own
 * within-user data plus a published fit statistic, and there is no such data yet.
 */
import { BAND_BOUNDARIES, SCORE_QUANTISATION_STEP, TOTAL_FEATURE_WEIGHT } from "./config.ts";
import type { DifficultyBand } from "./types.ts";

/**
 * Snap a score onto the model's 0.05 grid.
 *
 * Two consequences, both wanted: a band can never be decided by a difference in
 * the last floating-point bit, and `distanceToBoundary` is a meaningful
 * churn-risk number rather than noise.
 */
export function quantiseScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.round(score / SCORE_QUANTISATION_STEP) * SCORE_QUANTISATION_STEP;
}

/**
 * Score -> band.
 *
 * `>=` on both boundaries is the published tie-break: a score exactly on a
 * boundary belongs to the EASIER band. Written as two explicit comparisons
 * rather than a lookup table so the rule is readable at the point of decision.
 */
export function bandForScore(score: number): DifficultyBand {
  if (score >= BAND_BOUNDARIES.typicalMax) return "easy";
  if (score >= BAND_BOUNDARIES.hardMin) return "typical";
  return "hard";
}

/** Distance from a score to the nearest band boundary. */
export function distanceToBoundary(score: number): number {
  return Math.min(
    Math.abs(score - BAND_BOUNDARIES.typicalMax),
    Math.abs(score - BAND_BOUNDARIES.hardMin),
  );
}

/**
 * Combine the feature components into a 0-100 difficulty score.
 *
 * A weighted mean, not a weighted sum, so the score stays in 0-100 when a
 * feature is added or removed and the boundaries keep their meaning. The caller
 * passes components in `TYPABILITY_FEATURE_SPECS` order, which is why this
 * function takes `number[]` and knows nothing about names: the ordering contract
 * lives in one place (`./features.ts`) instead of in a zip here.
 */
export function weightedScore(
  components: ReadonlyArray<number>,
  weights: ReadonlyArray<number>,
): number {
  if (components.length === 0 || weights.length !== components.length) return 0;
  let total = 0;
  for (let i = 0; i < components.length; i++) {
    const component = components[i]!;
    total += (Number.isFinite(component) ? component : 0) * weights[i]!;
  }
  const mean = total / TOTAL_FEATURE_WEIGHT;
  return Math.min(100, Math.max(0, mean * 100));
}
