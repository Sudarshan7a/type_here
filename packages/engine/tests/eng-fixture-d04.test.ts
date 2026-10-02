import { describe, expect, it } from "vitest";

import { computeFromEvents, computeResult } from "../src/index";
import { keyDown, keyUp } from "../fixtures/helpers.js";

import { runFixture } from "./fixture-runner.js";

import * as mod from "../fixtures/d04.js";

// ENG-FIXTURE-D04-word-locked-boundary-hold: the caret cannot leave a word
// until the word is correct; corrections within the word are allowed.
// Expected values are recomputed independently in the fixture's own doc
// comment — see fixtures/PROVENANCE.md.
runFixture(mod);

describe("ENG-FIXTURE-D04-word-locked-boundary-hold pins", () => {
  it("replays to the pinned final text, corrected clean", () => {
    const { finalText } = computeResult(mod.log, mod.text);
    // The boundary hold forced the correction, so the finished text is clean
    // even though the log holds 3 refused presses and 2 wrong inserts.
    expect(finalText).toBe("the cat sat");
  });

  it("zero scoring presses do not crash (a lone stray keyup)", () => {
    const result = computeFromEvents("the cat sat", [keyUp("z", 100)], "word-locked");
    expect(result.details.durationMs).toBe(0);
    expect(result.finalText).toBe("");
    expect(result.summary.ikiMeanMs).toBeNull();
    expect(result.summary.consistency).toBeNull();
    for (const key of ["rawWpm", "grossWpm", "netWpm", "kspc"] as const) {
      expect(Number.isFinite(result.summary[key]), `${key} must stay finite`).toBe(true);
    }
  });

  it("a single wrong keystroke is kept mid-word and scores 0% accuracy", () => {
    // Word-locked never rejects a mid-word press: the typo is visible, and a
    // one-press test is degenerate but must stay finite.
    const result = computeFromEvents("the cat sat", [keyDown("x", 0)], "word-locked");
    expect(result.finalText).toBe("x");
    expect(result.summary.keystrokeAccuracy).toBe(0);
    expect(result.summary.finalAccuracy).toBe(0);
    expect(result.summary.netWpm).toBe(0);
  });
});
