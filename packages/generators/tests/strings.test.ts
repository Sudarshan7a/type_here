/**
 * The `strings` family. Two invariants carry the weight here: every literal is closed
 * and escaped validly for the skin's delimiter (which the token map proves, because an
 * unterminated literal is a lexer *diagnostic*), and nothing that looks like a
 * credential is anything other than obviously fake.
 */

import { describe, expect, it } from "vitest";

import {
  CREDENTIAL_MARKER,
  REAL_CREDENTIAL_PREFIXES,
  STRING_FORMS,
  UnsupportedFormError,
  classifyItem,
  findSafetyViolations,
  generate,
  generateStrings,
  isSyntheticCredential,
} from "../src/index";

/** Every backslash sequence this package is allowed to emit. */
const VALID_ESCAPES = new Set([
  "\\n",
  "\\t",
  "\\r",
  "\\\\",
  '\\"',
  "\\'",
  "\\u0020",
  "\\u0041",
  "\\u007a",
  "\\u00a9",
  "\\u00e9",
  "\\u2014",
  "\\u2192",
  "\\u2713",
]);

function itemsOf(form: (typeof STRING_FORMS)[number], count = 200, seed = form) {
  return generateStrings({ seed, family: "strings", form, count, level: 5 });
}

/** The backslash sequences in `text`, as written (not decoded). */
function escapesIn(text: string): string[] {
  return [...text.matchAll(/\\u[0-9a-fA-F]{4}|\\./g)].map((match) => match[0]);
}

describe("CNT-05 strings", () => {
  it("emits closed single-line literals with only valid escapes", () => {
    for (const form of ["quoted", "escapes"] as const) {
      for (const item of itemsOf(form)) {
        expect(item.text.startsWith(item.params.delimiter as string)).toBe(true);
        expect(item.text.endsWith(item.params.delimiter as string)).toBe(true);
        expect(item.text).not.toContain("\n");
        for (const escape of escapesIn(item.text)) {
          expect(VALID_ESCAPES.has(escape), `${form}: ${escape}`).toBe(true);
        }
        // `unterminated-string` is the lexer saying the literal never closed; the
        // authoritative check is the engine's, not a hand-rolled bracket count.
        expect(classifyItem(item).diagnostics).toEqual([]);
      }
    }
  });

  it("only escapes the delimiter's own quote character", () => {
    for (const item of itemsOf("escapes", 400)) {
      const delimiter = item.params.delimiter as string;
      if (delimiter === '"') {
        expect(escapesIn(item.text)).not.toContain("\\'");
      } else {
        expect(escapesIn(item.text)).not.toContain('\\"');
      }
    }
  });

  it("never emits a `\\u` escape in the surrogate range", () => {
    // An unpaired surrogate would produce a literal the engine's grapheme model cannot
    // count, so the typing surface and the metrics would disagree.
    for (const item of itemsOf("escapes", 500)) {
      for (const escape of escapesIn(item.text)) {
        if (!escape.startsWith("\\u")) continue;
        const code = Number.parseInt(escape.slice(2), 16);
        expect(code).toBeGreaterThanOrEqual(0x20);
        expect(code).toBeLessThanOrEqual(0xffff);
        expect(code < 0xd800 || code > 0xdfff).toBe(true);
      }
    }
  });

  it("honours the escape count, clamped to 1-4", () => {
    for (const escapeCount of [1, 2, 3, 4]) {
      for (const item of generateStrings({
        seed: `esc-${escapeCount}`,
        family: "strings",
        form: "escapes",
        count: 40,
        escapeCount,
      })) {
        expect(item.params.escapes).toBe(escapeCount);
        expect(escapesIn(item.text).length).toBeGreaterThanOrEqual(escapeCount);
      }
    }
    const clamped = generateStrings({
      seed: "esc-clamp",
      family: "strings",
      form: "escapes",
      count: 10,
      escapeCount: 99,
    });
    expect(clamped.every((item) => item.params.escapes === 4)).toBe(true);
  });

  it("emits one interpolation in a template literal, closed with a backtick", () => {
    for (const item of itemsOf("template", 300)) {
      expect(item.text.startsWith("`")).toBe(true);
      expect(item.text.endsWith("`")).toBe(true);
      expect(item.params.interpolation).toBe(1);
      const markers = item.text.match(/\$\{/g) ?? [];
      const closes = item.text.match(/\}/g) ?? [];
      expect(markers).toHaveLength(1);
      expect(closes).toHaveLength(1);
      const interpolated = item.text.slice(item.text.indexOf("${") + 2, item.text.indexOf("}"));
      expect(interpolated).toMatch(/^[a-z]+$/);
      const report = classifyItem(item);
      expect(report.diagnostics).toEqual([]);
      // The interpolation markers are class 4 (master-spec 7.1) and the identifier
      // between them is class 7, so a drill can score them separately.
      expect(report.counts.chars.string).toBeGreaterThan(0);
      expect(report.counts.tokens.identifier).toBe(1);
    }
  });

  it("refuses a template literal in a skin without interpolation, rather than faking one", () => {
    // Failing direction: silently emitting `` `text` `` without `${...}` would produce an
    // item whose `kind` claims interpolation and whose text has none.
    expect(() =>
      generateStrings({
        seed: "py",
        family: "strings",
        form: "template",
        count: 1,
        language: "python",
      }),
    ).toThrow(UnsupportedFormError);
  });

  it("marks every credential-shaped string, and never looks like a real one", () => {
    for (const item of itemsOf("credential", 300)) {
      const value = item.text.slice(1, -1);
      expect(item.params.synthetic).toBe(true);
      expect(value.startsWith(`${CREDENTIAL_MARKER}-`)).toBe(true);
      expect(value).toMatch(/^EXAMPLE-KEY(-[A-Z0-9]{4}){4}$/);
      expect(isSyntheticCredential(value)).toBe(true);
      for (const prefix of REAL_CREDENTIAL_PREFIXES) {
        expect(value.startsWith(prefix)).toBe(false);
      }
      expect(findSafetyViolations(item.text)).toEqual([]);
      expect(classifyItem(item).diagnostics).toEqual([]);
    }
  });

  it("rejects a real-looking credential, so the marker check is not vacuous", () => {
    for (const real of [
      "AKIAIOSFODNN7EXAMPLE",
      "sk_live_4f2a9c110b7d3e58",
      "ghp_16C7e42F292c6912E7710c838347Ae178B4a",
      "xoxb-1234-5678-abcdef",
      "AIzaSyD-4f2a9c110b7d3e58",
    ]) {
      expect(isSyntheticCredential(real), real).toBe(false);
      expect(findSafetyViolations(real)).not.toEqual([]);
    }
  });

  it("grows the form pool with the level and refuses templates below level 3", () => {
    const level1 = generate({ seed: "ramp", family: "strings", count: 60, level: 1 });
    expect(new Set(level1.items.map((item) => item.params.form))).toEqual(new Set(["quoted"]));
    const level2 = generate({ seed: "ramp", family: "strings", count: 200, level: 2 });
    expect(new Set(level2.items.map((item) => item.params.form))).toEqual(
      new Set(["quoted", "escapes"]),
    );
    const level5 = generate({ seed: "ramp", family: "strings", count: 400, level: 5 });
    expect(new Set(level5.items.map((item) => item.params.form))).toEqual(new Set(STRING_FORMS));
  });
});
