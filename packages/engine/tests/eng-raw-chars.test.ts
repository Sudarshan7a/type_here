import { describe, expect, it } from "vitest";

import { computeFromEvents } from "../src/index";
import { keyDown } from "../fixtures/helpers.js";

/**
 * ENG-10: raw characters preserved — no smart quotes/dash folding,
 * no autocorrect-style correction, no case folding.
 *
 * The engine compares the produced `key` to the target grapheme with strict
 * equality and nothing else. These tests pin that no transformation hides in
 * the scoring path: what the keyboard produced is what gets scored.
 */

function press(key: string, t: number, code = "KeyX") {
  return keyDown(key, t, { code });
}

describe("ENG-10 raw characters preserved", () => {
  it("scores straight quotes exactly as typed", () => {
    const events = [press('"', 0, "Digit2"), press("a", 400, "KeyA")];
    const result = computeFromEvents('"a', events, "free");
    expect(result.finalText).toBe('"a');
    expect(result.summary.keystrokeAccuracy).toBe(100);
  });

  it("does not fold curly quotes onto straight ones", () => {
    // A curly open-quote against a straight-quote target is a substitution,
    // not a match: the engine performs no smart-quote folding.
    const events = [press("“", 0, "BracketLeft")];
    const result = computeFromEvents('"', events, "free");
    expect(result.finalText).toBe("“");
    expect(result.summary.keystrokeAccuracy).toBe(0);
  });

  it("does not fold em-dashes onto hyphens (or the reverse)", () => {
    const emDash = computeFromEvents("—", [press("—", 0, "Minus")], "free");
    expect(emDash.summary.keystrokeAccuracy).toBe(100);
    const hyphenForEm = computeFromEvents("—", [press("-", 0, "Minus")], "free");
    expect(hyphenForEm.summary.keystrokeAccuracy).toBe(0);
  });

  it("preserves case exactly: capitals are not lowered, lowers not raised", () => {
    const upper = computeFromEvents("Ab", [press("A", 0), press("b", 400)], "free");
    expect(upper.summary.keystrokeAccuracy).toBe(100);
    // A lowercase press against a capital target is an error, not an
    // autocorrect: nothing repairs it.
    const lowered = computeFromEvents("Ab", [press("a", 0), press("b", 400)], "free");
    expect(lowered.summary.keystrokeAccuracy).toBe(50);
    expect(lowered.finalText).toBe("ab");
  });

  it("scores apostrophes verbatim, straight only", () => {
    const straight = computeFromEvents(
      "it's",
      [press("i", 0), press("t", 200), press("'", 400), press("s", 600)],
      "free",
    );
    expect(straight.summary.keystrokeAccuracy).toBe(100);
    const curly = computeFromEvents(
      "it's",
      [press("i", 0), press("t", 200), press("’", 400), press("s", 600)],
      "free",
    );
    expect(curly.summary.keystrokeAccuracy).toBe(75);
  });
});
