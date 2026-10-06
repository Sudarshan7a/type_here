import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * OPS-01: the motion inventory, checked at the source.
 *
 * The live behaviour is pinned in e2e/onboarding-flow.spec.ts against computed
 * style and `getAnimations()` in a real browser — that is the layer that can see
 * what a reader actually experiences, including whether the reduced-motion path
 * really differs. This file is the cheaper layer underneath it, and it catches the
 * class of mistake that would otherwise only be found by eye:
 *
 *  - a duration written as a literal instead of a token (11 §14);
 *  - a property other than `transform`/`opacity` in a keyframe (motion rule 1);
 *  - an animation that loops (motion rule 6);
 *  - a reduced-motion branch that still moves something;
 *  - a panel that declares NO motion at all, which would make every "reduced
 *    motion disables motion" assertion pass for the wrong reason.
 *
 * That last one is the "unstyled control" and it is the point of the file: every
 * check below is fed a deliberately violating sample, and the audit is also run
 * over a sample with no motion rules whatsoever. A gate that has only ever passed
 * has not been shown to work.
 */

const STYLES = fileURLToPath(new URL("../src/onboarding/onboarding.css", import.meta.url));
const source = readFileSync(STYLES, "utf8");

/** The panel's own section of the stylesheet, by its own section markers. */
function onboardingSection(css: string): string {
  const from = css.indexOf("THE ENTRANCE");
  const to = css.indexOf("FOCUS MODE");
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

function keyframeNames(block: string): string[] {
  return [...block.matchAll(/@keyframes\s+([a-z-]+)/g)].map((m) => m[1]!);
}

function animatedProperties(body: string): string[] {
  return [...body.matchAll(/(?:^|[;{])\s*([a-z-]+)\s*:/g)].map((m) => m[1]!);
}

/** The two conditional halves of the section, in document order. */
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

/** Every `@keyframes name` a block's `animation:` shorthand actually names. */
function referencedEntrances(block: string): string[] {
  return [...block.matchAll(/animation:\s*([^;]+);/g)]
    .map((match) => (match[1] ?? "").trim())
    .filter((declaration) => declaration !== "none")
    .flatMap((declaration) => declaration.split(/\s+/).filter((part) => /^onboarding-/.test(part)));
}

/**
 * Everything the motion inventory forbids, as a list of problems. Empty means the
 * section is compliant. Written over text so it can be pointed at a bad sample —
 * which is what the non-vacuity tests below do.
 */
export function auditOnboardingMotion(section: string): MotionProblem[] {
  const problems: MotionProblem[] = [];
  const push = (rule: string, detail: string) => problems.push({ rule, detail });

  if (section.trim() === "") {
    push("section-present", "no onboarding motion section found");
    return problems;
  }

  const { noPreference, reduce } = conditionalHalves(section);
  if (noPreference === "" || reduce === "") {
    push("both-directions", "the section must declare both motion branches");
    return problems;
  }

  // 1. Only transform and opacity may animate, anywhere.
  for (const name of keyframeNames(section)) {
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

  // 3. Nothing loops, and nothing borrows a duration built for a bigger moment.
  if (/\binfinite\b/.test(section)) {
    push("no-loops", "the panel entrance must not loop");
  }
  for (const [, token] of section.matchAll(/\(?(var\(--dur-(?:blink|hero|slower|slow))\)/g)) {
    push("budget", `the panel entrance must not borrow --dur-${token}`);
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

  // 5. The reduced branch animates nothing at all — and in particular must not
  //    reuse the entrance, which is how a "fade only" reduction quietly becomes
  //    the same movement played faster.
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

  // 6. No stagger at all: the panel is one object, and a delayed panel is a wait.
  if (/animation-delay:\s*(?!var\(--dur-instant\))/m.test(noPreference)) {
    push("no-stagger", "the panel entrance must not be staggered");
  }
  if (!/animation-delay:\s*var\(--dur-instant\)/.test(reduce)) {
    push("no-stagger", "the reduced branch must set animation-delay to --dur-instant");
  }

  // 7. The entrance is a class-toggled animation, never a transition: a transition
  //    on the panel would run on every re-render, including the one caused by
  //    answering a question.
  if (
    /(?:^|[;{])\s*transition\s*:/.test(noPreference) ||
    /(?:^|[;{])\s*transition\s*:/.test(reduce)
  ) {
    push("not-a-transition", "the panel entrance must not be a transition");
  }

  return problems;
}

const SECTION = onboardingSection(source);

describe("the onboarding motion inventory", () => {
  it("declares one entrance, in two branches, and nothing else", () => {
    expect(SECTION, "the onboarding motion section must exist in onboarding.css").not.toBe("");
    expect(auditOnboardingMotion(SECTION)).toEqual([]);
  });

  it("the default branch is an 8px settle, from named tokens", () => {
    const { noPreference } = conditionalHalves(SECTION);
    expect(noPreference).toMatch(
      /animation:\s*onboarding-enter\s+var\(--dur-base\)\s+var\(--ease-out\)\s+both/,
    );
    const body = keyframeBody(SECTION, "onboarding-enter");
    expect(body).toMatch(/transform:\s*translate3d\(0,\s*8px,\s*0\)/);
    expect(body).toMatch(/transform:\s*none/);
    // A single rise, not a list: no stagger token anywhere in the default branch.
    expect(noPreference).not.toContain("--dur-stagger");
  });

  it("the reduced branch declares no animation at all, and no delay", () => {
    const { reduce } = conditionalHalves(SECTION);
    expect(reduce).toMatch(/animation:\s*none/);
    expect(keyframeNames(reduce)).toEqual([]);
    expect(reduce).toMatch(/animation-delay:\s*var\(--dur-instant\)/);
  });

  it("uses transform only — never a property that would relayout the page", () => {
    const declarations = [...SECTION.matchAll(/(?:^|[;{])\s*([a-z-]+)\s*:/g)].map((m) => m[1]!);
    expect(declarations.filter((p) => p === "transition")).toEqual([]);
    // The panel is above the typing field: a height or margin animation here would
    // push the field down under a visitor who is already typing.
    for (const relayout of ["height", "margin", "top", "left", "padding", "width"]) {
      expect(
        animatedProperties(keyframeBody(SECTION, "onboarding-enter")),
        `the entrance must not animate ${relayout}`,
      ).not.toContain(relayout);
    }
  });
});

describe("the motion audit is not vacuous", () => {
  it("catches a literal duration", () => {
    const bad = `
    @media (prefers-reduced-motion: no-preference) {
      .onboarding { animation: onboarding-enter 320ms ease-out both; }
      @keyframes onboarding-enter { from { transform: translate3d(0, 8px, 0); } to { transform: none; } }
    }
    @media (prefers-reduced-motion: reduce) {
      .onboarding { animation: none; animation-delay: var(--dur-instant); }
    }`;
    expect(auditOnboardingMotion(bad).map((p) => p.rule)).toContain("token-durations");
  });

  it("catches a relayout property in a keyframe", () => {
    const bad = `
    @media (prefers-reduced-motion: no-preference) {
      .onboarding { animation: onboarding-enter var(--dur-base) var(--ease-out) both; }
      @keyframes onboarding-enter { from { height: 0; } to { height: 100px; } }
    }
    @media (prefers-reduced-motion: reduce) {
      .onboarding { animation: none; animation-delay: var(--dur-instant); }
    }`;
    const found = auditOnboardingMotion(bad);
    expect(found.map((p) => p.rule)).toContain("transform-opacity-only");
    expect(found.some((p) => p.detail.includes("height"))).toBe(true);
  });

  it("catches a loop, and a borrow from a long-duration token", () => {
    const looping = `
    @media (prefers-reduced-motion: no-preference) {
      .onboarding { animation: onboarding-enter var(--dur-base) var(--ease-out) infinite; }
      @keyframes onboarding-enter { from { transform: translate3d(0, 8px, 0); } to { transform: none; } }
    }
    @media (prefers-reduced-motion: reduce) {
      .onboarding { animation: none; animation-delay: var(--dur-instant); }
    }`;
    expect(auditOnboardingMotion(looping).map((p) => p.rule)).toContain("no-loops");

    const borrowed = `
    @media (prefers-reduced-motion: no-preference) {
      .onboarding { animation: onboarding-enter var(--dur-hero) var(--ease-out) both; }
      @keyframes onboarding-enter { from { transform: translate3d(0, 8px, 0); } to { transform: none; } }
    }
    @media (prefers-reduced-motion: reduce) {
      .onboarding { animation: none; animation-delay: var(--dur-instant); }
    }`;
    expect(auditOnboardingMotion(borrowed).map((p) => p.rule)).toContain("budget");
  });

  it("catches a reduced-motion branch that still moves", () => {
    const reuse = `
    @media (prefers-reduced-motion: no-preference) {
      .onboarding { animation: onboarding-enter var(--dur-base) var(--ease-out) both; }
      @keyframes onboarding-enter { from { transform: translate3d(0, 8px, 0); } to { transform: none; } }
    }
    @media (prefers-reduced-motion: reduce) {
      .onboarding { animation: onboarding-enter var(--dur-fast) linear both; animation-delay: var(--dur-instant); }
    }`;
    const found = auditOnboardingMotion(reuse).map((p) => p.rule);
    expect(found).toContain("reduced-no-animation");
    expect(found).toContain("reduced-still-moves");

    // A reduce-only fade is still a departure from the stated design: manufacturing
    // one only for reduced motion would mean the reduced-motion experience animates
    // more than the default one.
    const reduceFade = `
    @media (prefers-reduced-motion: no-preference) {
      .onboarding { animation: onboarding-enter var(--dur-base) var(--ease-out) both; }
      @keyframes onboarding-enter { from { transform: translate3d(0, 8px, 0); } to { transform: none; } }
    }
    @media (prefers-reduced-motion: reduce) {
      .onboarding { animation: onboarding-fade var(--dur-fast) linear both; animation-delay: var(--dur-instant); }
      @keyframes onboarding-fade { from { opacity: 0; } to { opacity: 1; } }
    }`;
    expect(auditOnboardingMotion(reduceFade).map((p) => p.rule)).toContain("reduced-no-animation");
  });

  it("catches a default branch that does not move at all", () => {
    // The non-vacuity probe for the reduce assertions: if the default branch had no
    // movement either, "reduce reports no motion" would prove nothing.
    const bad = `
    @media (prefers-reduced-motion: no-preference) {
      .onboarding { animation: onboarding-enter var(--dur-base) var(--ease-out) both; }
      @keyframes onboarding-enter { from { opacity: 0.4; } to { opacity: 1; } }
    }
    @media (prefers-reduced-motion: reduce) {
      .onboarding { animation: none; animation-delay: var(--dur-instant); }
    }`;
    expect(auditOnboardingMotion(bad).map((p) => p.rule)).toContain("default-moves");
  });

  it("catches a staggered entrance and a class-toggled transition", () => {
    const staggered = `
    @media (prefers-reduced-motion: no-preference) {
      .onboarding { animation: onboarding-enter var(--dur-base) var(--ease-out) both; animation-delay: var(--dur-stagger); }
      @keyframes onboarding-enter { from { transform: translate3d(0, 8px, 0); } to { transform: none; } }
    }
    @media (prefers-reduced-motion: reduce) {
      .onboarding { animation: none; animation-delay: var(--dur-instant); }
    }`;
    expect(auditOnboardingMotion(staggered).map((p) => p.rule)).toContain("no-stagger");

    const transitioned = `
    @media (prefers-reduced-motion: no-preference) {
      .onboarding { transition: transform var(--dur-base) var(--ease-out); }
      @keyframes onboarding-enter { from { transform: translate3d(0, 8px, 0); } to { transform: none; } }
    }
    @media (prefers-reduced-motion: reduce) {
      .onboarding { animation: none; animation-delay: var(--dur-instant); }
    }`;
    expect(auditOnboardingMotion(transitioned).map((p) => p.rule)).toContain("not-a-transition");
  });

  it("catches a section that is missing, or missing one of the two branches", () => {
    expect(auditOnboardingMotion("").map((p) => p.rule)).toEqual(["section-present"]);
    const oneBranchOnly = `
    @media (prefers-reduced-motion: no-preference) {
      .onboarding { animation: onboarding-enter var(--dur-base) var(--ease-out) both; }
      @keyframes onboarding-enter { from { transform: translate3d(0, 8px, 0); } to { transform: none; } }
    }`;
    expect(auditOnboardingMotion(oneBranchOnly).map((p) => p.rule)).toContain("both-directions");
  });

  /**
   * THE UNSTYLED CONTROL. A panel with no motion rules at all — which is what a
   * stylesheet that never grew an entrance looks like, and what "reduced motion
   * disables motion" would trivially pass on. The audit must report it as
   * non-compliant, which is what makes the clean result above mean something.
   */
  it("an UNSTYLED panel (no motion rules at all) is reported, not passed", () => {
    const unstyled = `
    .onboarding {
      padding: var(--s-6);
      background: var(--surface-1);
    }`;
    const found = auditOnboardingMotion(unstyled).map((p) => p.rule);
    expect(found).toContain("both-directions");
    // …and specifically: the default branch has no entrance at all.
    expect(unstyled).not.toContain("@keyframes");
    expect(auditOnboardingMotion(SECTION)).toEqual([]);
  });

  /** THE NO-MUTATION CONTROL: the real file, unmodified, passes. */
  it("control: the shipped stylesheet, with no mutation applied, passes every check", () => {
    expect(auditOnboardingMotion(SECTION)).toEqual([]);
    expect(keyframeNames(conditionalHalves(SECTION).noPreference)).toEqual(["onboarding-enter"]);
    expect(keyframeNames(conditionalHalves(SECTION).reduce)).toEqual([]);
    expect([...new Set(animatedProperties(keyframeBody(SECTION, "onboarding-enter")))]).toEqual([
      "transform",
    ]);
  });
});
