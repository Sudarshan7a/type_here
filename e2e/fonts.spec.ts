import { expect, test } from "@playwright/test";

/**
 * FONTS — STEER-6: self-host the design-pack faces, prove they loaded.
 *
 * The condition the owner put on self-hosting was licence-based, and that part is
 * settled in docs/content-license-register.md §3a (both SIL OFL 1.1, neither
 * declares a Reserved Font Name, each OFL.txt committed beside its woff2). This
 * file covers the half a licence cannot: that the bytes are actually served and
 * the browser actually resolved them.
 *
 * BEFORE THIS FILE EXISTED THE APP LOADED NO FONTS AT ALL
 *
 * `tokens.css` named "Bricolage Grotesque", "Geist" and "JetBrains Mono" and
 * nothing anywhere declared an `@font-face` rule or shipped a single woff2. The
 * names resolved to nothing and the whole surface rendered in system fallbacks —
 * while `getComputedStyle().fontFamily` cheerfully reported the pack's names. The
 * captures in docs/visual-evidence/ were pictures of Consolas captioned as the
 * design pack's type. A stack is a request, not a result.
 *
 * WHY THERE IS NO "MEASURE THE TEXT AND COMPARE" CHECK HERE
 *
 * The obvious way to prove a webfont is applied is to measure a string in it and
 * in a fallback and assert the widths differ. That check is WRONG for this app
 * and would fail or, worse, pass for the wrong reason: JetBrains Mono has an
 * advance width of exactly 0.6em, and so do the common system monospace faces
 * (DejaVu Sans Mono 0.602em, Liberation Mono 0.6em). A test comparing widths
 * would therefore report "the font did not load" on a machine where it loaded
 * perfectly — and on a machine with a single monospace installed it could not
 * distinguish success from failure at all.
 *
 * The authoritative signal is `document.fonts`: a `FontFace` object exists there
 * only because an `@font-face` rule declared it, and `FontFace.status` is the
 * browser's own report on whether the bytes arrived. That is what these tests
 * assert, plus a direct fetch of the bytes so a 404 or a truncated copy cannot
 * pass as a loaded face.
 */

/** The typing face is the one that must always resolve; everything else is polish. */
const TYPING_FACE = "JetBrains Mono";
const UI_FACE = "Geist Sans";

/*
 * Subset matchers, tolerant of BOTH the authored and the normalised range.
 *
 * `tokens.css` writes the ranges the long way — `U+0000-00FF` — and Chromium
 * reports them back shortened: `U+0-FF`, `U+100-2BA`. It parses the descriptors
 * and re-serialises them with leading zeroes stripped, so a test that matches the
 * string it wrote finds nothing and fails with "no face declared" on a page that
 * has three working faces. Matching a substring like "U+0100-02BA" would be the
 * same bug wearing a different hat. These accept either form.
 */
const BASIC_LATIN_RANGE = /U\+0{1,4}-0{0,2}FF/i;
const LATIN_EXT_RANGE = /U\+0*100-0*2BA/i;

test.describe("self-hosted fonts", () => {
  test("the faces the page actually uses are loaded", async ({ page }) => {
    await page.goto("/");

    // Force the fetch rather than waiting for the browser to get round to it.
    const faces = await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([
        document.fonts.load('400 28px "JetBrains Mono"'),
        document.fonts.load('400 16px "Geist Sans"'),
      ]);
      await document.fonts.ready;
      return [...document.fonts].map((f) => ({
        family: f.family.replaceAll('"', ""),
        weight: f.weight,
        status: f.status,
        unicodeRange: f.unicodeRange,
      }));
    });

    // A face is identified by its unicode-range, not by "is it loaded" — see the
    // next test for why that distinction is load-bearing.
    const basicLatin = faces.filter(
      (f) => f.family === TYPING_FACE && BASIC_LATIN_RANGE.test(f.unicodeRange),
    );
    expect(
      basicLatin.length,
      `no @font-face declared "${TYPING_FACE}" for basic Latin — found ` +
        `${faces.length} face(s): ${faces.map((f) => `${f.family} [${f.status}]`).join(", ")}`,
    ).toBeGreaterThan(0);
    for (const face of basicLatin) {
      expect(
        face.status,
        `${TYPING_FACE} ${face.weight} (basic Latin) must reach status "loaded"`,
      ).toBe("loaded");
    }

    const ui = faces.filter((f) => f.family === UI_FACE);
    expect(ui.length, `no @font-face declared "${UI_FACE}"`).toBeGreaterThan(0);
    for (const face of ui) {
      expect(face.status, `${UI_FACE} ${face.weight} must reach status "loaded"`).toBe("loaded");
    }

    // The API-level check as well. It is weaker on its own — `check()` can fall
    // through to a system font of the same name — but combined with a loaded
    // FontFace it is the same fact stated twice, from two different angles.
    expect(
      await page.evaluate(() => document.fonts.check('400 28px "JetBrains Mono"')),
      "document.fonts.check must confirm the typing face",
    ).toBe(true);
  });

  /**
   * The latin-ext subset loads ON DEMAND, and only when a glyph needs it.
   *
   * This test exists because the first version of the one above asserted that
   * *every* declared face reaches "loaded", and it failed on the latin-ext face —
   * correctly. A face the page never uses is never fetched, and that is the
   * behaviour we want: 09 §3 asks for Latin-ext because a passage might contain
   * an accented character, not because every visitor should pay 7.3 KB for one.
   * The first version of this file would have "fixed" that by downloading the
   * subset unconditionally, spending bytes to make a test green.
   *
   * So the real property is: ask with a character only latin-ext covers, and the
   * subset must arrive. That proves the subset is declared correctly and served
   * correctly — which a "status === loaded" check on an unused face never did.
   */
  test("the latin-ext subset loads when a character needs it", async ({ page }) => {
    await page.goto("/");

    const status = await page.evaluate(async () => {
      const pick = () =>
        [...document.fonts]
          .filter((f) => f.family.replaceAll('"', "") === "JetBrains Mono")
          .map((f) => ({
            range: f.unicodeRange,
            status: f.status,
          }));
      await document.fonts.ready;
      const before = pick();
      // "Ł" (U+0141) is Latin Extended-A — basic Latin cannot render it, so
      // this can only come from the latin-ext subset.
      await document.fonts.load('400 28px "JetBrains Mono"', "Ł");
      await document.fonts.ready;
      return { before, after: pick() };
    });

    const latinExt = (list: Array<{ range: string; status: string }>) =>
      list.find((f) => LATIN_EXT_RANGE.test(f.range));

    expect(
      latinExt(status.before),
      "a latin-ext subset must be declared — 09 §3 asks for Latin + Latin-ext",
    ).toBeDefined();
    expect(
      latinExt(status.after)?.status,
      "asking for a Latin-ext character must bring the latin-ext subset to 'loaded'",
    ).toBe("loaded");
  });

  test("the typing surface asks for the typing face first in its stack", async ({ page }) => {
    await page.goto("/");

    // Order matters. The face has to be FIRST in the stack or the fallback wins
    // whenever both are present, and the token would be self-contradictory.
    const stack = await page
      .getByTestId("surface")
      .evaluate((el) => getComputedStyle(el).fontFamily);
    const families = stack.split(",").map((f) => f.trim().replaceAll('"', ""));

    expect(families[0], `--font-type must lead with the self-hosted face, got "${stack}"`).toBe(
      TYPING_FACE,
    );

    // And the real fallback chain must still be behind it, so a font that fails
    // to load leaves readable text rather than a blank page.
    expect(families.length, "the type stack must keep its fallback chain").toBeGreaterThan(1);
    expect(stack, "the stack must end in a generic family").toMatch(/monospace$/);
  });

  test("the woff2 files are served as real woff2, not 404s", async ({ page }) => {
    await page.goto("/");

    for (const file of [
      "/fonts/jetbrains-mono-latin-400-normal.woff2",
      "/fonts/jetbrains-mono-latin-ext-400-normal.woff2",
      "/fonts/geist-sans-latin-400-normal.woff2",
    ]) {
      const response = await page.request.get(file);
      expect(
        response.status(),
        `${file} must be served (a 404 here means the font never loads)`,
      ).toBe(200);

      const body = await response.body();
      expect(body.length, `${file} must not be empty`).toBeGreaterThan(1000);

      // The wOF2 magic. Without this a Vite fallback route returning index.html
      // would sail past a 200 and a length check, and `document.fonts` would
      // quietly mark the face "loaded" against a copy of our own markup.
      expect(
        body.subarray(0, 4).toString("latin1"),
        `${file} must be a woff2, not an HTML fallback page`,
      ).toBe("wOF2");
    }
  });

  test("each licence file is served beside its font", async ({ page }) => {
    await page.goto("/");

    // This is the actual condition attached to OFL redistribution: a copy of the
    // licence must accompany the font. A font that loaded while its licence 404s
    // is a licence violation that no rendering test would ever notice.
    for (const file of ["/fonts/jetbrains-mono-OFL.txt", "/fonts/geist-sans-OFL.txt"]) {
      const response = await page.request.get(file);
      expect(response.status(), `${file} must be served — OFL requires the licence to travel`).toBe(
        200,
      );

      const text = await response.text();
      expect(text, `${file} must be the SIL Open Font License`).toMatch(/SIL OPEN FONT LICENSE/i);
      expect(text, `${file} must carry the version`).toMatch(/Version 1\.1/i);
    }
  });

  test("the typing font is preloaded, and preloaded correctly", async ({ page }) => {
    await page.goto("/");

    const preload = page.locator('link[rel="preload"][as="font"]');
    await expect(preload, "09 §3 requires the typing font to be preloaded").toHaveCount(1);

    const href = await preload.getAttribute("href");
    expect(href, "the preloaded face must be the typing font").toContain("jetbrains-mono");

    // `crossorigin` is the whole reason this test exists.
    //
    // Font fetches are ALWAYS made in anonymous CORS mode. A preload issued
    // without `crossorigin` carries different credentials from the @font-face
    // request that follows it, so the browser treats them as two distinct
    // resources and downloads the file TWICE — 21 KB twice, and the preload
    // buys nothing while appearing to work. Nothing else in the app would notice:
    // the font still loads, it is just fetched twice. This attribute is the
    // difference between a preload and a 21 KB regression.
    expect(
      await preload.getAttribute("crossorigin"),
      "the preload must carry crossorigin or the font is downloaded twice",
    ).not.toBeNull();
  });
});
