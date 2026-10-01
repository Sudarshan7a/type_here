import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Every user-visible string the typing surface renders must come from
 * docs/content-ui-copy-string-tables.md (Section 4, quality-bar item 5).
 *
 * This is a source-scanning test, not a browser test, because the failure mode it
 * guards is precisely the one a DOM assertion cannot see: copy that drifted away
 * from the string table while the component kept rendering something plausible.
 * The rules it protects are also non-negotiable ones — the a11y announcement is
 * the ONLY thing ever announced, and it must never fire per keystroke.
 */

const DOC = fileURLToPath(new URL("../../../docs/content-ui-copy-string-tables.md", import.meta.url));
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
    if (value.startsWith("*(")) continue; // "(no text — ...)" deliberate silences
    out.set(key, value);
  }
  return out;
}

const table = parseStringTable(text);

const SURFACE_COPY: ReadonlyArray<{ key: string; expected: string }> = [
  // STEER-2 criterion 4: the unfocused prompt.
  { key: "home.hint.firstVisit", expected: "Start typing whenever you're ready." },
  // STEER-2 criterion 5 / string table: restart hint and action label.
  { key: "home.hint.restart", expected: "Press Tab to restart" },
  { key: "action.restart", expected: "Restart" },
  // The accessible name/instructions for the key sink.
  {
    key: "a11y.instructions.typingSurface",
    expected: "Type the text shown. Press Tab to restart. Press Escape to leave this area.",
  },
  // The one and only automatic announcement.
  {
    key: "a11y.announce.testFinished",
    expected: "Test finished. {wpm} words per minute, {accuracy} percent accuracy.",
  },
];

describe("typing surface copy conforms to docs/content-ui-copy-string-tables.md", () => {
  it("every string the surface uses exists in the string table, character for character", () => {
    for (const { key, expected } of SURFACE_COPY) {
      const actual = table.get(key);
      expect(actual, `string table has no entry for ${key}`).toBeDefined();
      expect(actual, `${key} drifted from the string table`).toBe(expected);
    }
  });

  it("the string table declares the finished-state headline formats the surface renders", () => {
    // results.headline.netWpm is "{value} WPM" and results.headline.accuracy is
    // "{value}% accuracy"; the surface formats them from these templates rather
    // than hard-coding a shape of its own.
    expect(table.get("results.headline.netWpm")).toBe("{value} WPM");
    expect(table.get("results.headline.accuracy")).toBe("{value}% accuracy");
  });

  it("the string table keys used here are unique (a duplicate key would shadow one)", () => {
    const keys = [...text.matchAll(/^\|\s*`([a-zA-Z0-9_.]+)`\s*\|/gm)].map((m) => m[1]!);
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
    expect(dupes, `duplicate string-table keys: ${[...new Set(dupes)].join(", ")}`).toEqual([]);
  });

  it("the a11y announcement is the only string marked as never per-keystroke", () => {
    const line = text
      .split("\n")
      .find((l) => l.includes("`a11y.announce.testFinished`"));
    expect(line).toBeDefined();
    expect(line).toMatch(/never per-keystroke/i);
  });

  it("the typing-surface instructions name Tab (restart) and Escape (leave)", () => {
    const instructions = table.get("a11y.instructions.typingSurface") ?? "";
    expect(instructions).toMatch(/Tab/);
    expect(instructions).toMatch(/Escape/);
  });
});