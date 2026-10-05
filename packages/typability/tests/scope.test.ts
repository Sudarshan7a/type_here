/**
 * Scope: what the model refuses to band (CNT-02).
 *
 * The ledger row says it in as many words - "does not cover code/symbol text" -
 * and this file is where that becomes behaviour rather than a caveat:
 *
 *   - a CODE item never receives a band, whatever its text looks like;
 *   - a symbol-dense or digit-dense item is refused too, even if its family says
 *     prose, because the published model's stated coverage is English prose with
 *     simple punctuation and few digits;
 *   - a refused item always carries a reason, and the reason is in a closed enum;
 *   - pathological input (one character, ten thousand characters, nothing but
 *     punctuation, nothing but digits, an empty string) produces a finite verdict
 *     and no exception.
 */
import { describe, expect, it } from "vitest";

import {
  OUT_OF_SCOPE_REASONS,
  SCOPE_CEILINGS,
  classifyScope,
  explainTypabilityBand,
  typabilityBand,
} from "../src/index.ts";

const CODE_TEXT = [
  "function chunkArray(items, size) {",
  "  const result = [];",
  "  for (let i = 0; i < items.length; i += size) {",
  "    result.push(items.slice(i, i + size));",
  "  }",
  "  return result;",
  "}",
].join("\n");

describe("CNT-02 out-of-scope handling", () => {
  it("refuses a prose band for a code item, even when the code is mostly words", () => {
    const verdict = typabilityBand({
      text: CODE_TEXT,
      family: "CODE",
      language: "javascript",
    });
    expect(verdict.band).toBeNull();
    expect(verdict.reason).toBe("out-of-scope-code");
    expect(verdict.source).toBe("unbanded");
  });

  it("refuses a code item even with a declared band in the source document", () => {
    const verdict = typabilityBand({
      text: CODE_TEXT,
      family: "CODE",
      language: "javascript",
      declaredBand: "hard",
    });
    expect(verdict.band).toBeNull();
    // The declared value is echoed, never promoted: the corpus keeps the authoring
    // claim visible without showing it as a difficulty band.
    expect(verdict.declaredBand).toBe("hard");
    expect(verdict.declaredBandAgrees).toBeNull();
  });

  it("refuses a code item whose family is mislabelled as prose only via the language", () => {
    const verdict = typabilityBand({ text: CODE_TEXT, family: "PROSE", language: "javascript" });
    expect(verdict.band).toBeNull();
    expect(verdict.reason).toBe("out-of-scope-non-english");
  });

  it("refuses a word pool, whose length is the pool's and not a passage's", () => {
    const verdict = typabilityBand({
      text: "the a and to before on of i in it for you is this we at your so if that",
      family: "WORDLIST",
      language: "en",
    });
    expect(verdict.band).toBeNull();
    expect(verdict.reason).toBe("out-of-scope-word-pool");
  });

  it("refuses symbol-dense text even inside the prose family", () => {
    const verdict = typabilityBand({
      text: "Xq7#v$2 (KPJ/LMN): {a[b]}=c*d? 99% @2026-10-06 <<< >>> ||| ###",
      family: "PROSE",
      language: "en",
    });
    expect(verdict.band).toBeNull();
    expect(verdict.reason).toBe("out-of-scope-symbol-dense");
  });

  it("refuses digit-dense text even inside the prose family", () => {
    // Letters are present on purpose: a run of bare digits is refused earlier and
    // for a different reason (no letters at all), and this test is about the digit
    // ceiling specifically.
    const digits =
      "Invoices 2026 2025 2024 2023 2022 2021 2020 2019 2018 2017 2016 2015 2014 2013 2012 2011.";
    const digitFeature = explainTypabilityBand({
      text: digits,
      family: "PROSE",
      language: "en",
    }).features.features.find((f) => f.name === "digitShare");
    expect(digitFeature?.raw).toBeGreaterThan(SCOPE_CEILINGS.digitShare);
    const verdict = typabilityBand({ text: digits, family: "PROSE", language: "en" });
    expect(verdict.band).toBeNull();
    expect(verdict.reason).toBe("out-of-scope-symbol-dense");
  });

  it("refuses text with no letters at all, rather than banding it Easy by accident", () => {
    for (const text of ["!!!???...", "1234567890", "   ", "", "- - -"]) {
      const verdict = typabilityBand({ text, family: "PROSE", language: "en" });
      expect(verdict.band).toBeNull();
      expect(verdict.reason).toBe("out-of-scope-no-letters");
    }
  });

  it("gives every refusal a reason from the closed enum, and a band a null reason", () => {
    const inputs = [
      { text: CODE_TEXT, family: "CODE", language: "javascript" },
      { text: "the a and to", family: "WORDLIST", language: "en" },
      { text: "!!!", family: "PROSE", language: "en" },
      { text: "Le chat est sur la table.", family: "PROSE", language: "fr" },
      { text: "the cat sat on the mat", family: "PROSE", language: "en" },
    ];
    for (const input of inputs) {
      const verdict = typabilityBand(input);
      if (verdict.band === null) {
        expect(OUT_OF_SCOPE_REASONS).toContain(verdict.reason);
        expect(verdict.source).toBe("unbanded");
      } else {
        expect(verdict.reason).toBeNull();
        expect(verdict.source).toBe("computed");
      }
    }
  });

  it("survives pathological input without NaN, Infinity or an exception", () => {
    const pathological: ReadonlyArray<string> = [
      "a",
      "ab",
      "x".repeat(10_000),
      "!".repeat(5_000),
      "1".repeat(5_000),
      " ".repeat(1_000),
      "\n\t\r",
      "the ".repeat(2_000),
      "\u00e9\u00e8\u00ea\u00eb",
      "🎉🎉🎉",
      "a\u0000b\u0000c",
    ];
    for (const text of pathological) {
      const explanation = explainTypabilityBand({ text, family: "PROSE", language: "en" });
      expect(Number.isFinite(explanation.score)).toBe(true);
      expect(Number.isFinite(explanation.quantisedScore)).toBe(true);
      expect(Number.isFinite(explanation.distanceToBoundary)).toBe(true);
      expect(explanation.score).toBeGreaterThanOrEqual(0);
      expect(explanation.score).toBeLessThanOrEqual(100);
      for (const feature of explanation.features.features) {
        expect(Number.isFinite(feature.raw)).toBe(true);
        expect(Number.isFinite(feature.component)).toBe(true);
        expect(feature.component).toBeGreaterThanOrEqual(0);
        expect(feature.component).toBeLessThanOrEqual(1);
      }
      expect(explanation.band === null || explanation.reason === null).toBe(true);
    }
  });

  it("treats a one-character item as banded rather than crashing, and says so in the score", () => {
    const explanation = explainTypabilityBand({ text: "a", family: "PROSE", language: "en" });
    expect(explanation.band).toBe("easy");
    // A single letter has almost no evidence behind it: every share is either 0 or
    // 1 and the model says so by scoring it near the top of the range. Recorded as a
    // known degenerate case in docs/typability-scoring.md §5.
    expect(explanation.quantisedScore).toBeGreaterThan(70);
  });

  it("classifies scope without touching the score, and agrees with the verdict", () => {
    expect(classifyScope({ text: CODE_TEXT, family: "CODE", language: "javascript" })).toEqual({
      inScope: false,
      reason: "out-of-scope-code",
    });
    expect(classifyScope({ text: "the cat sat", family: "PROSE", language: "en" })).toEqual({
      inScope: true,
      reason: null,
    });
    // An absent family and language is not English and not code, so the only honest
    // answer is a refusal rather than an assumption.
    expect(classifyScope({ text: "the cat sat" })).toEqual({
      inScope: false,
      reason: "out-of-scope-non-english",
    });
  });
});
