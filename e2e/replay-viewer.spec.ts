import { expect, test } from "@playwright/test";

/**
 * ENG-08 [MVP]: basic replay from the retained log, with speed control and
 * error markers (master-spec §5 ENG-08; implementation-guide M1-10/M2-11).
 *
 * The viewer replays the just-finished attempt from the in-memory log only:
 * local, no storage, no network, speed as a display-only time scale. Frames
 * come from `framesForLog` in packages/engine — the spec asserts the viewer
 * shows what the engine folded, not a second implementation.
 *
 * LAB PROXY like the rest of this suite: synthetic keystrokes, headless
 * Chromium. Real-human timing replay waits on recorded fixtures
 * (HUMAN-ACTIONS.md fixture-recorder item).
 */

/** The first passage, from apps/web/src/passages.ts (PROSE-01-004). */
const PASSAGE =
  "Dinner's ready whenever you are. I made extra rice in case your brother stops by later tonight. There's also that soup from Sunday in the freezer if you're still hungry after. Just heat it on the stove and add a little pepper. I'll be in the garden until it gets dark, so come find me when you're done.";

async function finishPassage(page: import("@playwright/test").Page, text: string = PASSAGE) {
  await page.goto("/");
  await page.getByTestId("surface").click();
  await page.keyboard.type(text, { delay: 2 });
  await expect(page.getByTestId("finished")).toBeVisible({ timeout: 15_000 });
}

async function openReplay(page: import("@playwright/test").Page) {
  await page.getByTestId("replay-watch").click();
  await expect(page.getByTestId("replay")).toBeVisible();
}

async function replayStates(page: import("@playwright/test").Page): Promise<(string | null)[]> {
  return page
    .locator("[data-replay-char]")
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-char-state")));
}

test("ENG-08: a finished test offers a replay that steps through the attempt", async ({ page }) => {
  await finishPassage(page);
  await openReplay(page);

  // Before play: the first frame — everything untyped, caret at the start.
  expect(new Set(await replayStates(page))).toEqual(new Set(["untyped"]));

  // Play advances the attempt: characters flip to correct as their frames land.
  await page.getByTestId("replay-play-pause").click();
  await expect
    .poll(async () => (await replayStates(page)).filter((s) => s === "correct").length, {
      message: "playing the replay must paint characters correct",
      timeout: 30_000,
    })
    .toBeGreaterThan(0);

  // Pause freezes it: two reads half a second apart agree exactly.
  await page.getByTestId("replay-play-pause").click();
  const frozen = await replayStates(page);
  await page.waitForTimeout(500);
  expect(await replayStates(page)).toEqual(frozen);

  // Restart returns to the first frame.
  await page.getByTestId("replay-restart").click();
  expect(new Set(await replayStates(page))).toEqual(new Set(["untyped"]));

  // A clean run says so in words (the non-colour channel for the states).
  await expect(page.getByTestId("replay-errors")).toHaveText(/no errors/);
});

test("ENG-08: speed control rescales time without touching the frames", async ({ page }) => {
  await finishPassage(page);
  await openReplay(page);

  // Four display-only scales, default 1×.
  await expect(page.getByTestId("replay-speed")).toHaveValue("1");
  const options = await page.getByTestId("replay-speed").locator("option").allInnerTexts();
  expect(options).toEqual(["0.5×", "1×", "2×", "4×"]);

  // 4× finishes a ~{duration} run in well under the 1× wall time: start at 4×
  // and the whole attempt completes promptly; the frame count is unchanged.
  await page.getByTestId("replay-speed").selectOption("4");
  await page.getByTestId("replay-play-pause").click();
  await expect
    .poll(async () => (await replayStates(page)).filter((s) => s === "correct").length, {
      message: "4× replay must still reach the end",
      timeout: 30_000,
    })
    .toBe(PASSAGE.length);
});

test("ENG-08: a typo run names its error positions in words", async ({ page }) => {
  // 'X' at index 4 (position 5) instead of 'e', same length as the target so
  // the test still finishes — the finished attempt carries a real error.
  await finishPassage(
    page,
    "DinnXr's ready whenever you are. I made extra rice in case your brother stops by later tonight.",
  );
  await openReplay(page);

  const summary = page.getByTestId("replay-errors");
  await expect(summary).not.toHaveText(/no errors/);
  // Positions are 1-based words, never colour-only.
  await expect(summary).toHaveText(/position 5/);
});

test("ENG-08: the viewer is fully keyboard operable", async ({ page }) => {
  await finishPassage(page);
  await openReplay(page);

  // Play from the keyboard: focus + Enter starts the stepping.
  const play = page.getByTestId("replay-play-pause");
  await play.focus();
  await page.keyboard.press("Enter");
  await expect
    .poll(async () => (await replayStates(page)).filter((s) => s === "correct").length, {
      message: "keyboard-started replay must paint characters correct",
      timeout: 30_000,
    })
    .toBeGreaterThan(0);
  await page.keyboard.press("Enter"); // pause

  // Scrub from the keyboard: End jumps to the last frame.
  const scrub = page.getByTestId("replay-scrub");
  await scrub.focus();
  await page.keyboard.press("End");
  await expect
    .poll(async () => (await replayStates(page)).filter((s) => s === "correct").length, {
      message: "keyboard scrub to End must reach the final frame",
      timeout: 10_000,
    })
    .toBe(PASSAGE.length);

  // Home jumps back to the start. The first keystroke carries t=0 (the
  // capture clock starts on the first accepted key), so time 0 already
  // includes its frame — what Home must do deterministically is return the
  // scrub to 0 and the paint to (at most) that first frame.
  await page.keyboard.press("Home");
  await expect
    .poll(async () => Number(await scrub.inputValue()), {
      message: "keyboard scrub to Home must return the slider to 0",
      timeout: 10_000,
    })
    .toBe(0);
  expect(
    (await replayStates(page)).filter((s) => s === "correct").length,
    "time 0 holds at most the t=0 first keystroke",
  ).toBeLessThanOrEqual(1);
  await page.keyboard.press("End");
  const atEnd = Number(await scrub.inputValue());
  await page.keyboard.press("ArrowLeft");
  expect(Number(await scrub.inputValue())).toBeLessThan(atEnd);
});

test("ENG-08: restarting evicts the retained log", async ({ page }) => {
  await finishPassage(page);
  await openReplay(page);
  await expect(page.getByTestId("replay")).toBeVisible();

  // Tab restarts (AC5): the result goes away, and the retained log with it —
  // retention is the last finished attempt, in memory, cleared on restart.
  await page.getByTestId("surface").click();
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("finished")).toHaveCount(0);
  await expect(page.getByTestId("replay-watch")).toHaveCount(0);
});

test("ENG-08: nothing moves before an explicit press under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await finishPassage(page);
  await openReplay(page);

  // No autoplay by design — under reduced motion this is also the requirement:
  // one full second with no press leaves every character untyped.
  await page.waitForTimeout(1_000);
  expect(new Set(await replayStates(page))).toEqual(new Set(["untyped"]));
});

test("ENG-08: the viewer never covers the typing surface", async ({ page }) => {
  await finishPassage(page);
  await openReplay(page);

  // The viewer lives below the finished panel in normal flow: no fixed or
  // sticky positioning, no dialog semantics — the same positive-form shape
  // AC6 asserts for the surface itself.
  const overlay = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="replay"]');
    if (!(el instanceof HTMLElement)) return "missing";
    const style = getComputedStyle(el);
    return `${style.position}|${el.getAttribute("role") ?? "none"}`;
  });
  expect(overlay).toBe("static|none");

  // Closing hides the viewer; the finished panel stays put.
  await page.getByTestId("replay-close").click();
  await expect(page.getByTestId("replay")).toHaveCount(0);
  await expect(page.getByTestId("finished")).toBeVisible();
});
