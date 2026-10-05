/**
 * The determinism rules, checked on the source itself (CNT-05's headline requirement).
 *
 * A behavioural test can prove that output *happened* to be stable today. This one
 * proves the forbidden sources are not even present, which is what stops a future edit
 * from adding `Date.now()` to "make dates look realistic" and only being caught by
 * someone comparing two runs a year apart.
 *
 * Reading files is a test-time concern only: `src/` must stay import-time pure, which
 * is the other half of the rule.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SRC_DIR = join(import.meta.dirname, "..", "src");

function sourceFiles(): Array<{ name: string; text: string }> {
  return readdirSync(SRC_DIR)
    .filter((name) => name.endsWith(".ts"))
    .sort()
    .map((name) => ({ name, text: readFileSync(join(SRC_DIR, name), "utf8") }));
}

/**
 * Comments are stripped before scanning, so a file may *discuss* `Math.random` or
 * `Buffer` (several of these modules do) without failing the rule it is documenting.
 */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const FORBIDDEN: ReadonlyArray<readonly [RegExp, string]> = [
  [/Math\s*\.\s*random/, "Math.random: unseeded, unreproducible"],
  [/\bDate\s*\.\s*now/, "Date.now: wall-clock reads are not a seed"],
  [/new\s+Date\s*\(/, "new Date(): the clock is not a seed, and it moves"],
  [/performance\s*\.\s*now/, "performance.now: timing, not content"],
  [/crypto\b/, "crypto: unpredictable by design, so not reproducible"],
  [/from\s+["']node:/, "node: imports: this package runs in the browser too"],
  [/\brequire\s*\(/, "require: ESM only"],
  [/\bprocess\b/, "process: not available in the browser"],
  [/\bglobalThis\b/, "globalThis: hidden global state"],
  [/\bBuffer\b/, "Buffer: not available in the browser"],
  [/\bbtoa\b|\batob\b/, "base64 globals are not available everywhere; use ./safety.ts"],
  [/\bDateTimeFormat\b/, "Intl: locale-dependent output would not be byte-identical"],
];

describe("CNT-05 source-level determinism rules", () => {
  it("finds the forbidden non-determinism sources in src/", () => {
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
    // Failing direction: an empty file list would make the assertion above trivially
    // true. Twelve modules is the current count; the floor just catches a broken path.
    expect(sourceFiles().length).toBeGreaterThanOrEqual(10);
  });

  it("carries no mojibake, so a mangled comment cannot hide a mangled rule", () => {
    // U+FFFD in a source file means an encoding round-trip lost a character on the way
    // in. It is invisible in review (the comment still reads) and it is how a
    // `master-spec 7.1` citation becomes `master-spec ??7.1`.
    const mangled = sourceFiles()
      .filter((file) => file.text.includes("\uFFFD"))
      .map((file) => file.name);
    expect(mangled).toEqual([]);
  });

  it("documents the determinism rule where the PRNG is implemented", () => {
    const prng = readFileSync(join(SRC_DIR, "prng.ts"), "utf8");
    expect(prng).toContain("Math.imul");
    expect(prng).toContain("sfc32");
  });

  it("keeps the version constant that stored drills are pinned to", () => {
    const shared = readFileSync(join(SRC_DIR, "shared.ts"), "utf8");
    expect(shared).toMatch(/GENERATORS_VERSION = "\d+\.\d+\.\d+"/);
  });
});
