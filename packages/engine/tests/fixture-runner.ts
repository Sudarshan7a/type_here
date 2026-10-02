import { describe, expect, it } from "vitest";

import { InputLogSchema, type InputLog, type TypingText } from "@realtype/schemas";

import { computeResult, ENGINE_MODEL_VERSION } from "../src/index";
import type { FixtureExpectation } from "../fixtures/helpers.js";
import { expectSummaryMatches } from "./compare.js";

/**
 * A chapter-4 fixture module (pure data + independently recomputed
 * expectations — see fixtures/PROVENANCE.md).
 */
export interface FixtureModule {
  FIXTURE_ID: string;
  log: InputLog;
  text: TypingText;
  expected: FixtureExpectation;
}

/**
 * Shared runner for the ENG-FIXTURE-* tests (E1): every fixture log must
 * validate against InputLogSchema, every computed summary against
 * ResultSummarySchema, and every expected value must match the values
 * recomputed by fixtures/recompute.mjs.
 */
export function runFixture(mod: FixtureModule): void {
  describe(mod.FIXTURE_ID, () => {
    it("validates against InputLogSchema", () => {
      const parsed = InputLogSchema.parse(mod.log);
      expect(parsed.events.length).toBeGreaterThan(0);
      expect(parsed.meta.mode).toBe("classic");
    });

    it(`computes the independently recomputed expected metrics (${mod.expected.notes[0]})`, () => {
      const { summary, details } = computeResult(mod.log, mod.text);

      expect(() => InputLogSchema.parse(mod.log)).not.toThrow();
      expectSummaryMatches(summary, mod.expected.summary, mod.expected.tolerance);

      for (const [key, value] of Object.entries(mod.expected.details ?? {})) {
        const actual = (details as unknown as Record<string, number | undefined>)[key];
        expect(actual, `details.${key}`).toBeDefined();
        expect(
          Math.abs((actual ?? Number.NaN) - value) <= 1e-6,
          `details.${key}: ${actual} vs ${value}`,
        ).toBe(true);
      }

      // The stamp is checked against the constant, not a second literal: a
      // hand-written copy of a version string is a thing that has already drifted
      // once in this repository (see packages/telemetry enum-drift).
      expect(summary.modelVersion).toBe(ENGINE_MODEL_VERSION);
      expect(mod.expected.summary.modelVersion).toBe(ENGINE_MODEL_VERSION);
    });
  });
}
