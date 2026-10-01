import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { App } from "../src/App";
import { TypingSurface } from "../src/TypingSurface";
import { COPY } from "../src/copy";
import { PASSAGES } from "../src/passages";

/**
 * Server-rendered structure of the typing surface.
 *
 * This cannot exercise the keystroke path — that needs a real browser and lives
 * in e2e/typing-surface.spec.ts. What it CAN prove, cheaply and on every run,
 * is everything about the markup that a browser test would only notice when it
 * broke: the accessible name, the live region's politeness, the absence of any
 * dialog, and that every character is rendered with a state attribute from the
 * start rather than acquiring one on the first keystroke.
 */

const passage = PASSAGES[0]!;

describe("TypingSurface markup", () => {
  const html = renderToStaticMarkup(<TypingSurface passage={passage} errorMode="free" />);

  it("gives the key sink the accessible name from the string table", () => {
    expect(html).toContain(`aria-label="${COPY.typingSurfaceInstructions}"`);
    // The instructions must name both keys the surface binds.
    expect(html).toMatch(/Press Tab to restart/);
    expect(html).toMatch(/Press Escape/);
  });

  it("renders one span per character, each already carrying a char state", () => {
    const spans = html.match(/data-char-state="[a-z]+"/g) ?? [];
    expect(spans.length).toBe([...passage.text].length);
    // Every one starts untyped: a character must never be rendered with no state
    // at all, because "no state" and "not typed yet" are different claims.
    expect(new Set(spans)).toEqual(new Set(['data-char-state="untyped"']));
  });

  it("renders the live readouts as not-available, never as 0 (chapter 4 E9)", () => {
    expect(html).toMatch(/data-testid="live-net-wpm"[^>]*>n\/a</);
    expect(html).toMatch(/data-testid="live-accuracy"[^>]*>n\/a</);
  });

  it("renders exactly one polite live region and nothing assertive", () => {
    const live = html.match(/aria-live="[a-z]+"/g) ?? [];
    expect(live).toEqual(['aria-live="polite"']);
    expect(html).not.toContain('aria-live="assertive"');
    // A per-keystroke announcement would be a live region inside the surface.
    const surface = html.slice(html.indexOf('data-testid="surface"'));
    expect(surface.slice(0, surface.indexOf("</div>"))).not.toContain("aria-live");
  });

  it("renders no finished panel before anything has been typed", () => {
    expect(html).not.toContain('data-testid="finished"');
    expect(html).not.toContain('data-testid="restart"');
  });

  it("marks the caret decorative: it must never be announced", () => {
    const caret = /<div class="caret"[^>]*>/.exec(html);
    expect(caret).not.toBeNull();
    expect(caret![0]).toContain('aria-hidden="true"');
  });

  it("shows the unfocused prompt before the surface has focus", () => {
    expect(html).toContain('data-testid="focus-prompt"');
    expect(html).toContain(COPY.focusPrompt);
  });
});

describe("TypingSurface ships no interrupting chrome (CUS-01)", () => {
  const html = renderToStaticMarkup(<TypingSurface passage={passage} errorMode="free" />);

  it("contains no dialog, alert, toast, popover or modal element", () => {
    // Checked on the rendered markup rather than trusted from the stylesheet:
    // a popup can appear from markup, from a portal or from a script, and only
    // the markup proves what the server actually sent.
    for (const forbidden of [
      "<dialog",
      'role="dialog"',
      'role="alert"',
      'role="alertdialog"',
      "popover",
      'class="modal"',
      'class="toast"',
      'class="popup"',
      'class="tooltip"',
    ]) {
      expect(html, `${forbidden} must not appear on the typing surface`).not.toContain(forbidden);
    }
  });
});

describe("App shell", () => {
  const html = renderToStaticMarkup(<App />);

  it("renders a heading and a passage selector labelled for assistive tech", () => {
    expect(html).toContain("RealType");
    expect(html).toContain('<label for="passage">');
    expect(html).toContain('id="passage"');
  });

  it("offers every passage in the content set", () => {
    for (const p of PASSAGES) {
      expect(html).toContain(`value="${p.id}"`);
    }
  });

  it("states plainly that nothing is saved or sent", () => {
    expect(html).toMatch(/nothing is sent anywhere/i);
  });
});
