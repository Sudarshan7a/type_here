import { expect, test, type Page } from "@playwright/test";

/**
 * CUS-02 — the theme switcher, the interface-face selector and focus mode.
 *
 * LAB PROXY like the rest of this suite: synthetic selections and keystrokes
 * through a real browser. What is pinned here is the honest-defaults
 * contract: the switcher selects between palettes that already exist (it
 * never restyles by itself), the legible face reaches only the interface
 * (the typing face stays JetBrains Mono), and focus mode hides/dims chrome
 * without ever covering the text — so the AC6 scan holds with it on.
 */

/** PROSE-01-004, from apps/web/src/passages.ts. */
const PASSAGE =
  "Dinner's ready whenever you are. I made extra rice in case your brother stops by later tonight.";

async function typeText(page: Page, text: string, delay = 4) {
  await page.keyboard.type(text, { delay });
}

async function rootToken(page: Page, name: string): Promise<string> {
  return page.evaluate(
    (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(),
    name,
  );
}

test("the theme switcher swaps the palettes and persists across reload", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // Default: whatever the OS asks for, with the selector showing it
  // truthfully. (Headless Chromium here reports light; a dark machine reports
  // dark. The test pins the mapping, not the machine.)
  const firstBg = await rootToken(page, "--bg");
  const firstTheme = await page.getByTestId("theme-select").inputValue();
  expect(["#0d1120", "#f2f5fc"]).toContain(firstBg.toLowerCase());
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(firstTheme);

  // Switch to the other palette: the COMPUTED tokens change, not just the
  // attribute.
  const other = firstTheme === "daylight" ? "night-ink" : "daylight";
  const otherBg = other === "daylight" ? "#f2f5fc" : "#0d1120";
  await page.getByTestId("theme-select").selectOption(other);
  const dayBg = await rootToken(page, "--bg");
  expect(dayBg.toLowerCase()).toBe(otherBg);
  expect(dayBg).not.toBe(firstBg);
  expect(await page.evaluate(() => localStorage.getItem("realtype.theme"))).toBe(other);

  // The surface repaints in the new tokens too — the switcher selects between
  // palettes that exist rather than painting anything itself.
  const surfaceBg = await page
    .getByTestId("surface")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(surfaceBg).not.toBe("");
  const surface1 = await rootToken(page, "--surface-1");
  expect(surface1.toLowerCase()).toBe(other === "daylight" ? "#ffffff" : "#131a2e");

  // Persisted: a reload keeps the choice, with the selector still truthful.
  await page.reload();
  expect(await rootToken(page, "--bg")).toBe(dayBg);
  expect(await page.getByTestId("theme-select").inputValue()).toBe(other);
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(other);
});

test("a light OS gets Daylight before any selection (the default is not silently dark)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  expect((await rootToken(page, "--bg")).toLowerCase()).toBe("#f2f5fc");
  expect(await page.getByTestId("theme-select").inputValue()).toBe("daylight");
});

test("the legible face reaches the interface only, and its licence travels with it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  // Default: Geist, truthfully shown.
  expect(await page.getByTestId("ui-font-select").inputValue()).toBe("geist");

  await page.getByTestId("ui-font-select").selectOption("atkinson");
  expect(await page.evaluate(() => localStorage.getItem("realtype.uiFont"))).toBe("atkinson");

  // The browser actually resolved it — a stack is a request, not a result
  // (the lesson fonts.spec.ts records for the first two faces).
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    await document.fonts.load('400 16px "Atkinson Hyperlegible"');
    await document.fonts.ready;
    return [...document.fonts]
      .filter((f) => f.family.replaceAll('"', "") === "Atkinson Hyperlegible")
      .map((f) => f.status);
  });
  expect(loaded.length, "no @font-face declared Atkinson Hyperlegible").toBeGreaterThan(0);
  for (const status of loaded) {
    expect(status).toBe("loaded");
  }

  // The INTERFACE paints in it …
  const uiFont = await page
    .getByTestId("ui-font-note")
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(uiFont).toMatch(/Atkinson Hyperlegible/);

  // … while the TYPING face stays JetBrains Mono first in its stack.
  const typeStack = await page
    .getByTestId("surface")
    .evaluate((el) => getComputedStyle(el).fontFamily);
  const families = typeStack.split(",").map((f) => f.trim().replaceAll('"', ""));
  expect(families[0]).toBe("JetBrains Mono");
  expect(typeStack).not.toMatch(/Atkinson Hyperlegible/);

  // Persisted across reload.
  await page.reload();
  expect(await page.getByTestId("ui-font-select").inputValue()).toBe("atkinson");

  // The bytes are real woff2 and the OFL travels beside them (FONT-04).
  const font = await page.request.get("/fonts/atkinson-hyperlegible-latin-400-normal.woff2");
  expect(font.status()).toBe(200);
  const body = await font.body();
  expect(body.length).toBeGreaterThan(1000);
  expect(body.subarray(0, 4).toString("latin1")).toBe("wOF2");
  const licence = await page.request.get("/fonts/atkinson-hyperlegible-OFL.txt");
  expect(licence.status()).toBe(200);
  const licenceText = await licence.text();
  expect(licenceText).toMatch(/SIL OPEN FONT LICENSE/i);
  expect(licenceText).toMatch(/Version 1\.1/);
});

test("focus mode hides chrome, keeps the test completable, and replay works inside it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // Off by default: never auto-activated.
  await expect(page.locator(".app")).toHaveAttribute("data-focus-mode", "off");
  expect(await page.evaluate(() => localStorage.getItem("realtype.focusMode"))).toBeNull();

  await page.getByTestId("focus-mode-toggle").check();
  await expect(page.locator(".app")).toHaveAttribute("data-focus-mode", "on");
  expect(await page.evaluate(() => localStorage.getItem("realtype.focusMode"))).toBe("true");

  // Chrome hidden …
  await expect(page.getByTestId("passage-select")).toBeHidden();
  await expect(page.getByTestId("theme-select")).toBeHidden();
  await expect(page.getByTestId("ui-font-note")).toBeHidden();
  await expect(page.locator(".banner")).toBeHidden();
  await expect(page.getByTestId("app-title")).toBeHidden();
  // … the way back out stays visible: the toggle lives outside `.controls`.
  await expect(page.getByTestId("focus-mode-toggle")).toBeVisible();

  // The secondary lines dim; the passage stays at full strength.
  const liveOpacity = await page
    .getByTestId("live-bar")
    .evaluate((el) => getComputedStyle(el).opacity);
  expect(Number.parseFloat(liveOpacity)).toBeLessThan(1);
  const surfaceOpacity = await page
    .getByTestId("surface")
    .evaluate((el) => getComputedStyle(el).opacity);
  expect(Number.parseFloat(surfaceOpacity)).toBe(1);

  // The test still completes to a finished headline with focus mode on.
  await page.getByTestId("surface").click();
  await typeText(page, PASSAGE, 2);
  await expect(page.getByTestId("finished")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("headline-net-wpm")).toBeVisible();
  await expect(page.getByTestId("restart")).toBeVisible();

  // Replay works inside focus mode too — including its text summary, which
  // focus mode must not hide (it is test feedback, not chrome).
  await page.getByTestId("replay-watch").click();
  await expect(page.getByTestId("replay")).toBeVisible();
  await expect(page.getByTestId("replay-errors")).toBeVisible();
  await page.getByTestId("replay-play-pause").click();
  await expect(page.getByTestId("replay")).toBeVisible();

  // Unchecking brings the chrome back.
  await page.getByTestId("focus-mode-toggle").uncheck();
  await expect(page.locator(".app")).toHaveAttribute("data-focus-mode", "off");
  await expect(page.getByTestId("passage-select")).toBeVisible();
  await expect(page.locator(".banner")).toBeVisible();
});

test("focus mode is keyboard-reachable and never covers text (AC6 holds with it on)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByTestId("focus-mode-toggle").check();
  await expect(page.locator(".app")).toHaveAttribute("data-focus-mode", "on");

  // Keyboard path out: blur the surface, then two Tabs (skip link, toggle).
  await page.getByTestId("surface").click();
  await page.keyboard.press("Escape");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("focus-mode-toggle")).toBeFocused();
  // And Space flips it back off — a real toggle, not a div with a handler.
  await page.keyboard.press("Space");
  await expect(page.locator(".app")).toHaveAttribute("data-focus-mode", "off");

  // AC6 with focus mode back on: no interrupter may paint over the field.
  await page.getByTestId("focus-mode-toggle").check();
  await page.getByTestId("surface").click();
  await typeText(page, "Dinner's ready when", 6);
  const interrupts = await page.evaluate(() => {
    const caret = document.querySelector('[data-testid="caret"]');
    const found = [];
    for (const el of document.body.querySelectorAll("*")) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      if (Number.parseFloat(style.opacity) === 0) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const role = el.getAttribute("role");
      const reasons = [];
      if (el.tagName === "DIALOG") reasons.push("<dialog>");
      if (role === "dialog" || role === "alertdialog") reasons.push(`role=${role}`);
      if (el.hasAttribute("aria-modal")) reasons.push("aria-modal");
      if (el.hasAttribute("popover")) reasons.push("popover");
      if (style.position === "fixed" && el !== caret) reasons.push("position: fixed");
      if (style.position === "sticky" && el !== caret) reasons.push("position: sticky");
      if (reasons.length > 0) {
        found.push({ reasons, tag: el.tagName.toLowerCase() });
      }
    }
    return found;
  });
  expect(interrupts).toEqual([]);
});

test("the new controls fit 360px with no horizontal scroll, focus on or off", async ({ page }) => {
  for (const focus of [false, true] as const) {
    await page.setViewportSize({ width: 360, height: 900 });
    await page.goto("/");
    if (focus) await page.getByTestId("focus-mode-toggle").check();
    await page.getByTestId("surface").click();
    await typeText(page, "Dinner's ready whenever you are. I made extra rice", 3);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(
      overflow.scrollWidth,
      `horizontal scroll at 360px (focus ${focus ? "on" : "off"})`,
    ).toBeLessThanOrEqual(overflow.clientWidth + 1);
  }
});
