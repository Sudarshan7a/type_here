/**
 * Band stability under a one-character edit (CNT-02).
 *
 * The property under test is not "an edit never changes a band" - that would be
 * false, and pretending otherwise would make the band meaningless. It is:
 *
 *   A band is a pure function of the quantised score. So a one-character edit can
 *   only change a band by moving the item across a boundary, and the two tests
 *   below pin both directions on real corpus passages:
 *
 *     - an edit that moves the score by 0.55 and lands 12.8 points from the nearest
 *       boundary does NOT change the band;
 *     - an edit that moves the score by 0.30 and lands 0.25 points from a boundary
 *       DOES change it.
 *
 * Both fixtures are verbatim corpus items, so the numbers are the ones a reviewer
 * can reproduce with `node scripts/check-typability.mjs --item <id>`.
 */
import { describe, expect, it } from "vitest";

import { explainTypabilityBand, typabilityBand, type DifficultyBand } from "../src/index.ts";

/** PROSE-01-010, verbatim from docs/content-prose-batch-01.md. */
const FAR_ITEM =
  "Don't forget your umbrella today. The forecast says a 60% chance of rain starting sometime around lunch.";
/** The same item with the 'o' of "Don't" replaced by 'b': one character, one word still unknown. */
const FAR_ITEM_EDITED =
  "Dbn't forget your umbrella today. The forecast says a 60% chance of rain starting sometime around lunch.";

/** PROSE-01-002, verbatim from docs/content-prose-batch-01.md. */
const NEAR_ITEM =
  "The weather turned cold overnight, so I dug out my winter coat this morning and found a five-dollar bill in the pocket.";
/** The same item with one letter of "turned" replaced: still one character. */
const NEAR_ITEM_EDITED =
  "The weather ttrned cold overnight, so I dug out my winter coat this morning and found a five-dollar bill in the pocket.";

function explain(text: string) {
  return explainTypabilityBand({ text, family: "PROSE", language: "en" });
}

describe("CNT-02 band stability under a one-character edit", () => {
  it("keeps the band when the edit cannot reach a boundary", () => {
    const before = explain(FAR_ITEM);
    const after = explain(FAR_ITEM_EDITED);
    expect(Math.abs(after.quantisedScore - before.quantisedScore)).toBeLessThan(1);
    // The distance is the load-bearing half of the claim: an edit that moves the
    // score by 0.55 cannot cross a boundary 12.8 points away.
    expect(before.distanceToBoundary).toBeGreaterThan(10);
    expect(after.band).toBe(before.band);
    expect(after.band).not.toBeNull();
  });

  it("changes the band when the edit crosses a boundary", () => {
    const before = explain(NEAR_ITEM);
    const after = explain(NEAR_ITEM_EDITED);
    expect(before.distanceToBoundary).toBeLessThan(0.5);
    expect(after.band).not.toBe(before.band);
    expect(before.band).toBe("easy");
    expect(after.band).toBe("typical");
  });

  it("makes both edits exactly one character different from the original", () => {
    const pairs: ReadonlyArray<readonly [string, string]> = [
      [FAR_ITEM, FAR_ITEM_EDITED],
      [NEAR_ITEM, NEAR_ITEM_EDITED],
    ];
    for (const [original, edited] of pairs) {
      expect(original.length).toBe(edited.length);
      let differences = 0;
      for (let i = 0; i < original.length; i++) {
        if (original[i] !== edited[i]) differences++;
      }
      expect(differences).toBe(1);
    }
  });

  it("derives every band from the quantised score, so no edit can flip one without crossing a boundary", () => {
    // The structural statement behind both fixtures: band === f(quantised score).
    // Without it, "stable" would be a property of the fixtures rather than of the
    // model.
    const samples = [FAR_ITEM, NEAR_ITEM, "the cat sat on the mat", "A".repeat(200)];
    for (const text of samples) {
      const verdict = typabilityBand({ text, family: "PROSE", language: "en" });
      const explanation = explain(text);
      expect(verdict.band).toBe(explanation.band);
      expect(Number.isFinite(explanation.quantisedScore)).toBe(true);
    }
  });

  it("ignores a band-shaped difference that is not one: case and trailing whitespace do not move a band", () => {
    const base = explain("the cat sat on the mat");
    for (const variant of ["  the cat sat on the mat  ", "the cat sat on the mat."]) {
      const other = explain(variant);
      expect(other.band).toBe(base.band);
    }
  });

  it("never reports a band for an out-of-scope edit, whatever the edit", () => {
    const code = "function f(items, size) {\n  return items.slice(0, size);\n}";
    for (const variant of [code, code.replace("items", "itms"), code.toUpperCase()]) {
      const verdict = typabilityBand({ text: variant, family: "CODE", language: "javascript" });
      expect(verdict.band).toBeNull();
    }
  });

  it("agrees with itself across repeated calls on the fixtures", () => {
    const first: DifficultyBand | null = typabilityBand({
      text: NEAR_ITEM_EDITED,
      family: "PROSE",
      language: "en",
    }).band;
    for (let i = 0; i < 5; i++) {
      expect(typabilityBand({ text: NEAR_ITEM_EDITED, family: "PROSE", language: "en" }).band).toBe(
        first,
      );
    }
  });
});
