/**
 * Purity and no-mutation tests.
 *
 * Generators are pure functions of `(seed, options)`. "Pure" has two halves that are
 * usually only one half-tested: the output must not depend on hidden state (see
 * determinism.test.ts), and the generator must not reach *into* its input. The second
 * half matters here because the options and the vocabulary are shared module-level
 * arrays - a generator that sorted or spliced one would silently corrupt every later
 * call in the process, including another user's drill.
 *
 * The control at the end proves the assertions below can actually fail.
 */

import { describe, expect, it } from "vitest";

import {
  GENERATOR_FAMILIES,
  STRING_WORDS,
  TECH_WORDS,
  generate,
  renderIdentifier,
  type GenerateOptions,
} from "../src/index";

/** Recursively freeze, so a mutation inside the generator throws in strict mode. */
function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

describe("CNT-05 purity", () => {
  it("does not mutate the caller's options object", () => {
    const options: GenerateOptions[] = [
      deepFreeze({ seed: "purity", family: "numbers", count: 5, level: 3, form: "integer" }),
      deepFreeze({ seed: "purity", family: "ids", count: 5, level: 3, form: "uuid" }),
      deepFreeze({ seed: "purity", family: "naming", count: 5, level: 3, style: "snake" }),
      deepFreeze({ seed: "purity", family: "brackets", count: 5, level: 3, shape: "mixed" }),
      deepFreeze({ seed: "purity", family: "strings", count: 5, level: 3, form: "escapes" }),
    ];
    for (const given of options) {
      const before = JSON.stringify(given);
      generate(given);
      expect(JSON.stringify(given)).toBe(before);
    }
  });

  it("does not mutate the shared vocabulary", () => {
    const before = JSON.stringify([TECH_WORDS, STRING_WORDS]);
    for (const family of GENERATOR_FAMILIES) {
      generate({ seed: "vocab", family, count: 200, level: 5 });
    }
    renderIdentifier([...TECH_WORDS], "pascal");
    expect(JSON.stringify([TECH_WORDS, STRING_WORDS])).toBe(before);
    expect(Object.isFrozen(TECH_WORDS)).toBe(true);
    expect(Object.isFrozen(STRING_WORDS)).toBe(true);
  });

  it("returns items that are value-stable across calls, not shared references", () => {
    const first = generate({ seed: "refs", family: "ids", count: 5 });
    const second = generate({ seed: "refs", family: "ids", count: 5 });
    expect(first.items).toEqual(second.items);
    expect(first.items[0]).not.toBe(second.items[0]);
    // Mutating one call's result must not affect the next call: a shared module-level
    // buffer would make this fail.
    Object.assign(first.items[0]!, { text: "tampered" });
    expect(generate({ seed: "refs", family: "ids", count: 5 }).items[0]!.text).toBe(
      second.items[0]!.text,
    );
  });

  it("detects a mutation, so the assertions above are not vacuous", () => {
    // Control: the same deep-freeze-and-compare shape, applied to a function that does
    // mutate. If this did not throw, the three tests above would prove nothing.
    const mutate = (words: string[]): string[] => {
      words.sort();
      return words;
    };
    const frozen = deepFreeze(["b", "a"]);
    expect(() => mutate(frozen)).toThrow(TypeError);
  });
});
