import { describe, expect, it } from "vitest";

import { computeFromEvents, computeResult } from "../src/index";

import { runFixture } from "./fixture-runner.js";

import * as mod from "../fixtures/e-autoinsert.js";

// ENG-FIXTURE-E-AUTOINSERT-auto-pair-excluded-from-counts: the app's
// auto-paired bracket lands in the text but in no typed count. Expected
// values are hand-computed in the fixture's own doc comment.
runFixture(mod);

describe("ENG-FIXTURE-E-AUTOINSERT pins", () => {
  it("keeps the auto character in the final text", () => {
    const { finalText } = computeResult(mod.log, mod.text);
    expect(finalText).toBe("ab()");
  });

  it("excludes the auto press from every typed count", () => {
    const result = computeFromEvents("ab()", mod.log.events, "free");
    // Three typed presses; the auto bracket is text, not an attempt.
    expect(result.details.printableKeystrokes).toBe(3);
    expect(result.details.totalAttempts).toBe(3);
    expect(result.details.autoInserts).toBe(1);
    // KSPC 0.75: three keystrokes produced four characters.
    expect(result.summary.kspc).toBeCloseTo(0.75, 9);
  });

  it("scores the same log identically with the auto press removed from the text", () => {
    // Dropping the auto event loses the bracket from the text but must not
    // move any typed count: the auto press was never counted anywhere.
    const typedOnly = mod.log.events.filter((e) => !e.auto);
    const result = computeFromEvents("ab(", typedOnly, "free");
    expect(result.finalText).toBe("ab(");
    expect(result.details.printableKeystrokes).toBe(3);
    expect(result.details.totalAttempts).toBe(3);
    expect(result.summary.rawWpm).toBeCloseTo(36.0, 9);
  });
});
