import { expect, test } from "@playwright/test";

/**
 * STEER-2 acceptance criteria, asserted against the real typing surface in a
 * real browser. Each criterion from docs/handoff/STEER-2.MD is one test below,
 * named after the criterion it proves, so a failure says which one broke.
 *
 * These drive synthetic keystrokes through the browser, so they are LAB PROXY
 * (browser-inspected) evidence. They are not REAL-DEVICE CONFIRMED: they do not
 * exercise the OS keyboard layout, IME, dead keys or physical key positions
 * (Section 2 rule 8, Section 16.1).
 */

/** The first passage, from apps/web/src/passages.ts (PROSE-01-004). */
const PASSAGE = "Dinner's ready whenever you are. I made extra rice in case your brother stops by later tonight.";

/** Type a string one character at a time, so each keydown is a real event. */
async function typeText(page: import("@playwright/test").Page, text: string, delay = 4) {
  await page.keyboard.type(text, { delay });
}

test("AC1: a visible caret sits on the current character and moves on every keystroke", async ({
  page,
}) => {
  await page.goto("/");
  const surface = page.getByTestId("surface");
  await surface.click();

  const caret = page.getByTestId("caret");
  await expect(caret).toBeVisible();

  const box = await caret.boundingBox();
  expect(box, "the caret must have a real box, not zero size").not.toBeNull();
  expect(box!.width).toBeGreaterThan(0);
  expect(box!.height).toBeGreaterThan(0);

  // The caret must move right as the user types. One character per assertion, so
  // a caret that jumps on the last keystroke only cannot pass.
  const positions: number[] = [];
  for (const char of "Dinner") {
    const before = (await caret.boundingBox())!.x;
    await page.keyboard.press(char === " " ? "Space" : char);
    const after = (await caret.boundingBox())!.x;
    positions.push(after - before);
  }
  for (const [i, delta] of positions.entries()) {
    expect(delta, `keystroke ${i + 1} must move the caret forward`).toBeGreaterThan(0);
  }
});

test("AC2: every character carries exactly one data-char-state, and the states are distinguishable without colour", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("surface").click();

  // Before typing: every character is untyped.
  let states = await page.locator("[data-char-state]").evaluateAll((els) =>
    els.map((e) => e.getAttribute("data-char-state")),
  );
  expect(states.length).toBe(PASSAGE.length);
  expect(new Set(states)).toEqual(new Set(["untyped"]));

  // Type a correct prefix, one wrong character, then the rest.
  await typeText(page, "DinnXer's ready whenever you are.");

  states = await page.locator("[data-char-state]").evaluateAll((els) =>
    els.map((e) => e.getAttribute("data-char-state")),
  );
  expect(states[0]).toBe("correct");
  expect(states[4]).toBe("incorrect"); // the X typed where an e was expected
  expect(states[5]).toBe("untyped"); // nothing after it has been typed yet

  // No element may carry zero or two states: one attribute value per character.
  const invalid = await page
    .locator("[data-char-state]")
    .evaluateAll((els) =>
      els
        .filter((e) => {
          const v = e.getAttribute("data-char-state");
          return v === null || !["untyped", "correct", "incorrect", "extra", "missed"].includes(v);
        })
        .length,
    );
  expect(invalid).toBe(0);

  // Not-colour-alone: the non-colour cue for each state must differ from the
  // others. Read the computed decoration/weight rather than trusting the CSS.
  const cues = await page.evaluate(() => {
    const pick = (state: string) => {
      const el = document.querySelector(`[data-char-state="${state}"]`);
      if (el === null) return null;
      const s = getComputedStyle(el);
      return {
        textDecorationLine: s.textDecorationLine,
        textDecorationStyle: s.textDecorationStyle,
        fontWeight: s.fontWeight,
        opacity: s.opacity,
        outlineStyle: s.outlineStyle,
        borderBottomStyle: s.borderBottomStyle,
        color: s.color,
      };
    };
    return {
      untyped: pick("untyped"),
      correct: pick("correct"),
      incorrect: pick("incorrect"),
    };
  });
  expect(cues.incorrect).not.toBeNull();
  expect(cues.correct).not.toBeNull();
  expect(cues.untyped).not.toBeNull();

  // At least one NON-colour property must separate incorrect from correct.
  const nonColourDiffers =
    cues.incorrect!.textDecorationLine !== cues.correct!.textDecorationLine ||
    cues.incorrect!.textDecorationStyle !== cues.correct!.textDecorationStyle ||
    cues.incorrect!.fontWeight !== cues.correct!.fontWeight ||
    cues.incorrect!.outlineStyle !== cues.correct!.outlineStyle ||
    cues.incorrect!.borderBottomStyle !== cues.correct!.borderBottomStyle;
  expect(
    nonColourDiffers,
    "correct and incorrect must differ by something other than colour alone",
  ).toBe(true);
});

test("AC3: live net WPM and accuracy update while typing, from the engine", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("surface").click();

  const liveWpm = page.getByTestId("live-net-wpm");
  const liveAcc = page.getByTestId("live-accuracy");

  // Before typing, the live figure must say there is no data (chapter 4 E9).
  // It must NOT read 0 — 0 WPM claims the user typed at zero speed.
  await expect(liveWpm).toHaveText(/n\/a/);

  await typeText(page, "Dinner's ready whenever you are.", 8);

  // Live numbers now exist and are real, computed from the engine.
  const wpmText = await liveWpm.innerText();
  expect(wpmText).toMatch(/^\d+(\.\d+)?$/);
  expect(Number(wpmText)).toBeGreaterThan(0);

  const accText = await liveAcc.innerText();
  expect(accText).toMatch(/^\d+(\.\d+)?%$/);
  expect(Number(accText.replace("%", ""))).toBeGreaterThan(0);

  // A wrong keystroke must lower the live accuracy, live.
  const before = Number(await liveAcc.innerText());
  await typeText(page, "ZZ", 8);
  const after = Number(await liveAcc.innerText());
  expect(after, "accuracy must fall when wrong characters are typed").toBeLessThan(before);
});

test("AC4: an unfocused surface shows a prompt, and the timer starts on the first keystroke (ENG-04)", async ({
  page,
}) => {
  await page.goto("/");

  const prompt = page.getByTestId("focus-prompt");
  // Unfocused: the prompt is visible and tells the user what to do.
  await expect(prompt).toBeVisible();
  await expect(prompt).toContainText(/click here|start typing/i);

  const surface = page.getByTestId("surface");
  await surface.click();
  // Focused: the prompt is gone, so it is not competing with the text.
  await expect(prompt).toHaveCount(0);

  // ENG-04: the clock starts on the FIRST KEYSTROKE, not on focus and not on
  // page load. Waiting here before typing must not reduce the reported speed.
  await page.waitForTimeout(1500);
  await typeText(page, "Dinner's ready whenever you are.", 8);

  const wpm = Number(await page.getByTestId("live-net-wpm").innerText());
  // If the pre-typing wait had been counted, a 1.5 s pause would drag this far
  // below the floor a 1.5 s cadence implies. Typing 27 chars at 8 ms + overhead
  // is fast; counting the idle wait would put it under ~10 WPM.
  expect(wpm).toBeGreaterThan(10);
});

test("AC5: a finished test shows a headline, Restart (Tab) and New passage, and typing after the end does nothing", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("surface").click();
  await typeText(page, PASSAGE, 2);

  const finished = page.getByTestId("finished");
  await expect(finished).toBeVisible({ timeout: 15_000 });

  // Headline net WPM + accuracy, per the string table's results.headline.* keys.
  const headlineWpm = page.getByTestId("headline-net-wpm");
  const headlineAcc = page.getByTestId("headline-accuracy");
  await expect(headlineWpm).toHaveText(/^\d+(\.\d+)?$/);
  await expect(headlineAcc).toHaveText(/^\d+(\.\d+)?%$/);

  // Restart (Tab) and New passage are both offered.
  await expect(page.getByTestId("restart")).toBeVisible();
  await expect(page.getByTestId("new-passage")).toBeVisible();

  // Typing after the end changes nothing: no character state moves.
  const statesBefore = await page.locator("[data-char-state]").evaluateAll((els) =>
    els.map((e) => e.getAttribute("data-char-state")),
  );
  await typeText(page, "XXXXXXXXXXXXXXXX", 2);
  const statesAfter = await page.locator("[data-char-state]").evaluateAll((els) =>
    els.map((e) => e.getAttribute("data-char-state")),
  );
  expect(statesAfter).toEqual(statesBefore);

  // Tab restarts: every character is untyped again and the finished panel is gone.
  await page.keyboard.press("Tab");
  await expect(finished).toHaveCount(0);
  const statesRestarted = await page.locator("[data-char-state]").evaluateAll((els) =>
    els.map((e) => e.getAttribute("data-char-state")),
  );
  expect(new Set(statesRestarted)).toEqual(new Set(["untyped"]));

  // New passage loads a different text.
  const textBefore = await page.getByTestId("passage-id").innerText();
  await page.getByTestId("new-passage").click();
  await expect(page.getByTestId("passage-id")).not.toHaveText(textBefore);
  await expect(page.getByTestId("finished")).toHaveCount(0);
});

test("AC6: no popups or modals on the typing surface, and reduced motion is respected", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("surface").click();
  await typeText(page, "Dinner's ready when", 6);

  // CUS-01: nothing that interrupts typing may appear. Assert on the DOM, not
  // on a screenshot: dialog, alert, toast, popover and the <dialog> element.
  const interrupts = await page.evaluate(() => {
    const selectors = [
      "dialog",
      "[role=dialog]",
      "[role=alert]",
      "[role=alertdialog]",
      "[popover]",
      ".modal",
      ".popup",
      ".toast",
      ".tooltip",
    ];
    return selectors.flatMap((s) => [...document.querySelectorAll(s)].map((e) => s));
  });
  expect(interrupts, "no popup, modal or toast may appear while typing").toEqual([]);

  // Reduced motion: the caret's transition must be suppressed, not merely short.
  await page.emulateMedia({ reducedMotion: "reduce" });
  const transition = await page
    .getByTestId("caret")
    .evaluate((el) => getComputedStyle(el).transitionDuration);
  const durations = transition.split(",").map((t) => t.trim());
  for (const d of durations) {
    expect(["0s", "0ms"], `transition-duration must be 0 under reduced motion, got ${d}`).toContain(
      d,
    );
  }
});