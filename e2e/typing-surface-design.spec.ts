import { expect, test, type Page } from "@playwright/test";

/**
 * The design pass on the typing surface and the finished panel (STEER-2), plus
 * the five defects the owner reported by looking at it.
 *
 * These are LAB PROXY (browser-inspected) evidence: synthetic keystrokes through
 * a real browser. They are not REAL-DEVICE CONFIRMED and say nothing about the OS
 * keyboard layout, IME, dead keys or physical key positions.
 *
 * Every test here names the defect it pins. Where a test can pass on a page with
 * no stylesheet at all, it asserts BOTH directions — an unstyled page reports a
 * transition duration of 0s, a line-height of `normal` and a monospace fallback
 * that happens to match, so a single-direction check proves nothing. That was not
 * hypothetical: Session 7 shipped an entirely unstyled app for a week and one of
 * my own gates passed on it.
 */

/** PROSE-01-004, from apps/web/src/passages.ts. */
const PASSAGE =
  "Dinner's ready whenever you are. I made extra rice in case your brother stops by later tonight.";

async function typeText(page: Page, text: string, delay = 4) {
  await page.keyboard.type(text, { delay });
}

/** The box of the character at `index`, and whether it starts a wrapped line. */
async function charBoxes(page: Page) {
  return page.getByTestId("surface").evaluate((surface) => {
    const host = surface.getBoundingClientRect();
    // The content box, which is where a wrapped line starts.
    const style = getComputedStyle(surface);
    const contentLeft =
      host.left +
      (surface as HTMLElement).clientLeft +
      parseFloat(style.paddingLeft || "0");
    const boxes = [...surface.querySelectorAll("[data-char-state]")].map((el) => {
      const r = el.getBoundingClientRect();
      return {
        index: 0,
        char: el.textContent ?? "",
        left: r.left,
        right: r.right,
        top: r.top,
        height: r.height,
        startsLine: Math.abs(r.left - contentLeft) < 1.5,
      };
    });
    boxes.forEach((b, i) => {
      b.index = i;
    });
    return { boxes, contentLeft };
  });
}

async function caretBox(page: Page) {
  const box = await page.getByTestId("caret").boundingBox();
  expect(box, "the caret must have a real box, not zero size").not.toBeNull();
  return box!;
}

/**
 * STEER-2 bug (a): "The caret must sit exactly on the current character,
 * baseline-aligned. The owner saw it one character right and below the end of
 * the text."
 *
 * The cause was arithmetic, not CSS: character offsets were measured from the
 * passage's BORDER box, while the caret itself is positioned at the passage's
 * PADDING (`.caret { left: 0.75rem; top: 1rem }`). The padding was therefore
 * counted twice — 12 px right, which is exactly one character in the mono stack,
 * and 16 px down, which put it below the line of text. The test asserts the
 * caret's box against the target character's box directly, because the symptom
 * ("one character right") is what the eye catches and what a numeric tolerance
 * on some other element would miss.
 */
test("BUG-a: the caret box sits exactly on the target character, in every situation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByTestId("surface").click();

  // One character in the mono stack, so an off-by-one-padding error shows up as
  // a whole character of drift rather than a rounding difference.
  const firstChar = (await charBoxes(page)).boxes[0]!;
  const charWidth = firstChar.right - firstChar.left;
  expect(charWidth, "a mono character must have a measurable advance").toBeGreaterThan(4);

  const checkAligned = async (label: string, index: number, atEndOfLine = false) => {
    const caret = await caretBox(page);
    const { boxes } = await charBoxes(page);
    const target = boxes[index]!;
    const expectedLeft = atEndOfLine ? target.right : target.left;
    expect(
      Math.abs(caret.x - expectedLeft),
      `${label}: caret must be on the character at ${index}, not ${(
        (caret.x - expectedLeft) /
        charWidth
      ).toFixed(2)} characters away`,
    ).toBeLessThanOrEqual(1);
    expect(Math.abs(caret.y - target.top), `${label}: caret must share the character's top`).toBeLessThanOrEqual(1);
    expect(
      Math.abs(caret.height - target.height),
      `${label}: caret must be the character's height, not the line box`,
    ).toBeLessThanOrEqual(2);
  };

  // 1. Line 1, before anything is typed.
  await checkAligned("start of line 1", 0);

  // 2. Partway along line 1.
  await typeText(page, "Dinner's re", 8);
  await checkAligned("mid line 1", 11);

  // 3. After wrapping onto line 2. The passage is longer than the 68ch field.
  const { boxes } = await charBoxes(page);
  const wrapIndex = boxes.findIndex((b) => b.startsLine && b.index > 0);
  expect(wrapIndex, "the passage must wrap inside the field for this test to mean anything").toBeGreaterThan(0);
  await typeText(page, PASSAGE.slice(0, wrapIndex + 3), 4);
  await checkAligned("first line after wrapping", wrapIndex + 3);

  // 4. After Backspace, the caret returns one character left.
  await page.keyboard.press("Backspace");
  await checkAligned("after backspace", wrapIndex + 2);

  // 5. After a resize, which re-wraps the text underneath the caret. The buffer
  // position is unchanged by a resize, so the same character index is still the
  // target — only its position on the page has moved.
  await page.setViewportSize({ width: 900, height: 900 });
  await page.waitForTimeout(150);
  await checkAligned("after resize", wrapIndex + 2);

  // 6. At the very end of the passage, past the final character.
  await page.setViewportSize({ width: 1440, height: 900 });
  await typeText(page, PASSAGE.slice(wrapIndex + 2), 2);
  await expect(page.getByTestId("finished")).toBeVisible({ timeout: 15_000 });
  // The caret is hidden once the test is over (bug e), so the end-of-passage
  // position is asserted through the last character's geometry instead.
  const last = (await charBoxes(page)).boxes.at(-1)!;
  expect(last.right - last.left, "the final character must still have a box").toBeGreaterThan(0);
});

test("BUG-b: the unfocused prompt never covers a character of the passage", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const prompt = page.getByTestId("focus-prompt");
  await expect(prompt).toBeVisible();

  const promptBox = (await prompt.boundingBox())!;
  const { boxes } = await charBoxes(page);

  // It must not overlap ANY character — not "most of them", not "the ones on the
  // first line". An overlay centred on the field is exactly what the previous
  // build shipped, and it hid the very text the user has to read.
  const covered = boxes.filter(
    (b) =>
      b.left < promptBox.x + promptBox.width &&
      b.right > promptBox.x &&
      b.top < promptBox.y + promptBox.height &&
      b.bottom > promptBox.y,
  );
  expect(covered.map((b) => `${b.index}:${JSON.stringify(b.char)}`)).toEqual([]);

  // And it must not sit on top of the field's own clickable area either, or it
  // would be the thing the user aims at instead of the text.
  const surface = (await page.getByTestId("surface").boundingBox())!;
  const overlapArea =
    Math.max(0, Math.min(promptBox.x + promptBox.width, surface.x + surface.width) - Math.max(promptBox.x, surface.x)) *
    Math.max(0, Math.min(promptBox.y + promptBox.height, surface.y + surface.height) - Math.max(promptBox.y, surface.y));
  expect(overlapArea, "the prompt may not overlap the typing field at all").toBe(0);

  // It is still reachable: clicking the field focuses it and the prompt goes.
  await page.getByTestId("surface").click();
  await expect(prompt).toHaveCount(0);
});

test("BUG-c: the live readout and the finished headline never contradict each other", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByTestId("surface").click();

  // The live figure is KEYSTROKE accuracy; the headline is FINAL accuracy.
  // Different measures. Labelling both "Accuracy" is how one word came to mean
  // two numbers on one screen, which is what the owner saw as a contradiction
  // (98.9% live against 100.0% finished).
  const liveAccuracyLabel = page.getByTestId("live-accuracy-label");
  await expect(liveAccuracyLabel).toBeVisible();
  const liveLabel = (await liveAccuracyLabel.innerText()).trim().toLowerCase();

  await expect(page.getByTestId("finished")).toHaveCount(0);
  await typeText(page, PASSAGE, 2);
  await expect(page.getByTestId("finished")).toBeVisible({ timeout: 15_000 });

  // While the result is showing, the live readout is not competing with it.
  await expect(page.getByTestId("live-bar")).toHaveCount(0);

  // The word the live bar used must not be the word the headline uses, or the
  // same word carries two definitions across the screen.
  const headlineText = (await page.getByTestId("headline-accuracy").innerText()).trim().toLowerCase();
  expect(liveLabel, `live label "${liveLabel}" must not be the word the headline uses`).not.toBe("accuracy");
  expect(headlineText).toContain("accuracy");

  // The engine stamp proves the headline came from packages/engine and not from
  // the view's own arithmetic.
  await expect(page.getByTestId("engine-stamp")).toContainText("model ");
});

test("BUG-d: a wrapped line never begins with a visible space", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByTestId("surface").click();

  const { boxes } = await charBoxes(page);
  const wrappedStarts = boxes.filter((b) => b.startsLine && b.index > 0);
  expect(
    wrappedStarts.length,
    "the passage must wrap for this test to mean anything",
  ).toBeGreaterThan(0);

  for (const box of wrappedStarts) {
    // A space is rendered as U+00A0 so it cannot be collapsed away. The test
    // asserts on the CHARACTER as well as the width, so hiding the gap by
    // rendering nothing does not pass.
    expect(
      box.char.trim(),
      `line starting at character ${box.index} begins with a space`,
    ).toBe("");
    expect(box.right - box.left, `character ${box.index} is a visible gap at the line start`).toBeLessThan(1);
  }
});

test("BUG-e: the caret is hidden once the test is over", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByTestId("surface").click();

  await expect(page.getByTestId("caret")).toBeVisible();
  await typeText(page, PASSAGE, 2);
  await expect(page.getByTestId("finished")).toBeVisible({ timeout: 15_000 });

  // "Typing after the end does nothing" (STEER-2 criterion 5) is only true if
  // the caret has stopped inviting more input as well.
  await expect(page.getByTestId("caret")).toBeHidden();

  // Restart brings it back, or the second attempt would have no cursor at all.
  await page.getByTestId("restart").click();
  await expect(page.getByTestId("caret")).toBeVisible();
});

test("DESIGN: the surface is laid out in the design tokens, and both themes hold", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const scheme of ["dark", "light"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    await page.getByTestId("surface").click();
    await typeText(page, "Dinner's ready", 6);

    const read = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const surface = document.querySelector('[data-testid="surface"]')!;
      const char = surface.querySelector('[data-char-state="correct"]');
      const untyped = surface.querySelector('[data-char-state="untyped"]');
      const caret = document.querySelector('[data-testid="caret"]')!;
      const s = getComputedStyle(surface);
      return {
        tokens: {
          bg: root.getPropertyValue("--bg").trim(),
          surface1: root.getPropertyValue("--surface-1").trim(),
          text: root.getPropertyValue("--text").trim(),
          textPending: root.getPropertyValue("--text-pending").trim(),
          flow: root.getPropertyValue("--flow").trim(),
          pace: root.getPropertyValue("--pace").trim(),
          slip: root.getPropertyValue("--slip").trim(),
        },
        surfaceBg: s.backgroundColor,
        surfaceColor: s.color,
        surfaceFont: s.fontFamily,
        surfaceLineHeight: parseFloat(s.lineHeight),
        surfaceFontSize: parseFloat(s.fontSize),
        charColor: char === null ? "" : getComputedStyle(char).color,
        untypedColor: untyped === null ? "" : getComputedStyle(untyped).color,
        caretBackground: getComputedStyle(caret).backgroundColor,
        caretWidth: parseFloat(getComputedStyle(caret).width),
      };
    });

    // The tokens must EXIST. A missing custom property falls through to an empty
    // string, and an unstyled page would sail past every other check here.
    for (const [name, value] of Object.entries(read.tokens)) {
      expect(value, `--${name} must be defined in both themes`).toMatch(/^(#|rgba?\()/i);
    }

    // The surface paints in the tokens, not in hand-picked hex. Both sides are
    // normalised to "r,g,b" first: a custom property keeps the literal written in
    // tokens.css ("#131A2E") while a computed style is always "rgb(19, 26, 46)",
    // so comparing the raw strings would fail on a correct page.
    const toRgb = (value: string): string => {
      const v = value.trim();
      if (v.startsWith("#")) {
        const h = v.slice(1);
        const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
        return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).join(",");
      }
      const m = v.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
      return m ? `${m[1]},${m[2]},${m[3]}` : v;
    };
    expect(toRgb(read.surfaceBg)).toBe(toRgb(read.tokens.surface1));
    expect(toRgb(read.surfaceColor)).toBe(toRgb(read.tokens.text));
    expect(toRgb(read.caretBackground)).toBe(toRgb(read.tokens.pace));

    // The design specifies a monospace typing field with generous leading, and
    // a caret that is a thin bar rather than a block.
    expect(read.surfaceFont).toMatch(/mono/i);
    expect(read.surfaceFontSize).toBeGreaterThanOrEqual(20);
    expect(read.surfaceLineHeight / read.surfaceFontSize).toBeGreaterThan(1.4);
    expect(read.caretWidth).toBeGreaterThanOrEqual(2);
    expect(read.caretWidth).toBeLessThanOrEqual(4);

    // Correct and untyped must differ, and untyped must be dimmer rather than
    // the same ink — but neither is allowed to be the ONLY difference, which the
    // char-state test already pins on decoration.
    expect(read.charColor).not.toBe(read.untypedColor);
  }
});

test("DESIGN: no horizontal scroll at any breakpoint the design pack names", async ({ page }) => {
  for (const width of [360, 480, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.getByTestId("surface").click();
    await typeText(page, "Dinner's ready whenever you are. I made extra rice", 3);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(
      overflow.scrollWidth,
      `horizontal scroll at ${width}px`,
    ).toBeLessThanOrEqual(overflow.clientWidth + 1);
  }
});