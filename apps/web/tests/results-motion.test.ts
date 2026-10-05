import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * ANA-01: the motion inventory, checked at the source.
 *
 * The live behaviour is pinned in e2e/results.spec.ts against computed style and
 * the interpolated keyframes in a real browser — that is the layer that can see
 * what a reader actually experiences, including whether the reduced-motion path
 * really differs. This file is the cheaper layer underneath it, and it catches
 * the class of mistake that would otherwise only be found by eye:
 *
 *  - a duration written as a literal instead of a token (11 §14: every animation
 *    has a named token duration/easing);
 *  - a property other than `transform`/`opacity` in a keyframe (motion rule 1);
 *  - an animation that loops (motion rule 6);
 *  - an unbounded stagger, which is how a 220ms reveal quietly becomes a 400ms
 *    one;
 *  - a reduced-motion branch that still moves something.
 *
 * Every check is a function over stylesheet text, and each is fed a deliberately
 * violating sample below. A gate that has only ever passed has not been shown to
 * work.
 */

const STYLES = fileURLToPath(new URL("../src/styles.css", import.meta.url));
const source = readFileSync(STYLES, "utf8");

/** The results-screen block of the stylesheet, by its own section markers. */
function resultsSection(css: string): string {
  const from = css.indexOf("results screen (ANA-01)");
  const to = css.indexOf("keycap-style primary");
  if (from === -1 || to === -1 || to <= from) return "";
  return css.slice(from, to);
}

/** The body of an `@keyframes name { … }` rule, matched on brace depth. */
function keyframeBody(css: string, name: string): string {
  const at = css.indexOf(`@keyframes ${name}`);
  if (at === -1) return "";
  const open = css.indexOf("{", at);
  if (open === -1) return "";
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    else if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  return "";
}

/** Every property a keyframe body declares. */
function animatedProperties(body: string): string[] {
  return [...body.matchAll(/(?:^|[;{])\s*([a-z-]+)\s*:/g)].map((m) => m[1]!);
}

/** The two conditional halves of the results section, in document order. */
function conditionalHalves(section: string): { noPreference: string; reduce: string } {
  const noPrefAt = section.indexOf("@media (prefers-reduced-motion: no-preference)");
  const reduceAt = section.indexOf("@media (prefers-reduced-motion: reduce)");
  if (noPrefAt === -1 || reduceAt === -1 || reduceAt <= noPrefAt) {
    return { noPreference: "", reduce: "" };
  }
  return { noPreference: section.slice(noPrefAt, reduceAt), reduce: section.slice(reduceAt) };
}

interface MotionProblem {
  rule: string;
  detail: string;
}

/** Every `@keyframes` name declared in a block. */
function keyframeNames(block: string): string[] {
  return [...block.matchAll(/@keyframes\s+([a-z-]+)/g)].map((m) => m[1]!);
}

/** Every results keyframes a block's `animation:` shorthands actually name. */
function referencedEntrances(block: string): string[] {
  return [...block.matchAll(/animation:\s*([^;]+);/g)]
    .map((match) => (match[1] ?? "").trim())
    .filter((declaration) => declaration !== "none")
    .flatMap((declaration) => declaration.split(/\s+/).filter((part) => /^results-/.test(part)));
}

/**
 * Everything the motion inventory forbids, as a list of problems. Empty means the
 * section is compliant. Written over text so it can be pointed at a bad sample.
 */
export function auditResultsMotion(section: string): MotionProblem[] {
  const problems: MotionProblem[] = [];
  const push = (rule: string, detail: string) => problems.push({ rule, detail });

  if (section.trim() === "") {
    push("section-present", "no results-screen section found");
    return problems;
  }

  const { noPreference, reduce } = conditionalHalves(section);
  if (noPreference === "" || reduce === "") {
    push("both-directions", "the section must declare both motion branches");
    return problems;
  }

  // 1. Only transform and opacity may animate, anywhere.
  for (const name of [...keyframeNames(section)]) {
    for (const property of animatedProperties(keyframeBody(section, name))) {
      if (property !== "opacity" && property !== "transform") {
        push("transform-opacity-only", `@keyframes ${name} animates ${property}`);
      }
    }
  }

  // 2. Every duration and easing comes from a token (11 §14).
  for (const block of [noPreference, reduce]) {
    for (const [, shorthand] of block.matchAll(/animation:\s*([^;]+);/g)) {
      const declaration = (shorthand ?? "").trim();
      if (declaration === "none") continue;
      if (/\d\s*(ms|s)\b/.test(declaration)) {
        push("token-durations", `literal duration in "animation: ${declaration}"`);
      }
      if (!/var\(--dur-[a-z-]+\)/.test(declaration)) {
        push("token-durations", `"animation: ${declaration}" has no --dur token`);
      }
    }
  }

  // 3. Nothing loops, and nothing borrows a duration built for another purpose.
  if (/\binfinite\b/.test(section)) {
    push("no-loops", "the results entrance must not loop");
  }
  for (const [, token] of section.matchAll(/\(?(var\(--dur-(?:blink|hero|slower))\)/g)) {
    push("budget", `the results entrance must not borrow --dur-${token}`);
  }

  // 4. One entrance in the default branch, and it must move.
  const defaultNames = keyframeNames(noPreference);
  if (defaultNames.length !== 1) {
    push("one-entrance", `the default branch declares ${defaultNames.length} keyframes`);
  }
  const entranceName = defaultNames[0] ?? "";
  if (entranceName !== "" && !/transform/.test(keyframeBody(section, entranceName))) {
    push("default-moves", "the default entrance must move something");
  }

  // 5. The reduced branch must animate nothing at all — and in particular must
  //    not reuse the entrance, which is how a "fade only" reduction quietly
  //    becomes the same movement played faster.
  const reduceReferences = referencedEntrances(reduce);
  if (reduceReferences.length > 0 || keyframeNames(reduce).length > 0) {
    push(
      "reduced-no-animation",
      `the reduced branch animates ${[...reduceReferences, ...keyframeNames(reduce)].join(", ")}`,
    );
  }
  for (const name of reduceReferences) {
    if (/transform/.test(keyframeBody(section, name))) {
      push("reduced-still-moves", `the reduced branch animates transform (@keyframes ${name})`);
    }
  }

  // 5. The stagger is bounded: at most two delayed rows, so the last one's start
  //    is inside the catalog's 300 ms total.
  const staggered = [
    ...section.matchAll(/--results-step:\s*(?:calc\([^)]*\)|var\(--dur-stagger\))/g),
  ];
  if (staggered.length > 2) {
    push("stagger-cap", `${staggered.length} staggered rows exceeds the two-row cap`);
  }

  return problems;
}

const SECTION = resultsSection(source);

describe("the results-screen motion inventory", () => {
  it("declares one entrance, in two branches, and nothing else", () => {
    expect(SECTION, "the results-screen section must exist in styles.css").not.toBe("");
    expect(auditResultsMotion(SECTION)).toEqual([]);
  });

  it("the default branch is an 8px settle, from named tokens", () => {
    const { noPreference } = conditionalHalves(SECTION);
    expect(noPreference).toMatch(
      /animation:\s*results-enter\s+var\(--dur-base\)\s+var\(--ease-out\)\s+both/,
    );
    const body = keyframeBody(SECTION, "results-enter");
    expect(body).toMatch(/transform:\s*translate3d\(0,\s*8px,\s*0\)/);
    expect(body).toMatch(/transform:\s*none/);
  });

  it("the reduced branch declares no animation at all", () => {
    const { reduce } = conditionalHalves(SECTION);
    expect(reduce).toMatch(/animation:\s*none/);
    expect(keyframeNames(reduce)).toEqual([]);
    // No stagger either: a delayed appearance is a wait, not a reveal.
    expect(reduce).toMatch(/animation-delay:\s*var\(--dur-instant\)/);
  });

  it("uses transform and opacity and nothing else, anywhere in the section", () => {
    // Including declarations outside the keyframes: `top`, `left`, `margin` and
    // `width` are what turn a reveal into a relayout.
    const declarations = [...SECTION.matchAll(/(?:^|[;{])\s*([a-z-]+)\s*:/g)].map((m) => m[1]!);
    const animated = declarations.filter((property) => property.startsWith("transition"));
    expect(animated, "the entrance is an animation, not a class-toggled transition").toEqual([]);
  });
});

describe("the motion audit is not vacuous", () => {
  it("catches a literal duration", () => {
    const bad = `
    @media (prefers-reduced-motion: no-preference) {
      .results > * { animation: results-enter 320ms ease-out both; }
      @keyframes results-enter { from { transform: translate3d(0, 8px, 0); } to { transform: none; } }
    }
    @media (prefers-reduced-motion: reduce) {
      .results > * { animation: none; }
    }`;
    expect(auditResultsMotion(bad).map((p) => p.rule)).toContain("token-durations");
  });

  it("catches a relayout property in a keyframe", () => {
    const bad = `
    @media (prefers-reduced-motion: no-preference) {
      .results > * { animation: results-enter var(--dur-base) var(--ease-out) both; }
      @keyframes results-enter { from { height: 0; } to { height: 100px; } }
    }
    @media (prefers-reduced-motion: reduce) {
      .results > * { animation: none; }
    }`;
    const found = auditResultsMotion(bad);
    expect(found.map((p) => p.rule)).toContain("transform-opacity-only");
    expect(found.some((p) => p.detail.includes("height"))).toBe(true);
  });

  it("catches a loop, and a borrow from a long-duration token", () => {
    const looping = `
    @media (prefers-reduced-motion: no-preference) {
      .results > * { animation: results-enter var(--dur-base) var(--ease-out) infinite; }
      @keyframes results-enter { from { transform: translate3d(0, 8px, 0); } to { transform: none; } }
    }
    @media (prefers-reduced-motion: reduce) {
      .results > * { animation: none; }
    }`;
    expect(auditResultsMotion(looping).map((p) => p.rule)).toContain("no-loops");

    const borrowed = `
    @media (prefers-reduced-motion: no-preference) {
      .results > * { animation: results-enter var(--dur-hero) var(--ease-out) both; }
      @keyframes results-enter { from { transform: translate3d(0, 8px, 0); } to { transform: none; } }
    }
    @media (prefers-reduced-motion: reduce) {
      .results > * { animation: none; }
    }`;
    expect(auditResultsMotion(borrowed).map((p) => p.rule)).toContain("budget");
  });

  it("catches a reduced-motion branch that still moves", () => {
    const reuse = `
    @media (prefers-reduced-motion: no-preference) {
      .results > * { animation: results-enter var(--dur-base) var(--ease-out) both; }
      @keyframes results-enter { from { transform: translate3d(0, 8px, 0); } to { transform: none; } }
    }
    @media (prefers-reduced-motion: reduce) {
      .results > * { animation: results-enter var(--dur-fast) linear both; }
    }`;
    const found = auditResultsMotion(reuse).map((p) => p.rule);
    expect(found).toContain("reduced-no-animation");
    expect(found).toContain("reduced-still-moves");

    // A reduce-only fade is still a departure from the stated design, and the
    // audit says so rather than passing it because it happens to be opacity-only.
    const reduceFade = `
    @media (prefers-reduced-motion: no-preference) {
      .results > * { animation: results-enter var(--dur-base) var(--ease-out) both; }
      @keyframes results-enter { from { transform: translate3d(0, 8px, 0); } to { transform: none; } }
    }
    @media (prefers-reduced-motion: reduce) {
      .results > * { animation: results-fade var(--dur-fast) linear both; }
      @keyframes results-fade { from { opacity: 0; } to { opacity: 1; } }
    }`;
    expect(auditResultsMotion(reduceFade).map((p) => p.rule)).toContain("reduced-no-animation");
  });

  it("catches a default branch that does not move at all", () => {
    // The non-vacuity probe for the reduce assertions: if the default branch had
    // no movement either, "reduce reports no motion" would prove nothing.
    const bad = `
    @media (prefers-reduced-motion: no-preference) {
      .results > * { animation: results-enter var(--dur-base) var(--ease-out) both; }
      @keyframes results-enter { from { opacity: 0.4; } to { opacity: 1; } }
    }
    @media (prefers-reduced-motion: reduce) {
      .results > * { animation: none; }
    }`;
    expect(auditResultsMotion(bad).map((p) => p.rule)).toContain("default-moves");
  });

  it("catches an unbounded stagger, and a missing section", () => {
    const greedy = `
    @media (prefers-reduced-motion: no-preference) {
      .results > * { animation: results-enter var(--dur-base) var(--ease-out) both; animation-delay: var(--dur-stagger); }
      .results > :nth-child(2) { --results-step: var(--dur-stagger); }
      .results > :nth-child(3) { --results-step: calc(2 * var(--dur-stagger)); }
      .results > :nth-child(4) { --results-step: calc(3 * var(--dur-stagger)); }
      .results > :nth-child(5) { --results-step: calc(4 * var(--dur-stagger)); }
      @keyframes results-enter { from { transform: translate3d(0, 8px, 0); } to { transform: none; } }
    }
    @media (prefers-reduced-motion: reduce) {
      .results > * { animation: none; }
    }`;
    expect(auditResultsMotion(greedy).map((p) => p.rule)).toContain("stagger-cap");
    expect(auditResultsMotion("").map((p) => p.rule)).toEqual(["section-present"]);
  });
});
