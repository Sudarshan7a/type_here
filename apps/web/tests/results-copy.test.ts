import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { COPY } from "../src/copy";
import { DETAIL_METRICS, splitAtLabel } from "../src/results/metrics";

/**
 * ANA-01 copy conformance, and the copy-claims audit for this screen's strings.
 *
 * `tests/copy-tables.test.ts` already pins the surface's strings against
 * docs/content-ui-copy-string-tables.md. This file does the same job for the
 * results screen's own rows, because that file is not mine to edit and a string
 * nobody reviews is a string that drifts. It also runs the PRG-05 claims scanner
 * over exactly the strings this screen renders, so the copy-claims rule is
 * confirmed on the results copy and not merely assumed from `pnpm lint`.
 *
 * The scanner is the same module the ESLint rule imports
 * (tools/eslint-plugin-copy-claims.mjs), so this cannot pass while the rule would
 * fail.
 */

const DOC = fileURLToPath(
  new URL("../../../docs/content-ui-copy-string-tables.md", import.meta.url),
);
const text = readFileSync(DOC, "utf8");

/** Parse `| \`key\` | Text | notes |` rows out of the string tables. */
function parseStringTable(markdown: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of markdown.split("\n")) {
    const m = /^\|\s*`([a-zA-Z0-9_.]+)`\s*\|\s*(.*?)\s*\|/.exec(line);
    if (m === null) continue;
    const key = m[1]!;
    const value = m[2]!;
    if (value.startsWith("~")) continue; // banned negative examples
    if (value.startsWith("*(")) continue; // deliberate silences
    out.set(key, value);
  }
  return out;
}

const table = parseStringTable(text);

/** Every string-table row the results screen binds, with its exact text. */
const RESULTS_COPY: ReadonlyArray<{ key: string; expected: string }> = [
  { key: "results.title", expected: "Results" },
  { key: "results.headline.classicWpm", expected: "Classic WPM: {value}" },
  { key: "results.details.title", expected: "Details" },
  { key: "results.details.raw", expected: "Raw: {value} WPM" },
  { key: "results.details.consistency", expected: "Consistency: {value}" },
  { key: "results.details.kspc", expected: "Keystrokes per character: {value}" },
  { key: "results.details.rollover", expected: "Rollover: {value}%" },
  { key: "results.details.burst", expected: "Best 5-second burst: {value} WPM" },
  {
    key: "results.details.notReported",
    expected: "Not reported for this test",
  },
  { key: "results.unverified.label", expected: "Practice result (not verified)" },
  {
    key: "results.unverified.local",
    expected:
      "Calculated in this browser from the keystrokes you produced. Nothing was sent anywhere and nothing was saved.",
  },
  { key: "results.short.title", expected: "Short test" },
  {
    key: "results.short.body",
    expected:
      "This test ran for {seconds} seconds. Figures that need at least {minimum} seconds of it are left out.",
  },
  { key: "results.flags.title", expected: "Notes on this test" },
  {
    key: "results.flags.body",
    expected:
      "The engine recorded {notes} while this test ran. The figures above come from the same keystrokes.",
  },
  {
    key: "results.flags.untrusted",
    expected: "input the browser did not mark as trusted",
  },
  {
    key: "results.flags.auto",
    expected: "characters inserted automatically",
  },
  {
    key: "results.flags.verifiedInvalid",
    expected: "input that would disqualify a verified result",
  },
  { key: "results.flags.announce", expected: "This test has notes." },
  { key: "results.offline.label", expected: "Offline" },
  {
    key: "results.offline.note",
    expected:
      "You're offline. This result was calculated in this browser and has not been sent anywhere.",
  },
  {
    key: "results.pending",
    expected:
      "There is no difficulty rating for this passage and no result history to compare against yet.",
  },
  {
    key: "help.shortcuts.resultsEscape",
    expected: "Escape, in the results: close the replay, or return to the passage.",
  },
];

/** The COPY key each table key is bound to, for the ones that are not 1:1. */
const BOUND: ReadonlyArray<{ copy: unknown; key: string }> = [
  { copy: COPY.resultsTitle, key: "results.title" },
  { copy: COPY.resultsDetailsTitle, key: "results.details.title" },
  { copy: COPY.resultsDetailsNotReported, key: "results.details.notReported" },
  { copy: COPY.resultsUnverifiedLabel, key: "results.unverified.label" },
  { copy: COPY.resultsUnverifiedLocal, key: "results.unverified.local" },
  { copy: COPY.resultsShortTitle, key: "results.short.title" },
  { copy: COPY.resultsFlagsTitle, key: "results.flags.title" },
  { copy: COPY.resultsFlagsAnnounce, key: "results.flags.announce" },
  { copy: COPY.resultsOfflineLabel, key: "results.offline.label" },
  { copy: COPY.resultsOfflineNote, key: "results.offline.note" },
  { copy: COPY.resultsPending, key: "results.pending" },
];

describe("results-screen copy conforms to the string table", () => {
  it("every row the screen binds exists in the table, character for character", () => {
    for (const { key, expected } of RESULTS_COPY) {
      const actual = table.get(key);
      expect(actual, `string table has no entry for ${key}`).toBeDefined();
      expect(actual, `${key} drifted from the string table`).toBe(expected);
    }
  });

  it("the bound strings render exactly the table's text", () => {
    for (const { copy, key } of BOUND) {
      const expected = table.get(key)!;
      if (typeof copy !== "string") continue;
      expect(copy, `COPY for ${key} drifted`).toBe(expected);
    }
  });

  it("the template functions fill the table's placeholders with nothing else", () => {
    // Each template is a pure `{slot}` substitution, so filling the table's own
    // placeholders and rendering COPY must agree. This is what makes the
    // `{value}` slots in the table real rather than decorative.
    const substitutions: ReadonlyArray<[string, string, (v: string) => string]> = [
      ["results.headline.classicWpm", "3.4", COPY.resultsClassicWpm],
      ["results.details.raw", "3.4", COPY.resultsDetailsRaw],
      ["results.details.consistency", "3.4", COPY.resultsDetailsConsistency],
      ["results.details.kspc", "3.4", COPY.resultsDetailsKspc],
      ["results.details.rollover", "3.4", COPY.resultsDetailsRollover],
      ["results.details.burst", "3.4", COPY.resultsDetailsBurst],
    ];
    for (const [key, value, template] of substitutions) {
      const slot = table.get(key)!;
      const filled = slot.replace("{value}", value);
      expect(template(value), `${key} does not fill its table template`).toBe(filled);
    }
    const shortSlot = table.get("results.short.body")!;
    expect(COPY.resultsShortBody("1.5", "10.0")).toBe(
      shortSlot.replace("{seconds}", "1.5").replace("{minimum}", "10.0"),
    );
    const flagsSlot = table.get("results.flags.body")!;
    expect(COPY.resultsFlagsBody("a note")).toBe(flagsSlot.replace("{notes}", "a note"));
  });

  it("every figure row splits at its label and rejoins character for character", () => {
    // The `<dl>` renders label and value separately; the string table holds one
    // string. Splitting at the FIRST ": " is the join between them, and these
    // rows are where that join could silently lose a character.
    for (const metric of DETAIL_METRICS) {
      const rendered = metric.template("1.2");
      const { label, value } = splitAtLabel(rendered);
      expect(label.length, `${metric.id} has no label to split`).toBeGreaterThan(0);
      expect(value.length, `${metric.id} has no value`).toBeGreaterThan(0);
      expect(`${label}: ${value}`).toBe(rendered);
      expect(rendered.indexOf(": ")).toBe(label.length);
    }
  });

  it("the shortcuts list names only bindings the screen honours", () => {
    // A shortcut nobody honours is how a shortcuts list starts lying. The
    // results binding must be present, and no placeholder may remain.
    expect(COPY.shortcuts.join(" ")).toContain(table.get("help.shortcuts.resultsEscape")!);
    for (const line of COPY.shortcuts) expect(line).not.toMatch(/\{[a-z]+\}/);
  });
});

describe("PRG-05 claims audit on the results screen's own copy", () => {
  it("no string this screen renders promises an outcome", async () => {
    const { claimViolations } = await import("../../../tools/eslint-plugin-copy-claims.mjs");

    const rendered: Array<{ path: string; text: string }> = [];
    for (const { copy, key } of BOUND) {
      if (typeof copy === "string") rendered.push({ path: key, text: copy });
    }
    for (const [code, words] of Object.entries(COPY.resultsFlagWords)) {
      rendered.push({ path: `resultsFlagWords[${code}]`, text: words });
    }
    // Real renders of every template, with a plausible value.
    rendered.push(
      { path: "resultsClassicWpm", text: COPY.resultsClassicWpm("62.4") },
      { path: "resultsDetailsRaw", text: COPY.resultsDetailsRaw("62.4") },
      { path: "resultsDetailsConsistency", text: COPY.resultsDetailsConsistency("78.1") },
      { path: "resultsDetailsKspc", text: COPY.resultsDetailsKspc("1.04") },
      { path: "resultsDetailsRollover", text: COPY.resultsDetailsRollover("0.0") },
      { path: "resultsDetailsBurst", text: COPY.resultsDetailsBurst("71.2") },
      { path: "resultsShortBody", text: COPY.resultsShortBody("2.0", "10.0") },
      {
        path: "resultsFlagsBody",
        text: COPY.resultsFlagsBody(Object.values(COPY.resultsFlagWords).join(", ")),
      },
      { path: "announceTestFinished", text: COPY.announceTestFinished("62", "98") },
      {
        path: "announceTestFinished(flagged)",
        text: COPY.announceTestFinished("62", "98", ` ${COPY.resultsFlagsAnnounce}`),
      },
      { path: "shortcuts", text: COPY.shortcuts.join(" ") },
    );

    const problems = rendered.flatMap(({ path, text: value }) =>
      claimViolations(value).map((v) => `${path}: ${v.patternId} (${v.category}): "${v.match}"`),
    );
    expect(problems, `outcome promises in the results copy:\n${problems.join("\n")}`).toEqual([]);
  });

  it("the audit is not vacuous — the scanner still rejects a promise", async () => {
    // Non-vacuity. If the scanner were fed an empty string or silently
    // short-circuited, the test above would pass for the wrong reason.
    const { claimViolations } = await import("../../../tools/eslint-plugin-copy-claims.mjs");
    expect(claimViolations("You will type faster after a week.")).not.toEqual([]);
    expect(claimViolations("Become a better programmer.")).not.toEqual([]);
    expect(claimViolations("Get hired with these drills.")).not.toEqual([]);
    // …and the honest phrasings the screen does use are the ones it accepts.
    expect(claimViolations(COPY.resultsUnverifiedLocal)).toEqual([]);
    expect(claimViolations(COPY.resultsPending)).toEqual([]);
  });
});
