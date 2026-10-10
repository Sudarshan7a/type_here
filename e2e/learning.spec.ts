import { expect, test } from "@playwright/test";

/**
 * LRN-05 — learn from errors, end to end.
 *
 * The list is driven by making REAL mistakes: typing the same wrong character
 * repeatedly produces the substitution the engine classifies, and the list
 * appears on the finished screen. The one-click drill then loads that
 * confusion's characters as the target — a passage like any other.
 *
 * LAB PROXY: synthetic keystrokes through headless Chromium. Not REAL-DEVICE
 * CONFIRMED.
 */

test("LRN-05: a repeated mistake appears on the finished screen with a one-click drill", async ({
  page,
}) => {
  await page.goto("/");
  const passage = await page.getByTestId("surface").innerText();
  const target = passage.replace(/\u00A0/g, " ").trim();

  const surface = page.getByTestId("surface");
  await surface.click();

  // Type the WHOLE passage, with the same character wrong three times, so the
  // attempt finishes and the alignment has a repeated substitution to find.
  // The passage opens "Dinner's ready…": the `e` at index 5 typed as `X`.
  const broken = target
    .replace("er's", "r'sX")
    .replace(" ready", " rXady")
    .replace("whenever", "whenXver");
  await page.keyboard.type(broken, { delay: 1 });

  await expect(page.getByTestId("finished")).toBeVisible({ timeout: 20_000 });

  // The mistakes that repeated are listed — not every single slip.
  await expect(page.getByTestId("confusions")).toBeVisible();
  await expect(page.getByTestId("confusions-intro")).toContainText("repeated");
  await expect(page.getByTestId("confusions-list")).toBeVisible();

  // The typo map is decoration: the list is the accessible form.
  await expect(page.getByTestId("typo-map")).toHaveCount(1);

  // And the confusion is actionable: one click loads its own drill.
  const drill = page.getByTestId("confusion-drill").first();
  await expect(drill).toBeVisible();
  await drill.click();

  // The drill is a passage like any other: the confusion's characters, loaded
  // through the ordinary path, scored by the ordinary engine.
  await expect(page.getByTestId("finished")).toHaveCount(0);
  const target2 = await page.getByTestId("surface").innerText();
  expect(target2.replace(/\u00A0/g, " ").trim()).not.toBe("");
});

test("LRN-05: a clean run says nothing about mistakes", async ({ page }) => {
  await page.goto("/");
  const target = await page.getByTestId("surface").innerText();

  const surface = page.getByTestId("surface");
  await surface.click();
  await page.keyboard.type(target.replace(/\u00A0/g, " ").trim(), { delay: 1 });

  await expect(page.getByTestId("finished")).toBeVisible({ timeout: 15_000 });
  // One slip is not a pattern, and a clean run is not a pattern at all: the
  // confusions section is not rendered rather than rendered empty.
  await expect(page.getByTestId("confusions")).toHaveCount(0);
  await expect(page.getByTestId("confusions-empty")).toHaveCount(0);
});
