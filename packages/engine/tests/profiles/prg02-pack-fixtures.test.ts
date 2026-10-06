import { describe, expect, it } from "vitest";

import { PACK_FIXTURES, TOK_FIXTURE_004, type PackFixture } from "../../fixtures/tok02.js";
import { LANGUAGE_PACKS, resolvePack, tokenizePacked } from "../../src/profiles";
import { validateTokenMap } from "../../src/token-map";

/**
 * Every fixture here tiles its source and pins every class, and the tiling is
 * re-derived from the expectation rather than trusted: the span texts are sliced
 * out of the SOURCE, so a lexer that drifted (or a profile that was edited) shows
 * up as a text mismatch rather than as a silently different map.
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

const ALL: readonly PackFixture[] = [...PACK_FIXTURES, ...TOK_FIXTURE_004];

describe("PRG-02 language-pack fixtures", () => {
  for (const fixture of ALL) {
    it(`${fixture.id} — ${fixture.provenance}`, () => {
      const map = tokenizePacked(fixture.source, fixture.language);

      expect(map.language).toBe(fixture.pack);
      expect(map.spans.map((s) => fixture.source.slice(s.index, s.index + s.length))).toEqual(
        fixture.expected.map((e) => e.text),
      );
      expect(map.spans.map((s) => s.class)).toEqual(fixture.expected.map((e) => e.class));
      expect(map.diagnostics.map((d) => d.code)).toEqual([...(fixture.diagnostics ?? [])]);
      expect(map.length).toBe(fixture.source.length);
      expectTiling(fixture.source, map.spans);
      expect(validateTokenMap(map)).toEqual([]);
    });
  }

  it("has no duplicate fixture ids", () => {
    const ids = ALL.map((fixture) => fixture.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every pack at least one fixture of its own", () => {
    const covered = new Set(ALL.map((fixture) => fixture.pack));
    for (const pack of LANGUAGE_PACKS) {
      expect(covered, `no fixture exercises ${pack.id}`).toContain(pack.id);
    }
    expect(covered.has("generic")).toBe(true);
  });

  it("declares each fixture's pack as the id its language actually resolves to", () => {
    for (const fixture of ALL) {
      expect(resolvePack(fixture.language).profile.id, fixture.id).toBe(fixture.pack);
    }
  });

  it("exercises every token class somewhere across the six packs", () => {
    // A pack set that never produces Class 3 or Class 6 would look fine on a
    // dashboard; this is the coarse check that the taxonomy is being reached.
    const seen = new Set(ALL.flatMap((fixture) => fixture.expected.map((e) => e.class)));
    for (const required of [
      "bracket",
      "operator",
      "chord",
      "string",
      "number",
      "number-system",
      "identifier",
      "keyword",
      "whitespace",
      "comment",
      "data",
    ]) {
      expect(seen, `no fixture produces ${required}`).toContain(required);
    }
  });

  it("reports no diagnostics on every fixture that does not declare one", () => {
    for (const fixture of ALL) {
      if (fixture.diagnostics === undefined) {
        expect(tokenizePacked(fixture.source, fixture.language).diagnostics).toEqual([]);
      }
    }
  });

  it("pins TOK-FIXTURE-004, the one the ledger cites against PRG-02", () => {
    // docs/FEATURE-LEDGER.md attributes TOK-FIXTURE-004 to PRG-02 (and also to
    // PRG-01 and PRG-12). PRG-01's own `TOK-FIXTURE-004-keyword-vs-identifier-position`
    // stays in fixtures/tok01.ts untouched; the PRG-02 half of the citation is this
    // file, and renaming either one is a ledger-visible change.
    expect(TOK_FIXTURE_004.length).toBeGreaterThanOrEqual(4);
    expect(new Set(TOK_FIXTURE_004.map((fixture) => fixture.pack))).toEqual(
      new Set(["css", "javascript", "python", "sql"]),
    );
    expect(TOK_FIXTURE_004.every((fixture) => fixture.id.startsWith("TOK-FIXTURE-004-"))).toBe(
      true,
    );
  });

  it("pits the four packs against each other on `#ff00aa`, in both directions", () => {
    // The whole point in one assertion: same characters, four packs, and only the
    // CSS one calls it a literal. If the CSS entry changed to `identifier`, CNT-05's
    // deferred colour form would still be deferred and this fixture would pass.
    const answers = TOK_FIXTURE_004.map((fixture) => {
      const literal = fixture.expected.find((span) => span.text === "#ff00aa");
      expect(literal, `${fixture.id} has no #ff00aa span`).toBeDefined();
      return `${fixture.pack}:${literal!.class}`;
    });
    expect(answers).toEqual([
      "css:number-system",
      "javascript:identifier",
      "python:comment",
      "sql:identifier",
    ]);
    // …and the control: the assertion above can fail, which is what makes it mean
    // something. Reclassifying the CSS answer must break it.
    expect(
      answers.map((answer) => answer.replace("css:number-system", "css:identifier")),
    ).not.toEqual(answers);
  });
});
