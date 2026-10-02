import { describe, expect, it } from "vitest";

import { computeFromEvents, computeResult } from "../src/index";
import { keyDown, keyUp } from "../fixtures/helpers.js";

import { runFixture } from "./fixture-runner.js";

import * as mod from "../fixtures/d03.js";

// ENG-FIXTURE-D03-no-backspace-ignored: Backspace is not a key in exam mode.
// Expected values are recomputed independently in the fixture's own doc
// comment — see fixtures/PROVENANCE.md.
runFixture(mod);

describe("ENG-FIXTURE-D03-no-backspace-ignored pins", () => {
  it("replays to the pinned final text with the error kept", () => {
    const { finalText } = computeResult(mod.log, mod.text);
    // The wrong `x` stays: no-backspace has no correction path, and the two
    // Backspace attempts were ignored rather than applied.
    expect(finalText).toBe("the xat sat");
  });

  it("zero scoring presses do not crash (a lone stray keyup)", () => {
    const result = computeFromEvents("the cat sat", [keyUp("z", 100)], "no-backspace");
    expect(result.details.durationMs).toBe(0);
    expect(result.finalText).toBe("");
    expect(result.summary.ikiMeanMs).toBeNull();
    expect(result.summary.consistency).toBeNull();
    for (const key of ["rawWpm", "grossWpm", "netWpm", "kspc"] as const) {
      expect(Number.isFinite(result.summary[key]), `${key} must stay finite`).toBe(true);
    }
  });

  it("a single keystroke is stable and does not divide by zero", () => {
    const result = computeFromEvents("the cat sat", [keyDown("t", 0)], "no-backspace");
    expect(result.finalText).toBe("t");
    expect(result.details.durationMs).toBe(0);
    expect(result.summary.netWpm).toBe(0);
    expect(Number.isFinite(result.summary.rawWpm)).toBe(true);
  });
});
