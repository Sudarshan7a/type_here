import { expect, test, type Page } from "@playwright/test";

/**
 * LOC-01 app wiring: layout selector + composition guard (LAB PROXY).
 *
 * What these prove, and what they do NOT. Playwright cannot drive a real IME:
 * there is no OS composition engine behind `page.keyboard`, so the
 * composition events below are SYNTHETIC CompositionEvents dispatched via
 * `evaluate` — they prove the ADAPTER/SINK contract (partial flagged, so the
 * engine leaves the buffer alone; committed text scores exactly once), not
 * that any real keyboard, OS layout driver or IME behaves. Real-keyboard and
 * real-IME confirmation stays a HUMAN action (see docs/LAYOUT-VERIFICATION.md).
 */

const PASSAGE =
  "Dinner's ready whenever you are. I made extra rice in case your brother stops by later tonight. There's also that soup from Sunday in the freezer if you're still hungry after. Just heat it on the stove and add a little pepper. I'll be in the garden until it gets dark, so come find me when you're done.";

async function typeText(page: Page, text: string, delay = 4) {
  await page.keyboard.type(text, { delay });
}

async function charStates(page: Page): Promise<(string | null)[]> {
  return page
    .locator("[data-char-state]")
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-char-state")));
}

test("layout selector attributes the run and persists the override", async ({ page }) => {
  await page.goto("/");
  const selector = page.getByTestId("layout-select");
  const surface = page.getByTestId("surface");

  // First run in a fresh context: the guess is shown as a guess, with the
  // override beside it.
  await expect(page.getByTestId("layout-why")).toBeVisible();
  await expect(selector).toBeVisible();

  // The selector is a real labelled control, not a lookalike.
  const label = page.locator('label[for="layout"]');
  await expect(label).toBeVisible();
  await expect(selector).toHaveValue("qwerty-us");
  await expect(surface).toHaveAttribute("data-layout", "qwerty-us");

  // Changing it re-attributes the run immediately.
  await selector.selectOption("azerty");
  await expect(surface).toHaveAttribute("data-layout", "azerty");
  // Confirming a layout dismisses the first-run prompt; the control stays.
  await expect(page.getByTestId("layout-why")).toHaveCount(0);
  await expect(selector).toBeVisible();

  // The override survives a reload (guest-first persistence, auth comes later).
  await page.reload();
  await expect(page.getByTestId("layout-select")).toHaveValue("azerty");
  await expect(page.getByTestId("surface")).toHaveAttribute("data-layout", "azerty");
  await expect(page.getByTestId("layout-why")).toHaveCount(0);

  // The IME notice lives beside the settings on every visit, first or not.
  await expect(page.getByTestId("ime-notice")).toBeVisible();
  await expect(page.getByTestId("ime-notice")).toContainText(/never scored/i);
});

test("partial composition input never scores; committed text scores once", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("surface").click();

  // A composition opens. Everything typed now is a partial reading.
  await page.getByTestId("surface").evaluate((el) => {
    el.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, cancelable: true }));
  });
  await typeText(page, "Dinne", 8);

  // Nothing scored: every character is still untyped.
  expect(await charStates(page)).toEqual(new Array(PASSAGE.length).fill("untyped"));

  // The user confirms "D". Exactly one character scores — position 0 correct,
  // position 1 still untyped.
  await page.getByTestId("surface").evaluate((el) => {
    el.dispatchEvent(
      new CompositionEvent("compositionend", {
        bubbles: true,
        cancelable: true,
        data: "D",
      }),
    );
  });
  await expect
    .poll(async () => (await charStates(page)).slice(0, 2), { timeout: 2_000 })
    .toEqual(["correct", "untyped"]);

  // Ordinary typing resumes after the composition closes.
  await typeText(page, "inner", 8);
  await expect
    .poll(async () => (await charStates(page)).slice(0, 6), { timeout: 2_000 })
    .toEqual(["correct", "correct", "correct", "correct", "correct", "correct"]);
});

test("layout selector stays usable at 360px with no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  const selector = page.getByTestId("layout-select");
  await expect(selector).toBeVisible();

  // A real labelled control reachable by keyboard, with a usable target.
  await expect(selector).toBeEnabled();
  const box = await selector.boundingBox();
  expect(box, "the layout selector must have a real box at 360px").not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(24);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "no horizontal overflow at 360px").toBeLessThanOrEqual(0);

  // The selector still works at this width.
  await selector.selectOption("qwertz");
  await expect(page.getByTestId("surface")).toHaveAttribute("data-layout", "qwertz");
});
