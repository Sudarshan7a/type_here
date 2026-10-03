import { expect, test } from "@playwright/test";

/**
 * ENG-10 [MVP]: raw characters preserved — no smart quotes/dash folding,
 * no autocorrect, no capitalization rewrites between the key and the engine.
 *
 * The engine pins strict-equality scoring in eng-raw-chars.test.ts; this
 * spec pins the browser half: what Playwright's real key pipeline delivers
 * for quotes, apostrophes, dashes and shifted capitals arrives at the
 * surface untransformed. LAB PROXY (synthetic keystrokes, headless
 * Chromium); OS-level mobile-keyboard transforms are outside a desktop
 * browser surface and documented in the ledger, not asserted here.
 */

test("ENG-10: apostrophes and capitals arrive verbatim", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("surface").click();
  // PROSE-01-004 carries a straight apostrophe (Dinner's) and capitals.
  await page.keyboard.type(
    "Dinner's ready whenever you are. I made extra rice in case your brother stops by later tonight.",
    { delay: 2 },
  );
  await expect(page.getByTestId("finished")).toBeVisible({ timeout: 15_000 });

  // Every character correct, accuracy 100%: nothing was folded or repaired.
  const states = await page
    .locator("[data-char-state]")
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-char-state")));
  expect(new Set(states)).toEqual(new Set(["correct"]));
  await expect(page.getByTestId("headline-accuracy")).toHaveText(/^100(\.0)?% accuracy$/);
});

test("ENG-10: a straight quote is never smart-folded into an apostrophe", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("surface").click();
  // Same length as the target, with `"` where `'` belongs: the attempt must
  // still finish, carrying the typed character verbatim.
  await page.keyboard.type(
    'Dinner"s ready whenever you are. I made extra rice in case your brother stops by later tonight.',
    { delay: 2 },
  );
  await expect(page.getByTestId("finished")).toBeVisible({ timeout: 15_000 });

  // The replay shows what was actually typed: scrub to the final frame and
  // the straight quote is there at position 7, marked as the error — not
  // silently repaired into an apostrophe. (Pre-play slots show the target;
  // only played frames show typed text.)
  await page.getByTestId("replay-watch").click();
  await expect(page.getByTestId("replay")).toBeVisible();
  await page.getByTestId("replay-scrub").focus();
  await page.keyboard.press("End");
  await expect(page.getByTestId("replay-text")).toContainText('"');
  await expect(page.getByTestId("replay-errors")).toHaveText(/position 7/);
});
