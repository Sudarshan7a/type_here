import { expect, test, type Page } from "@playwright/test";

/**
 * OPS-01: the first-run onboarding flow, in a real browser.
 *
 * Everything in this file is a question node can answer and a DOM assertion
 * cannot, or a question only a browser can answer honestly:
 *
 *  - does skipping leave ANY residue on the next load, and is a test possible
 *    straight afterwards;
 *  - can the whole thing be completed with the keyboard alone, in the order a
 *    keyboard user meets it;
 *  - where does focus go when the panel opens, and where does it come back to when
 *    it closes;
 *  - does reduced motion disable the entrance in BOTH directions — measured
 *    against an element that IS animated, so the check cannot pass by seeing
 *    nothing anywhere;
 *  - does the layout guess survive the panel untouched;
 *  - is there any `dialog`, `aria-modal` or `popover` left on the typing surface.
 *
 * Deterministic by construction (typing-e2e-testing): no sleeps, no randomness, no
 * network. The passage is the app's own first one, hard-coded below.
 *
 * LAB PROXY: synthetic keystrokes through Chromium. Screen-reader narration of the
 * flow is A11Y-01's human pass, not this file.
 */

const PASSAGE =
  "Dinner's ready whenever you are. I made extra rice in case your brother stops by later tonight.";

/** A visitor with nothing stored: the real first run, every test in this file. */
async function firstRun(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByTestId("onboarding")).toBeVisible();
}

async function typePassage(page: Page, text: string, delay = 3): Promise<void> {
  await page.getByTestId("surface").click();
  await page.keyboard.type(text, { delay });
}

/** Tab until the element carrying `testid` has focus. Bounded by the tab order. */
async function tabTo(page: Page, testid: string, limit = 60): Promise<void> {
  for (let i = 0; i < limit; i += 1) {
    const current = await page.evaluate(
      () => document.activeElement?.getAttribute("data-testid") ?? null,
    );
    if (current === testid) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`Tab order never reached ${testid}`);
}

/** The interrupting constructs AGENTS.md rule 1 and the AC6 scan forbid. */
async function interrupters(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const found: string[] = [];
    for (const el of document.body.querySelectorAll("*")) {
      if (!(el instanceof HTMLElement)) continue;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      if (Number.parseFloat(style.opacity) === 0) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const role = el.getAttribute("role");
      if (el.tagName === "DIALOG") found.push("<dialog>");
      if (role === "dialog" || role === "alertdialog") found.push(`role=${role}`);
      if (el.hasAttribute("aria-modal")) found.push("aria-modal");
      if (el.hasAttribute("popover")) found.push("popover");
      if (style.position === "fixed" || style.position === "sticky") {
        found.push(`${style.position} .${el.className}`);
      }
    }
    return found;
  });
}

test.describe("OPS-01: what a first-time visitor meets", () => {
  test("the panel is the first thing on the page, and it covers nothing", async ({ page }) => {
    await firstRun(page);

    const panel = page.getByTestId("onboarding");
    await expect(panel).toBeVisible();
    // In flow, above the settings row, never over the typing field.
    await expect(panel).toHaveCSS("position", "static");
    expect(await interrupters(page), "a first-run panel may not interrupt anything").toEqual([]);

    // …and the typing field is fully usable with the panel open and unanswered.
    const panelBox = (await panel.boundingBox())!;
    const surfaceBox = (await page.getByTestId("surface").boundingBox())!;
    expect(
      panelBox.y + panelBox.height,
      "the panel must sit above the typing field, never over it",
    ).toBeLessThanOrEqual(surfaceBox.y + 1);
    await expect(page.getByTestId("surface")).toContainText("Dinner");
  });

  test("the visitor can type a whole test WITHOUT answering anything", async ({ page }) => {
    // The strongest reading of "skippable": the app is not gated, it was never
    // gated, and no question stands between a new visitor and the product.
    await firstRun(page);
    await typePassage(page, PASSAGE, 2);
    await expect(page.getByTestId("finished")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("headline-net-wpm")).toBeVisible();
    // The panel is still there, unanswered, and has not interfered.
    await expect(page.getByTestId("onboarding")).toBeVisible();
  });

  test("a real heading structure, and no live region added by the panel", async ({ page }) => {
    await firstRun(page);
    const levels = await page.evaluate(() =>
      [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((h) => ({
        level: Number.parseInt(h.tagName.slice(1), 10),
        text: h.textContent?.trim() ?? "",
      })),
    );
    expect(levels[0]).toEqual({ level: 1, text: "RealType" });
    expect(levels[1]?.level, "the panel heading follows the page title with no skip").toBe(2);
    // No level is skipped anywhere on the page.
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i]!.level - levels[i - 1]!.level).toBeLessThanOrEqual(1);
    }
    // The finished test's single announcement is the only live region (results.spec.ts).
    const regions = await page.evaluate(() =>
      [...document.querySelectorAll("[aria-live], [role=status], [role=alert]")].map(
        (el) => el.getAttribute("aria-live") ?? el.getAttribute("role"),
      ),
    );
    expect(regions).toEqual(["polite"]);
  });
});

test.describe("OPS-01: skipping means skippable", () => {
  test("the dismiss control is one Tab from the top of the page", async ({ page }) => {
    await firstRun(page);
    // Tab 1 is the app's own skip link, which 13 §1 pins and which focus stealing on
    // load would break. Tab 2 is the dismiss control, before any question.
    await page.keyboard.press("Tab");
    await expect(page.locator(".skip-link")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("onboarding-skip")).toBeFocused();
  });

  test("skipping leaves ZERO residue on the next load, and a test is possible", async ({
    page,
  }) => {
    await firstRun(page);
    await page.keyboard.press("Tab"); // skip link
    await page.keyboard.press("Tab"); // dismiss
    await page.getByTestId("onboarding-skip").press("Enter");

    // Gone from the tree, not merely hidden.
    await expect(page.getByTestId("onboarding")).toHaveCount(0);
    await expect(page.getByTestId("onboarding-summary")).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId("onboarding")).toHaveCount(0);
    await expect(page.getByTestId("onboarding-summary")).toHaveCount(0);
    expect(
      await interrupters(page),
      "no modal, no overlay, no fixed or sticky layer after skipping",
    ).toEqual([]);

    // Nothing was recorded that the visitor did not say.
    const stored = await page.evaluate(() => localStorage.getItem("realtype.onboarding"));
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toEqual({ version: 1, state: "skipped" });

    // …and the product works, from a completely clean slate.
    await typePassage(page, PASSAGE, 2);
    await expect(page.getByTestId("finished")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("restart")).toBeVisible();
  });

  test("focus is returned somewhere real when the panel is dismissed", async ({ page }) => {
    await firstRun(page);
    await page.getByTestId("onboarding-skip").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("onboarding")).toHaveCount(0);
    // Not <body>: a keyboard visitor who dismisses a panel must still be somewhere.
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.getAttribute("data-testid")))
      .toBe("surface");
  });

  test("dismissing with the keyboard alone never needs a second key", async ({ page }) => {
    await firstRun(page);
    // Enter on the dismiss button, with no answer selected anywhere.
    await tabTo(page, "onboarding-skip");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("onboarding")).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId("onboarding")).toHaveCount(0);
  });
});

test.describe("OPS-01: the plan, and the way back into it", () => {
  test("the whole flow completes with the keyboard alone", async ({ page }) => {
    await firstRun(page);

    // The tab order a keyboard user actually meets: skip link, dismiss, then one
    // stop per question — because a radio group is ONE tab stop, not one per
    // option. This is asserted rather than assumed, since the whole point of
    // "keyboard-only completable" is that the order is the expected one.
    await page.keyboard.press("Tab");
    await expect(page.locator(".skip-link")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("onboarding-skip")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("onboarding-goal-everyday")).toBeFocused();

    // Move within the goal group with the arrow keys, as a radiogroup is used.
    await page.keyboard.press("ArrowDown");
    await expect(page.getByTestId("onboarding-goal-mistakes")).toBeChecked();
    await expect(page.getByTestId("onboarding-goal-everyday")).not.toBeChecked();

    // Next Tab is the LEVEL group — not the second goal.
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("onboarding-level-new")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expect(page.getByTestId("onboarding-level-returning")).toBeChecked();

    // Checkboxes are one stop each, and Space is the binding.
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("onboarding-language-javascript")).toBeFocused();
    await page.keyboard.press("Space");
    await expect(page.getByTestId("onboarding-language-javascript")).toBeChecked();
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("onboarding-language-python")).toBeFocused();
    await page.keyboard.press("Space");
    await expect(page.getByTestId("onboarding-language-python")).toBeChecked();

    // Submit, and the plan is there. Three remaining checkboxes, then the button:
    // the layout sentence between them is text, not a control, so it is not a stop.
    for (const language of ["java", "sql", "html-css"]) {
      await page.keyboard.press("Tab");
      await expect(page.getByTestId(`onboarding-language-${language}`)).toBeFocused();
    }
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("onboarding-submit")).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page.getByTestId("onboarding-plan")).toBeVisible();
    // The answers are in the plan, in words, and nothing more is claimed.
    await expect(page.getByTestId("onboarding-plan-focus")).toContainText("Prose");
    await expect(page.getByTestId("onboarding-plan-level")).toContainText("coming back");
    await expect(page.getByTestId("onboarding-plan-languages")).toContainText("Python");
    await expect(page.getByTestId("onboarding-plan-provisional")).toBeVisible();
    await expect(page.getByTestId("onboarding-plan-pending")).toBeVisible();
  });

  test("a radio group is ONE tab stop, so the questions do not become a wall", async ({ page }) => {
    await firstRun(page);
    // Fifteen controls: five goals, five levels, five languages. As tab stops the
    // two radio groups are ONE each, so the whole form is eight stops — skip link
    // aside, that is dismiss, goal, level, five checkboxes, submit.
    await tabTo(page, "onboarding-skip");
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("onboarding-goal-everyday")).toBeFocused();
    // …and a second Tab leaves the group entirely rather than walking five goals.
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("onboarding-level-new")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("onboarding-language-javascript")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("onboarding-language-python")).toBeFocused();
    for (const language of ["java", "sql", "html-css"]) {
      await page.keyboard.press("Tab");
      await expect(page.getByTestId(`onboarding-language-${language}`)).toBeFocused();
    }
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("onboarding-submit")).toBeFocused();
  });

  test("submitting with NOTHING answered still produces a complete plan", async ({ page }) => {
    await firstRun(page);
    await page.getByTestId("onboarding-submit").click();
    await expect(page.getByTestId("onboarding-plan")).toBeVisible();
    await expect(page.getByTestId("onboarding-plan-focus")).toBeVisible();
    await expect(page.getByTestId("onboarding-plan-content")).toContainText("English prose");
    await expect(page.getByTestId("onboarding-plan-level")).not.toBeEmpty();
    await expect(page.getByTestId("onboarding-plan-languages")).not.toBeEmpty();
    // The difficulty band is named, and what it covers is named too.
    await expect(page.getByTestId("onboarding-plan-band-note")).toContainText("prose and quotes");
  });

  test("a goal the app cannot act on says so instead of implying it exists", async ({ page }) => {
    await firstRun(page);
    await page.getByTestId("onboarding-goal-symbols").check();
    await page.getByTestId("onboarding-submit").click();
    const focus = page.getByTestId("onboarding-plan-focus");
    await expect(focus).toContainText("Not available yet");
    // No code band is ever promised, on any path.
    await expect(page.getByTestId("onboarding-plan-content")).toContainText("English prose");
    await expect(page.getByTestId("onboarding-plan-band-note")).toContainText(
      "Code snippets carry no band yet",
    );
  });

  test("the plan survives a reload, and reopens into focus on request", async ({ page }) => {
    await firstRun(page);
    await page.getByTestId("onboarding-goal-writing").check();
    await page.getByTestId("onboarding-submit").click();
    await expect(page.getByTestId("onboarding-plan")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("onboarding-summary")).toBeVisible();
    await expect(page.getByTestId("onboarding-plan-focus")).toContainText("prose passages");
    // The questions are not re-asked: the plan is the resting state.
    await expect(page.getByTestId("onboarding-goal-everyday")).toHaveCount(0);

    // Reopening moves focus INTO the panel…
    await page.getByTestId("onboarding-plan-change").click();
    await expect(page.getByTestId("onboarding")).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.getAttribute("data-testid") ?? null))
      .toBe("onboarding");
    // …and the previous answer is still there.
    await expect(page.getByTestId("onboarding-goal-writing")).toBeChecked();
  });

  test("changing the plan and submitting again replaces it", async ({ page }) => {
    await firstRun(page);
    await page.getByTestId("onboarding-goal-everyday").check();
    await page.getByTestId("onboarding-submit").click();
    await expect(page.getByTestId("onboarding-plan-focus")).toContainText("your own pace");

    await page.getByTestId("onboarding-plan-change").click();
    await page.getByTestId("onboarding-goal-mistakes").check();
    await page.getByTestId("onboarding-submit").click();
    await expect(page.getByTestId("onboarding-plan-focus")).toContainText("mistake marked");
  });
});

test.describe("OPS-01: the layout guess is respected, not re-asked", () => {
  test("the panel states the layout the app already decided, and offers no control for it", async ({
    page,
  }) => {
    await page.goto("/");
    const note = page.getByTestId("onboarding-layout-note");
    await expect(note).toBeVisible();
    // The guess is named as a guess, in the same sentence as the value.
    await expect(note).toContainText("guessed from your browser language");

    // One setting, one control: the panel contains no select and no layout input.
    await expect(page.locator(".onboarding select")).toHaveCount(0);
    await expect(page.locator('.onboarding input[type="text"]')).toHaveCount(0);
    // The always-visible override LOC-01 shipped is still right there.
    await expect(page.getByTestId("layout-select")).toBeVisible();
    const options = await page.getByTestId("layout-select").locator("option").allTextContents();
    expect(options.length).toBe(6);
  });

  test("changing the layout in Settings updates the plan and is described as chosen", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("layout-select").selectOption("dvorak");
    // The panel's sentence follows the change: no second, contradicting copy.
    await expect(page.getByTestId("onboarding-layout-note")).toContainText("Dvorak");
    await expect(page.getByTestId("onboarding-layout-note")).toContainText(
      "You can change it in Settings",
    );

    await page.getByTestId("onboarding-submit").click();
    await expect(page.getByTestId("onboarding-plan-layout")).toContainText("Dvorak");
    // Chosen by the visitor, so the plan says "set by you" and not "guessed".
    await expect(page.getByTestId("onboarding-plan-layout")).toContainText("set by you");
    await expect(page.getByTestId("onboarding-plan-layout")).not.toContainText("guessed");
  });

  test("a stored layout choice is never described as a guess", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("layout-select").selectOption("azerty");
    await page.reload();
    await expect(page.getByTestId("onboarding-layout-note")).toContainText("AZERTY");
    await expect(page.getByTestId("onboarding-layout-note")).not.toContainText("guessed from");
  });
});

test.describe("OPS-01: motion, in both directions", () => {
  test("the entrance moves with motion allowed, and getAnimations() proves it", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const panel = page.getByTestId("onboarding");
    await expect(panel).toBeVisible();

    // Computed name is the entrance, and a transform is actually in flight — not a
    // class that merely claims to animate.
    expect(await panel.evaluate((el) => getComputedStyle(el).animationName)).toBe(
      "onboarding-enter",
    );
    const transform = await panel.evaluate((el) => getComputedStyle(el).transform);
    expect(transform, "the entrance must apply a transform, not a fade").toMatch(/matrix/);
    const duration = await panel.evaluate((el) => getComputedStyle(el).animationDuration);
    expect(Number.parseFloat(duration)).toBeGreaterThan(0);
    // Exactly one animation, on transform: no loop, no second effect.
    const summary = await panel.evaluate((el) =>
      el.getAnimations().map((a) => {
        const effect = a.effect as KeyframeEffect | null;
        return {
          properties: [
            ...new Set(
              (effect?.getKeyframes() ?? []).flatMap((k) =>
                Object.keys(k).filter(
                  (p) => !["offset", "computedOffset", "easing", "composite"].includes(p),
                ),
              ),
            ),
          ],
          // `infinite` would make this Infinity; one pass is 1.
          iterations: effect?.getTiming().iterations ?? null,
          durationMs: Number.parseFloat(effect?.getTiming().duration.toString() ?? "NaN"),
        };
      }),
    );
    expect(summary.length).toBe(1);
    expect(summary[0]?.properties).toEqual(["transform"]);
    expect(summary[0]?.iterations, "the entrance must play once, not loop").toBe(1);
    // 160ms from --dur-base: inside the catalog's budget and short enough that a
    // visitor is not waiting on it.
    expect(summary[0]?.durationMs).toBeGreaterThan(0);
    expect(summary[0]?.durationMs).toBeLessThanOrEqual(320);
  });

  test("reduced motion disables the entrance — checked against a control that DOES animate", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const panel = page.getByTestId("onboarding");

    // THE CONTROL. A deliberately unstyled element animated by a stylesheet this
    // spec injects, with no media query around it. If the reduced-motion
    // environment cannot even show this moving, then "the panel does not move"
    // below proves nothing — so this is asserted FIRST, and it must move in BOTH
    // settings. It is the unstyled control the audit needs.
    await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.id = "onboarding-motion-control";
      const sheet = document.createElement("style");
      sheet.textContent =
        "@keyframes onboarding-control-move { from { transform: translate3d(0, 24px, 0); } to { transform: none; } }" +
        "#onboarding-motion-control { animation: onboarding-control-move 400ms linear both; }";
      document.head.append(sheet);
      document.body.prepend(probe);
    });
    const controlTransform = await page.evaluate(() => {
      const probe = document.getElementById("onboarding-motion-control")!;
      return {
        name: getComputedStyle(probe).animationName,
        transform: getComputedStyle(probe).transform,
        running: probe.getAnimations().length,
      };
    });
    expect(controlTransform.name).toBe("onboarding-control-move");
    expect(controlTransform.transform, "the control must actually be mid-move").toMatch(/matrix/);
    expect(controlTransform.running).toBeGreaterThan(0);

    // Now the panel, in the same reduced-motion environment, with the control moving.
    expect(await panel.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
    expect(await panel.evaluate((el) => el.getAnimations().length)).toBe(0);
    expect(await panel.evaluate((el) => getComputedStyle(el).transform)).toBe("none");
    expect(await panel.evaluate((el) => getComputedStyle(el).animationDelay)).toBe("0s");

    // The feedback is NOT removed: every word is present from the first frame.
    await expect(panel).toBeVisible();
    await expect(page.getByTestId("onboarding-intro")).toBeVisible();
    await expect(page.getByTestId("onboarding-skip")).toBeVisible();
  });

  test("reduced motion still allows the flow to complete", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await firstRun(page);
    await page.getByTestId("onboarding-goal-mistakes").check();
    await page.getByTestId("onboarding-submit").click();
    await expect(page.getByTestId("onboarding-plan")).toBeVisible();
    await expect(page.getByTestId("onboarding-plan-provisional")).toBeVisible();
  });
});

test.describe("OPS-01: accessibility of the panel itself", () => {
  test("every control is a real, named, reachable control at 24px or more", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 900 });
    await firstRun(page);

    const targets = await page.evaluate(() => {
      const out: { id: string; tag: string; w: number; h: number; name: string }[] = [];
      for (const el of document.querySelectorAll(
        ".onboarding button, .onboarding input, .onboarding select, .onboarding label",
      )) {
        if (!(el instanceof HTMLElement)) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        const input = el as HTMLInputElement;
        // The accessible name a screen reader would use: an explicit aria-label, or
        // the wrapping <label>'s text. No placeholder is ever a label.
        const labelled =
          el.getAttribute("aria-label") ?? input.labels?.[0]?.textContent?.trim() ?? "";
        out.push({
          id: el.getAttribute("data-testid") ?? el.tagName.toLowerCase(),
          tag: el.tagName.toLowerCase(),
          w: rect.width,
          h: rect.height,
          name: labelled,
        });
      }
      return out;
    });
    expect(targets.length).toBeGreaterThan(10);
    for (const t of targets) {
      expect(t.w, `${t.tag}[${t.id}] width`).toBeGreaterThanOrEqual(24);
      expect(t.h, `${t.tag}[${t.id}] height`).toBeGreaterThanOrEqual(24);
    }
    // Every input has a label with real words in it, not a placeholder. "SQL" and
    // "Java" are three characters and three perfectly good labels.
    const inputs = targets.filter((t) => t.tag === "input");
    for (const input of inputs) {
      expect(input.name.trim().length, `${input.id} needs a label`).toBeGreaterThanOrEqual(2);
    }
  });

  test("reflows at 320px with no horizontal scroll, and every question is still readable", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await firstRun(page);
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth, "horizontal scroll at 320px").toBeLessThanOrEqual(
      overflow.clientWidth + 1,
    );
    await expect(page.getByTestId("onboarding-submit")).toBeVisible();
    await expect(page.getByTestId("onboarding-skip")).toBeVisible();
    await page.getByTestId("onboarding-goal-symbols").check();
    await page.getByTestId("onboarding-submit").click();
    await expect(page.getByTestId("onboarding-plan")).toBeVisible();
    const after = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(after.scrollWidth, "the plan must reflow too").toBeLessThanOrEqual(
      after.clientWidth + 1,
    );
  });

  test("the panel is chrome: focus mode hides it and keeps the way out visible", async ({
    page,
  }) => {
    await firstRun(page);
    await page.getByTestId("focus-mode-toggle").check();
    await expect(page.getByTestId("onboarding")).toBeHidden();
    await expect(page.getByTestId("focus-mode-toggle")).toBeVisible();
    // Nothing interrupting, with the panel hidden.
    expect(await interrupters(page)).toEqual([]);
    await page.getByTestId("focus-mode-toggle").uncheck();
    await expect(page.getByTestId("onboarding")).toBeVisible();
  });

  test("the panel never covers the typing field at any viewport", async ({ page }) => {
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const panelBox = (await page.getByTestId("onboarding").boundingBox())!;
      const surfaceBox = (await page.getByTestId("surface").boundingBox())!;
      expect(
        panelBox.y + panelBox.height,
        `panel must sit above the field at ${width}px`,
      ).toBeLessThanOrEqual(surfaceBox.y + 1);
      expect(await interrupters(page), `no interrupter at ${width}px`).toEqual([]);
    }
  });
});
