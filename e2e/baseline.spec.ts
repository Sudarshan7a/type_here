import { expect, test } from "@playwright/test";

/**
 * MOD-05 / LRN-01 — the baseline, in a real browser.
 *
 * WHAT THIS SPEC DOES NOT DO is wait three minutes. A countdown that can only
 * be proven at its end is a countdown whose suite grows to the length of the
 * feature, so the timing half is covered where it belongs:
 *
 *  - the TIMED MODE end condition (a 15-second countdown that really ends the
 *    test) is proven in test-setup.spec.ts;
 *  - the BASELINE's own length, its placement rule, its storage and its
 *    retest arithmetic are proven in tests/baseline.test.ts, with the clock
 *    passed in rather than waited on.
 *
 * What is left for a browser is the part a unit test cannot see: that the mode
 * is selectable, that it arms the three-minute countdown, that the clock
 * actually runs against a real attempt, and that skip-ahead works BEFORE the
 * test starts rather than trapping the visitor in it.
 *
 * LAB PROXY: synthetic keystrokes through headless Chromium. Not REAL-DEVICE
 * CONFIRMED.
 */

test("LRN-01: the baseline arms a 3-minute countdown, and skip-ahead leaves before it starts", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("test-mode-select").selectOption("baseline");

  // MOD-05: "general (3 min)". The countdown is the baseline's own, not the
  // duration selector's, so the two cannot disagee about what is running.
  const remaining = page.getByTestId("live-time-remaining");
  await expect(remaining).toBeVisible();
  await expect(remaining).toHaveText("180");

  // Skip-ahead is available BEFORE the test starts: a visitor is never routed
  // through a three-minute test to reach the typing surface.
  const skip = page.getByTestId("baseline-skip");
  await expect(skip).toBeVisible();

  await page.getByTestId("surface").click();
  await page.keyboard.type("The weather turned cold", { delay: 1 });

  // The clock runs against the real attempt.
  await expect
    .poll(async () => Number(await remaining.innerText()), { timeout: 5000 })
    .toBeLessThan(180);

  // And the test is NOT over: a baseline ends on the clock, not on the buffer.
  await expect(page.getByTestId("finished")).toHaveCount(0);
  await expect(page.getByTestId("live-net-wpm")).toBeVisible();

  // Skip leaves for the ordinary prose mode with no card and no countdown.
  await page.getByTestId("baseline-skip").click();
  await expect(page.getByTestId("test-mode-select")).toHaveValue("prose");
  await expect(page.getByTestId("live-time-remaining")).toHaveCount(0);
  await expect(page.getByTestId("placement")).toHaveCount(0);
});

test("LRN-01: skip-ahead is reachable and labelled even mid-baseline", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("test-mode-select").selectOption("baseline");
  await page.getByTestId("surface").click();
  await page.keyboard.type("Can you", { delay: 1 });

  // The way out is not hidden while the baseline runs: the visitor who
  // changes their mind three characters in is not held for three minutes.
  await expect(page.getByTestId("baseline-skip")).toBeVisible();
  await page.getByTestId("baseline-skip").click();
  await expect(page.getByTestId("test-mode-select")).toHaveValue("prose");
});

test("MOD-05: the baseline uses a real-world prose passage, like practice", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("test-mode-select").selectOption("baseline");

  // Same content, same band display, same engine as the ordinary prose mode —
  // a baseline must not silently be a different instrument.
  await expect(page.getByTestId("passage-id")).toContainText("PROSE-");
  await expect(page.getByTestId("passage-band")).toHaveText(/easy|typical|hard/);
  await expect(page.getByTestId("test-mode-note")).toContainText("3-minute");
});
