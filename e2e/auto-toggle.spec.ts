import { expect, test } from "@playwright/test";

/**
 * ENG-09 [MVP]: auto-indent/auto-pair toggles exist, persist guest-first,
 * and change nothing about a prose attempt (no producer exists in prose
 * mode — code passages arrive in WAVE 3). The accounting half (auto events
 * in the text, out of every typed count) is pinned by
 * ENG-FIXTURE-E-AUTOINSERT in packages/engine; this spec is the settings
 * half: the toggles are real controls whose choice survives a reload.
 */

test("ENG-09: auto toggles persist and leave a prose test untouched", async ({ page }) => {
  await page.goto("/");

  const indent = page.getByTestId("auto-indent-toggle");
  const pair = page.getByTestId("auto-pair-toggle");
  // Off by default: arming is always the user's explicit choice.
  await expect(indent).not.toBeChecked();
  await expect(pair).not.toBeChecked();

  await indent.check();
  await pair.check();
  await expect(indent).toBeChecked();
  await expect(pair).toBeChecked();

  // Guest-first persistence: a reload restores the armed choice.
  await page.reload();
  await expect(page.getByTestId("auto-indent-toggle")).toBeChecked();
  await expect(page.getByTestId("auto-pair-toggle")).toBeChecked();

  // An armed toggle changes nothing about a prose attempt: the full passage
  // still finishes to a headline, because prose produces no auto events.
  await page.getByTestId("surface").click();
  await page.keyboard.type(
    "Dinner's ready whenever you are. I made extra rice in case your brother stops by later tonight.",
    { delay: 2 },
  );
  await expect(page.getByTestId("finished")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("headline-net-wpm")).toHaveText(/^\d+(\.\d+)? WPM$/);
});
