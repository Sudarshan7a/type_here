/**
 * Stage A enforcement (master-spec §6.2: "Output Easy / Typical / Hard bands.
 * **No score multiplication yet.**").
 *
 * A promise in a document is not an enforcement. These tests make the prohibition
 * checkable, in three layers:
 *
 *   1. The verdict carries no number. `TypabilityVerdict` has no score field, so
 *      the product path cannot multiply by one even by accident.
 *   2. The numeric score is not exported from the package barrel. Reaching it
 *      requires importing a private module path, and this test asserts that no
 *      file outside this package does that.
 *   3. Nothing in the repository multiplies a speed-like quantity by a typability
 *      quantity. The scan covers apps/, packages/ and scripts/, so a future PR that
 *      reaches for the score to "normalise" a result turns CI red instead of
 *      quietly shipping Stage B behaviour under a Stage A label.
 *
 * The control at the end proves the two scans can fail.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { explainTypabilityBand, typabilityBand } from "../src/index.ts";

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");

/** Text one might legitimately write when implementing Stage B by accident. */
const MULTIPLICATION_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [
    /\b(?:net|gross|raw|r)?wpm\s*[*x\u00d7]\s*[A-Za-z_$][\w.$]*\s*(?:typab|difficult|score|band)/i,
    "WPM multiplied by a typability quantity: that is Stage B (master-spec 6.2), which needs a fitted beta and a published fit statistic",
  ],
  [
    /[A-Za-z_$][\w.$]*(?:Typab|Difficult|Score)[A-Za-z_$]*\s*[*x\u00d7]\s*(?:net|gross|raw|r)?wpm/i,
    "typability quantity multiplied into WPM: same prohibition, other side of the operator",
  ],
  [
    /\bexp\s*\(\s*(?:beta|\u03b2|BETA)\s*[*x\u00d7]?/,
    "the rWPM exponential from Stage B: it may not be built before the data exists",
  ],
];

function repoSourceFiles(): Array<{ name: string; text: string }> {
  const skip = new Set([
    "node_modules",
    "dist",
    "coverage",
    ".git",
    "playwright-report",
    "test-results",
  ]);
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      if (skip.has(entry.name)) return [];
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return walk(path);
      return /\.(ts|tsx|mjs|js)$/.test(entry.name) ? [path] : [];
    });
  return ["apps", "packages", "scripts"]
    .map((area) => join(REPO_ROOT, area))
    .filter((dir) => {
      try {
        return readdirSync(dir).length >= 0;
      } catch {
        return false;
      }
    })
    .flatMap((dir) => walk(dir))
    .sort()
    .map((path) => ({
      name: path.slice(REPO_ROOT.length + 1).replaceAll("\\", "/"),
      text: readFileSync(path, "utf8"),
    }));
}

/** Comments stripped, so a file may quote the prohibition to explain it. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

function withoutOwnPackage(
  files: ReadonlyArray<{ name: string; text: string }>,
): Array<{ name: string; text: string }> {
  return files.filter((file) => !file.name.startsWith("packages/typability/"));
}

describe("CNT-02 Stage A: a band is a label, not a multiplier", () => {
  it("returns no numeric score on the product-facing verdict", () => {
    const verdict = typabilityBand({
      text: "Can you pick up milk on your way home?",
      family: "PROSE",
      language: "en",
    });
    expect(Object.keys(verdict).sort()).toEqual([
      "band",
      "declaredBand",
      "declaredBandAgrees",
      "modelVersion",
      "reason",
      "source",
    ]);
    for (const [key, value] of Object.entries(verdict)) {
      expect(typeof value === "number").toBe(false);
      expect(key.toLowerCase()).not.toContain("score");
    }
  });

  it("does not re-export the scoring core from the package barrel", () => {
    const barrel = readFileSync(join(REPO_ROOT, "packages/typability/src/index.ts"), "utf8");
    expect(barrel).not.toContain('from "./scoring.ts"');
    for (const name of ["weightedScore", "bandForScore", "quantiseScore", "distanceToBoundary"]) {
      expect(barrel).not.toMatch(new RegExp(`\\b${name}\\b`));
    }
  });

  it("reaches the score only through the audit entry point, and never past a distance", () => {
    // Two callers, both build-time, both justified:
    //   scripts/check-typability.mjs   the audit CLI, which prints the score
    //   scripts/corpus-pipeline.mjs    the build, which reads ONLY
    //                                  distanceToBoundary for the churn count
    // The second is the one that matters: the artifact must not carry a score, so
    // the pipeline may look at how close an item is to a boundary and at nothing
    // else.
    const users = withoutOwnPackage(repoSourceFiles()).filter((file) =>
      /explainTypabilityBand/.test(file.text),
    );
    expect(users.map((file) => file.name).sort()).toEqual([
      "scripts/check-typability.mjs",
      "scripts/corpus-pipeline.mjs",
    ]);

    const pipeline = repoSourceFiles().find((file) => file.name === "scripts/corpus-pipeline.mjs");
    expect(pipeline).toBeDefined();
    expect(/explanation\.distanceToBoundary/.test(pipeline!.text)).toBe(true);
    expect(/explanation\.score|\.quantisedScore/.test(pipeline!.text)).toBe(false);

    // And the artifact itself carries no score for any item.
    const artifact = readFileSync(join(REPO_ROOT, "content", "corpus.json"), "utf8");
    expect(/"(score|quantisedScore)"\s*:/.test(artifact)).toBe(false);
  });

  it("finds no typability multiplier anywhere in apps/, packages/ or scripts/", () => {
    // This package is excluded from its own scan, and the reason is stated rather
    // than worked around: `tests/stage-a.test.ts` contains the prohibited shape
    // on purpose, as the control that proves the patterns fire. The package
    // computes no speed metric, so it is also the one place a scan would be
    // meaningless rather than merely noisy.
    const findings: string[] = [];
    for (const file of withoutOwnPackage(repoSourceFiles())) {
      const source = code(file.text);
      for (const [pattern, why] of MULTIPLICATION_PATTERNS) {
        if (pattern.test(source)) findings.push(`${file.name}: ${why}`);
      }
    }
    expect(findings).toEqual([]);
  });

  it("carries the score on the audit explanation only, and only for review", () => {
    const explanation = explainTypabilityBand({
      text: "Can you pick up milk on your way home?",
      family: "PROSE",
      language: "en",
    });
    expect(typeof explanation.score).toBe("number");
    expect(Number.isFinite(explanation.score)).toBe(true);
    expect(explanation.band).not.toBeNull();
  });

  it("detects a multiplication, so the scan above is not vacuous", () => {
    // Control: the same patterns applied to code that does multiply.
    const bad = "const adjusted = netWpm * typabilityScore;";
    const matched = MULTIPLICATION_PATTERNS.filter(([pattern]) => pattern.test(bad)).map(
      ([, why]) => why,
    );
    expect(matched.length).toBeGreaterThan(0);
    const worse = "const r = netWpm * Math.exp(beta * (T_ref - T_text));";
    expect(MULTIPLICATION_PATTERNS.some(([pattern]) => pattern.test(worse))).toBe(true);
  });

  it("detects a deep import of the scoring core, so the barrel assertion is not vacuous", () => {
    const barrel = readFileSync(join(REPO_ROOT, "packages/typability/src/index.ts"), "utf8");
    const leaky = `${barrel}\nexport { weightedScore } from "./scoring.ts";\n`;
    expect(leaky).toContain("./scoring.ts");
    const consumers = withoutOwnPackage(repoSourceFiles()).filter((file) =>
      /typability\/src\/scoring/.test(file.text),
    );
    expect(consumers).toEqual([]);
  });
});
