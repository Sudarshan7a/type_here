import { expect, test } from "@playwright/test";

/**
 * CARET SIZE — STEER-6, an owner override of STEER-5 D9.
 *
 * The owner looked at the surface and said: the caret is too big for the letter.
 * Alignment is fine, size is not. Keep the pack-level choices (2px width,
 * `--pace` colour, blink-while-idle); change the HEIGHT.
 *
 * The spec is "about 1.1x font size, not the line box". Those are very
 * different numbers and that is the whole point: at `--t-type: 28px` and
 * `--lh-type: 1.65` the line box is 46.2px and the target is ~30.8px, so the
 * caret was over half again as tall as the letter it sat on.
 *
 * MEASURED BEFORE (line box): caret 46.2px, tallest glyph in the passage 20.0px
 * ("i"), so the caret stood 26.2px taller than the tallest letter on the line.
 *
 * WHY NOT "THE CURRENT CHARACTER'S INK" LITERALLY
 *
 * The first draft of this file asserted the caret against the ink height of the
 * character it happened to be over, and the run showed why that is the wrong
 * question. Ink varies enormously within one passage: "i" is 20.0px, "." is
 * 5.0px. A caret sized to the current character's ink would shrink to a stub
 * over every full stop and jump back over every letter — a caret that changes
 * size as you type, which is a worse defect than the one being fixed.
 *
 * So "sized to the glyph" is asserted as: a height in the neighbourhood of the
 * passage's TALLEST ink, and on the owner's own number of ~1.1x font size. That
 * is what "sized to the letter" means to someone looking at a screen, and it is
 * stable across the passage. The per-character ink is still measured and
 * reported in every failure message, because it is what makes a failure legible.
 *
 * FOUR POSITIONS, because a caret that is only ever correct on line 1 is not
 * correct. The wrap case is the one that historically breaks: the height comes
 * from a value measured once per layout, and a line-2 slot is a different rect
 * from a line-1 slot.
 *
 * Everything here POLLS rather than reading once. The surface batches its DOM
 * writes into a requestAnimationFrame (AGENTS.md rule 2 forbids a React render
 * per keystroke), so a read issued in the same task as a keystroke sees the
 * PREVIOUS frame. An earlier draft of this probe read `caretIndex` straight
 * after three Backspaces and concluded Backspace was broken; it was not, the
 * read was just early. AC1 documents the same constraint.
 */
const PASSAGE =
  "Dinner's ready whenever you are. I made extra rice in case your brother stops by later tonight.";

/** The owner's number, and the tolerance a real font is allowed around it. */
const CARET_EM = 1.1;
const EM_TOLERANCE = 0.1;

type Measurement = {
  caretHeight: number;
  fontSize: number;
  lineHeight: number;
  /** Ink height of the tallest character in the passage — the "glyph" size. */
  tallestInk: number;
  tallestChar: string;
  /** Ink of whatever the caret is over, for the failure message only. */
  currentChar: string;
  currentInk: number;
  index: number;
  /** Which visual line the caret is on, 0-based. */
  line: number;
};

async function measure(page: import("@playwright/test").Page): Promise<Measurement> {
  return page.evaluate(() => {
    const caret = document.querySelector<HTMLElement>('[data-testid="caret"]');
    if (caret === null) throw new Error("no caret");
    const chars = [...document.querySelectorAll<HTMLElement>("[data-char-state]")];
    if (chars.length === 0) throw new Error("no character spans");

    const index = Number.parseInt(caret.dataset.caretIndex ?? "", 10);
    const charEl = chars[Math.min(Math.max(index, 0), chars.length - 1)];
    if (charEl === undefined) throw new Error("no character span at the caret");

    const s = getComputedStyle(charEl);
    const ctx = document.createElement("canvas").getContext("2d");
    if (ctx === null) throw new Error("no 2d context");
    // The character's OWN computed font, so a fallback font is measured as the
    // font that actually rendered rather than the one the stylesheet asked for.
    ctx.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;

    const ink = (text: string) => {
      const m = ctx.measureText(text);
      return m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    };

    let tallestChar = "";
    let tallestInk = 0;
    for (const el of chars) {
      const t = el.textContent ?? "";
      const h = ink(t);
      if (h > tallestInk) {
        tallestInk = h;
        tallestChar = t;
      }
    }

    // Which line: the caret's own character is the ground truth for the row it
    // belongs to, so the row is found by matching that character's rect rather
    // than by guessing an offset from the caret's top. The caret is a sibling
    // box, not the character, and the two are offset by the half-leading —
    // 8px here — so any constant would be a guess that breaks the day the
    // type tokens change.
    const rowTops = [...new Set(chars.map((c) => Math.round(c.getBoundingClientRect().top)))].sort(
      (a, b) => a - b,
    );
    const myTop = Math.round(charEl.getBoundingClientRect().top);

    return {
      caretHeight: caret.getBoundingClientRect().height,
      fontSize: Number.parseFloat(s.fontSize),
      lineHeight: Number.parseFloat(s.lineHeight),
      tallestInk,
      tallestChar,
      currentChar: charEl.textContent ?? "",
      currentInk: ink(charEl.textContent ?? ""),
      index,
      line: rowTops.findIndex((t) => Math.abs(t - myTop) < 2),
    };
  });
}

/** The rule under test, stated once so every case reads the same. */
function expectSizedToGlyph(m: Measurement, where: string) {
  const detail =
    `${where}: caret ${m.caretHeight.toFixed(1)}px · font-size ${m.fontSize}px · ` +
    `line box ${m.lineHeight.toFixed(1)}px · tallest glyph "${m.tallestChar}" ` +
    `${m.tallestInk.toFixed(1)}px · under caret "${m.currentChar}" ${m.currentInk.toFixed(1)}px`;

  // 1. The owner's number. This is the assertion the line-box caret fails.
  const target = m.fontSize * CARET_EM;
  const tol = m.fontSize * EM_TOLERANCE;
  expect(
    Math.abs(m.caretHeight - target),
    `${detail} — expected about ${target.toFixed(1)}px (${CARET_EM}x font-size ±${tol.toFixed(1)}px)`,
  ).toBeLessThanOrEqual(tol);

  // 2. It is visibly NOT the line box. Stated separately so a regression names
  //    the thing that actually broke rather than a ratio.
  expect(
    m.caretHeight,
    `${detail} — the caret must be shorter than the ${m.lineHeight.toFixed(1)}px line box`,
  ).toBeLessThan(m.lineHeight - 4);

  // 3. And it is sized to the GLYPH, not merely to a fraction of the em. A line
  //    box is 26px over the tallest letter; this band is 14px.
  const glyphSlack = m.fontSize * 0.5;
  expect(
    Math.abs(m.caretHeight - m.tallestInk),
    `${detail} — the caret must be within ${glyphSlack.toFixed(1)}px of the tallest glyph`,
  ).toBeLessThanOrEqual(glyphSlack);
}

/** Wait for the caret's published index to settle, rather than reading one frame early. */
async function settledIndex(page: import("@playwright/test").Page, expected: number) {
  await expect
    .poll(
      async () =>
        page.evaluate(() =>
          Number.parseInt(
            document.querySelector('[data-testid="caret"]')?.dataset.caretIndex ?? "",
            10,
          ),
        ),
      { message: `the caret must settle at index ${expected}`, timeout: 2_000 },
    )
    .toBe(expected);
}

test("caret: sized to the glyph on line 1", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("surface").click();
  await settledIndex(page, 0);

  const m = await measure(page);
  expect(m.line, "the caret must start on the first line").toBe(0);
  expectSizedToGlyph(m, "line 1");

  // The pack-level choices the owner said to keep.
  const kept = await page.getByTestId("caret").evaluate((el) => {
    const s = getComputedStyle(el);
    return { width: s.width, background: s.backgroundColor };
  });
  expect(Number.parseFloat(kept.width), "the 2px caret width is a pack choice and stays").toBe(2);
  expect(kept.background, "the caret keeps the --pace colour").not.toBe("rgba(0, 0, 0, 0)");
});

test("caret: sized to the glyph after the text wraps to a second line", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("surface").click();
  // 65 characters: the passage wraps to two lines at this viewport, so this is
  // past the break. The assertion below re-checks that it really is a later
  // line rather than trusting this number.
  await page.keyboard.type(PASSAGE.slice(0, 65), { delay: 2 });
  await settledIndex(page, 65);

  const m = await measure(page);
  expect(
    m.line,
    "the caret must be on a later line for this case to test anything",
  ).toBeGreaterThan(0);
  expectSizedToGlyph(m, `line ${m.line + 1}`);
});

test("caret: sized to the glyph after Backspace moves it back", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("surface").click();
  await page.keyboard.type(PASSAGE.slice(0, 40), { delay: 2 });
  await settledIndex(page, 40);

  for (let i = 0; i < 3; i++) await page.keyboard.press("Backspace");
  await settledIndex(page, 37);

  const m = await measure(page);
  expectSizedToGlyph(m, "after Backspace");
});

test("caret: sized to the glyph at the end of the passage", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("surface").click();
  await page.keyboard.type(PASSAGE, { delay: 2 });
  await settledIndex(page, PASSAGE.length);

  const m = await measure(page);
  expectSizedToGlyph(m, "at the end");
});

/**
 * CARET STYLE (STEER-6): line, block, underline, default line.
 *
 * The owner asked for the choice as a setting, so what is asserted here is that
 * the setting REACHES the caret and that each style is visibly a different
 * shape — not that it looks good, which is the owner's call and is recorded in
 * HUMAN-ACTIONS.md as such.
 *
 * Every style must also keep the caret glyph-sized in spirit: the point of the
 * change was a caret that does not tower over the letter, and a block caret
 * that reverted to the line box would undo it.
 */
test("caret style: defaults to line and is offered as a setting", async ({ page }) => {
  await page.goto("/");

  const select = page.getByTestId("caret-style-select");
  await expect(select, "caret style must be offered as a setting").toBeVisible();
  await expect(select).toHaveValue("line");

  // The default must actually reach the surface, not just sit in the control.
  await expect(page.getByTestId("surface")).toHaveAttribute("data-caret-style", "line");

  const options = await select
    .locator("option")
    .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
  expect(options, "line, block and underline are the three the owner asked for").toEqual([
    "line",
    "block",
    "underline",
  ]);
});

test("caret style: each style is a visibly different shape", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("surface").click();

  const shape = () =>
    page.getByTestId("caret").evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
    });

  const seen: Record<string, { w: number; h: number }> = {};
  for (const style of ["line", "block", "underline"] as const) {
    await page.getByTestId("caret-style-select").selectOption(style);
    await expect(page.getByTestId("surface")).toHaveAttribute("data-caret-style", style);
    seen[style] = await shape();
  }

  // Line is thin, block is a character wide, underline is short. If the style
  // attribute were not reaching CSS these would all be identical, which is
  // exactly the bug this catches.
  expect(seen.line!.w, "the line caret stays a thin bar").toBeLessThan(4);
  expect(seen.block!.w, "the block caret is as wide as a character").toBeGreaterThan(8);
  expect(seen.underline!.h, "the underline caret is much shorter than the letter").toBeLessThan(
    seen.line!.h / 2,
  );

  // And the block caret must not have quietly become the line box again — the
  // whole point of STEER-6 was that the caret does not tower over the letter.
  const lineBox = await page
    .getByTestId("surface")
    .evaluate((el) => Number.parseFloat(getComputedStyle(el).lineHeight));
  expect(seen.block!.h, "the block caret stays glyph-sized, not line-box tall").toBeLessThan(
    lineBox - 4,
  );
  expect(seen.line!.h, "the line caret stays glyph-sized, not line-box tall").toBeLessThan(
    lineBox - 4,
  );
});
