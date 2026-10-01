import { describe, expect, it } from "vitest";

import { computeFromEvents } from "../src/index";
import { deriveCharStates } from "../src/char-states";
import { keyDown, keyUp } from "../fixtures/helpers.js";

/**
 * Character states for the typing surface (master spec ENG-03, chapter 4 §4.4).
 *
 * The five states the spec names are correct / incorrect / extra / missed, plus
 * the "not reached yet" state a live surface needs while a test is running. The
 * derivation lives in packages/engine, not in the view, for two reasons: the view
 * must not re-implement the text model's decisions (AGENTS.md rule 3), and the
 * weakness model and the replay viewer will need exactly the same classification.
 */

describe("deriveCharStates — the five character states", () => {
  it("reports every character as untyped before anything is typed", () => {
    const states = deriveCharStates("cat", [], { finished: false });
    expect(states).toEqual(["untyped", "untyped", "untyped"]);
  });

  it("marks a matching character correct and a differing one incorrect", () => {
    expect(deriveCharStates("cat", ["c", "a"], { finished: false })).toEqual([
      "correct",
      "correct",
      "untyped",
    ]);
    // "Xat" typed against "cat": position 0 wrong, 1 and 2 still to come.
    expect(deriveCharStates("cat", ["X"], { finished: false })).toEqual([
      "incorrect",
      "untyped",
      "untyped",
    ]);
  });

  it("labels characters typed past the end of the target as extra (chapter 4 E2)", () => {
    // target "cat", typed "catt": the fourth `t` has no target position, so it is
    // an extra character rather than an error against position 3.
    const states = deriveCharStates("cat", ["c", "a", "t", "t"], { finished: false });
    expect(states).toEqual(["correct", "correct", "correct", "extra"]);
  });

  it("calls an untyped character missed only once the attempt is over", () => {
    // Mid-test the same buffer is "untyped", not "missed": nothing is known yet.
    expect(deriveCharStates("cat", ["c"], { finished: false })).toEqual([
      "correct",
      "untyped",
      "untyped",
    ]);
    // At the end, the two characters the user never produced are missed.
    expect(deriveCharStates("cat", ["c"], { finished: true })).toEqual([
      "correct",
      "missed",
      "missed",
    ]);
  });

  it("reports no missed characters for a fully typed target", () => {
    expect(deriveCharStates("cat", ["c", "a", "t"], { finished: true })).toEqual([
      "correct",
      "correct",
      "correct",
    ]);
  });

  it("renders one entry per visible character: the target plus any extras", () => {
    expect(deriveCharStates("cat", [], { finished: true })).toHaveLength(3);
    expect(deriveCharStates("cat", ["c", "a", "t", "x", "y"], { finished: true })).toHaveLength(5);
  });

  it("handles a Backspace: the character it removed goes back to untyped", () => {
    // "ca" typed, then Backspace pops the `a`, so position 1 is untyped again and
    // a later finish must call it missed, not incorrect.
    expect(deriveCharStates("cat", ["c"], { finished: false })).toEqual([
      "correct",
      "untyped",
      "untyped",
    ]);
    expect(deriveCharStates("cat", ["c"], { finished: true })).toEqual([
      "correct",
      "missed",
      "missed",
    ]);
  });

  it("treats an empty target as an empty surface rather than throwing", () => {
    expect(deriveCharStates("", [], { finished: false })).toEqual([]);
    expect(deriveCharStates("", ["x"], { finished: false })).toEqual(["extra"]);
  });

  it("counts spaces as characters", () => {
    expect(deriveCharStates("a b", ["a", " ", "b"], { finished: true })).toEqual([
      "correct",
      "correct",
      "correct",
    ]);
  });

  it("handles multi-byte characters without splitting them into broken halves", () => {
    // "é" is one character to the user. The surface must render one entry, not
    // two surrogates (chapter 4 E6, MVP grapheme handling).
    const states = deriveCharStates("é", ["é"], { finished: true });
    expect(states).toEqual(["correct"]);
  });

  it("counts a character the user produced but that differs by case as incorrect", () => {
    expect(deriveCharStates("Cat", ["c"], { finished: true })).toEqual([
      "incorrect",
      "missed",
      "missed",
    ]);
  });

  it("agrees with the engine: correct states match correctCharsInFinalText", () => {
    // The surface must not be able to paint a character correct that the engine
    // counts wrong. Both read the same positional text model, and this pins it.
    const target = "the cat sat";
    const typed = ["t", "h", "X", " ", "c", "a", "t"];
    const result = computeFromEvents(
      target,
      [...typed.map((k, i) => keyDown(k, i * 100)), ...typed.map((k, i) => keyUp(k, i * 100 + 40))],
      "free",
    );
    const states = deriveCharStates(target, typed, { finished: false });
    const paintedCorrect = states.filter((s) => s === "correct").length;
    expect(paintedCorrect).toBe(result.details.correctCharsInFinalText);
  });
});
