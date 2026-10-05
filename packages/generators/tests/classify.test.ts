/**
 * Token-map self-verification (CNT-05's third promise: generated text is classifiable).
 *
 * The engine owns the token classes (AGENTS.md rule 3), so this package does not
 * re-lex anything: it asks `tokenize` what the authoritative lexer made of each item and
 * fails when the lexer had anything to say. A `hasError`-equivalent for a lexical map.
 */

import { describe, expect, it } from "vitest";

import {
  DEFAULT_LANGUAGE,
  GENERATOR_FAMILIES,
  classifyItem,
  classifySet,
  generate,
  uncleanItems,
  type GeneratedItem,
} from "../src/index";

function item(text: string, language = "javascript"): GeneratedItem {
  return { text, family: "strings", kind: "test", language, params: {} };
}

describe("CNT-05 token-map self-verification", () => {
  it("classifies every generated item cleanly, across families, levels and skins", () => {
    for (const family of GENERATOR_FAMILIES) {
      for (const level of [1, 2, 3, 4, 5]) {
        for (const language of ["javascript", "typescript", "python", "generic"]) {
          const set = generate({ seed: `map-${level}`, family, count: 150, level, language });
          expect(uncleanItems(set), `${family} @${level}/${language}`).toEqual([]);
          expect(classifySet(set)).toHaveLength(set.items.length);
        }
      }
    }
  });

  it("reports the diagnostics it is supposed to catch", () => {
    // Failing direction: an empty `diagnostics` list on every input would make the test
    // above pass for the wrong reason.
    const unterminated = classifyItem(item('"never closed'));
    expect(unterminated.clean).toBe(false);
    expect(unterminated.diagnostics).toEqual(["unterminated-string"]);

    const unterminatedTemplate = classifyItem(item("`never closed"));
    expect(unterminatedTemplate.diagnostics).toEqual(["unterminated-template"]);

    const rawNewline = classifyItem(item('"two\nlines"'));
    expect(rawNewline.clean).toBe(false);
    // The first diagnostic is the unterminated literal. A second one follows, because
    // after the raw newline the rest of the line (`lines"`) opens a fresh string that
    // also never closes - which is exactly the damage a raw newline in a literal does.
    expect(rawNewline.diagnostics[0]).toBe("unterminated-string");

    const unknownCharacter = classifyItem(item("\u{1F600}"));
    expect(unknownCharacter.clean).toBe(false);
    // An emoji is two UTF-16 code units, and the lexer reports one diagnostic per unit,
    // so the count is not 1 - but every diagnostic must be the same kind.
    expect(new Set(unknownCharacter.diagnostics)).toEqual(new Set(["unrecognized-character"]));
  });

  it("counts a template literal's markers as class 4 and its expression as class 7", () => {
    const report = classifyItem(item("`rows: ${pageSize} left`"));
    expect(report.clean).toBe(true);
    expect(report.counts.chars.string).toBeGreaterThan(0);
    expect(report.counts.tokens.identifier).toBe(1);
    expect(report.language).toBe("javascript");
  });

  it("defaults to the javascript skin, the profile that can classify every form", () => {
    expect(DEFAULT_LANGUAGE).toBe("javascript");
    const set = generate({ seed: "default", family: "numbers", count: 40, level: 5 });
    expect(set.language).toBe("javascript");
    expect(set.items.every((item) => item.language === "javascript")).toBe(true);
    expect(uncleanItems(set)).toEqual([]);
  });

  it("resolves an aliased skin to the same profile", () => {
    const ts = classifyItem(item("0xFF", "typescript"));
    expect(ts.language).toBe("javascript");
  });
});
