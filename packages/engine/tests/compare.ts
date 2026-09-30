import { expect } from "vitest";

import type { ResultSummary } from "@realtype/schemas";

import type { FixtureExpectation } from "../fixtures/helpers.js";

/**
 * Compare a computed summary against a fixture's expected block. Floats with
 * the fixture's absolute tolerance; nulls and enum-ish fields exactly.
 */
export function expectSummaryMatches(
  actual: ResultSummary,
  expected: FixtureExpectation["summary"],
  tolerance: number,
): void {
  expect(actual.modelVersion).toBe(expected.modelVersion);
  expect(actual.difficultyBand).toBe(expected.difficultyBand);
  expect(actual.verified).toBe(expected.verified);
  expect(actual.flags).toEqual(expected.flags);

  const nullableNumericKeys = ["consistency", "ikiMeanMs"] as const;
  for (const key of nullableNumericKeys) {
    const want = expected[key];
    if (want === null) {
      expect(actual[key], `${key}: expected null`).toBeNull();
    } else {
      expect(
        Math.abs((actual[key] as number) - want),
        `${key}: ${actual[key]} vs ${want}`,
      ).toBeLessThanOrEqual(tolerance);
    }
  }

  const numericKeys = [
    "rawWpm",
    "grossWpm",
    "netWpm",
    "keystrokeAccuracy",
    "finalAccuracy",
    "kspc",
    "rolloverRatio",
    "burstWpm",
  ] as const;
  for (const key of numericKeys) {
    expect(
      Math.abs(actual[key] - expected[key]),
      `${key}: ${actual[key]} vs ${expected[key]}`,
    ).toBeLessThanOrEqual(tolerance);
  }
}
