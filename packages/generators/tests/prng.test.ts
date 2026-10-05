/**
 * PRNG tests (CNT-05). Two jobs: prove the published-algorithm vectors still hold, and
 * prove that the *sequence itself* is frozen, because stored drills are re-generated
 * from their seed and a silent change to the generator would rewrite history.
 */

import { describe, expect, it } from "vitest";

import { SeededRng, deriveSeed, fnv1a32 } from "../src/index";

describe("CNT-05 PRNG", () => {
  it("matches the published FNV-1a 32-bit vectors, so the string-seed hash has not drifted", () => {
    // Fowler-Noll-Vo test vectors. If these change, `seed: "some-id"` no longer maps to
    // the stream it used to, and every stored drill generated from a string seed is
    // silently un-reproducible.
    expect(fnv1a32("")).toBe(0x811c9dc5);
    expect(fnv1a32("a")).toBe(0xe40c292c);
    expect(fnv1a32("foobar")).toBe(0xbf9cf968);
  });

  it("pins the draw sequence for a known seed, so a generator change cannot pass unnoticed", () => {
    // Frozen on purpose. Changing these numbers is a content-version change
    // (GENERATORS_VERSION), not a refactor: it changes what a stored seed produces.
    const rng = new SeededRng(1);
    expect([rng.float(), rng.float(), rng.float()]).toEqual([
      0.15070555242709816, 0.16780947777442634, 0.6835320217069238,
    ]);
    expect(new SeededRng(1).seed).toBe(1);
    expect(new SeededRng("some-daily-id").seed).toBe(fnv1a32("some-daily-id"));
  });

  it("draws floats in [0, 1) only", () => {
    const rng = new SeededRng("range-check");
    for (let draw = 0; draw < 5000; draw += 1) {
      const value = rng.float();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("respects inclusive integer bounds and returns both ends", () => {
    const rng = new SeededRng(7);
    const seen = new Set<number>();
    for (let draw = 0; draw < 2000; draw += 1) {
      const value = rng.int(3, 6);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(6);
      seen.add(value);
    }
    // A range that silently excluded an end would still pass the bounds assertions.
    expect([...seen].sort()).toEqual([3, 4, 5, 6]);
    expect(rng.int(5, 5)).toBe(5);
  });

  it("refuses an impossible or fractional range rather than returning NaN", () => {
    const rng = new SeededRng(1);
    // Failing direction: these are the calls whose return value used to be NaN, and a
    // NaN in drill text is invisible until it is on a user's screen.
    expect(() => rng.int(5, 1)).toThrow(RangeError);
    expect(() => rng.int(0, 2.5)).toThrow(RangeError);
    expect(() => rng.pick([])).toThrow(RangeError);
    expect(() => rng.fromAlphabet("", 3)).toThrow(RangeError);
  });

  it("normalises seeds to uint32 instead of producing a degenerate stream", () => {
    expect(new SeededRng(2 ** 32 + 5).seed).toBe(5);
    expect(new SeededRng(-1).seed).toBe(0xffffffff);
    expect(new SeededRng(1.9).seed).toBe(1);
    expect(new SeededRng(Number.NaN).seed).toBe(0);
    expect(Number.isNaN(new SeededRng(Number.NaN).float())).toBe(false);
  });

  it("shuffles deterministically and without touching the input", () => {
    const source = [1, 2, 3, 4, 5, 6, 7, 8];
    const frozen = Object.freeze([...source]);
    const first = new SeededRng("shuffle").shuffle(frozen);
    const second = new SeededRng("shuffle").shuffle(frozen);
    expect(first).toEqual(second);
    expect(frozen).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...first].sort((a, b) => a - b)).toEqual(source);
  });

  it("derives independent streams per label and index", () => {
    expect(deriveSeed(1, "ids", 0)).toBe(deriveSeed(1, "ids", 0));
    // Failing direction: if the family label or the index were ignored, every item in
    // a set would be the same item and "deterministic" would be indistinguishable from
    // "constant".
    expect(deriveSeed(1, "ids", 0)).not.toBe(deriveSeed(1, "numbers", 0));
    expect(deriveSeed(1, "ids", 0)).not.toBe(deriveSeed(1, "ids", 1));
    expect(deriveSeed(1, "ids", 0)).not.toBe(deriveSeed(2, "ids", 0));
  });

  it("treats a numeric and a string seed as different keys", () => {
    expect(new SeededRng(7).seed).not.toBe(new SeededRng("7").seed);
  });
});
