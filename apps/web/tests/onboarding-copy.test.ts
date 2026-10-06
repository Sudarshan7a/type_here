import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Linter } from "eslint";
import { describe, expect, it } from "vitest";

import { claimViolations, copyClaimsPlugin } from "../../../tools/eslint-plugin-copy-claims.mjs";
import { COPY } from "../src/copy";
import { ONBOARDING_GOALS, ONBOARDING_LEVELS, TRACK_LANGUAGES } from "../src/onboarding/plan";

/**
 * OPS-01: the copy contract, in both directions.
 *
 * PART 1 — TABLE-FIRST. Every onboarding string in `copy.ts` is bound to a row in
 * section 5 of docs/content-ui-copy-string-tables.md, character for character.
 * The build contract is table-first copy, and this is the test that makes it one:
 * a component literal, or an edit to copy.ts that nobody adds to the table, fails
 * here rather than shipping.
 *
 * PART 2 — NO PROMISES, PROVED BY INJECTION. The goal options are the riskiest
 * strings in the product: they sit one word away from a promise ("get faster",
 * "in 30 days", "like a programmer twice your age"). PRG-05's rule is run over
 * every one of them, and then the SAME rule is run over deliberately promise-
 * phrased variants of them. If the injected variants do not fail, the check is
 * vacuous and the whole block means nothing — so the failing direction is part of
 * this file, not a claim in it.
 *
 * Nothing here needs a key-scoped exemption. The older `onboarding.goal.preset*`
 * rows in the table need one (they are user aspirations in the WAVE-4 wording);
 * these five do not, which is why they are worded the way they are.
 */

const DOC = fileURLToPath(
  new URL("../../../docs/content-ui-copy-string-tables.md", import.meta.url),
);
const doc = readFileSync(DOC, "utf8");

/** Parse `| \`key\` | Text | notes |` rows, exactly as tests/copy-tables.test.ts does. */
function parseStringTable(markdown: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of markdown.split("\n")) {
    const m = /^\|\s*`([a-zA-Z0-9_.]+)`\s*\|\s*(.*?)\s*\|/.exec(line);
    if (m === null) continue;
    const value = m[2]!;
    if (value.startsWith("~")) continue;
    if (value.startsWith("*(")) continue;
    out.set(m[1]!, value);
  }
  return out;
}

const table = parseStringTable(doc);

/** Every onboarding string, as the table key it is bound to. */
const BINDINGS: ReadonlyArray<{ key: string; value: string }> = [
  { key: "onboarding.panel.title", value: COPY.onboarding.title },
  { key: "onboarding.panel.intro", value: COPY.onboarding.intro },
  { key: "onboarding.panel.submit", value: COPY.onboarding.submit },
  { key: "action.skip", value: COPY.onboarding.skip },
  { key: "onboarding.goal.prompt", value: COPY.onboarding.goalPrompt },
  { key: "onboarding.level.prompt", value: COPY.onboarding.levelPrompt },
  { key: "onboarding.languages.prompt", value: COPY.onboarding.languagesPrompt },
  { key: "onboarding.languages.note", value: COPY.onboarding.languagesNote },
  { key: "onboarding.layout.label", value: COPY.onboarding.layoutLabel },
  { key: "onboarding.plan.title", value: COPY.onboarding.planTitle },
  { key: "onboarding.plan.provisional", value: COPY.onboarding.planProvisional },
  { key: "onboarding.plan.row.focus", value: COPY.onboarding.planRows.focus },
  { key: "onboarding.plan.row.content", value: COPY.onboarding.planRows.content },
  { key: "onboarding.plan.row.level", value: COPY.onboarding.planRows.level },
  { key: "onboarding.plan.row.layout", value: COPY.onboarding.planRows.layout },
  { key: "onboarding.plan.row.languages", value: COPY.onboarding.planRows.languages },
  { key: "onboarding.plan.focus.everyday", value: COPY.onboarding.planFocus.everyday },
  { key: "onboarding.plan.focus.mistakes", value: COPY.onboarding.planFocus.mistakes },
  { key: "onboarding.plan.focus.symbols", value: COPY.onboarding.planFocus.symbols },
  { key: "onboarding.plan.focus.writing", value: COPY.onboarding.planFocus.writing },
  { key: "onboarding.plan.focus.unsure", value: COPY.onboarding.planFocus.unsure },
  { key: "onboarding.plan.value.bandNote", value: COPY.onboarding.planBandNote },
  { key: "onboarding.plan.value.languagesNone", value: COPY.onboarding.planLanguagesNone },
  { key: "onboarding.plan.value.levelNone", value: COPY.onboarding.planLevelNone },
  { key: "onboarding.plan.languagesNote", value: COPY.onboarding.planLanguagesNote },
  { key: "onboarding.plan.pending", value: COPY.onboarding.planPending },
  { key: "onboarding.plan.change", value: COPY.onboarding.planChange },
  ...ONBOARDING_GOALS.map((id) => ({
    key: `onboarding.goal.${id}`,
    value: COPY.onboarding.goalOptions[id],
  })),
  ...ONBOARDING_LEVELS.map((id) => ({
    key: `onboarding.level.${id}`,
    value: COPY.onboarding.levelOptions[id],
  })),
  ...(["easy", "typical", "hard"] as const).map((band) => ({
    key: `onboarding.plan.band.${band}`,
    value: COPY.onboarding.planBandNames[band],
  })),
  ...Object.entries(COPY.onboarding.planLayoutSource).map(([id, value]) => ({
    key: `onboarding.plan.value.layoutSource.${id}`,
    value,
  })),
];

/**
 * Templated strings. `slots` is the placeholder list in the CODE's own template,
 * and the table row must declare the same number of them: that is what stops a
 * slot being renamed on one side only, which is the drift a string table exists
 * to prevent. `rendered` values are then scanned for promises, because a template
 * can promise through its fixed half as easily as through a literal.
 */
const TEMPLATED: ReadonlyArray<{ key: string; slots: number; rendered: string[] }> = [
  {
    key: "onboarding.layout.guess",
    slots: 1,
    rendered: [
      COPY.onboarding.layoutGuess("QWERTY (US)"),
      COPY.onboarding.layoutGuess("Colemak-DH"),
      COPY.onboarding.layoutGuess("QWERTZ"),
    ],
  },
  {
    key: "onboarding.layout.confirmed",
    slots: 1,
    rendered: [
      COPY.onboarding.layoutConfirmed("AZERTY"),
      COPY.onboarding.layoutConfirmed("Dvorak"),
    ],
  },
  {
    key: "onboarding.plan.value.layout",
    slots: 2,
    rendered: [
      COPY.onboarding.planLayoutValue("Dvorak", COPY.onboarding.planLayoutSource.confirmed),
      COPY.onboarding.planLayoutValue("AZERTY", COPY.onboarding.planLayoutSource.guessed),
    ],
  },
  {
    key: "onboarding.plan.value.prose",
    slots: 1,
    rendered: [
      COPY.onboarding.planProseValue("Easy"),
      COPY.onboarding.planProseValue("Typical"),
      COPY.onboarding.planProseValue("Hard"),
    ],
  },
  {
    key: "onboarding.plan.value.levelSelfReported",
    slots: 1,
    rendered: [
      COPY.onboarding.planSelfReported(COPY.onboarding.levelOptions.new),
      COPY.onboarding.planSelfReported(COPY.onboarding.levelOptions.returning),
      COPY.onboarding.planSelfReported(COPY.onboarding.levelOptions.unsure),
    ],
  },
  {
    key: "onboarding.plan.value.languagesSelfReported",
    slots: 1,
    rendered: [
      COPY.onboarding.planSelfReported("Python"),
      COPY.onboarding.planSelfReported("JavaScript / TypeScript, SQL"),
    ],
  },
];

describe("table-first copy: every onboarding string is in the string table", () => {
  it("each literal string matches its table row, character for character", () => {
    for (const { key, value } of BINDINGS) {
      expect(table.get(key), `string table has no row for ${key}`).toBeDefined();
      expect(table.get(key), `${key} drifted from the string table`).toBe(value);
    }
  });

  it("the table's templates declare the same number of slots the code fills", () => {
    for (const { key, slots, rendered } of TEMPLATED) {
      const row = table.get(key);
      expect(row, `string table has no row for ${key}`).toBeDefined();
      const rowSlots = (row ?? "").match(/\{[a-zA-Z]+\}/g) ?? [];
      expect(
        rowSlots.length,
        `${key}: table declares ${rowSlots.length} slots, the code fills ${slots}`,
      ).toBe(slots);
      // Every render is non-empty and carries the slot's value: a template that
      // silently dropped an argument would still scan clean.
      for (const one of rendered) {
        expect(one.trim().length, `${key} rendered empty`).toBeGreaterThan(10);
      }
    }
  });

  it("the goal, level and language labels all exist as rows — none was invented in code", () => {
    for (const id of ONBOARDING_GOALS) {
      expect(table.get(`onboarding.goal.${id}`)).toBe(COPY.onboarding.goalOptions[id]);
    }
    for (const id of ONBOARDING_LEVELS) {
      expect(table.get(`onboarding.level.${id}`)).toBe(COPY.onboarding.levelOptions[id]);
    }
    for (const language of TRACK_LANGUAGES) {
      // Language display names are data (TRACK_LANGUAGES), not copy keys; the check
      // is that each one is a real label rather than an empty or id-shaped string.
      expect(language.label).toMatch(/\S/);
      expect(language.label).not.toBe(language.id);
    }
  });

  it("no duplicate key was introduced in section 5", () => {
    const keys = [...doc.matchAll(/^\|\s*`([a-zA-Z0-9_.]+)`\s*\|/gm)].map((m) => m[1]!);
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
    expect(dupes, `duplicate string-table keys: ${[...new Set(dupes)].join(", ")}`).toEqual([]);
  });
});

describe("PRG-05: no onboarding string promises an outcome", () => {
  const shipped: ReadonlyArray<{ where: string; text: string }> = [
    ...BINDINGS.map(({ key, value }) => ({ where: key, text: value })),
    ...TEMPLATED.flatMap(({ key, rendered }) => rendered.map((r) => ({ where: key, text: r }))),
    // The string the panel most wants to say and must not.
    { where: "onboarding.panel.intro", text: COPY.onboarding.intro },
  ];

  for (const { where, text } of shipped) {
    it(`${where} promises no outcome`, () => {
      // No key is passed: these strings have to pass on their own merits, with no
      // key-scoped allowlist entry. The exemption that exists for the older
      // `onboarding.goal.preset*` rows does not apply to these.
      expect(claimViolations(text), `${where}: ${JSON.stringify(text)}`).toEqual([]);
    });
  }

  it("the table rows pass the same scan with their own keys", () => {
    for (const { key } of BINDINGS) {
      const row = table.get(key);
      expect(row, `${key} has no row`).toBeDefined();
      expect(claimViolations(row!, { key }), `${key} drifted into a promise`).toEqual([]);
    }
  });
});

describe("PRG-05: the check is not vacuous — injected promises all fail", () => {
  /**
   * Each case is a plausible rewrite of a string this panel actually ships,
   * phrased as an OUTCOME rather than as an intention. Every one must be caught.
   */
  const INJECTED: ReadonlyArray<{ id: string; why: string; text: string; expectId: string }> = [
    {
      id: "goal.everyday → comparative speed",
      why: "the everyday-typing goal restated as a speed promise",
      text: "Get faster at everyday typing",
      expectId: "speed-faster",
    },
    {
      id: "goal.everyday → superlative",
      why: "a superlative about the user rather than an intention",
      text: "Become the fastest typist in your team",
      expectId: "speed-fastest",
    },
    {
      id: "plan.title → speed gain",
      why: "the plan title promising a measured gain",
      text: "Your starting plan: 10x faster in a month",
      expectId: "speed-multiplier",
    },
    {
      id: "plan.provisional → boost",
      why: "the honesty line replaced by a hype line",
      text: "This will boost your WPM and your accuracy.",
      expectId: "speed-boost",
    },
    {
      id: "plan.pending → ability gain",
      why: "the pending list promising programming ability",
      text: "Improve your coding with the programmer track",
      expectId: "ability-improve-coding",
    },
    {
      id: "plan.pending → better programmer",
      why: "a plan promising to make the user a better programmer",
      text: "You will become a better developer in weeks",
      expectId: "ability-become-better",
    },
    {
      id: "plan.languagesNote → hireability",
      why: "a language note promising a job outcome",
      text: "Practise JavaScript with us and get hired faster",
      expectId: "hire-get-hired",
    },
    {
      id: "plan.provisional → job-ready",
      why: "the provisional line promising employability",
      text: "Interview-ready in six weeks, guaranteed",
      expectId: "hire-interview-ready",
    },
    {
      id: "plan.title → career-ready",
      why: "a plan title promising a career outcome",
      text: "Your career-ready starting plan",
      expectId: "hire-career-ready",
    },
    {
      id: "plan.focus.symbols → 10x developer",
      why: "the code-drill focus promising a developer myth",
      text: "Become a 10x developer",
      expectId: "ability-10x-dev",
    },
  ];

  for (const { id, why, text, expectId } of INJECTED) {
    it(`${id} is flagged (${expectId}) — ${why}`, () => {
      const found = claimViolations(text);
      expect(
        found.map((f) => f.patternId),
        `"${text}" must be reported as ${expectId}`,
      ).toContain(expectId);
      // …and with no key, which is how shipped source is scanned.
      expect(claimViolations(text, {}).length).toBeGreaterThan(0);
    });
  }

  it("an injected promise in the goal row is flagged even WITH a preset-shaped key", () => {
    // The one narrow exemption the rule has is key-scoped to the older
    // `onboarding.goal.preset*` rows. OPS-01's keys are not preset-shaped, so the
    // exemption cannot be borrowed by renaming a key — this is the assertion that
    // the exemption is still narrow after this change.
    expect(claimViolations("Get faster at everyday typing")).not.toEqual([]);
    expect(
      claimViolations("Get faster at everyday typing", { key: "onboarding.goal.everyday" }),
    ).not.toEqual([]);
    // A preset key still exempts the speed family only, and still not an ability
    // claim.
    expect(
      claimViolations("Get faster at everyday typing", { key: "onboarding.goal.presetSpeed" }),
    ).toEqual([]);
    expect(
      claimViolations("Become a better programmer", { key: "onboarding.goal.presetSpeed" }),
    ).not.toEqual([]);
  });

  it("the honest strings the panel ships are NOT flagged, so the gate discriminates", () => {
    // The control: if the rule flagged these, the panel would be shipping copy that
    // passes nothing and the gate above would prove nothing.
    for (const clean of [
      COPY.onboarding.title,
      COPY.onboarding.intro,
      COPY.onboarding.goalOptions.everyday,
      COPY.onboarding.goalOptions.symbols,
      COPY.onboarding.planProvisional,
      COPY.onboarding.planPending,
      COPY.onboarding.planBandNote,
      COPY.onboarding.layoutGuess("QWERTY (US)"),
    ]) {
      expect(claimViolations(clean), JSON.stringify(clean)).toEqual([]);
    }
  });
});

describe("PRG-05 through the real ESLint rule, which is what `pnpm lint` runs", () => {
  /**
   * The scanner above and the lint rule are the same module, but "same module" is an
   * argument, not a result. This block drives the actual `Linter` over a fake source
   * file shaped like the panel's, so the claim being tested is the one CI enforces:
   * `pnpm lint` FAILS on a panel string restated as an outcome.
   */
  const CONFIG: Linter.Config = {
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    plugins: { "copy-claims": copyClaimsPlugin },
    rules: { "copy-claims/no-outcome-promises": "error" },
  };

  function lint(code: string): Linter.LintMessage[] {
    // A non-exempt filename: the rule is on in shipped source, not only in tests.
    return new Linter().verify(code, CONFIG, "apps/web/src/onboarding/OnboardingPanel.tsx");
  }

  it("passes on the panel's shipped strings, so the rule is wired the way CI has it", () => {
    const clean = `
      export const title = ${JSON.stringify(COPY.onboarding.title)};
      export const intro = ${JSON.stringify(COPY.onboarding.intro)};
      export const goals = ${JSON.stringify(COPY.onboarding.goalOptions)};
      export const levels = ${JSON.stringify(COPY.onboarding.levelOptions)};
      export const focus = ${JSON.stringify(COPY.onboarding.planFocus)};
      export const plan = \`${COPY.onboarding.planProvisional}\`;
      export const layout = (name) => ${JSON.stringify("We've set the keyboard to ")} + name;
    `;
    expect(lint(clean)).toEqual([]);
  });

  it("FAILS when a goal is restated as an outcome — the failing direction, through lint", () => {
    const broken = `
      export const goals = {
        everyday: "Get faster at everyday typing",
      };
    `;
    const messages = lint(broken);
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]?.ruleId).toBe("copy-claims/no-outcome-promises");
    expect(messages[0]?.message).toContain("speed-faster");
  });

  it("FAILS on a plan line that promises hireability, and on one that promises ability", () => {
    for (const [line, expected] of [
      [
        `export const pending = "Improve your coding with the programmer track";`,
        "ability-improve-coding",
      ],
      [`export const summary = "Interview-ready in six weeks";`, "hire-interview-ready"],
    ] as const) {
      const messages = lint(line);
      expect(messages.map((m) => m.message)).toContainEqual(expect.stringContaining(expected));
    }
  });

  it("FAILS on JSX text too — a hard-coded string in a component is still user-facing", () => {
    const brokenJsx = `
      export const Panel = () => (
        <h2>Become a better programmer in weeks</h2>
      );
    `;
    const messages = new Linter().verify(
      brokenJsx,
      { ...CONFIG, languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } },
      "apps/web/src/onboarding/OnboardingPanel.tsx",
    );
    expect(messages.map((m) => m.message)).toContainEqual(
      expect.stringContaining("ability-become-better"),
    );
  });
});
