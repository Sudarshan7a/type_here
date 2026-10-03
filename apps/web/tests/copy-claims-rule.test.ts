import { describe, expect, it } from "vitest";
import { Linter } from "eslint";
import {
  ALLOWLIST,
  BANNED_PATTERNS,
  claimViolations,
  copyClaimsPlugin,
} from "../../../tools/eslint-plugin-copy-claims.mjs";

/**
 * PRG-05 rule behaviour tests (test-first for the copy-claims lint rule).
 *
 * The rule under test lives in tools/eslint-plugin-copy-claims.mjs and is wired
 * into `pnpm lint` via eslint.config.mjs. These tests drive it through the real
 * ESLint Linter (not a reimplementation), so a green suite means the shipped
 * rule actually flags what it must and stays silent where it must.
 *
 * Coverage contract: every entry in BANNED_PATTERNS has at least one offending
 * fixture below (pinned by the "every pattern is exercised" test), so a pattern
 * added without a test — or a pattern silently removed — fails loudly.
 */

const BASE_CONFIG: Linter.Config = {
  // Flat config only lints extensions that a `files` pattern claims, and `**/*`
  // claims none: without explicit extensions the Linter answers every
  // non-.js filename with a "No matching configuration found" warning (ruleId null)
  // instead of running the rule.
  files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
  plugins: { "copy-claims": copyClaimsPlugin },
  rules: { "copy-claims/no-outcome-promises": "error" },
};

function lintCopy(code: string, filename = "check.js") {
  const linter = new Linter();
  return linter.verify(code, BASE_CONFIG, filename);
}

function lintJsx(code: string) {
  const linter = new Linter();
  return linter.verify(
    code,
    {
      ...BASE_CONFIG,
      languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    },
    "Component.jsx",
  );
}

/** Offending fixtures: each names the pattern id(s) it must trip. */
const OFFENDING_CASES: ReadonlyArray<{ expectIds: string[]; code: string }> = [
  // — Speed-gain promises —
  { expectIds: ["speed-faster"], code: `export const a = "Type faster with daily drills.";` },
  {
    expectIds: ["speed-fastest"],
    code: `export const a = "Become the fastest typist on your team.";`,
  },
  { expectIds: ["speed-boost"], code: `export const a = "Boost your WPM in just two weeks.";` },
  { expectIds: ["speed-gains"], code: `export const a = "Unlock massive speed gains.";` },
  {
    expectIds: ["speed-multiplier", "speed-faster"],
    code: `export const a = "Our method is 10x faster than normal practice.";`,
  },
  { expectIds: ["speed-multiplier"], code: `export const a = "Double your speed in 30 days.";` },
  // — Ability-gain promises —
  {
    expectIds: ["ability-better-programmer", "ability-become-better"],
    code: `export const a = "Become a better programmer in weeks.";`,
  },
  {
    expectIds: ["ability-become-better"],
    code: `export const a = "You will become a much better developer with practice.";`,
  },
  {
    expectIds: ["ability-improve-coding"],
    code: `export const a = "Improve your coding through typing drills.";`,
  },
  { expectIds: ["ability-10x-dev"], code: `export const a = "Become a 10x developer.";` },
  // — Hireability promises —
  { expectIds: ["hire-hireable"], code: `export const a = "Become hireable in 90 days.";` },
  { expectIds: ["hire-job-ready"], code: `export const a = "Get job-ready with our track.";` },
  { expectIds: ["hire-get-hired"], code: `export const a = "Practice until you get hired.";` },
  {
    expectIds: ["hire-land-job", "speed-faster"],
    code: `export const a = "Land your dream job by typing faster.";`,
  },
  {
    expectIds: ["hire-interview-ready"],
    code: `export const a = "Ace your interview with fast typing.";`,
  },
  {
    expectIds: ["hire-interview-ready"],
    code: `export const a = "Interview-ready in six weeks.";`,
  },
  {
    expectIds: ["hire-hiring"],
    code: `export const a = "Improve your hiring prospects.";`,
  },
  {
    expectIds: ["hire-career-ready"],
    code: `export const a = "Become career-ready and employable.";`,
  },
];

describe("copy-claims rule flags outcome promises (PRG-05)", () => {
  it.each(OFFENDING_CASES.map((c) => [c.expectIds.join("+"), c.code] as const))(
    "flags %s",
    (expectIds, code) => {
      const messages = lintCopy(code);
      expect(messages.length).toBeGreaterThan(0);
      for (const id of expectIds.split("+")) {
        expect(
          messages.some((m) => m.message.includes(id)),
          `expected a ${id} report for: ${code}`,
        ).toBe(true);
      }
    },
  );

  it("every banned pattern has at least one offending fixture (no untested patterns)", () => {
    const covered = new Set(OFFENDING_CASES.flatMap((c) => c.expectIds));
    for (const pattern of BANNED_PATTERNS) {
      expect(covered.has(pattern.id), `no offending fixture exercises ${pattern.id}`).toBe(true);
    }
  });

  it("flags promises inside template literals", () => {
    const messages = lintCopy("export const s = `Boost your WPM, ${name}!`;");
    expect(messages.some((m) => m.message.includes("speed-boost"))).toBe(true);
  });

  it("flags promises in JSX text (component literals are user-facing copy)", () => {
    const messages = lintJsx(`export const H = () => <h1>Type faster and get hired!</h1>;`);
    expect(messages.some((m) => m.message.includes("speed-faster"))).toBe(true);
    expect(messages.some((m) => m.message.includes("hire-get-hired"))).toBe(true);
  });

  it("flags promises in JSX string attributes (accessible names, titles)", () => {
    const messages = lintJsx(`export const H = () => <div title="Become job-ready fast" />;`);
    expect(messages.some((m) => m.message.includes("hire-job-ready"))).toBe(true);
  });
});

describe("copy-claims rule passes clean copy", () => {
  const CLEAN = [
    `export const a = "Less friction between your thoughts and your editor.";`,
    `export const a = "Watch replay";`,
    `export const a = "Your layout decides which finger map a result is read against.";`,
    `export const a = "Best 5-second burst: 82 WPM";`,
    `export const a = "Night Ink";`,
    // Phrase precision: bare "better" in passage prose is not an ability claim.
    `export const a = "full of good food, better company, and at least one nap.";`,
    // Measurement vocabulary the product must keep: deltas, not promises.
    `export const a = "Consistency: 92.4";`,
    `export const a = "Replay speed";`,
  ];

  it.each(CLEAN.map((code) => [code] as const))("passes %s", (code) => {
    expect(lintCopy(code)).toEqual([]);
  });

  it("passes clean JSX text", () => {
    expect(
      lintJsx(`export const H = () => <p>Less friction between thoughts and editor.</p>;`),
    ).toEqual([]);
  });

  it("passes clean template literals", () => {
    expect(lintCopy("export const s = `Test finished. ${wpm} words per minute.`;")).toEqual([]);
  });
});

describe("copy-claims rule allowlist (documented false positives stay silent)", () => {
  it("passes measured past deltas (results copy must state deltas, not promises)", () => {
    const messages = lintCopy(
      `export const s = "Nice \\u2014 th\\u2192e is 18% faster than it was a minute ago.";`,
    );
    expect(messages).toEqual([]);
    // The exemption is the documented past-measurement entry, not a hole.
    expect(ALLOWLIST.map((e) => e.id)).toContain("past-measurement");
  });

  it("passes strings that discuss the ban instead of making the claim", () => {
    const messages = lintCopy(
      `export const note = "Deliberately does NOT say 'become a better programmer' (positioning guardrail).";`,
    );
    expect(messages).toEqual([]);
  });

  it("is strict in source where no table key applies: a goal-style sentence is still flagged", () => {
    // The user-goal-preset exemption is key-scoped to onboarding.goal.preset rows
    // in the string tables (see the corpus test). In shipped source there is no
    // key, so the same wording must fail here — strictness by default.
    const messages = lintCopy(`export const a = "Get faster at everyday typing";`);
    expect(messages.some((m) => m.message.includes("speed-faster"))).toBe(true);
  });

  it("key-scoped goal exemption applies only with its table key", () => {
    expect(claimViolations("Get faster at everyday typing")).not.toEqual([]);
    expect(
      claimViolations("Get faster at everyday typing", { key: "onboarding.goal.presetSpeed" }),
    ).toEqual([]);
  });
});

describe("copy-claims rule ignores non-copy constructs", () => {
  it("never reads comments (ban-quoting comments are the documented allowlist)", () => {
    expect(
      lintCopy(`// TODO: never promise "type faster", see PRG-05\nexport const a = "ok";`),
    ).toEqual([]);
  });

  it("never reads regex literals (the existing claims-ban tests name the ban there)", () => {
    expect(lintCopy(`export const re = /faster|hireable|job-ready/;`)).toEqual([]);
  });

  it("never reads import sources, require paths or static keys", () => {
    expect(lintCopy(`import { x } from "faster-starter-kit";\nexport { x };`)).toEqual([]);
    expect(lintCopy(`export const o = { faster: 1 };`)).toEqual([]);
  });

  it("never applies inside test or spec files (tests must name the ban to assert it)", () => {
    const code = `it("promises no outcome \\u2014 no speed, skill or hiring claims", () => {});\nexport const re = /hireable|job-ready/;`;
    expect(lintCopy(code, "claims.test.ts")).toEqual([]);
    expect(lintCopy(code, "claims.spec.tsx")).toEqual([]);
    // …while the identical code outside a test file is still checked.
    expect(lintCopy(`export const a = "Improve your hiring prospects.";`, "copy.ts")).not.toEqual(
      [],
    );
  });

  it("never applies to its own registry file (which must name the ban to forbid it)", () => {
    expect(
      lintCopy(
        `export const example = "Become a better programmer";`,
        "tools/eslint-plugin-copy-claims.mjs",
      ),
    ).toEqual([]);
  });
});
