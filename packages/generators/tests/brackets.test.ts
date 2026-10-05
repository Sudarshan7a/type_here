/**
 * The `brackets` family. The load-bearing property is the balance invariant, and the
 * tests are written so that a generator which stopped balancing would fail *here*
 * rather than in a user's hands. Deliberately unbalanced items must carry their intent.
 */

import { describe, expect, it } from "vitest";

import {
  BRACKET_SHAPES,
  bracketBalance,
  classifyItem,
  generate,
  generateBrackets,
} from "../src/index";

function itemsOf(shape: (typeof BRACKET_SHAPES)[number], count = 200, seed = shape) {
  return generateBrackets({ seed, family: "brackets", shape, count, level: 5 });
}

describe("CNT-05 brackets", () => {
  it("balances every balanced shape, and says so in the item parameters", () => {
    const balancedShapes = ["pairs", "content", "nesting", "mixed", "ladder"] as const;
    for (const shape of balancedShapes) {
      for (const item of itemsOf(shape)) {
        const balance = bracketBalance(item.text);
        expect(balance.imbalance, `${shape}: ${item.text}`).toBe(0);
        expect(balance.minDepth, `${shape}: ${item.text}`).toBe(0);
        expect(item.params.balanced).toBe(true);
        expect(item.params.intent).toBeUndefined();
        expect(item.fullText).toBeUndefined();
      }
    }
  });

  it("rejects unbalanced text, so the balance assertion above is not vacuous", () => {
    // Failing direction. If these returned 0, "every generated item is balanced" would
    // be a statement about the checker rather than about the generator.
    expect(bracketBalance("([)").imbalance).not.toBe(0);
    expect(bracketBalance("(()").imbalance).toBe(1);
    expect(bracketBalance("())").imbalance).toBe(-1);
    expect(bracketBalance("))(").minDepth).toBe(-2);
    expect(bracketBalance("()").maxDepth).toBe(1);
    expect(bracketBalance("([{}])").maxDepth).toBe(3);
    expect(bracketBalance("").maxDepth).toBe(0);
  });

  it("marks every unbalanced item with a single, named imbalance", () => {
    const seen = new Set<string>();
    for (const item of itemsOf("unbalanced", 600)) {
      const balance = bracketBalance(item.text);
      seen.add(String(item.params.intent));
      expect(["missing-closer", "extra-opener", "extra-closer"]).toContain(item.params.intent);
      expect(Math.abs(balance.imbalance)).toBe(1);
      expect(item.params.imbalance).toBe(balance.imbalance);
      expect(item.params.balanced).toBe(false);
      // A closer with nothing open is the only case whose trace dips below zero; the
      // other two are a net +1 with a well-formed prefix.
      if (item.params.intent === "extra-closer") {
        expect(balance.minDepth).toBe(-1);
      } else {
        expect(balance.minDepth).toBe(0);
      }
    }
    expect([...seen].sort()).toEqual(["extra-closer", "extra-opener", "missing-closer"]);
  });

  it("emits openers only for overtype items, and keeps the full expression balanced", () => {
    for (const item of itemsOf("overtype")) {
      expect(item.fullText).toBeDefined();
      expect(item.params.autoPair).toBe(true);
      expect(bracketBalance(item.fullText!).imbalance).toBe(0);
      const closers = new Set([")", "]", "}", ">"]);
      expect(item.text).toBe([...item.fullText!].filter((char) => !closers.has(char)).join(""));
      // What the user presses is openers only, so its own trace is the *negative* of a
      // balanced one: unbalanced by design, and marked as a projection rather than as a
      // mistake.
      expect(bracketBalance(item.text).imbalance).toBeGreaterThan(0);
      expect(item.params.balanced).toBeUndefined();
    }
  });

  it("nests to exactly the requested depth and never deeper", () => {
    for (const depth of [1, 2, 3, 4]) {
      for (const shape of ["nesting", "mixed", "overtype"] as const) {
        for (const item of generateBrackets({
          seed: `depth-${depth}`,
          family: "brackets",
          shape,
          depth,
          count: 50,
        })) {
          expect(item.params.depth).toBe(depth);
          const trace = bracketBalance(item.fullText ?? item.text);
          expect(trace.maxDepth).toBeLessThanOrEqual(depth);
          if (shape === "overtype") expect(trace.maxDepth).toBe(depth);
        }
      }
    }
  });

  it("clamps a hostile depth to the skill's tier-1 range of 1-4", () => {
    for (const requested of [0, -3, 99]) {
      const items = generateBrackets({
        seed: "clamp",
        family: "brackets",
        shape: "nesting",
        depth: requested,
        count: 5,
      });
      expect(
        items.every((item) => Number(item.params.depth) >= 1 && Number(item.params.depth) <= 4),
      ).toBe(true);
    }
  });

  it("uses only the brackets the skin declares, so Python never gets angle brackets", () => {
    // Master-spec 7.1 and the lexer's rule 7: `<` `>` are brackets in a C-like
    // language and two comparison operators in Python, so a Python bracket drill that
    // contained them would be typing operators.
    const python = generateBrackets({
      seed: "skin",
      family: "brackets",
      count: 300,
      level: 5,
      language: "python",
    });
    expect(python.every((item) => !item.text.includes("<") && !item.text.includes(">"))).toBe(true);
    expect(python.every((item) => classifyItem(item).counts.tokens.bracket > 0)).toBe(true);

    const javascript = generateBrackets({ seed: "skin", family: "brackets", count: 300, level: 5 });
    expect(javascript.some((item) => item.text.includes("<"))).toBe(true);
  });

  it("classifies every bracket character of a bracket-only item as a bracket", () => {
    // The `content` shape is excluded on purpose: its filler is deliberately letters and
    // digits, which the lexer classes as identifiers and numbers. Everything else this
    // family emits must be bracket characters and the spaces between ladder rungs - a `<`
    // read as an operator (Python, or a doubled `<<` shift) fails here.
    for (const item of generate({ seed: "class", family: "brackets", count: 300, level: 5 })
      .items) {
      if (item.params.shape === "content") continue;
      const report = classifyItem(item);
      expect(report.clean).toBe(true);
      const totalChars = Object.values(report.counts.chars).reduce((sum, count) => sum + count, 0);
      expect(totalChars).toBe(item.text.length);
      const otherChars = Object.entries(report.counts.chars)
        .filter(([cls]) => cls !== "bracket" && cls !== "whitespace")
        .reduce((sum, [, count]) => sum + count, 0);
      expect(otherChars, item.text).toBe(0);
      expect(report.counts.chars.bracket).toBeGreaterThan(0);
    }
  });

  it("never emits a doubled angle bracket, which every profile would read as a shift", () => {
    // `<<` and `>>` are multi-character operators, and the lexer matches them before
    // brackets, so a nested run of the same angle bracket would be typed as brackets and
    // scored as shift operators. Angle brackets appear as single pairs only.
    for (const item of generate({ seed: "angles", family: "brackets", count: 400, level: 5 })
      .items) {
      expect(item.text.includes("<<")).toBe(false);
      expect(item.text.includes(">>")).toBe(false);
    }
    expect(
      generate({ seed: "angles", family: "brackets", count: 400, level: 5 })
        .items.filter((item) => item.text.includes("<"))
        .every((item) => item.params.shape === "pairs" || item.params.shape === "content"),
    ).toBe(true);
  });

  it("reaches every shape by level 5 and keeps level 1 to isolated pairs", () => {
    const level1 = generate({ seed: "ramp", family: "brackets", count: 60, level: 1 });
    expect(new Set(level1.items.map((item) => item.params.shape))).toEqual(new Set(["pairs"]));
    const level5 = generate({ seed: "ramp", family: "brackets", count: 800, level: 5 });
    expect(new Set(level5.items.map((item) => item.params.shape))).toEqual(new Set(BRACKET_SHAPES));
  });
});
