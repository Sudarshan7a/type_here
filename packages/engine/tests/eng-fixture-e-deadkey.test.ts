import { describe, expect, it } from "vitest";

import { filterEvents, isScoringPress } from "../src/index.js";

import * as mod from "../fixtures/e-deadkey.js";
import { runFixture } from "./fixture-runner.js";

// Named fixture test: the chapter-4 deep-dive fixture id is carried by the
// fixture module (ENG-FIXTURE-*-*). Expected values are recomputed
// independently — see fixtures/PROVENANCE.md.
runFixture(mod);

describe(`${mod.FIXTURE_ID} input semantics (ENG-06 E5 + IME guard)`, () => {
  it("sorts every event into the documented bucket", () => {
    const filtered = filterEvents(mod.log.events);
    expect(filtered.scoringPresses.map((e) => e.key)).toEqual([
      "n",
      "a",
      "ï",
      "v",
      "e",
      " ",
      "c",
      "a",
      "f",
      "é",
    ]);
    expect(filtered.deadKeys.map((e) => e.t)).toEqual([1300, 4900]);
    expect(filtered.compositionDrops.map((e) => e.key)).toEqual(["i", "ï", "e", "é", "Backspace"]);
    // Escape (cancel) and the empty commit: captured but unscored.
    expect(filtered.ignored.map((e) => e.key)).toEqual(["Escape", ""]);
  });

  it("never treats a dead key or a composition partial as a scoring press", () => {
    const filtered = filterEvents(mod.log.events);
    for (const dead of filtered.deadKeys) expect(isScoringPress(dead)).toBe(false);
    for (const partial of filtered.compositionDrops) expect(isScoringPress(partial)).toBe(false);
  });

  it("starts the clock at the first scoring press, not at the t=0 partial", () => {
    const filtered = filterEvents(mod.log.events);
    expect(filtered.scoringPresses[0]!.t).toBe(500);
    expect(filtered.scoringPresses[filtered.scoringPresses.length - 1]!.t).toBe(4500);
  });
});
