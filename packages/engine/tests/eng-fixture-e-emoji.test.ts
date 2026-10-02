import { describe, expect, it } from "vitest";

import {
  charStatesForModel,
  correctStateCount,
  createTextModel,
  applyPress,
  filterEvents,
  segmentGraphemes,
} from "../src/index.js";

import * as mod from "../fixtures/e-emoji.js";
import { runFixture } from "./fixture-runner.js";

// Named fixture test: the chapter-4 deep-dive fixture id is carried by the
// fixture module (ENG-FIXTURE-*-*). Expected values are recomputed
// independently — see fixtures/PROVENANCE.md.
runFixture(mod);

describe(`${mod.FIXTURE_ID} input semantics (ENG-06 E6)`, () => {
  it("segments the target into 5 graphemes, not 15 UTF-16 units", () => {
    expect(segmentGraphemes(mod.targetText)).toEqual(["o", "k", " ", "👨‍👩‍👧‍👦", "!"]);
  });

  it("paints one state per grapheme, all correct at the end", () => {
    const model = createTextModel(mod.targetText, "free");
    for (const press of filterEvents(mod.log.events).textAffecting) applyPress(model, press);
    expect(charStatesForModel(model, { finished: true })).toEqual([
      "correct",
      "correct",
      "correct",
      "correct",
      "correct",
    ]);
    // The surface invariant: painted-correct equals engine-counted-correct.
    expect(correctStateCount(model, { finished: true })).toBe(5);
  });

  it("scores the piecemeal emoji part wrong and the whole sequence right", () => {
    const model = createTextModel(mod.targetText, "free");
    for (const press of filterEvents(mod.log.events).textAffecting) applyPress(model, press);
    // The wrong part was corrected, so the inserts hold exactly one error.
    expect(model.inserts.filter((i) => !i.correct).map((i) => i.key)).toEqual(["👨"]);
    expect(model.buffer.join("")).toBe(mod.targetText);
  });
});
