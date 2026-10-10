import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { ConfusionsList } from "../src/learning/ConfusionsList";
import { COPY } from "../src/copy";
import type { Confusion } from "../src/learning/errors";

/**
 * LRN-05's confusions list, server-rendered.
 *
 * A browser test would drive a long attempt with controlled errors; what this
 * layer proves cheaply and on every run is the markup's shape — that the
 * typo map is hidden from assistive tech, that the list is a real list, and
 * that the copy describes what was typed rather than what it means.
 */

const CONFUSIONS: readonly Confusion[] = [
  { intended: "e", typed: "r", count: 3, position: 12, kind: "substitution" },
  { intended: "he", typed: "eh", count: 1, position: 4, kind: "transposition" },
];

function render(confusions: readonly Confusion[]): string {
  return renderToStaticMarkup(<ConfusionsList confusions={confusions} onDrill={() => {}} />);
}

describe("confusions list (LRN-05)", () => {
  it("shows the intended character, the typed one, and the count", () => {
    const html = render(CONFUSIONS);
    // The pair, in that order, and the engine's count.
    expect(html).toContain("confusion-intended");
    expect(html).toContain("confusion-typed");
    expect(html).toContain(">e<");
    expect(html).toContain(">r<");
    expect(html).toContain("3 times");
  });

  it("names the engine's classification, in words not colour", () => {
    const html = render(CONFUSIONS);
    expect(html).toContain("Wrong key");
    expect(html).toContain("Swapped");
  });

  it("offers a one-click drill per confusion", () => {
    const html = render(CONFUSIONS);
    const drills = html.match(/data-testid="confusion-drill"/g) ?? [];
    expect(drills).toHaveLength(2);
    expect(html).toContain(COPY.learning.drillAction);
  });

  it("hides the typo map from assistive tech, and never colour-only", () => {
    // The map is decoration: the list above is the accessible form, and a
    // diagram of arrows has nothing to add to it.
    const html = render(CONFUSIONS);
    expect(html).toContain('data-testid="typo-map"');
    expect(html).toContain('aria-hidden="true"');
    // The keys are labelled with the characters themselves, so the map
    // survives without colour (rule 7).
    expect(html).toContain('class="typo-key"');
  });

  it("says so when there is nothing to show", () => {
    const html = render([]);
    expect(html).toContain('data-testid="confusions-empty"');
    expect(html).toContain(COPY.learning.emptyNote);
    // And it does NOT render an empty list with a heading.
    expect(html).not.toContain("confusions-list");
  });

  it("never promises an outcome (rule 9)", () => {
    const banned = /\b(faster|improve|boost|master|perfect|progress)\b/i;
    for (const s of [
      COPY.learning.title,
      COPY.learning.intro,
      COPY.learning.emptyNote,
      COPY.learning.drillAction,
      COPY.learning.mapLabel,
    ]) {
      expect(banned.test(s), `claims-banned wording in: ${s}`).toBe(false);
    }
    // "What you typed" is a description; nothing about what it will get you.
    expect(COPY.learning.title.toLowerCase()).not.toContain("will");
  });
});
