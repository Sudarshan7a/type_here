/**
 * Resource and layout cross-checks (CNT-02).
 *
 * Two jobs:
 *
 *   1. The authored resources are what they claim to be - no duplicates, no
 *      non-letters, a bigram weight that really is monotone in rank, and a
 *      syllable counter that behaves on the cases its doc comment names.
 *   2. `QWERTY_US_RIGHT_HAND_LETTERS` is checked against the engine's own verified
 *      finger map. The constant is declared locally because the engine's sources
 *      are not loadable by `node` from source today (their internal specifiers end
 *      in `.js`), and a fork nobody checks is how two answers to one question
 *      appear. This test is the check; if the engine's map moves, it fails.
 */
import { describe, expect, it } from "vitest";

import { LAYOUT_FINGER_MAPS, type Finger } from "@realtype/engine/src/layout-fingers.js";

import {
  COMMON_WORD_COUNT,
  COMMON_WORDS,
  ENGLISH_BIGRAM_RANKS,
  HIGH_FREQUENCY_WORD_COUNT,
  HIGH_FREQUENCY_WORDS,
  QWERTY_US_RIGHT_HAND_LETTERS,
  RIGHT_HAND_FINGERS,
  UNRANKED_BIGRAM_WEIGHT,
  bigramWeight,
  countSyllables,
  isCommonWord,
  isHighFrequencyWord,
} from "../src/index.ts";

describe("CNT-02 authored resources", () => {
  it("holds letters-only word forms with no duplicates", () => {
    for (const list of [HIGH_FREQUENCY_WORDS, COMMON_WORDS]) {
      expect(list.length).toBeGreaterThan(100);
      expect(new Set(list).size).toBe(list.length);
      for (const word of list) expect(word).toMatch(/^[a-z]+$/);
      expect(Object.isFrozen(list)).toBe(true);
    }
  });

  it("contains every high-frequency word in the common list, by construction", () => {
    for (const word of HIGH_FREQUENCY_WORDS) expect(isCommonWord(word)).toBe(true);
    expect(COMMON_WORD_COUNT).toBe(COMMON_WORDS.length);
    expect(HIGH_FREQUENCY_WORD_COUNT).toBe(HIGH_FREQUENCY_WORDS.length);
    expect(HIGH_FREQUENCY_WORD_COUNT).toBeLessThan(COMMON_WORD_COUNT);
  });

  it("looks words up exactly, including the contracted forms the tokenizer strips", () => {
    expect(isHighFrequencyWord("the")).toBe(true);
    expect(isHighFrequencyWord("The")).toBe(false);
    expect(isHighFrequencyWord("")).toBe(false);
    expect(isCommonWord("zzyzxian")).toBe(false);
  });

  it("maps bigram weight monotonically down the ranked list, with the unranked floor below it", () => {
    // Two pairs that are genuinely unranked. "zz" is not, and using it here was a
    // bug this test caught: it returned the floor, so comparing it against the
    // floor was comparing 0.12 with 0.12.
    const UNRANKED = ["q", "j"];
    const first = bigramWeight("t", "h");
    const second = bigramWeight("h", "e");
    expect(first).toBeGreaterThan(second);
    expect(second).toBeGreaterThan(UNRANKED_BIGRAM_WEIGHT);
    expect(bigramWeight(UNRANKED[0]!, UNRANKED[1]!)).toBe(UNRANKED_BIGRAM_WEIGHT);
    // And a full sweep: every ranked pair outranks every unranked one.
    const ranked = ENGLISH_BIGRAM_RANKS.map((pair) => bigramWeight(pair[0]!, pair[1]!));
    expect(Math.min(...ranked)).toBeGreaterThan(UNRANKED_BIGRAM_WEIGHT);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i]!).toBeLessThan(ranked[i - 1]!);
    }
    for (const [a, b] of [
      ["t", "h"],
      ["h", "e"],
      ["q", "j"],
      ["z", "z"],
    ] as const) {
      const weight = bigramWeight(a, b);
      expect(weight).toBeGreaterThan(0);
      expect(weight).toBeLessThanOrEqual(1);
    }
  });

  it("counts syllables the way its doc comment says, including the named inaccuracies", () => {
    expect(countSyllables("")).toBe(0);
    expect(countSyllables("!!!")).toBe(0);
    expect(countSyllables("a")).toBe(1);
    expect(countSyllables("the")).toBe(1);
    expect(countSyllables("table")).toBe(2);
    expect(countSyllables("simple")).toBe(2);
    expect(countSyllables("make")).toBe(1);
    expect(countSyllables("asked")).toBe(1);
    expect(countSyllables("wanted")).toBe(2);
    expect(countSyllables("communication")).toBe(5);
    // Never less than one, whatever the input throws at it.
    expect(countSyllables("rhythms")).toBeGreaterThanOrEqual(1);
    expect(countSyllables("x")).toBe(1);
  });
});

describe("CNT-02 keyboard geometry cross-check", () => {
  const map = LAYOUT_FINGER_MAPS["qwerty-us"];

  it("matches the engine's verified QWERTY-US finger map for every letter", () => {
    const letters = "abcdefghijklmnopqrstuvwxyz".split("");
    const engineRightHand = new Set(
      letters.filter((letter) => {
        const finger = map.get(letter) as Finger | undefined;
        return finger !== undefined && RIGHT_HAND_FINGERS.includes(finger);
      }),
    );
    expect(engineRightHand).toEqual(QWERTY_US_RIGHT_HAND_LETTERS);
  });

  it("names the columns the derivation claims: 5-9 of the ten-column letter block", () => {
    // The comment in resources/layout.ts lists the right-hand letters per row. If
    // the constant and that derivation ever disagree, this is what says so.
    const byRow = [
      ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
      ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"],
      ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"],
    ];
    const derived = new Set(byRow.flatMap((row) => row.slice(5)));
    for (const letter of derived) {
      if (!/[a-z]/.test(letter)) continue;
      expect(QWERTY_US_RIGHT_HAND_LETTERS.has(letter)).toBe(true);
    }
    for (const letter of QWERTY_US_RIGHT_HAND_LETTERS) {
      expect(derived.has(letter)).toBe(true);
    }
  });

  it("has no punctuation in the letter set, so the symbol features do not double-count", () => {
    for (const ch of QWERTY_US_RIGHT_HAND_LETTERS) expect(ch).toMatch(/^[a-z]$/);
    for (const ch of ";,. /") expect(QWERTY_US_RIGHT_HAND_LETTERS.has(ch)).toBe(false);
  });
});
