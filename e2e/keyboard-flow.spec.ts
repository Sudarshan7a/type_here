import { expect, test } from "@playwright/test";

/**
 * CUS-03 [MVP]: full keyboard navigation and shortcuts (loop WAVE 0.10).
 *
 * Tab=restart already worked; this pins the whole flow without a mouse:
 * reach the field by Tab alone, type, finish, work the finished actions,
 * leave by Escape — plus the shortcuts list that documents exactly these
 * bindings (nothing listed is aspirational; every entry is exercised below).
 *
 * LAB PROXY: synthetic keystrokes through Chromium. Screen-reader narration
 * of the flow belongs to A11Y-01's human pass, not this spec.
 */

/** The first passage, from apps/web/src/passages.ts (PROSE-01-004). */
const PASSAGE =
  "Dinner's ready whenever you are. I made extra rice in case your brother stops by later tonight.";

async function tabToSurface(page: import("@playwright/test").Page) {
  // From a fresh load, Tab through skip-link and controls until the typing
  // field itself is focused. Bounded: the page has a finite tab order.
  for (let i = 0; i < 40; i++) {
    const testid = await page.evaluate(() => document.activeElement?.getAttribute("data-testid"));
    if (testid === "surface") return;
    await page.keyboard.press("Tab");
  }
  throw new Error("Tab order never reached the typing surface");
}

test("CUS-03: a complete test runs keyboard-only, mouse untouched", async ({ page }) => {
  await page.goto("/");
  await tabToSurface(page);

  // Type the whole passage with the keyboard only, exactly as a user would.
  await page.keyboard.type(PASSAGE, { delay: 2 });
  await expect(page.getByTestId("finished")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("headline-net-wpm")).toBeVisible();

  // Tab while the field holds focus restarts (the documented binding) — so
  // reaching the finished actions goes via Escape first, then Tab moves on.
  await page.keyboard.press("Escape");
  for (let i = 0; i < 40; i++) {
    const testid = await page.evaluate(() => document.activeElement?.getAttribute("data-testid"));
    if (testid === "restart") break;
    await page.keyboard.press("Tab");
  }
  await expect(page.getByTestId("restart")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("finished")).toHaveCount(0);

  // …and the re-armed surface takes keys immediately (restart refocuses it).
  await page.keyboard.type("Dinner", { delay: 2 });
  const states = await page
    .locator("[data-char-state]")
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-char-state")));
  expect(states.slice(0, 6).every((s) => s === "correct")).toBe(true);
});

test("CUS-03: Escape leaves the typing area to a deterministic place", async ({ page }) => {
  await page.goto("/");
  await tabToSurface(page);
  await page.keyboard.press("Escape");
  // Leaving means the surface no longer holds focus; focus drops to the
  // document body (the instructions promise "leave this area", not a menu —
  // there is no menu to go to, and inventing one would be scope creep).
  await expect
    .poll(async () => page.evaluate(() => document.activeElement?.tagName), {
      message: "Escape must move focus out of the surface",
      timeout: 5_000,
    })
    .toBe("BODY");
});

test("CUS-03: the shortcuts list documents only bindings that work", async ({ page }) => {
  await page.goto("/");
  const list = page.getByTestId("shortcuts");
  await expect(list).toBeVisible();

  // The disclosure itself opens and closes from the keyboard (it starts
  // closed on a fresh load) — and its row is a 24px target (WCAG 2.5.8).
  const summary = list.locator("summary").first();
  await summary.focus();
  const summaryBox = await summary.boundingBox();
  expect(summaryBox, "summary row must have a real box").not.toBeNull();
  expect(summaryBox!.height).toBeGreaterThanOrEqual(24);
  await expect(list).not.toHaveAttribute("open", "");
  await page.keyboard.press("Enter");
  await expect(list).toHaveAttribute("open", "");
  await page.keyboard.press("Enter");
  await expect(list).not.toHaveAttribute("open", "");

  // Every documented binding is exercised somewhere in this file or the
  // replay suite. Open it like a user would, then read what is shown —
  // innerText only reports rendered text, not hidden markup.
  await summary.click();
  const text = (await list.innerText()).toLowerCase();
  for (const binding of ["tab", "escape", "enter", "arrow", "replay"]) {
    expect(text, `shortcuts list must document ${binding}`).toContain(binding);
  }
});
