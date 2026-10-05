/**
 * The `numbers` family: format validity, base parsing, class expectations and the
 * skin-dependent grouping rule. The skill's property tests for this family are
 * "numbers parse in the target base"; everything else here exists because a number
 * drill that emits an invalid literal teaches the wrong thing while still passing a
 * "did it run" test.
 */

import { describe, expect, it } from "vitest";

import { NUMBER_FORMS, classifyItem, generate, generateNumbers } from "../src/index";

const INTEGER_RE = /^\d{1,9}$/;
const NEGATIVE_RE = /^-\d{1,9}$/;
const DECIMAL_RE = /^\d{1,9}\.\d{1,6}$/;
const GROUPED_RE = /^(\d{1,3})(_\d{3}|,\d{3})+$/;
const SCIENTIFIC_RE = /^\d{1,3}\.\d{1,6}e-?\d{1,2}$/;
const HEX_RE = /^0x([0-9a-f]{4}_)*[0-9a-f]{1,4}$/;
const BINARY_RE = /^0b[01]{4,16}(_[01]{4})*$/;
const OCTAL_RE = /^0o[0-7]{2,4}$/;

const PATTERNS = {
  integer: INTEGER_RE,
  negative: NEGATIVE_RE,
  decimal: DECIMAL_RE,
  grouped: GROUPED_RE,
  scientific: SCIENTIFIC_RE,
  hex: HEX_RE,
  binary: BINARY_RE,
  octal: OCTAL_RE,
} as const;

function itemsOf(form: (typeof NUMBER_FORMS)[number], count = 200, seed = "numbers"): string[] {
  return generateNumbers({ seed, family: "numbers", form, count, level: 5 }).map(
    (item) => item.text,
  );
}

describe("CNT-05 numbers", () => {
  it("emits every documented form in its documented shape", () => {
    for (const form of NUMBER_FORMS) {
      const texts = itemsOf(form);
      expect(texts).toHaveLength(200);
      for (const text of texts) {
        expect(text, `${form} produced ${text}`).toMatch(PATTERNS[form]);
      }
    }
  });

  it("parses every literal in its target base, which is the skill's property test", () => {
    for (const text of itemsOf("hex")) {
      const digits = text.slice(2).replace(/_/g, "");
      expect(Number.parseInt(digits, 16)).toBeGreaterThan(0);
      // Round-trip through the base: the grouped literal must be the same value, and
      // the digits must be the canonical lower-case form with no leading zero.
      expect(digits).toBe(Number.parseInt(digits, 16).toString(16));
    }
    for (const text of itemsOf("binary")) {
      const digits = text.slice(2).replace(/_/g, "");
      expect(digits).toBe(Number.parseInt(digits, 2).toString(2));
    }
    for (const text of itemsOf("octal")) {
      const octal = text.slice(2);
      expect(octal).toBe(Number.parseInt(octal, 8).toString(8));
    }
    for (const text of itemsOf("decimal").concat(itemsOf("negative"))) {
      expect(Number.isFinite(Number(text))).toBe(true);
    }
    for (const text of itemsOf("scientific")) {
      expect(Number.isFinite(Number(text))).toBe(true);
    }
  });

  it("never writes a leading zero, an empty fraction or a bare radix prefix", () => {
    // Failing direction: each of these shapes parses fine but is not a number anyone
    // types, and a number drill is exactly the place they get learned.
    expect(itemsOf("integer").every((text) => !text.startsWith("0"))).toBe(true);
    expect(itemsOf("decimal").every((text) => !text.includes(".."))).toBe(true);
    expect(itemsOf("scientific").every((text) => !text.includes("e0"))).toBe(true);
    expect(itemsOf("hex").every((text) => text.length > 2)).toBe(true);
    expect(itemsOf("octal").every((text) => text.length > 2)).toBe(true);
    expect(itemsOf("binary").every((text) => text.startsWith("0b1"))).toBe(true);
  });

  it("groups binary and hex in whole nibbles, and never groups right after a prefix", () => {
    for (const text of itemsOf("binary")) {
      for (const group of text.slice(2).split("_")) {
        expect(group).toHaveLength(4);
      }
    }
    for (const text of itemsOf("hex")) {
      expect(text.startsWith("0x_")).toBe(false);
      for (const group of text.slice(2).split("_")) {
        expect(group.length).toBeLessThanOrEqual(4);
      }
    }
  });

  it("uses the skin's own digit separator, and commas when the skin declares none", () => {
    // `1_048_576` under the generic profile tokenizes as a number followed by an
    // identifier, so the generator must not emit it there: the fallback is the human
    // thousands marker, which is honestly an operator and not a literal.
    const javascript = generateNumbers({
      seed: "sep",
      family: "numbers",
      form: "grouped",
      count: 50,
      language: "javascript",
    });
    expect(javascript.every((item) => item.text.includes("_"))).toBe(true);
    expect(javascript.every((item) => item.params.separator === "_")).toBe(true);

    const generic = generateNumbers({
      seed: "sep",
      family: "numbers",
      form: "grouped",
      count: 50,
      language: "generic",
    });
    expect(generic.every((item) => item.text.includes(","))).toBe(true);
    expect(generic.every((item) => item.params.separator === ",")).toBe(true);
  });

  it("honours the magnitude and precision parameters, clamped to their ranges", () => {
    const long = generateNumbers({
      seed: "mag",
      family: "numbers",
      form: "integer",
      count: 20,
      magnitude: 7,
    });
    expect(long.every((item) => item.text.length === 7)).toBe(true);

    const single = generateNumbers({
      seed: "mag",
      family: "numbers",
      form: "integer",
      count: 20,
      magnitude: 1,
    });
    expect(single.every((item) => item.text.length === 1)).toBe(true);

    const clamped = generateNumbers({
      seed: "mag",
      family: "numbers",
      form: "integer",
      count: 5,
      magnitude: 99,
    });
    expect(clamped.every((item) => item.text.length === 9)).toBe(true);

    const precise = generateNumbers({
      seed: "prec",
      family: "numbers",
      form: "decimal",
      count: 20,
      precision: 4,
    });
    expect(precise.every((item) => item.text.split(".")[1]?.length === 4)).toBe(true);
  });

  it("classifies radix literals as number-system and plain decimals as number", () => {
    for (const text of itemsOf("hex", 20).concat(itemsOf("binary", 20), itemsOf("octal", 20))) {
      const report = classifyItem({
        text,
        family: "numbers",
        kind: "numbers",
        language: "javascript",
        params: {},
      });
      expect(report.counts.tokens["number-system"]).toBe(1);
      expect(report.clean).toBe(true);
    }
    for (const text of itemsOf("integer", 20).concat(itemsOf("decimal", 20))) {
      const report = classifyItem({
        text,
        family: "numbers",
        kind: "numbers",
        language: "javascript",
        params: {},
      });
      expect(report.counts.tokens.number).toBe(1);
      expect(report.counts.tokens["number-system"]).toBe(0);
    }
  });

  it("lets the level widen the form pool, and never offers a form the skin cannot classify", () => {
    const level1 = generate({ seed: "ramp", family: "numbers", count: 60, level: 1 });
    expect(new Set(level1.items.map((item) => item.params.form))).toEqual(new Set(["integer"]));
    const level5 = generate({ seed: "ramp", family: "numbers", count: 400, level: 5 });
    expect(new Set(level5.items.map((item) => item.params.form))).toEqual(new Set(NUMBER_FORMS));
  });

  it("does not generate colour literals, because no shipped profile can classify one", () => {
    // Master-spec 7 tier 6 and M6-02 list `#FF00AA`, and the engine has
    // `hashMeaning: "colour"` ready - but JavaScript reads `#` as a private-field
    // prefix and Python/generic as a comment, so a colour literal would come back as an
    // `unrecognized-character` diagnostic. The form returns with PRG-02's CSS profile;
    // until then the honest answer is that it is not generated at all.
    expect(NUMBER_FORMS).not.toContain("colour");
    for (const language of ["javascript", "python", "generic"]) {
      const items = generateNumbers({
        seed: "colour",
        family: "numbers",
        count: 400,
        level: 5,
        language,
      });
      expect(items.every((item) => !item.text.startsWith("#"))).toBe(true);
      expect(items.every((item) => classifyItem(item).clean)).toBe(true);
    }
  });
});
