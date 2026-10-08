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
const PASSAGE =
  "Dinner's ready whenever you are. I made extra rice in case your brother stops by later tonight. There's also that soup from Sunday in the freezer if you're still hungry after. Just heat it on the stove and add a little pepper. I'll be in the garden until it gets dark, so come find me when you're done.";

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
  // a caret that only jumps on the final keystroke cannot pass.
  //
  // The position is polled rather than sampled once: the surface batches its DOM
  // writes into a requestAnimationFrame (AGENTS.md rule 2 forbids a React render
  // per keystroke), so the paint lands on the next frame, not synchronously with
  // the key event. Polling still measures "this keystroke moved the caret", since
  // only one keystroke is sent between measurements.
  const x = async () => (await caret.boundingBox())!.x;
  for (const char of "Dinner") {
    const before = await x();
    await page.keyboard.press(char === " " ? "Space" : char);
    await expect
      .poll(async () => (await x()) > before, {
        message: `keystroke ${char} must move the caret forward`,
        timeout: 2_000,
      })
      .toBe(true);
  }
});

test("AC2: every character carries exactly one data-char-state, and the states are distinguishable without colour", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("surface").click();

  // Before typing: every character is untyped.
  let states = await page
    .locator("[data-char-state]")
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-char-state")));
  expect(states.length).toBe(PASSAGE.length);
  expect(new Set(states)).toEqual(new Set(["untyped"]));

  // Type a correct prefix, one wrong character, then the rest.
  await typeText(page, "DinnXer's ready whenever you are.");

  states = await page
    .locator("[data-char-state]")
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-char-state")));
  // The typed text is scored POSITIONALLY, which is what the engine's text model
  // does: the wrong "X" occupies position 4 and every later character is then
  // compared one position on from where it belongs. That cascade is the engine's
  // fixture-pinned behaviour, not a rendering bug, so it is asserted rather than
  // wished away.
  expect(states.slice(0, 4)).toEqual(["correct", "correct", "correct", "correct"]);
  expect(states[4]).toBe("incorrect"); // the X typed where an e was expected
  expect(states[5]).toBe("incorrect"); // the shifted cascade, positionally
  expect(states[40]).toBe("untyped"); // nothing that far in has been typed yet

  // No element may carry zero or two states: one attribute value per character.
  const invalid = await page.locator("[data-char-state]").evaluateAll(
    (els) =>
      els.filter((e) => {
        const v = e.getAttribute("data-char-state");
        return v === null || !["untyped", "correct", "incorrect", "extra", "missed"].includes(v);
      }).length,
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
  const before = Number((await liveAcc.innerText()).replace("%", ""));
  await typeText(page, "ZZ", 8);
  const after = Number((await liveAcc.innerText()).replace("%", ""));
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

  // Headline net WPM + accuracy. The regexes carry the string table's templates
  // (results.headline.netWpm = "{value} WPM", results.headline.accuracy =
  // "{value}% accuracy"), so this asserts the copy conforms and not merely that a
  // number appeared.
  const headlineWpm = page.getByTestId("headline-net-wpm");
  const headlineAcc = page.getByTestId("headline-accuracy");
  await expect(headlineWpm).toHaveText(/^\d+(\.\d+)? WPM$/);
  await expect(headlineAcc).toHaveText(/^\d+(\.\d+)?% accuracy$/);

  // Restart (Tab) and New passage are both offered.
  await expect(page.getByTestId("restart")).toBeVisible();
  await expect(page.getByTestId("new-passage")).toBeVisible();

  // The engine's model version is surfaced on the finished result, which is what
  // proves the numbers came from packages/engine and were not computed in the
  // view. This carries over the intent of the old E1 wiring spec.
  await expect(page.getByTestId("engine-stamp")).toContainText("model 1.1.0");

  // Typing after the end changes nothing: no character state moves.
  const statesBefore = await page
    .locator("[data-char-state]")
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-char-state")));
  await typeText(page, "XXXXXXXXXXXXXXXX", 2);
  const statesAfter = await page
    .locator("[data-char-state]")
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-char-state")));
  expect(statesAfter).toEqual(statesBefore);

  // New passage loads a different text. Checked before the restart below, because
  // restarting clears the finished panel the button lives in.
  const textBefore = await page.getByTestId("passage-id").innerText();
  await page.getByTestId("new-passage").click();
  await expect(page.getByTestId("passage-id")).not.toHaveText(textBefore);
  await expect(page.getByTestId("finished")).toHaveCount(0);
  const statesAfterNew = await page
    .locator("[data-char-state]")
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-char-state")));
  expect(new Set(statesAfterNew)).toEqual(new Set(["untyped"]));

  // Tab restarts: every character is untyped again and the finished panel is gone.
  await page.getByTestId("surface").click();
  await typeText(page, PASSAGE.slice(0, 10), 2);
  await page.keyboard.press("Tab");
  await expect(finished).toHaveCount(0);
  const statesRestarted = await page
    .locator("[data-char-state]")
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-char-state")));
  expect(new Set(statesRestarted)).toEqual(new Set(["untyped"]));
});

test("AC6: no popups or modals on the typing surface, and reduced motion is respected", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("surface").click();
  await typeText(page, "Dinner's ready when", 6);

  // CUS-01: nothing that interrupts typing may appear.
  //
  // POSITIVE FORM. The previous version of this assertion queried nine
  // hardcoded selectors — `dialog`, `[role=dialog]`, `[role=alert]`,
  // `[role=alertdialog]`, `[popover]`, `.modal`, `.popup`, `.toast`, `.tooltip`.
  // Owner-proxy review 1 (REVIEW-1.md, H1) added
  //
  //     <div className="promo-banner" aria-modal="true">Congrats! Sign up…</div>
  //
  // to the surface and **this test passed**. A blocklist is a list of the names
  // someone thought of; the next name is not on it, and AGENTS.md rule 1 does
  // not care what the thing is called.
  //
  // So the question is no longer "is one of these nine names present?" It is:
  // does ANY visible element carry overlay semantics, or paint itself over the
  // page independently of the document flow? Both halves are named positively,
  // so an overlay has to be allowed rather than merely unlisted to get past it.
  //
  // Computed styles matter here and a name list cannot see them: an overlay
  // with no dialog semantics at all, pinned with `position: fixed`, is still an
  // overlay. That is why this is a live DOM read and not a markup scan.
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
      // An element that takes itself out of the flow and paints over the
      // viewport is interrupting whether or not it says so. The caret is the
      // one legitimate fixed element on this surface, and it is exempt by
      // identity rather than by selector, so renaming it cannot dodge this.
      if (style.position === "fixed" && el !== caret) reasons.push("position: fixed");
      if (style.position === "sticky" && el !== caret) reasons.push("position: sticky");

      if (reasons.length > 0) {
        found.push({
          reasons,
          tag: el.tagName.toLowerCase(),
          className: typeof el.className === "string" ? el.className.slice(0, 60) : "",
          text: (el.textContent ?? "").trim().slice(0, 60),
        });
      }
    }
    return found;
  });
  expect(
    interrupts,
    "no popup, modal or overlay may appear while typing (AGENTS.md rule 1). " +
      "An overlay has to be excluded deliberately to get past this, not merely " +
      "be named something this list has never heard of.",
  ).toEqual([]);

  // Reduced motion. BOTH directions are asserted, and the first one is the
  // important one: a page with no stylesheet at all reports a transition duration
  // of 0s, so checking only the reduced-motion case would pass on a completely
  // unstyled page. The caret must genuinely animate by default and genuinely
  // stop when motion is reduced.
  const motionUnderDefault = await page.getByTestId("caret").evaluate((el) => ({
    duration: getComputedStyle(el).transitionDuration,
    property: getComputedStyle(el).transitionProperty,
    width: getComputedStyle(el).width,
  }));
  expect(
    parseFloat(motionUnderDefault.duration),
    "the caret must animate by default, or this check proves nothing",
  ).toBeGreaterThan(0);
  expect(motionUnderDefault.property).toContain("transform");

  await page.emulateMedia({ reducedMotion: "reduce" });
  const reduced = await page
    .getByTestId("caret")
    .evaluate((el) => getComputedStyle(el).transitionDuration);
  for (const d of reduced.split(",").map((t) => t.trim())) {
    expect(["0s", "0ms"], `transition-duration must be 0 under reduced motion, got ${d}`).toContain(
      d,
    );
  }

  // The surface must actually be laid out: an unstyled app renders as a wall of
  // unspaced text, which is exactly what shipped until the stylesheet import was
  // added. This is the check that would have caught it.
  const laidOut = await page.getByTestId("surface").evaluate((el) => {
    const s = getComputedStyle(el);
    const first = el.querySelector("[data-char-state]");
    return {
      fontFamily: s.fontFamily,
      lineHeight: s.lineHeight,
      borderTopWidth: s.borderTopWidth,
      charFontFamily: first === null ? "" : getComputedStyle(first).fontFamily,
    };
  });
  expect(laidOut.fontFamily).toMatch(/mono/i);
  expect(laidOut.charFontFamily).toMatch(/mono/i);
  expect(parseFloat(laidOut.lineHeight)).toBeGreaterThan(10);
  expect(parseFloat(laidOut.borderTopWidth)).toBeGreaterThan(0);
});
