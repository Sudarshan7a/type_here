import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The design pack's token gate.
 *
 * `docs/design/09-design-system-tokens.md` opens with: "Single source of truth.
 * Implement as CSS custom properties ... Agents must not hard-code colours,
 * sizes outside this file." and §10 requires "Lint rule: forbid raw hex/px
 * values in components".
 *
 * A lint rule is the right instrument for the whole component tree, but the rule
 * itself is the thing that can be wrong, so it is written here as a test with
 * the same reach: every stylesheet in the app is scanned, tokens.css is the one
 * file allowed to name a colour, and the check is proved against a deliberately
 * violating stylesheet before it is trusted against the real ones. A gate that
 * has only ever passed has not been shown to work (Section 2, rule 6).
 */

const SRC = fileURLToPath(new URL("../src", import.meta.url));
const TOKENS_FILE = join(SRC, "styles", "tokens.css");

/** Every `.css` file under src, tokens.css included. */
function cssFiles(dir: string = SRC): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...cssFiles(full));
    else if (entry.endsWith(".css")) out.push(full);
  }
  return out;
}

/** Raw colour literals: #abc, #aabbcc, #aabbccdd, rgb(), hsl(). */
const RAW_COLOUR = /#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/g;

/**
 * Find raw colours in CSS source, skipping comments and the token file itself.
 *
 * Comments are stripped because the design pack's own rationale is quoted in
 * places, and a `#` inside prose is not a colour. Comments cannot be detected by
 * naively removing `/* ... *\/` because URLs and content strings can contain
 * them; for a stylesheet of this size, stripping block comments and double-quoted
 * strings is enough and is checked by the bad-case test below.
 */
export function rawColoursIn(css: string, isTokensFile = false): string[] {
  if (isTokensFile) return [];
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, " ");
  const withoutStrings = withoutComments.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');
  return withoutStrings.match(RAW_COLOUR) ?? [];
}

describe("design tokens — tokens.css is the only place a colour is named", () => {
  it("exists, and defines every token the design pack names", () => {
    const tokens = readFileSync(TOKENS_FILE, "utf8");
    // §1 colour roles. The ones with a stated contrast ratio are the ones a
    // validator would check, so they are the ones that must not go missing.
    const required = [
      "--bg",
      "--surface-1",
      "--surface-2",
      "--line",
      "--line-strong",
      "--text",
      "--text-muted",
      "--text-pending",
      "--flow",
      "--pace",
      "--slip",
      "--level",
      "--on-flow",
      "--slip-bg",
      "--focus-ring",
    ];
    for (const name of required) {
      expect(tokens, `${name} must be defined in tokens.css`).toContain(`${name}:`);
    }
  });

  it("defines each colour role in BOTH themes, so neither theme falls back", () => {
    const tokens = readFileSync(TOKENS_FILE, "utf8");
    const roles = ["--bg", "--surface-1", "--text", "--text-pending", "--flow", "--pace", "--slip"];
    // Dark is the `:root` block and light is `[data-theme="daylight"]`, plus the
    // `prefers-color-scheme: light` mapping for a visitor with no stored choice.
    const dark = tokens.slice(0, tokens.indexOf('[data-theme="daylight"]'));
    const light = tokens.slice(tokens.indexOf('[data-theme="daylight"]'));
    for (const role of roles) {
      expect(dark, `${role} must be defined for the default dark theme`).toContain(`${role}:`);
      expect(light, `${role} must be defined for the light theme`).toContain(`${role}:`);
    }
  });

  it("keeps the two Daylight definitions identical, so the OS mapping cannot drift", () => {
    // `[data-theme="daylight"]` (stored choice) and the `prefers-color-scheme:
    // light` `:not([data-theme])` mapping (no stored choice) must paint the
    // same palette — a one-token drift would make first paint disagree with a
    // stored Daylight choice. Presence-only checks cannot see that.
    const tokens = readFileSync(TOKENS_FILE, "utf8");
    const block = (start: string): Map<string, string> => {
      const open = tokens.indexOf(start);
      const body = tokens.slice(open, tokens.indexOf("}", open));
      const out = new Map<string, string>();
      for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out.set(m[1]!, m[2]!.trim());
      return out;
    };
    const stored = block('[data-theme="daylight"]');
    const mediaAt = tokens.indexOf("@media (prefers-color-scheme: light)");
    const mapped = block(tokens.slice(mediaAt, mediaAt + 60));
    expect(stored.size).toBeGreaterThan(0);
    expect(mapped.size).toBeGreaterThan(0);
    expect([...mapped.keys()].sort()).toEqual([...stored.keys()].sort());
    for (const [name, value] of stored) {
      expect(
        mapped.get(name),
        `Daylight token ${name} drifted between the stored block and the OS mapping`,
      ).toBe(value);
    }
  });

  it("carries the type scale, spacing, radius, motion and layout tokens", () => {
    const tokens = readFileSync(TOKENS_FILE, "utf8");
    // §3 type, §4 spacing + containers, §5 radius, §7 motion, §6 z-index.
    const required = [
      "--t-body",
      "--t-type",
      "--t-kpi",
      "--font-display",
      "--font-ui",
      "--font-type",
      "--s-1",
      "--s-4",
      "--s-6",
      "--r-key",
      "--r-input",
      "--r-card",
      "--r-pill",
      "--w-type",
      "--w-page",
      "--dur-fast",
      "--dur-base",
      "--dur-slow",
      "--ease-out",
      "--ease-caret",
      "--z-overlay",
    ];
    for (const name of required) {
      expect(tokens, `${name} must be defined in tokens.css`).toContain(`${name}:`);
    }
  });

  it("no stylesheet outside tokens.css hard-codes a colour", () => {
    const offenders: string[] = [];
    for (const file of cssFiles()) {
      const relative = file.slice(SRC.length + 1);
      for (const found of rawColoursIn(
        readFileSync(file, "utf8"),
        relative.endsWith("tokens.css"),
      )) {
        offenders.push(`${relative}: ${found}`);
      }
    }
    expect(
      offenders,
      "use var(--token) instead of a literal colour; only styles/tokens.css may name one",
    ).toEqual([]);
  });

  it("the colour scan actually fails on a violation (the gate is not vacuous)", () => {
    // BAD CASE. A rule that has never been shown to fail is a rule that might be
    // silently matching nothing — which is exactly how the reduced-motion gate
    // passed on a completely unstyled page in Session 7.
    const bad = `.thing { color: #ff0000; background: rgba(0, 0, 0, .5); }`;
    expect(rawColoursIn(bad).length).toBeGreaterThanOrEqual(2);

    // GOOD CASE.
    const good = `.thing { color: var(--slip); background: var(--slip-bg); }`;
    expect(rawColoursIn(good)).toEqual([]);
  });

  it("the colour scan ignores colours mentioned in comments and strings", () => {
    const css = `/* the design pack's --pace is #FFC24D, do not hard-code it */
      .thing::after { content: "#00FF00"; color: var(--text); }`;
    expect(rawColoursIn(css)).toEqual([]);
  });

  it("tokens.css itself is exempt, and does contain colours", () => {
    // Without this the exemption could quietly grow to cover everything.
    const tokens = readFileSync(TOKENS_FILE, "utf8");
    expect(rawColoursIn(tokens, true)).toEqual([]);
    expect(rawColoursIn(tokens, false).length).toBeGreaterThan(10);
  });
});
