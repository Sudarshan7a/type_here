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

  it("puts every character inside a word box, and every space at the END of one", () => {
    // STEER-2 bug (d) and bug (f) are both about where the browser is allowed to
    // break the line, and CSS Text permits a break between any two adjacent
    // ATOMIC INLINES. So the structure is the whole defence:
    //
    //   - a character at top level is atomic, which is how "whenever" came to be
    //     split as "wh / enever" at 360px;
    //   - a space at top level is atomic too, which lets a break land BEFORE it
    //     and opens the next line with a space.
    //
    // Both were once handled by measuring the laid-out result and correcting it,
    // and that measurement was found to settle on the wrong side of the break at
    // every width where the wrap sat within a couple of pixels of fitting. This
    // asserts the structure instead, which needs no layout and no browser to know
    // it holds. Character spans hold no child elements, so a word box is exactly a
    // run of them and this pattern cannot run past the end of one.
    const WORD_BOX = /<span class="word">((?:<span class="ch[^"]*"[^>]*>[^<]*<\/span>)+)<\/span>/g;

    const boxes = [...html.matchAll(WORD_BOX)].map(([, body = ""]) =>
      [...body.matchAll(/>([^<]*)<\/span>/g)].map(([, text = ""]) => text).join(""),
    );
    expect(boxes.length, "the passage must render as more than one word box").toBeGreaterThan(1);

    for (const [i, text] of boxes.entries()) {
      const isLast = i === boxes.length - 1;
      // A box is a run of non-space characters followed by AT MOST one space, and
      // that space is last. This is the whole of bug (d): a break can only occur
      // BETWEEN two atomic boxes, and there is no longer a break opportunity in
      // front of a space, so a wrapped line can never open with one.
      expect(
        text,
        `word box ${i} must be non-space characters followed by at most one trailing ` +
          `space, never an interior one: ${JSON.stringify(text)}`,
      ).toMatch(/^\S*(?:\u00A0)?$/);
      expect(
        isLast ? text : text.slice(0, -1),
        `word box ${i} ${isLast ? "must not" : "must only"} end with a space`,
      ).not.toMatch(/\s$/);
      if (!isLast) {
        expect(text, `word box ${i} must own the space that follows it`).toMatch(/\u00A0$/);
      }
    }

    // Nothing is left outside: the boxes account for every character, and the
    // text they render is the passage itself, spaces and all.
    const rendered = boxes.join("");
    // The apostrophe in the passage is an HTML entity in the rendered markup,
    // and the space is U+00A0 rather than U+0020 by design — see groupIntoWords.
    expect(rendered.replace(/&#x27;/g, "'").replace(/\u00A0/g, " ")).toBe(passage.text);

    // And nothing was left out of the boxes: no character span sits beside one.
    const inBoxes = [...html.matchAll(WORD_BOX)].reduce(
      (n, [, body = ""]) => n + (body.match(/data-char-state/g) ?? []).length,
      0,
    );
    expect(inBoxes, "every character span must live inside a word box").toBe(
      [...passage.text].length,
    );
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

  /**
   * POSITIVE FORM — and the layer this one is actually responsible for.
   *
   * The previous version asserted the ABSENCE of nine literal strings
   * (`<dialog`, `role="dialog"`, `class="toast"`, …). Owner-proxy review 1
   * (REVIEW-1.md, H1) rendered a `promo-banner` div carrying `aria-modal="true"`
   * onto the surface and the assertion passed: the string `aria-modal` was not
   * in the list.
   *
   * So the list is inverted. Rather than naming the attributes that must not
   * appear, this parses every tag in the markup and reports any element that
   * carries overlay SEMANTICS — an overlay role, aria-modal, the popover
   * attribute, or a `<dialog>` element. An overlay now has to be positively
   * described as something other than an overlay to get through.
   *
   * This layer exists because the server-rendered markup is the only place a
   * portal or a late script cannot escape: if it is not in the markup, it is
   * not in the initial document. The live computed-style check lives in
   * `e2e/typing-surface.spec.ts` AC6, which can see a runtime overlay that
   * never existed in this string, and `scripts/check-policies.mjs` stops the
   * construct being written in the first place. Three layers, three different
   * failure modes.
   */
  function overlaySemantics(markup: string): string[] {
    const problems: string[] = [];
    // Every opening tag, whatever it is called.
    for (const match of markup.matchAll(
      /<([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g,
    )) {
      const [, tag, attributes] = match;
      if (tag === undefined || attributes === undefined) continue;
      const lower = attributes.toLowerCase();
      const has = (attr: string) => new RegExp(`\\b${attr}\\s*=`).test(lower);

      if (tag === "dialog") problems.push("<dialog>");
      if (has("popover")) problems.push(`<${tag} popover>`);
      if (has("aria-modal")) problems.push(`<${tag} aria-modal>`);
      const role = /\brole\s*=\s*["']([^"']*)["']/.exec(lower)?.[1] ?? "";
      if (role === "dialog" || role === "alertdialog") {
        problems.push(`<${tag} role=${role}>`);
      }
    }
    return problems;
  }

  it("renders no element carrying overlay semantics", () => {
    // Deliberately NOT `expect(html).not.toContain("aria-modal")`. Asserting
    // one forbidden string is asserting that nobody has thought of the next
    // one. This walks every tag the surface actually emits.
    expect(overlaySemantics(html), "the typing surface must render no overlay element").toEqual([]);
  });

  it("would catch an overlay named something the old list never mentioned", () => {
    // The regression this whole change exists for, as a test rather than a
    // claim. If someone replaces the parser with a blocklist again, this fails.
    const sneaky = '<div class="promo-banner" aria-modal="true">Sign up</div>';
    expect(
      overlaySemantics(sneaky),
      "an aria-modal overlay must be caught whatever it is called",
    ).toContain("<div aria-modal>");
  });

  it("would catch a dialog element with a role and no class at all", () => {
    expect(overlaySemantics('<section role="dialog">Blocked</section>')).toEqual([
      "<section role=dialog>",
    ]);
  });

  it("does not fire on ordinary surface markup", () => {
    // The guard must not simply reject everything, or it is useless.
    expect(
      overlaySemantics(
        '<span class="ch" data-char-state="pending">a</span><div class="word">b</div>',
      ),
    ).toEqual([]);
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
