/**
 * Determinism and purity (CNT-02).
 *
 * Two different properties, and both are load-bearing for a committed artifact:
 *
 *   1. BEHAVIOURAL: identical input produces identical output, byte for byte, in
 *      the same process and across call order. This is what makes
 *      `content/corpus.json` reviewable in a diff instead of being a build-time
 *      side effect nobody can check.
 *   2. SOURCE-LEVEL: the forbidden sources are not present at all. A behavioural
 *      test proves the output happened to be stable today; the source scan is
 *      what stops a future edit from adding `Date.now()` to make the calibration
 *      look plausible and only being caught by someone comparing two runs a year
 *      apart.
 *
 * The control at the end proves the assertions above can fail.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  BAND_BOUNDARIES,
  explainTypabilityBand,
  typabilityBand,
  typabilityConfigDigestInput,
  typabilityFeatures,
} from "../src/index.ts";

const SRC_DIR = join(import.meta.dirname, "..", "src");

function sourceFiles(): Array<{ name: string; text: string }> {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
    );
  return walk(SRC_DIR)
    .filter((path) => path.endsWith(".ts"))
    .sort()
    .map((path) => ({ name: path.slice(SRC_DIR.length + 1), text: readFileSync(path, "utf8") }));
}

/** Comments are stripped first, so a file may DISCUSS a forbidden call. */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const FORBIDDEN: ReadonlyArray<readonly [RegExp, string]> = [
  [/Math\s*\.\s*random/, "Math.random: unseeded, unreproducible"],
  [/\bDate\s*\.\s*now/, "Date.now: wall-clock reads are not content"],
  [/new\s+Date\s*\(/, "new Date(): the clock is not a seed, and it moves"],
  [/performance\s*\.\s*now/, "performance.now: timing, not content"],
  [/\bcrypto\b/, "crypto: unpredictable by design"],
  [/from\s+["']node:/, "node: imports: this package must stay importable without Node"],
  [/\brequire\s*\(/, "require: ESM only"],
  // `process.` rather than the bare word: `process` is a legitimate entry in the
  // authored word list, and a rule that fires on English vocabulary would get
  // switched off the first time somebody added a word.
  [/\bprocess\s*\.[A-Za-z]/, "process.env and friends: not available in the browser"],
  [/\bglobalThis\b/, "globalThis: hidden global state"],
  [/\bfetch\s*\(/, "fetch: a network call cannot be part of a build"],
  [/\blocalStorage\b|\bsessionStorage\b/, "storage: content must not depend on client state"],
];

const SAMPLES: ReadonlyArray<{ text: string; family: string; language: string }> = [
  {
    text: "Can you pick up milk on your way home? We're also out of bread and there's barely any coffee left in the jar.",
    family: "PROSE",
    language: "en",
  },
  { text: "Patience is a skill, not a personality trait.", family: "QUOTE", language: "en" },
  {
    text: "function chunkArray(items, size) {\n  return items.slice(0, size);\n}",
    family: "CODE",
    language: "javascript",
  },
  { text: "the a and to before on of i in it for you is this", family: "WORDLIST", language: "en" },
  {
    text: "Xq7#v$2 (KPJ/LMN): {a[b]}=c*d? 99% @2026-10-06 <<< >>>",
    family: "PROSE",
    language: "en",
  },
];

describe("CNT-02 determinism", () => {
  it("produces byte-identical output for identical input", () => {
    for (const sample of SAMPLES) {
      const first = JSON.stringify(typabilityBand(sample));
      const second = JSON.stringify(typabilityBand(sample));
      const third = JSON.stringify(typabilityBand({ ...sample }));
      expect(second).toBe(first);
      expect(third).toBe(first);
      const features = JSON.stringify(typabilityFeatures(sample.text));
      expect(JSON.stringify(typabilityFeatures(sample.text))).toBe(features);
      const explanation = JSON.stringify(explainTypabilityBand(sample));
      expect(JSON.stringify(explainTypabilityBand(sample))).toBe(explanation);
    }
  });

  it("produces the same config digest string on every call", () => {
    const digest = typabilityConfigDigestInput();
    expect(typabilityConfigDigestInput()).toBe(digest);
    expect(digest).toContain(`boundary.typicalMax=${BAND_BOUNDARIES.typicalMax}`);
    expect(digest.endsWith("\n")).toBe(true);
  });

  it("does not mutate the caller's input object", () => {
    const input = { text: SAMPLES[0]!.text, family: "PROSE", language: "en" };
    const before = JSON.stringify(input);
    typabilityBand(input);
    explainTypabilityBand(input);
    typabilityFeatures(input.text);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("finds no forbidden non-determinism source in src/", () => {
    const findings: string[] = [];
    for (const file of sourceFiles()) {
      const code = stripComments(file.text);
      for (const [pattern, why] of FORBIDDEN) {
        if (pattern.test(code)) findings.push(`${file.name}: ${why}`);
      }
    }
    expect(findings).toEqual([]);
  });

  it("reads the whole source tree, so the scan cannot pass by matching nothing", () => {
    expect(sourceFiles().length).toBeGreaterThanOrEqual(8);
  });

  it("carries no mojibake, so a mangled comment cannot hide a mangled rule", () => {
    const mangled = sourceFiles()
      .filter((file) => file.text.includes("\uFFFD"))
      .map((file) => file.name);
    expect(mangled).toEqual([]);
  });

  it("detects the forbidden sources, so the scan above is not vacuous", () => {
    // Control: the same pattern list, applied to source text that does contain a
    // violation. If this ever came back empty, the scan would prove nothing.
    const bad = stripComments("const seed = Math.random(); export { seed };");
    const matched = FORBIDDEN.filter(([pattern]) => pattern.test(bad)).map(([, why]) => why);
    expect(matched).toContain("Math.random: unseeded, unreproducible");
    const badProcess = stripComments("const home = process.env.HOME;");
    expect(FORBIDDEN.some(([pattern]) => pattern.test(badProcess))).toBe(true);
    // And the rule the word list forced: an English vocabulary entry must not trip it.
    expect(FORBIDDEN.some(([pattern]) => pattern.test("process procedure"))).toBe(false);
  });

  it("detects an output difference, so the identity assertions above are not vacuous", () => {
    const a = typabilityBand({ text: "the cat sat on the mat", family: "PROSE", language: "en" });
    const b = typabilityBand({ text: "THE CAT SAT ON THE MAT", family: "PROSE", language: "en" });
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });
});
