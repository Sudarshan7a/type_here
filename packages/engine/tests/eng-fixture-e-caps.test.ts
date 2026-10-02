import { describe, expect, it } from "vitest";

import { filterEvents } from "../src/index.js";

import * as mod from "../fixtures/e-caps.js";
import { runFixture } from "./fixture-runner.js";

// Named fixture test: the chapter-4 deep-dive fixture id is carried by the
// fixture module (ENG-FIXTURE-*-*). Expected values are recomputed
// independently — see fixtures/PROVENANCE.md.
runFixture(mod);

describe(`${mod.FIXTURE_ID} input semantics (ENG-06 E3)`, () => {
  it("attributes both capitals to their physical keys via event.code", () => {
    const filtered = filterEvents(mod.log.events);
    expect(filtered.scoringPresses.map((e) => e.code)).toEqual([
      "KeyA",
      "KeyB",
      "Space",
      "Digit1",
      "Digit2",
    ]);
  });

  it("flags exactly the two letters as case-only substitutions", () => {
    // Subtype rule (fixture doc comment): typed and intended differ by case
    // alone AND the code is the intended letter's physical key.
    const units = [...mod.targetText];
    expect(units).toHaveLength(5);
    const caseErrors = [0, 1].map((i) => ({
      intended: units[i]!,
      typed: mod.log.events.filter((e) => e.type === "down")[i]!.key,
      code: mod.log.events.filter((e) => e.type === "down")[i]!.code,
    }));
    for (const { intended, typed, code } of caseErrors) {
      expect(typed.toLowerCase()).toBe(intended);
      expect(typed).not.toBe(intended);
      expect(code).toBe(`Key${intended.toUpperCase()}`);
    }
  });
});
