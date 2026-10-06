import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { COPY } from "../src/copy";
import { OnboardingPanel } from "../src/onboarding/OnboardingPanel";
import { ONBOARDING_STORAGE_KEY } from "../src/onboarding/storage";

/**
 * OPS-01: the server-rendered shape of the panel.
 *
 * Server rendering is the layer that can prove, on every run in node, the things
 * that matter most about a first-run surface: the heading structure, the grouping
 * of the questions, the ABSENCE of anything modal, the absence of a second live
 * region, and that no question is required — a `required` attribute is the
 * mechanism by which "skippable" quietly stops being true.
 *
 * What it cannot prove is live behaviour: focus order, computed contrast, the
 * entrance motion and the residue after a dismissal. Those are in
 * e2e/onboarding-flow.spec.ts, which drives a real browser.
 */

const REALM = { storage: new Map<string, string>() };

/** Install a localStorage stand-in holding the given records, for the render. */
function withStored(key: string, value: string): () => void {
  const had = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: {
      get length() {
        return REALM.storage.size;
      },
      clear: () => REALM.storage.clear(),
      key: (i: number) => [...REALM.storage.keys()][i] ?? null,
      getItem: (k: string) => REALM.storage.get(k) ?? null,
      removeItem: (k: string) => void REALM.storage.delete(k),
      setItem: (k: string, v: string) => void REALM.storage.set(k, v),
    } as Storage,
  });
  REALM.storage.set(key, value);
  return () => {
    if (had === undefined) Reflect.deleteProperty(globalThis, "localStorage");
    else Object.defineProperty(globalThis, "localStorage", had);
  };
}

function render(props: Partial<React.ComponentProps<typeof OnboardingPanel>> = {}): string {
  return renderToStaticMarkup(
    <OnboardingPanel layout="qwerty-us" layoutConfirmed={false} {...props} />,
  );
}

/**
 * The rendered markup with React's HTML entities decoded.
 *
 * Server rendering escapes an apostrophe as `&#x27;`, so a copy string containing
 * one ("I'm new to it") is not literally present in the markup even when it is
 * plainly on screen. Assertions about COPY are made against this; assertions about
 * TAGS are made against the raw markup, which is what they are about.
 */
function text(markup: string): string {
  return markup
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x2F;", "/")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

/** A first run: no stored record at all. */
function renderFirstRun(): string {
  const restore = withStored("unrelated-key", "unrelated");
  try {
    return render();
  } finally {
    restore();
  }
}

/** A later visit, with the given stored value. */
function renderWith(
  value: string,
  props: Partial<React.ComponentProps<typeof OnboardingPanel>> = {},
): string {
  const restore = withStored(ONBOARDING_STORAGE_KEY, value);
  try {
    return render(props);
  } finally {
    restore();
  }
}

afterEach(() => {
  REALM.storage.clear();
  Reflect.deleteProperty(globalThis, "localStorage");
});

describe("the panel is a section with a real heading, not a dialog", () => {
  const html = renderFirstRun();

  it("is a <section> labelled by its own h2 — no dialog role, no aria-modal", () => {
    expect(html).toContain('data-testid="onboarding"');
    expect(html).toMatch(/<section[^>]*aria-labelledby="/);
    expect(html).toMatch(/<h2[^>]*>/);
    // The three things that would make this a modal. Each is a hard failure, not a
    // style preference: AGENTS.md rule 1 and the a11y skill's "never show modals
    // during typing".
    expect(html).not.toContain("aria-modal");
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain('role="alertdialog"');
    expect(html).not.toContain("popover");
    expect(html).not.toContain("<dialog");
  });

  it("declares NO interrupting construct of any kind", () => {
    expect(html).not.toContain("position:fixed");
    expect(html).not.toContain("position: fixed");
    expect(html).not.toMatch(/class="[^"]*overlay|backdrop|scrim|modal/i);
    // No inline style attribute at all: every visual decision is in the stylesheet,
    // where the token gate can see it.
    expect(html).not.toContain("style=");
  });

  it("does not add a live region — the finished test's single announcement is the only one", () => {
    // results.spec.ts asserts exactly one live region on the finished screen. A
    // second one here would make that count depend on whether onboarding is open.
    expect(html).not.toContain("aria-live");
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain('role="alert"');
  });

  it("heading levels: h2 for the panel, and the page's h1 is above it", () => {
    // App.tsx renders the h1; the panel is the first thing inside main, so h2 is
    // the correct level and no level is skipped.
    const headings = [...html.matchAll(/<h([1-6])\b/g)].map((m) => m[1]);
    expect(headings).toEqual(["2"]);
  });
});

describe("the questions are grouped, labelled, and none of them is required", () => {
  const html = renderFirstRun();

  it("uses a fieldset and a legend per question, so each group has a real name", () => {
    expect([...html.matchAll(/<fieldset/g)]).toHaveLength(3);
    expect([...html.matchAll(/<legend>/g)]).toHaveLength(3);
    expect(text(html)).toContain(COPY.onboarding.goalPrompt);
    expect(text(html)).toContain(COPY.onboarding.levelPrompt);
    expect(text(html)).toContain(COPY.onboarding.languagesPrompt);
  });

  it("has NO required input anywhere — that is what would block a test", () => {
    // Structural, not textual: the word "required" appears in the copy on purpose
    // ("None of this is required"), so the check is on the ATTRIBUTE.
    expect(html).not.toMatch(/<input[^>]*\brequired\b/);
    expect(html).not.toMatch(/<select[^>]*\brequired\b/);
    expect(html).not.toMatch(/<textarea[^>]*\brequired\b/);
    // …and no HTML5 validation API is reachable either.
    expect(html).not.toContain("setCustomValidity");
    expect(html).not.toContain("reportValidity");
  });

  it("offers every goal and every level, with 'unsure' among them", () => {
    for (const id of ["everyday", "mistakes", "symbols", "writing", "unsure"] as const) {
      expect(html).toContain(`data-testid="onboarding-goal-${id}"`);
      expect(text(html)).toContain(COPY.onboarding.goalOptions[id]);
    }
    for (const id of ["new", "partway", "returning", "comfortable", "unsure"] as const) {
      expect(html).toContain(`data-testid="onboarding-level-${id}"`);
      expect(text(html)).toContain(COPY.onboarding.levelOptions[id]);
    }
  });

  it("includes the adult re-learner option, in words", () => {
    expect(text(html)).toContain(COPY.onboarding.levelOptions.returning);
    expect(COPY.onboarding.levelOptions.returning).toMatch(/coming back/i);
  });

  it("offers every track language as a checkbox, described by the honest note", () => {
    for (const id of ["javascript", "python", "java", "sql", "html-css"]) {
      expect(html).toContain(`data-testid="onboarding-language-${id}"`);
      expect(html).toContain('type="checkbox"');
    }
    expect(text(html)).toContain(COPY.onboarding.languagesNote);
    expect(html).toMatch(
      /aria-describedby="[^"]*-languages-note"|aria-describedby="[^"]*languages-note"/,
    );
  });

  it("starts with nothing selected: no goal is assumed for the visitor", () => {
    expect(html).not.toMatch(/<input[^>]*type="radio"[^>]*checked/);
    expect(html).not.toMatch(/<input[^>]*type="checkbox"[^>]*checked/);
  });

  it("is a real form with a submit button, and the submit names the output", () => {
    expect(html).toMatch(/<form[^>]*class="onboarding-form"/);
    expect(html).toContain('type="submit"');
    expect(text(html)).toContain(COPY.onboarding.submit);
  });
});

describe("the dismiss control comes first and is an equal, labelled button", () => {
  const html = renderFirstRun();

  it("puts the skip control before every question in the DOM", () => {
    // Tab order follows DOM order, and the panel is the first thing in main, so
    // this is what makes the dismiss control one Tab after the skip link.
    const skipAt = html.indexOf('data-testid="onboarding-skip"');
    const firstQuestionAt = html.indexOf('data-testid="onboarding-goal-everyday"');
    expect(skipAt).toBeGreaterThan(-1);
    expect(skipAt).toBeLessThan(firstQuestionAt);
  });

  it("is a plain button, not a submit, so Enter in a radio group cannot dismiss", () => {
    const skipTag = /<button[^>]*data-testid="onboarding-skip"[^>]*>/.exec(html)?.[0] ?? "";
    expect(skipTag).toContain('type="button"');
    expect(skipTag).not.toContain('type="submit"');
    // Not a link or a bare glyph either: an equal-weight control with a real label.
    expect(html).toMatch(/<button[^>]*data-testid="onboarding-skip"[^>]*>/);
    expect(skipTag).not.toContain("aria-hidden");
  });

  it("uses the global action.skip wording, so it is the same control everywhere", () => {
    expect(text(html)).toContain(COPY.onboarding.skip);
    expect(COPY.onboarding.skip).toBe("Skip for now");
  });
});

describe("the layout is stated, not asked", () => {
  it("names the guess as a guess, on a first run", () => {
    const html = renderFirstRun();
    expect(text(html)).toContain(COPY.onboarding.layoutGuess("QWERTY (US)"));
    expect(text(html)).toContain(COPY.onboarding.layoutLabel);
    // The guess is named as a guess in the same sentence as the value.
    expect(COPY.onboarding.layoutGuess("Dvorak")).toMatch(/guessed from your browser language/);
  });

  it("says nothing about guessing once the visitor has chosen one", () => {
    const html = render({ layoutConfirmed: true });
    expect(text(html)).toContain(COPY.onboarding.layoutConfirmed("QWERTY (US)"));
    expect(text(html)).not.toContain(COPY.onboarding.layoutGuess("QWERTY (US)"));
  });

  it("shows the layout the app actually has, and offers NO control for it", () => {
    for (const [layout, name] of [
      ["azerty", "AZERTY"],
      ["qwertz", "QWERTZ"],
      ["colemak-dh", "Colemak-DH"],
    ] as const) {
      const html = render({ layout });
      expect(text(html)).toContain(name);
      expect(html).toContain(`Change it in Settings whenever you like`);
    }
    // The load-bearing absence: no select, no radio group and no input of any kind
    // named for the layout. One setting, one control, in Settings.
    expect(renderFirstRun()).not.toMatch(/<select/);
    expect(renderFirstRun()).not.toMatch(/layout-(select|input|radio)/);
  });

  it("points at the override rather than hiding it behind the panel", () => {
    expect(COPY.onboarding.layoutGuess("x")).toMatch(/Settings/);
    expect(COPY.onboarding.layoutConfirmed("x")).toMatch(/Settings/);
  });
});

describe("what a later visit gets", () => {
  it("a skipped record renders NOTHING — no residue, no hidden gate", () => {
    const html = renderWith(JSON.stringify({ version: 1, state: "skipped" }));
    expect(html).toBe("");
  });

  it("a planned record renders the plan, and not the questions", () => {
    const html = renderWith(
      JSON.stringify({
        version: 1,
        state: "planned",
        goal: "mistakes",
        level: "returning",
        languages: ["python"],
      }),
    );
    expect(html).toContain('data-testid="onboarding-plan"');
    expect(html).not.toContain('data-testid="onboarding-goal-everyday"');
    expect(html).not.toContain("<fieldset");
    expect(html).not.toContain("<form");
  });

  it("the plan renders as a real definition list, with every row present", () => {
    const html = renderWith(
      JSON.stringify({
        version: 1,
        state: "planned",
        goal: "symbols",
        level: "new",
        languages: ["sql"],
      }),
      { layout: "dvorak", layoutConfirmed: true },
    );
    expect(html).toMatch(/<dl[^>]*data-testid="onboarding-plan"/);
    expect([...html.matchAll(/<dt>/g)]).toHaveLength(5);
    expect([...html.matchAll(/<dd/g)]).toHaveLength(5);
    for (const label of Object.values(COPY.onboarding.planRows)) {
      expect(text(html)).toContain(label);
    }
  });

  it("the plan says the honest thing in words, every time it is shown", () => {
    const html = renderWith(
      JSON.stringify({ version: 1, state: "planned", goal: "symbols", level: null, languages: [] }),
    );
    // Not a measurement.
    expect(text(html)).toContain(COPY.onboarding.planProvisional);
    // Prose and quotes only — no code band implied.
    expect(text(html)).toContain(COPY.onboarding.planBandNote);
    // What exists and what does not, per language.
    expect(text(html)).toContain(COPY.onboarding.planLanguagesNote);
    // The pending list, named.
    expect(text(html)).toContain(COPY.onboarding.planPending);
    // The goal that cannot be acted on says so.
    expect(text(html)).toContain(COPY.onboarding.planFocus.symbols);
  });

  it("an empty plan reads as a complete one, never as a gap", () => {
    const html = renderWith(
      JSON.stringify({ version: 1, state: "planned", goal: null, level: null, languages: [] }),
    );
    expect(text(html)).toContain(COPY.onboarding.planLanguagesNone);
    expect(text(html)).toContain(COPY.onboarding.planLevelNone);
    expect(text(html)).toContain(COPY.onboarding.planFocus.unsure);
    expect(text(html)).toContain(COPY.onboarding.planProseValue("Typical"));
  });

  it("names the layout's provenance in the plan, from what the host passed in", () => {
    const guessed = renderWith(
      JSON.stringify({ version: 1, state: "planned", goal: null, level: null, languages: [] }),
      { layout: "qwertz", layoutConfirmed: false },
    );
    expect(text(guessed)).toContain(
      COPY.onboarding.planLayoutValue("QWERTZ", COPY.onboarding.planLayoutSource.guessed),
    );

    const confirmed = renderWith(
      JSON.stringify({ version: 1, state: "planned", goal: null, level: null, languages: [] }),
      { layout: "qwertz", layoutConfirmed: true },
    );
    expect(text(confirmed)).toContain(
      COPY.onboarding.planLayoutValue("QWERTZ", COPY.onboarding.planLayoutSource.confirmed),
    );
  });

  it("offers a way back in, and that control is keyboard-reachable", () => {
    const html = renderWith(
      JSON.stringify({ version: 1, state: "planned", goal: null, level: null, languages: [] }),
    );
    expect(html).toContain('data-testid="onboarding-plan-change"');
    const changeTag =
      /<button[^>]*data-testid="onboarding-plan-change"[^>]*>/.exec(html)?.[0] ?? "";
    expect(changeTag).toContain(`type="button"`);
    expect(text(html)).toContain(COPY.onboarding.planChange);
  });

  it("the plan view is also a section with a real heading, not a bare div", () => {
    const html = renderWith(
      JSON.stringify({ version: 1, state: "planned", goal: null, level: null, languages: [] }),
    );
    expect(html).toMatch(/<section[^>]*aria-labelledby="/);
    expect([...html.matchAll(/<h([1-6])\b/g)].map((m) => m[1])).toEqual(["2"]);
    expect(html).not.toContain("aria-modal");
    expect(html).not.toContain('role="dialog"');
  });

  it("never claims a code difficulty band, whatever the goal", () => {
    for (const goal of ["everyday", "mistakes", "symbols", "writing", "unsure", null]) {
      const html = renderWith(
        JSON.stringify({ version: 1, state: "planned", goal, level: "new", languages: [] }),
      );
      // The content row names a prose band and the band note says what bands cover.
      expect(text(html)).toMatch(/English prose at (Easy|Typical|Hard) difficulty/);
      expect(text(html)).toContain(COPY.onboarding.planBandNote);
      expect(text(html)).not.toMatch(/code at (Easy|Typical|Hard) difficulty/i);
    }
  });
});

describe("a first run asks nothing about cadence, streaks or quotas", () => {
  const html = renderFirstRun();

  it("has no streak, daily-goal or notification question anywhere in the panel", () => {
    // BIZ-06 (no dark patterns) and the retention playbook §7.3: a shame loop is
    // built out of exactly these words, and the string table's
    // `onboarding.gamificationChoice.*` rows are deliberately NOT asked by OPS-01.
    for (const word of [
      "streak",
      "daily goal",
      "every day",
      "reminder",
      "notify",
      "goal per day",
    ]) {
      expect(html.toLowerCase(), `panel must not mention "${word}"`).not.toContain(word);
    }
  });

  it("asks no question about when the visitor will practise", () => {
    expect(html).not.toMatch(/morning coffee|before bed|commute/i);
  });

  it("uses no pressure or hype verbs", () => {
    for (const word of ["must", "required to", "earn", "rank", "unlock your", "you'll be able"]) {
      expect(html.toLowerCase()).not.toContain(word);
    }
  });
});
