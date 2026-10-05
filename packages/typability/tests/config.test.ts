/**
 * Model-config consistency (CNT-02).
 *
 * The failure this file exists to prevent: a feature name in `RawTypabilityFeatures`
 * that the config does not declare. Such a feature scores as `undefined`, which the
 * weighted mean silently treats as zero - so the item gets a lower score, a real
 * band flip for 704 corpus items, and nothing anywhere says why.
 *
 * It also pins the anchor ordering, because "anchors are [hardest, easiest]" is a
 * convention and a convention that is easy to invert is a convention that will be:
 * five of the thirteen anchors were inverted during this build and the symptom was
 * a corpus where every single item banded "hard".
 */
import { describe, expect, it } from "vitest";

import {
  BAND_BOUNDARIES,
  RAW_FEATURE_NAMES,
  SCOPE_CEILINGS,
  TYPABILITY_FEATURE_SPECS,
  TOTAL_FEATURE_WEIGHT,
  normaliseFeature,
  typabilityFeatureNames,
  typabilityFeatures,
} from "../src/index.ts";
import { weightedScore } from "../src/scoring.ts";

describe("CNT-02 model config consistency", () => {
  it("declares exactly the features the extractor produces, no more and no fewer", () => {
    expect([...typabilityFeatureNames()]).toEqual([...RAW_FEATURE_NAMES]);
    expect([...typabilityFeatureNames()]).toEqual(
      TYPABILITY_FEATURE_SPECS.map((spec) => spec.name),
    );
    expect(new Set(typabilityFeatureNames()).size).toBe(typabilityFeatureNames().length);
  });

  it("gives every declared feature a finite raw value and a component in 0-1", () => {
    const vectors = [
      "the cat sat on the mat",
      "Can you pick up milk on your way home? We're also out of bread.",
      "MEETING AGENDA 2026 $412.50 (KPJ/LMN) <<< >>>",
      "a",
      "",
      "12345 !!!",
    ];
    for (const text of vectors) {
      const features = typabilityFeatures(text);
      expect(features.features).toHaveLength(TYPABILITY_FEATURE_SPECS.length);
      for (const [index, feature] of features.features.entries()) {
        expect(feature.name).toBe(TYPABILITY_FEATURE_SPECS[index]!.name);
        expect(Number.isFinite(feature.raw)).toBe(true);
        expect(feature.component).toBeGreaterThanOrEqual(0);
        expect(feature.component).toBeLessThanOrEqual(1);
      }
    }
  });

  it("orders every anchor pair from the hard end to the easy end", () => {
    for (const spec of TYPABILITY_FEATURE_SPECS) {
      const [hard, easy] = spec.anchors;
      if (spec.direction === "increasing-is-easier") {
        expect(hard).toBeLessThan(easy);
      } else {
        expect(hard).toBeGreaterThan(easy);
      }
      expect(hard).not.toBe(easy);
    }
  });

  it("normalises in the direction each spec claims, with clamping at both ends", () => {
    expect(normaliseFeature(0.5, [0, 1], "increasing-is-easier")).toBe(0.5);
    expect(normaliseFeature(0.5, [1, 0], "decreasing-is-easier")).toBe(0.5);
    expect(normaliseFeature(-3, [0, 1], "increasing-is-easier")).toBe(0);
    expect(normaliseFeature(9, [0, 1], "increasing-is-easier")).toBe(1);
    expect(normaliseFeature(9, [1, 0], "decreasing-is-easier")).toBe(0);
    expect(normaliseFeature(Number.NaN, [0, 1], "increasing-is-easier")).toBe(0);
    // A degenerate span must not divide by zero.
    expect(normaliseFeature(0.5, [1, 1], "increasing-is-easier")).toBe(0);
  });

  it("keeps both band boundaries inside the score range and ordered", () => {
    expect(BAND_BOUNDARIES.hardMin).toBeGreaterThan(0);
    expect(BAND_BOUNDARIES.typicalMax).toBeLessThan(100);
    expect(BAND_BOUNDARIES.hardMin).toBeLessThan(BAND_BOUNDARIES.typicalMax);
  });

  it("keeps the out-of-scope ceilings inside the shares they bound", () => {
    expect(SCOPE_CEILINGS.symbolShare).toBeGreaterThan(0);
    expect(SCOPE_CEILINGS.symbolShare).toBeLessThanOrEqual(1);
    expect(SCOPE_CEILINGS.digitShare).toBeGreaterThan(0);
    expect(SCOPE_CEILINGS.digitShare).toBeLessThanOrEqual(1);
    // The digit ceiling must sit above the symbol ceiling's typical prose values:
    // digits are rarer than punctuation in English prose, so refusing on digits
    // first would refuse ordinary prose.
    expect(SCOPE_CEILINGS.digitShare).toBeGreaterThan(SCOPE_CEILINGS.symbolShare);
  });

  it("sums the weights it publishes", () => {
    const sum = TYPABILITY_FEATURE_SPECS.reduce((total, spec) => total + spec.weight, 0);
    expect(sum).toBeCloseTo(TOTAL_FEATURE_WEIGHT, 10);
    expect(TOTAL_FEATURE_WEIGHT).toBe(14);
  });

  it("refuses to weight mismatched component and weight arrays, and never returns NaN", () => {
    // `weightedScore` divides by the PUBLISHED total weight, so a caller passing a
    // different number of components than the model has features would silently
    // shift every score. Length mismatch is refused rather than padded.
    expect(weightedScore([], [])).toBe(0);
    expect(weightedScore([0.5], [1, 1])).toBe(0);
    expect(weightedScore([0.5, 0.5], [1])).toBe(0);
    expect(weightedScore([Number.NaN], [1])).toBe(0);
    // Correct-length input still works, and clamps at both ends.
    expect(weightedScore([1], [1])).toBeLessThanOrEqual(100);
  });

  it("detects a feature the extractor produces but the config does not declare", () => {
    // Control: dropping a spec must be visible to the first test, or that test
    // would pass on a model that silently lost a feature.
    const withoutOne = TYPABILITY_FEATURE_SPECS.filter((spec) => spec.name !== "symbolShare");
    expect(withoutOne.map((spec) => spec.name)).not.toEqual([...RAW_FEATURE_NAMES]);
    expect(RAW_FEATURE_NAMES).toContain("symbolShare");
  });
});
