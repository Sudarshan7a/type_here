import { expect, test, type Page } from "@playwright/test";

/**
 * ANA-01: the states a result can be in, other than the good one.
 *
 * The product's anti-goals forbid gatekeeping a single attempt and forbid guilt
 * copy, and a results screen is exactly where that pressure shows up. So the
 * states are the interesting part of this requirement, and each one gets its own
 * spec with the FAILING direction pinned: what the screen must NOT say.
 *
 * Deterministic, per typing-e2e-testing. Two of the three states are produced by
 * genuinely changing the conditions rather than by faking a payload:
 *
 *  - SHORT comes for free. Synthetic typing covers the passage in a fraction of
 *    the engine's ten-second consistency floor, so it is the NORMAL case here.
 *  - FLAGGED comes from a dispatched KeyboardEvent, which the browser marks
 *    `isTrusted: false` — the same shape as a synthetic injection, which is
 *    exactly what the engine's `untrusted-events` flag exists to notice.
 *  - OFFLINE comes from the browser context going offline with the page already
 *    loaded. The app is local-only, so the test still completes: which is the
 *    point being tested.
 */

/** PROSE-01-004, from apps/web/src/passages.ts. */
const PASSAGE =
  "Dinner's ready whenever you are. I made extra rice in case your brother stops by later tonight. There's also that soup from Sunday in the freezer if you're still hungry after. Just heat it on the stove and add a little pepper. I'll be in the garden until it gets dark, so come find me when you're done.";

async function finishPassage(page: Page, text: string = PASSAGE) {
  await page.getByTestId("surface").click();
  await page.keyboard.type(text, { delay: 2 });
  await expect(page.getByTestId("finished")).toBeVisible({ timeout: 15_000 });
}

/**
 * Type the passage in two halves, running `between` at the seam.
 *
 * Sliced by INDEX rather than by a hand-counted literal: the passage is 95
 * characters and a literal one character out types the whole thing and never
 * finishes, which looks exactly like a broken app.
 */
async function typeAround(page: Page, at: number, between?: () => Promise<void>) {
  await page.getByTestId("surface").click();
  await page.keyboard.type(PASSAGE.slice(0, at), { delay: 4 });
  await between?.();
  await page.keyboard.type(PASSAGE.slice(at), { delay: 2 });
  await expect(page.getByTestId("finished")).toBeVisible({ timeout: 15_000 });
}

/**
 * Inject one keydown the browser did not trust, mid-test. `dispatchEvent` is how
 * a script fakes a keystroke, and the resulting event carries `isTrusted: false`,
 * which is what the engine flags. Shift is chosen deliberately: it is not a
 * printable key, so the attempt still finishes exactly as it would have.
 */
async function injectUntrustedKey(page: Page) {
  await page.evaluate(() => {
    const surface = document.querySelector('[data-testid="surface"]');
    if (!(surface instanceof HTMLElement)) return;
    surface.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Shift",
        code: "ShiftLeft",
        bubbles: true,
        cancelable: true,
      }),
    );
  });
}

test.describe("ANA-01: a short run is labelled, not treated as a failure", () => {
  test("the notice names the engine's own floor, and the missing figure says so", async ({
    page,
  }) => {
    await page.goto("/");
    await finishPassage(page);

    await expect(page.getByTestId("results-notice-short")).toBeVisible();
    await expect(page.getByTestId("results-notice-short")).toContainText("Short test");
    await expect(page.getByTestId("results-notice-short")).toContainText("seconds");

    // The figure the floor explains is present as a row, marked absent, with a
    // sentence rather than a zero or a dash.
    await expect(page.getByTestId("results-consistency-label")).toHaveText("Consistency");
    await expect(page.getByTestId("results-consistency")).toHaveText("Not reported for this test");
    await expect(page.locator(".results-detail[data-reported='false']")).toHaveCount(1);

    // Every OTHER figure is still reported. A short run is short, not empty.
    for (const id of ["results-raw", "results-kspc", "results-rollover", "results-burst"]) {
      await expect(page.getByTestId(id)).not.toHaveText("Not reported for this test");
    }
    await expect(page.getByTestId("headline-net-wpm")).toHaveText(/^\d+\.\d WPM$/);
  });

  test("a short run is not congratulated, and no action is withheld", async ({ page }) => {
    await page.goto("/");
    await finishPassage(page);
    const panel = await page.getByTestId("finished").innerText();

    // No gate: every action stays offered, and the replay is still there.
    await expect(page.getByTestId("restart")).toBeEnabled();
    await expect(page.getByTestId("new-passage")).toBeEnabled();
    await expect(page.getByTestId("replay-watch")).toBeEnabled();

    // No shame, no pressure, no verdict on the attempt.
    for (const phrase of [
      "too short",
      "failed",
      "fail",
      "poor",
      "try again later",
      "keep going",
      "you should",
      "almost",
    ]) {
      expect(panel.toLowerCase(), `the panel must not say "${phrase}"`).not.toContain(phrase);
    }
  });
});

test.describe("ANA-01: a flagged run is labelled, not celebrated", () => {
  test("the engine's flag reaches the screen in words, and the figures still stand", async ({
    page,
  }) => {
    await page.goto("/");
    await typeAround(page, 20, () => injectUntrustedKey(page));

    // Labeled: a note, in words, saying what was recorded — not an accusation,
    // not a raw code, and not silence.
    await expect(page.getByTestId("results-notice-flagged")).toBeVisible();
    await expect(page.getByTestId("results-notice-flagged")).toContainText("Notes on this test");
    await expect(page.getByTestId("results-notice-flagged")).toContainText(
      "input the browser did not mark as trusted",
    );
    // The opaque code itself is not what a person is shown.
    await expect(page.getByTestId("results-notice-flagged")).not.toContainText("untrusted-events");

    // The figures are stated to come from the same keystrokes, so the note cannot
    // read as "these numbers are void".
    await expect(page.getByTestId("results-notice-flagged")).toContainText("same keystrokes");

    // …and they are all still on screen. A flag is a note, not a redaction.
    await expect(page.getByTestId("headline-net-wpm")).toHaveText(/^\d+\.\d WPM$/);
    await expect(page.locator('[data-testid="results-details"] dd')).toHaveCount(5);

    // Non-colour cue on the notice itself: a dashed rule, distinct from the
    // short notice's solid one.
    const flagged = await page
      .getByTestId("results-notice-flagged")
      .evaluate((el) => getComputedStyle(el).borderLeftStyle);
    const short = await page
      .getByTestId("results-notice-short")
      .evaluate((el) => getComputedStyle(el).borderLeftStyle);
    expect(flagged, "the flagged notice must not look like the short one").not.toBe(short);
  });

  test("the announcement says the run has notes, still exactly once", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      (window as unknown as { __spoken?: string[] }).__spoken = [];
    });
    await page.getByTestId("surface").click();
    await page.evaluate(() => {
      const spoken = (window as unknown as { __spoken: string[] }).__spoken;
      const el = document.querySelector('[data-testid="announcer"]');
      if (el === null) return;
      new MutationObserver(() => {
        const text = el.textContent?.trim() ?? "";
        if (text !== "") spoken.push(text);
      }).observe(el, { childList: true, characterData: true, subtree: true });
    });

    await page.keyboard.type(PASSAGE.slice(0, 10), { delay: 6 });
    await injectUntrustedKey(page);
    await page.keyboard.type(PASSAGE.slice(10), { delay: 2 });
    await expect(page.getByTestId("finished")).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(500);

    const spoken = await page.evaluate(
      () => (window as unknown as { __spoken: string[] }).__spoken,
    );
    expect(spoken.length, `announced ${spoken.length} times`).toBe(1);
    // The qualification rides on the ONE announcement rather than beside it in a
    // second live region, which would be a second announcement.
    expect(spoken[0]).toContain("This test has notes.");
  });

  test("a clean run makes no claim about being clean", async ({ page }) => {
    await page.goto("/");
    await finishPassage(page);
    // The client has NOT run the plausibility checks — they are threshold-free
    // and server-side — so it must not announce that it found nothing.
    await expect(page.getByTestId("results-notice-flagged")).toHaveCount(0);

    // "not verified" is the honest standing state and is always present, so the
    // scan runs on the panel with that one phrase removed — otherwise the check
    // would be reading the honest label as a boast.
    await expect(page.getByTestId("results-status-label")).toHaveText(
      "Practice result (not verified)",
    );
    const panel = (await page.getByTestId("finished").innerText())
      .toLowerCase()
      .replace("practice result (not verified)", "");
    for (const phrase of ["no notes", "nothing flagged", "verified", "all clear", "passed"]) {
      expect(panel, `a clean run must not claim "${phrase}"`).not.toContain(phrase);
    }
  });
});

test.describe("ANA-01: an unreachable backend changes nothing but one line", () => {
  test("the offline notice says what happened, and promises no sync", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("finished")).toHaveCount(0);

    // Lose the network with the page already loaded. The app is local-only, so
    // the test must still complete — which is the whole claim being tested.
    await page.context().setOffline(true);
    try {
      await finishPassage(page);

      await expect(page.getByTestId("results-notice-offline")).toBeVisible();
      await expect(page.getByTestId("results-notice-offline")).toContainText("Offline");
      const notice = (await page.getByTestId("results-notice-offline").innerText()).toLowerCase();

      // What happened, said plainly.
      expect(notice).toContain("calculated in this browser");
      expect(notice).toContain("has not been sent anywhere");

      // …and NOT the global `state.offline` sentence, which promises results will
      // sync when the connection returns. There is no sync to promise at MVP, and
      // a promise the screen cannot keep is worse than no sentence.
      expect(notice).not.toContain("sync");
      expect(notice).not.toContain("when you're back online");

      // The numbers are unaffected: they were never going anywhere.
      await expect(page.getByTestId("headline-net-wpm")).toHaveText(/^\d+\.\d WPM$/);
      await expect(page.getByTestId("results-status-label")).toHaveText(
        "Practice result (not verified)",
      );
    } finally {
      await page.context().setOffline(false);
    }
  });

  test("the notice is gone once the connection is back", async ({ page }) => {
    await page.goto("/");
    await page.context().setOffline(true);
    try {
      await finishPassage(page);
      await expect(page.getByTestId("results-notice-offline")).toBeVisible();
    } finally {
      await page.context().setOffline(false);
    }
    // The panel listens for the transition rather than caching a reading at mount,
    // so a connection that returns retires the notice.
    await expect(page.getByTestId("results-notice-offline")).toHaveCount(0);
    await expect(page.getByTestId("finished")).toBeVisible();
  });

  test("short and offline together are both shown, each with its own cue", async ({ page }) => {
    await page.goto("/");
    await page.context().setOffline(true);
    try {
      await finishPassage(page);
      await expect(page.getByTestId("results-notices").locator("p")).toHaveCount(2);
      const tones = await page
        .getByTestId("results-notices")
        .locator("p")
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).borderLeftStyle));
      expect(
        new Set(tones).size,
        `the two notices must not share a rule: ${tones.join(", ")}`,
      ).toBe(2);
    } finally {
      await page.context().setOffline(false);
    }
  });
});
