/**
 * Determinism tests (CNT-05, the row's own acceptance criterion: "deterministic per
 * seed"). These are the tests the skill asks for - same seed -> identical output,
 * different seeds -> different output - plus the per-item-stream property that makes a
 * drill able to ask for one item without generating the rest.
 */

import { describe, expect, it } from "vitest";

import { GENERATOR_FAMILIES, generate, type GenerateOptions } from "../src/index";

const FAMILIES = GENERATOR_FAMILIES;

function textOf(options: GenerateOptions): string[] {
  return generate(options).items.map((item) => item.text);
}

describe("CNT-05 determinism", () => {
  it("produces byte-identical items for the same seed and options", () => {
    for (const family of FAMILIES) {
      for (const level of [1, 3, 5]) {
        const options: GenerateOptions = { seed: "determinism", family, count: 25, level };
        expect(generate(options)).toEqual(generate(options));
      }
    }
  });

  it("changes the output when the seed changes, for every family", () => {
    for (const family of FAMILIES) {
      const first = textOf({ seed: 1, family, count: 25, level: 5 });
      const second = textOf({ seed: 2, family, count: 25, level: 5 });
      expect(first).not.toEqual(second);
    }
  });

  it("changes the output when the seed is a different string of the same length", () => {
    for (const family of FAMILIES) {
      expect(textOf({ seed: "alpha", family, count: 20, level: 5 })).not.toEqual(
        textOf({ seed: "bravo", family, count: 20, level: 5 }),
      );
    }
  });

  it("gives item i the same value regardless of how many items were requested", () => {
    // The reason item streams are derived per index: a drill that re-renders, retries or
    // asks for "the seventh item" must get the seventh item it showed last time.
    for (const family of FAMILIES) {
      const short = textOf({ seed: 5, family, count: 3, level: 4 });
      const long = textOf({ seed: 5, family, count: 40, level: 4 });
      expect(long.slice(0, 3)).toEqual(short);
    }
  });

  it("gives the same items when the level changes but the form and defaults are pinned", () => {
    // Level only chooses the form *pool* (and the magnitude a level implies, which is
    // why `magnitude` is pinned here too). It must not otherwise become a hidden input
    // to every literal, or "the same seed" would depend on how the drill asked for it.
    const pinned: GenerateOptions[] = [
      { seed: 11, family: "numbers", form: "integer", magnitude: 4, count: 5 },
      { seed: 11, family: "ids", form: "uuid", count: 5 },
      { seed: 11, family: "naming", style: "snake", wordCount: 2, count: 5 },
      { seed: 11, family: "brackets", shape: "pairs", count: 5 },
      { seed: 11, family: "strings", form: "quoted", count: 5 },
    ];
    for (const options of pinned) {
      expect(textOf({ ...options, level: 1 })).toEqual(textOf({ ...options, level: 5 }));
    }
  });

  it("lets the level change the form pool, which is the only way it changes output", () => {
    // Failing direction for the test above: if the level were ignored entirely, the two
    // expectations would hold trivially. Level 1 draws integers only.
    const easy = generate({ seed: 11, family: "numbers", count: 20, level: 1 });
    expect(easy.items.every((item) => item.params.form === "integer")).toBe(true);
    const hard = generate({ seed: 11, family: "numbers", count: 40, level: 5 });
    expect(new Set(hard.items.map((item) => item.params.form)).size).toBeGreaterThan(1);
  });

  it("records the version, seed, family, language and level on the set", () => {
    const set = generate({ seed: 3, family: "ids", count: 4, level: 2, language: "python" });
    expect(set).toMatchObject({
      version: "0.0.1",
      family: "ids",
      seed: 3,
      language: "python",
      level: 2,
      count: 4,
    });
    expect(set.items).toHaveLength(4);
    expect(set.items.every((item) => item.language === "python")).toBe(true);
  });

  it("clamps a hostile level and count instead of throwing or going negative", () => {
    const set = generate({ seed: 1, family: "numbers", count: -5, level: 99 });
    expect(set.count).toBe(1);
    expect(set.level).toBe(5);
    expect(set.items).toHaveLength(1);
    expect(generate({ seed: 1, family: "numbers" }).count).toBe(10);
    expect(generate({ seed: 1, family: "numbers" }).level).toBe(1);
    // A non-finite level or count is a bad row in a level table, not a crash: it eases
    // off to the easiest setting rather than taking the drill down.
    const nan = generate({ seed: 1, family: "numbers", count: Number.NaN, level: Number.NaN });
    expect(nan.count).toBe(10);
    expect(nan.level).toBe(1);
    expect(nan.items).toHaveLength(10);
  });

  it("accepts a list of forms as well as a single one", () => {
    const items = generate({
      seed: "many-forms",
      family: "numbers",
      form: ["hex", "octal"],
      count: 40,
    });
    expect(new Set(items.items.map((item) => item.params.form))).toEqual(new Set(["hex", "octal"]));
    const styles = generate({
      seed: "many-styles",
      family: "naming",
      style: ["snake", "camel"],
      count: 40,
    });
    expect(new Set(styles.items.map((item) => item.params.style))).toEqual(
      new Set(["snake", "camel"]),
    );
  });

  it("resolves an unknown skin to the engine's generic profile rather than throwing", () => {
    const set = generate({ seed: 1, family: "brackets", count: 3, language: "klingon" });
    expect(set.language).toBe("generic");
    expect(set.items.every((item) => item.language === "generic")).toBe(true);
  });
});
