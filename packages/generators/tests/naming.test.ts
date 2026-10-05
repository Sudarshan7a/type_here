/**
 * The `naming` family. Two properties matter: every identifier matches the convention
 * it claims (the skill's "names match the requested style" property test), and the
 * vocabulary itself is original and free of words that would make an identifier look
 * like a record of a real person or a real credential.
 */

import { describe, expect, it } from "vitest";

import {
  IDENTIFIER_STYLES,
  TECH_WORDS,
  UnsupportedFormError,
  classifyItem,
  generate,
  generateIdentifiers,
  isIdentifierInStyle,
  renderIdentifier,
  type GeneratedItem,
  type IdentifierStyle,
} from "../src/index";

function itemOf(style: IdentifierStyle, index: number, language?: string): GeneratedItem {
  return generateIdentifiers({
    seed: "naming",
    family: "naming",
    style,
    count: index + 1,
    language,
  })[index]!;
}

describe("CNT-05 naming", () => {
  it("renders one word sequence in all seven conventions, changing only case and joiner", () => {
    const words = ["retry", "queue", "timeout"];
    expect(renderIdentifier(words, "snake")).toBe("retry_queue_timeout");
    expect(renderIdentifier(words, "screaming_snake")).toBe("RETRY_QUEUE_TIMEOUT");
    expect(renderIdentifier(words, "camel")).toBe("retryQueueTimeout");
    expect(renderIdentifier(words, "pascal")).toBe("RetryQueueTimeout");
    expect(renderIdentifier(words, "kebab")).toBe("retry-queue-timeout");
    expect(renderIdentifier(words, "dot")).toBe("retry.queue.timeout");
    expect(renderIdentifier(words, "namespace")).toBe("retry::queue::timeout");
    expect(() => renderIdentifier([], "snake")).toThrow(RangeError);
  });

  it("matches the requested style for every generated identifier", () => {
    for (const style of IDENTIFIER_STYLES) {
      const items = generateIdentifiers({
        seed: "styles",
        family: "naming",
        style,
        count: 300,
        level: 5,
        language: "generic",
      });
      for (const item of items) {
        expect(item.params.style).toBe(style);
        expect(isIdentifierInStyle(style, item.text), `${style}: ${item.text}`).toBe(true);
        // Failing direction for the predicate above: a name in one convention must not
        // pass as another. Only multi-segment names are compared, because a single
        // lowercase word genuinely satisfies the `dot` pattern too - that ambiguity is
        // in the pattern, and the generator sidesteps it by never emitting a one-segment
        // qualified name.
        const multiSegment = Number(item.params.wordCount) > 1;
        if (multiSegment) {
          for (const other of IDENTIFIER_STYLES) {
            if (other !== style) {
              expect(isIdentifierInStyle(other, item.text), `${other}: ${item.text}`).toBe(false);
            }
          }
        }
      }
    }
  });

  it("never emits an identifier with a digit, a space or a doubled word", () => {
    for (const style of IDENTIFIER_STYLES) {
      // `namespace` needs a skin that has `::`, so the style sweep runs on the generic
      // profile where all seven exist.
      for (const item of generateIdentifiers({
        seed: 2024,
        family: "naming",
        style,
        count: 200,
        level: 5,
        wordCount: 3,
        language: "generic",
      })) {
        expect(item.text).toMatch(/^[A-Za-z:._-]+$/);
        const words = String(item.params.words).split("|");
        expect(words.length).toBe(style === "dot" ? Math.max(3, 2) : 3);
        expect(new Set(words).size).toBe(words.length);
        expect(words.every((word) => TECH_WORDS.includes(word))).toBe(true);
      }
    }
  });

  it("classifies identifiers as class 7, and refuses a `::` style the skin does not have", () => {
    const snake = classifyItem(itemOf("snake", 0));
    expect(snake.counts.tokens.identifier).toBeGreaterThan(0);
    expect(snake.clean).toBe(true);

    // `::` is not JavaScript: the JavaScript profile has no `::` token, so a
    // namespaced name there would be two separators rather than one chord, and the
    // drill would teach punctuation the language does not have.
    expect(() =>
      generateIdentifiers({ seed: "ns", family: "naming", style: "namespace", count: 3 }),
    ).toThrow(UnsupportedFormError);
    expect(
      generate({
        seed: "ns",
        family: "naming",
        count: 300,
        level: 5,
        language: "javascript",
      }).items.some((item) => item.params.style === "namespace"),
    ).toBe(false);

    // The generic profile does list `::` among its chords (class 3), so there a
    // two-word namespaced name is two identifiers and exactly one chord.
    const namespaced = itemOf("namespace", 0, "generic");
    expect(namespaced.language).toBe("generic");
    const report = classifyItem(namespaced);
    expect(report.counts.tokens.chord).toBe(1);
    expect(report.counts.tokens.identifier).toBe(2);
  });

  it("opens at underscore styles and reaches the qualified styles by level 5", () => {
    const level1 = generate({ seed: "ramp", family: "naming", count: 80, level: 1 });
    expect(new Set(level1.items.map((item) => item.params.style))).toEqual(
      new Set(["snake", "screaming_snake"]),
    );
    const level5 = generate({
      seed: "ramp",
      family: "naming",
      count: 400,
      level: 5,
      language: "generic",
    });
    expect(new Set(level5.items.map((item) => item.params.style))).toEqual(
      new Set(IDENTIFIER_STYLES),
    );
  });

  it("honours wordCount, clamped to 1-4", () => {
    const one = generateIdentifiers({
      seed: "wc",
      family: "naming",
      style: "snake",
      count: 30,
      wordCount: 1,
    });
    expect(one.every((item) => !item.text.includes("_"))).toBe(true);
    const clamped = generateIdentifiers({
      seed: "wc",
      family: "naming",
      style: "snake",
      count: 10,
      wordCount: 99,
    });
    expect(clamped.every((item) => String(item.params.words).split("|").length === 4)).toBe(true);
    // `dot` always gets at least two segments, because a one-segment "qualified name"
    // is indistinguishable from a plain identifier.
    const dotted = generateIdentifiers({
      seed: "wc",
      family: "naming",
      style: "dot",
      count: 30,
      wordCount: 1,
      language: "generic",
    });
    expect(dotted.every((item) => item.text.includes("."))).toBe(true);
  });

  it("has an original vocabulary: shaped, unique, and free of person-shaped words", () => {
    expect(TECH_WORDS.length).toBeGreaterThanOrEqual(100);
    expect(new Set(TECH_WORDS).size).toBe(TECH_WORDS.length);
    for (const word of TECH_WORDS) {
      expect(word).toMatch(/^[a-z]{4,14}$/);
    }
    // CNT-05/CNT-07 and rule 6: the drill corpus must not be able to look like a
    // directory of real accounts. These are the words that would do that.
    for (const forbidden of [
      "user",
      "name",
      "email",
      "password",
      "passwd",
      "secret",
      "token",
      "key",
    ]) {
      expect(TECH_WORDS).not.toContain(forbidden);
    }
  });
});
