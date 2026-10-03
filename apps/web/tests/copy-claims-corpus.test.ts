import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { claimViolations, scanCopyText } from "../../../tools/eslint-plugin-copy-claims.mjs";
import { COPY } from "../src/copy";

/**
 * PRG-05 corpus test: the user-facing copy itself must contain no outcome
 * promises (speed gains, ability gains, hireability).
 *
 * Two corpora, one shared scanner (tools/eslint-plugin-copy-claims.mjs — the
 * same module the ESLint rule uses, so the rule and this test cannot drift):
 *
 * 1. docs/content-ui-copy-string-tables.md — every shipped or planned string.
 *    ESLint cannot lint Markdown without a processor (and no new dependencies
 *    are allowed), so the tables are enforced here instead. Scope is the whole
 *    file, line by line: Text cells are the copy; Notes cells are authorial
 *    meta-discussion that must be free to quote the ban to forbid it (handled
 *    by the ban-discourse allowlist, pinned below).
 * 2. apps/web/src/copy.ts values — belt and braces alongside the ESLint rule:
 *    proves the shipped surface strings are clean even if lint wiring breaks.
 *
 * Out of scope by design (documented, not overlooked):
 * - Spec/guide docs (master-spec, implementation-guide, playbooks) must define
 *   the ban, which requires quoting it ("become a better programmer").
 * - content/** passages and quotes are typed material, not product promises;
 *   censoring vocabulary there would corrupt the typing content itself.
 * - Prototypes are throwaway pre-pipeline explorations, not shipped copy.
 */

const TABLES_DOC = fileURLToPath(
  new URL("../../../docs/content-ui-copy-string-tables.md", import.meta.url),
);

function tableLines(): Array<{ line: number; key: string; text: string }> {
  const raw = readFileSync(TABLES_DOC, "utf8");
  const out: Array<{ line: number; key: string; text: string }> = [];
  raw.split("\n").forEach((text, index) => {
    if (text.trim() === "") return;
    if (text.includes("~~")) return; // struck-through banned negative examples
    const key = /^\|\s*`([^`]+)`/.exec(text)?.[1] ?? "";
    out.push({ line: index + 1, key, text });
  });
  return out;
}

/** Every string COPY renders, including representative outputs of its functions. */
function shippedCopyStrings(): Array<{ path: string; text: string }> {
  const strings: Array<{ path: string; text: string }> = [];
  const walk = (value: unknown, path: string): void => {
    if (typeof value === "string") {
      strings.push({ path, text: value });
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => walk(item, `${path}[${i}]`));
    } else if (typeof value === "object" && value !== null) {
      for (const [k, v] of Object.entries(value)) walk(v, path === "COPY" ? k : `${path}.${k}`);
    }
  };
  walk(COPY, "COPY");
  // Representative renders of the function-valued strings (real shapes, benign data).
  strings.push(
    { path: "announceTestFinished", text: COPY.announceTestFinished("62.4", "98.9") },
    { path: "headlineNetWpm", text: COPY.headlineNetWpm(62.4) },
    { path: "headlineAccuracy", text: COPY.headlineAccuracy(98.9) },
    { path: "engineStamp", text: COPY.engineStamp("1.0-test") },
    { path: "replayTime", text: COPY.replayTime("12.3", "60.0") },
    { path: "replayErrorsSome(1)", text: COPY.replayErrorsSome(1, "position 5") },
    { path: "replayErrorsSome(2)", text: COPY.replayErrorsSome(2, "positions 5, 9") },
  );
  return strings;
}

describe("PRG-05 corpus: string tables promise no outcome", () => {
  it("no line carries an unallowlisted outcome promise", () => {
    const problems = tableLines().flatMap(({ line, key, text }) =>
      claimViolations(text, { key }).map(
        (v) => `line ${line} [${key || "prose"}] ${v.patternId} (${v.category}): "${v.match}"`,
      ),
    );
    expect(problems, `outcome promises in string tables:\n${problems.join("\n")}`).toEqual([]);
  });

  it("triage pins: the three known allowlisted lines still match only their entry", () => {
    const byKey = new Map(tableLines().map((l) => [l.key || `line:${l.line}`, l]));

    // 1. Measured past delta, not a future promise (past-measurement).
    const delta = byKey.get("onboarding.postDrill.delta.improved")!;
    const deltaFindings = scanCopyText(delta.text, { key: delta.key });
    expect(deltaFindings.length).toBeGreaterThan(0);
    for (const f of deltaFindings) expect(f.allowlistedBy).toEqual(["past-measurement"]);

    // 2. User-aspiration goal preset, not a product delivery claim (user-goal-preset).
    const preset = byKey.get("onboarding.goal.presetSpeed")!;
    const presetFindings = scanCopyText(preset.text, { key: preset.key });
    expect(presetFindings.length).toBeGreaterThan(0);
    for (const f of presetFindings) expect(f.allowlistedBy).toEqual(["user-goal-preset"]);

    // 3. Note quoting the ban to forbid it (ban-discourse).
    const subtitle = byKey.get("code.hub.subtitle")!;
    const subtitleFindings = scanCopyText(subtitle.text, { key: subtitle.key });
    expect(subtitleFindings.length).toBeGreaterThan(0);
    for (const f of subtitleFindings) {
      expect(f.allowlistedBy).toContain("ban-discourse");
    }
    expect(claimViolations(subtitle.text, { key: subtitle.key })).toEqual([]);
  });

  it("banned negative examples stay struck-through (not silently promoted to copy)", () => {
    const raw = readFileSync(TABLES_DOC, "utf8");
    for (const key of [
      "notification.bannedExample.doNotUse1",
      "notification.bannedExample.doNotUse2",
    ]) {
      const line = raw.split("\n").find((l) => l.includes(key));
      expect(line, `${key} row must still exist`).toBeDefined();
      expect(line).toMatch(/~~/);
    }
  });
});

describe("PRG-05 corpus: shipped copy.ts values promise no outcome", () => {
  it("every COPY string and representative function render is clean", () => {
    const problems = shippedCopyStrings().flatMap(({ path, text }) =>
      claimViolations(text).map((v) => `${path}: ${v.patternId} (${v.category}): "${v.match}"`),
    );
    expect(problems, `outcome promises in copy.ts:\n${problems.join("\n")}`).toEqual([]);
  });
});
