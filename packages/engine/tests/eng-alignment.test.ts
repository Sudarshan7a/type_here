import { describe, expect, it } from "vitest";

import { alignText, type ErrorKind } from "../src/alignment.js";

/**
 * Chapter-4 deep-dive §4.11 — alignment / error classification.
 * Every named fixture from the catalog, written before the implementation.
 * The property test generates errors it controls, so the expected
 * classification is known exactly (no reliance on a worked example).
 */

describe("ENG-FIXTURE-H01-transposition-classification", () => {
  it("three adjacent transpositions are three events, not six substitutions", () => {
    // §4.11 worked example.
    const result = alignText("the quick brown", "teh qiuck brwon");

    expect(result.correctChars).toBe(9);
    expect(result.finalAccuracy).toBeCloseTo(60, 10);
    expect(count(result, "transposition")).toBe(3);
    expect(count(result, "substitution")).toBe(0);
    expect(count(result, "omission")).toBe(0);
    expect(count(result, "insertion")).toBe(0);
  });

  it("reports the swapped pairs", () => {
    const result = alignText("the quick brown", "teh qiuck brwon");
    expect(result.transpositions.map((t) => `${t.intended}->${t.typed}`)).toEqual([
      "he->eh",
      "ui->iu",
      "ow->wo",
    ]);
  });
});

describe("ENG-FIXTURE-I01-omission-classification", () => {
  it("a skipped character is an omission, not a substitution", () => {
    // §4.11 second example: "cats" typed as "cts" — the `a` was skipped while
    // the user kept typing, so it is an omission and not an early stop.
    const result = alignText("cats", "cts");
    expect(count(result, "omission")).toBe(1);
    expect(count(result, "substitution")).toBe(0);
    expect(result.omissions.map((o) => o.expected)).toEqual(["a"]);
    expect(result.correctChars).toBe(3);
  });
});

describe("ENG-FIXTURE-I02-insertion-classification", () => {
  it("an extra character is an insertion", () => {
    // §4.11 third example: "cat" typed as "caat".
    const result = alignText("cat", "caat");
    expect(count(result, "insertion")).toBe(1);
    expect(result.insertions.map((i) => i.typed)).toEqual(["a"]);
    expect(result.correctChars).toBe(3);
  });
});

describe("ENG-FIXTURE-I03-mixed-errors", () => {
  it("classifies extra characters ahead of the correct suffix", () => {
    // "cwxats" against "cats": after the leading `c`, both `w` and `x` are
    // extra, and the remaining "ats" lines up with the target suffix — so
    // this is two insertions, not an omission plus a substitution.
    const result = alignText("cats", "cwxats");
    expect(result.insertions.map((i) => i.typed)).toEqual(["w", "x"]);
    expect(result.correctChars).toBe(4);
    expect(result.omissions).toHaveLength(0);
    expect(result.substitutions).toHaveLength(0);
  });
});

function count(result: ReturnType<typeof alignText>, kind: ErrorKind): number {
  const map: Record<ErrorKind, unknown[]> = {
    correct: [],
    substitution: result.substitutions,
    transposition: result.transpositions,
    omission: result.omissions,
    insertion: result.insertions,
  };
  return map[kind].length;
}

describe("ENG-ALIGN-PROP-01", () => {
  /** Deterministic PRNG so a failure is reproducible. */
  function rng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0x100000000;
    };
  }

  const WORDS = [
    "the",
    "quick",
    "brown",
    "fox",
    "jumps",
    "over",
    "lazy",
    "dog",
    "typing",
    "speed",
    "practice",
    "bracket",
    "string",
    "number",
    "symbol",
    "editor",
    "keyboard",
    "muscle",
  ];
  const ALPHABET = "abcdefghijklmnopqrstuvwxyz ";

  it("recovers exactly the injected errors over 2,000 random target/typed pairs", () => {
    const next = rng(20260928);
    let checked = 0;

    for (let run = 0; run < 2_000; run++) {
      const word = WORDS[Math.floor(next() * WORDS.length)]!;
      // Apply ONE known error to the target, so the ground truth is exact.
      const position = Math.floor(next() * word.length);
      const kind = (["substitution", "omission", "insertion", "transposition"] as const)[
        Math.floor(next() * 4)
      ]!;
      // The replacement must actually differ from the original, otherwise no
      // error is injected and the ground truth would be wrong.
      let replacement = ALPHABET[Math.floor(next() * ALPHABET.length)]!;
      if (replacement === word[position]) {
        replacement = replacement === "a" ? "b" : "a";
      }

      let typed = word;
      let expected: { kind: ErrorKind; count: number };
      switch (kind) {
        case "substitution":
          typed = word.slice(0, position) + replacement + word.slice(position + 1);
          expected = { kind, count: 1 };
          break;
        case "omission":
          typed = word.slice(0, position) + word.slice(position + 1);
          expected = { kind, count: 1 };
          break;
        case "insertion":
          typed = word.slice(0, position) + replacement + word.slice(position);
          expected = { kind, count: 1 };
          break;
        case "transposition": {
          // Only meaningful when a following character exists AND the two
          // characters differ — swapping "e","e" injects no error at all.
          if (position + 1 >= word.length) continue;
          if (word[position] === word[position + 1]) continue;
          typed =
            word.slice(0, position) +
            word[position + 1] +
            word[position] +
            word.slice(position + 2);
          expected = { kind, count: 1 };
          break;
        }
      }

      const result = alignText(word, typed);
      checked += 1;
      expect(
        count(result, expected.kind),
        `run ${run}: expected one ${expected.kind} in ${JSON.stringify({ word, typed, position })}`,
      ).toBe(expected.count);

      // Exactly one error event overall, and the rest of the text is correct.
      const totalErrors =
        result.substitutions.length +
        result.transpositions.length +
        result.omissions.length +
        result.insertions.length;
      expect(totalErrors, `run ${run}: expected exactly one error event`).toBe(1);
    }

    expect(checked).toBeGreaterThan(1_500);
  });
});
