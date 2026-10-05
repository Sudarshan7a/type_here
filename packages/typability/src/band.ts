/**
 * The per-item verdict (CNT-02).
 *
 * `typabilityBand` is what the corpus pipeline calls, and it returns a LABEL.
 * `explainTypabilityBand` is the audit entry point: same computation, plus the
 * feature vector and the numeric score, for the calibration report and for a
 * reviewer asking "why is this item Hard?". Stage A means the second function's
 * score is reportable and not consumable: master-spec §6.2 says "no score
 * multiplication yet", and the product path never receives a number.
 */
import { classifyScope } from "./classify.ts";
import { TYPABILITY_FEATURE_SPECS, TYPABILITY_VERSION } from "./config.ts";
import { typabilityFeatures } from "./features.ts";
import { bandForScore, distanceToBoundary, quantiseScore, weightedScore } from "./scoring.ts";
import {
  DIFFICULTY_BANDS,
  type DifficultyBand,
  type TypabilityExplanation,
  type TypabilityInput,
  type TypabilityVerdict,
} from "./types.ts";

/**
 * Coerce a declared band to the enum, case- and space-insensitively.
 *
 * The declared value comes from a human-edited markdown header, so it may be
 * "Easy", "easy " or missing. Anything unrecognised becomes null rather than a
 * guess: an unknown declared label is recorded as absent, and the computed band
 * stands on its own.
 */
export function normaliseDeclaredBand(value: unknown): DifficultyBand | null {
  const band = String(value ?? "")
    .trim()
    .toLowerCase();
  return (DIFFICULTY_BANDS as ReadonlyArray<string>).includes(band)
    ? (band as DifficultyBand)
    : null;
}

/**
 * The verdict for one item: a band label, or an explicit reason for having none.
 *
 * `declaredBand` is echoed back verbatim (normalised) but never used as the
 * answer. A source document's own "Difficulty: Easy" is an unreviewed authoring
 * claim, and preferring it over the computed band would mean CNT-02 had no
 * effect on the 333 items that already carry one; preferring it the other way
 * (declared always wins) would mean a stale header silently overrides the model.
 * The computed band is shown, and `declaredBandAgrees` records whether the two
 * happened to match - which is a quality signal about the corpus, reported by
 * `scripts/check-typability.mjs`.
 */
export function typabilityBand(input: TypabilityInput): TypabilityVerdict {
  const declaredBand = normaliseDeclaredBand(input.declaredBand);
  const scope = classifyScope(input);
  if (!scope.inScope) {
    return {
      band: null,
      reason: scope.reason,
      declaredBand,
      declaredBandAgrees: null,
      source: "unbanded",
      modelVersion: TYPABILITY_VERSION,
    };
  }
  const features = typabilityFeatures(input.text);
  const band = bandForScore(quantiseScore(scoreFor(features)));
  return {
    band,
    reason: null,
    declaredBand,
    declaredBandAgrees: declaredBand === null ? null : declaredBand === band,
    source: "computed",
    modelVersion: TYPABILITY_VERSION,
  };
}

/**
 * The audit explanation. Carries the score; intended for humans and for the
 * calibration report, never for a speed calculation.
 */
export function explainTypabilityBand(input: TypabilityInput): TypabilityExplanation {
  const features = typabilityFeatures(input.text);
  const verdict = typabilityBand(input);
  const score = scoreFor(features);
  const quantisedScore = quantiseScore(score);
  return {
    ...verdict,
    features,
    score,
    quantisedScore,
    distanceToBoundary: distanceToBoundary(quantisedScore),
  };
}

/** The weighted 0-100 score for an already-computed feature vector. */
function scoreFor(features: ReturnType<typeof typabilityFeatures>): number {
  return weightedScore(
    features.features.map((feature) => feature.component),
    TYPABILITY_FEATURE_SPECS.map((spec) => spec.weight),
  );
}
