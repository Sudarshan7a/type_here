import { describe, expect, it } from "vitest";

import { TOKEN_FIXTURES } from "../fixtures/tok01.js";
// Imported from the package index on purpose: the export itself is part of the
// PRG-01 contract (M5-02's publish-time pipeline and ANA-05 consume it from here).
import { assertTokenMap, tokenize, validateTokenMap } from "../src/index";

/**
 * The token map must TILE its text (D-M5-2). These tests re-derive that from the
 * fixtures rather than trusting the implementation: the concatenation of the
 * expected span texts is compared to the source, and every span's start is
 * compared to the running cursor, so a span that skips a character or overlaps
 * its neighbour fails here even when the classes all look right.
 */
function expectTiling(source: string, spans: readonly { index: number; length: number }[]): void {
  let cursor = 0;
  for (const span of spans) {
    expect(span.index, `span at ${span.index} must start at ${cursor}`).toBe(cursor);
    expect(span.length).toBeGreaterThan(0);
    cursor += span.length;
  }
  expect(cursor).toBe(source.length);
}

describe("PRG-01 token-map fixtures (M5-02, D-M5-2)", () => {
  for (const fixture of TOKEN_FIXTURES) {
    it(`${fixture.id} — ${fixture.provenance}`, () => {
      const map = tokenize(fixture.source, fixture.language);

      expect(map.spans.map((s) => fixture.source.slice(s.index, s.index + s.length))).toEqual(
        fixture.expected.map((e) => e.text),
      );
      expect(map.spans.map((s) => s.class)).toEqual(fixture.expected.map((e) => e.class));
      expect(map.diagnostics.map((d) => d.code)).toEqual([...(fixture.diagnostics ?? [])]);
      expect(map.length).toBe(fixture.source.length);
      expectTiling(fixture.source, map.spans);
      expect(validateTokenMap(map)).toEqual([]);
      expect(() => assertTokenMap(map)).not.toThrow();
    });
  }

  it("has no duplicate fixture ids", () => {
    const ids = TOKEN_FIXTURES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers the three chapter-named fixtures the ledger cites for PRG-01", () => {
    // docs/FEATURE-LEDGER.md attributes these three to PRG-01 (and TOK-FIXTURE-003
    // / -004 additionally to PRG-12 / PRG-02). If one is renamed the ledger must
    // be updated in the same commit, which is what this assertion forces.
    const ids = TOKEN_FIXTURES.map((f) => f.id);
    expect(ids).toContain("TOK-FIXTURE-003-number-inside-string");
    expect(ids).toContain("TOK-FIXTURE-004-keyword-vs-identifier-position");
    expect(ids).toContain("TOK-FIXTURE-005-symbols-inside-comments-excluded");
  });

  it("reports no diagnostics on every fixture that does not declare one", () => {
    for (const fixture of TOKEN_FIXTURES) {
      if (fixture.diagnostics === undefined) {
        expect(tokenize(fixture.source, fixture.language).diagnostics).toEqual([]);
      }
    }
  });
});
