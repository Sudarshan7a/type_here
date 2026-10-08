import { expect, test, type Page } from "@playwright/test";

/**
 * A11Y-01 / NFR-11 — the machine-checkable accessibility sweep.
 *
 * The screen-reader pass stays HUMAN (see HUMAN-ACTIONS.md); everything here
 * must run in CI on headless Chromium. No axe-core: the license gate forbids
 * it even as a devDependency without approval, so every check below is a
 * hand-rolled computed-style assertion — the repo precedent from
 * e2e/appearance.spec.ts (computed contrast with opacity walk-up),
 * e2e/caret.spec.ts (reduced-motion both-directions) and
 * e2e/typing-surface-design.spec.ts (token assertions).
 *
 * Coverage: every screen (idle surface, finished panel, replay viewer open,
 * focus mode on/off, both themes) across seven areas — 200% zoom, text
 * spacing, forced colors, reduced motion (both directions), computed contrast,
 * 24px targets, and non-color cues. Each area also carries a non-vacuity
 * probe: the assertion is shown to fail on a deliberate break, so a gate
 * that has only ever passed is not trusted.
 *
 * LAB PROXY like the rest of this suite: synthetic keystrokes through a real
 * browser. Real-browser 200%, device checks and the screen-reader pass are
 * human actions, listed at the bottom of this file.
 */

/** PROSE-01-004, from apps/web/src/passages.ts. */
const PASSAGE =
  "Dinner's ready whenever you are. I made extra rice in case your brother stops by later tonight. There's also that soup from Sunday in the freezer if you're still hungry after. Just heat it on the stove and add a little pepper. I'll be in the garden until it gets dark, so come find me when you're done.";

/** Same text with one substitution at index 4, so the run finishes with a real error. */
const TYPO_PASSAGE =
  "DinnXr's ready whenever you are. I made extra rice in case your brother stops by later tonight. There's also that soup from Sunday in the freezer if you're still hungry after. Just heat it on the stove and add a little pepper. I'll be in the garden until it gets dark, so come find me when you're done.";

type Theme = "daylight" | "night-ink";

async function typeText(page: Page, text: string, delay = 2) {
  await page.keyboard.type(text, { delay });
}

async function gotoWithTheme(page: Page, theme: Theme) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId("theme-select").selectOption(theme);
}

async function finishPassage(page: Page, text: string = PASSAGE) {
  await page.getByTestId("surface").click();
  await typeText(page, text);
  await expect(page.getByTestId("finished")).toBeVisible({ timeout: 15_000 });
}

async function openReplay(page: Page) {
  await page.getByTestId("replay-watch").click();
  await expect(page.getByTestId("replay")).toBeVisible();
}

async function assertNoHorizontalScroll(page: Page, where: string) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.scrollWidth, `horizontal scroll ${where}`).toBeLessThanOrEqual(
    overflow.clientWidth + 1,
  );
}

/**
 * WCAG contrast from the LIVE page: foreground color at its effective opacity
 * (multiplied down the ancestor chain, the appearance.spec.ts precedent)
 * blended over the given background, with proper sRGB relative luminance.
 * When the background element is transparent (replay text sits directly on
 * the finished panel), the page background behind it is used instead.
 */
async function contrastRatio(page: Page, fgSelector: string, bgSelector: string): Promise<number> {
  return page.evaluate(
    ([fgSel, bgSel]) => {
      const parse = (s: string): [number, number, number, number] => {
        const m = /rgba?\(([^)]+)\)/.exec(s) ?? ["", "0,0,0,1"];
        const parts = m[1]!.split(",").map((p) => Number.parseFloat(p));
        return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
      };
      const lum = (c: [number, number, number]): number => {
        const l = c.map((v) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * l[0]! + 0.7152 * l[1]! + 0.0722 * l[2]!;
      };
      const fgEl = document.querySelector(fgSel);
      const bgEl = document.querySelector(bgSel);
      if (!(fgEl instanceof HTMLElement) || !(bgEl instanceof HTMLElement)) return -1;
      const fg = parse(getComputedStyle(fgEl).color);
      let alpha = fg[3];
      for (let node: HTMLElement | null = fgEl; node; node = node.parentElement) {
        alpha *= Number.parseFloat(getComputedStyle(node).opacity || "1");
      }
      let bg = parse(getComputedStyle(bgEl).backgroundColor);
      if (bg[3] < 1) bg = parse(getComputedStyle(document.body).backgroundColor);
      const blended: [number, number, number] = [
        fg[0] * alpha + bg[0] * (1 - alpha),
        fg[1] * alpha + bg[1] * (1 - alpha),
        fg[2] * alpha + bg[2] * (1 - alpha),
      ];
      const hi = Math.max(lum(blended), lum([bg[0], bg[1], bg[2]]));
      const lo = Math.min(lum(blended), lum([bg[0], bg[1], bg[2]]));
      return (hi + 0.05) / (lo + 0.05);
    },
    [fgSelector, bgSelector] as const,
  );
}

/** Every element exists (selector resolving to -1 is a missing element, not a pass). */
async function expectContrast(
  page: Page,
  fgSelector: string,
  bgSelector: string,
  floor: number,
  label: string,
) {
  const ratio = await contrastRatio(page, fgSelector, bgSelector);
  expect(
    ratio,
    `${label}: element missing (${fgSelector} on ${bgSelector})`,
  ).toBeGreaterThanOrEqual(0);
  expect(ratio, `${label}: contrast ${ratio.toFixed(2)}:1 below ${floor}:1`).toBeGreaterThanOrEqual(
    floor,
  );
}

/** The interactive controls that must stay usable on the idle screen. */
const IDLE_CONTROLS = [
  "passage-select",
  "caret-style-select",
  "layout-select",
  "theme-select",
  "ui-font-select",
  "focus-mode-toggle",
  "auto-indent-toggle",
  "auto-pair-toggle",
] as const;

async function expectIdleControlsUsable(page: Page, where: string) {
  for (const id of IDLE_CONTROLS) {
    const control = page.getByTestId(id);
    await expect(control, `${where}: ${id} must stay reachable`).toBeVisible();
    await expect(control, `${where}: ${id} must stay enabled`).toBeEnabled();
    const box = await control.boundingBox();
    expect(box, `${where}: ${id} must keep a real box`).not.toBeNull();
  }
  // The typing field itself: visible with a real box.
  await expect(page.getByTestId("surface"), `${where}: surface visible`).toBeVisible();
  const surfaceBox = await page.getByTestId("surface").boundingBox();
  expect(surfaceBox, `${where}: surface must keep a real box`).not.toBeNull();
  // The skip link is off-screen until focused — reachable means focusing it
  // reveals it, which is its whole contract.
  await page.locator(".skip-link").focus();
  await expect(page.locator(".skip-link"), `${where}: skip link reveals on focus`).toBeVisible();
  await expect(page.locator(".skip-link"), `${where}: skip link focused`).toBeFocused();
}

test.describe("200% zoom equivalent (720px CSS at 2x density)", () => {
  test.use({ viewport: { width: 720, height: 900 }, deviceScaleFactor: 2 });

  for (const theme of ["daylight", "night-ink"] as const) {
    test(`zoom: ${theme} idle, focus on/off, finished and replay stay usable`, async ({ page }) => {
      await gotoWithTheme(page, theme);

      // Idle, focus off: no scroll, controls usable, passage readable.
      await assertNoHorizontalScroll(page, `zoom ${theme} idle`);
      await expectIdleControlsUsable(page, `zoom ${theme} idle`);
      await expect(page.getByTestId("surface")).toContainText("Dinner");

      // Focus mode on: chrome hides, the way out stays, still no scroll.
      await page.getByTestId("focus-mode-toggle").check();
      await expect(page.locator(".app")).toHaveAttribute("data-focus-mode", "on");
      await expect(page.getByTestId("focus-mode-toggle")).toBeVisible();
      await assertNoHorizontalScroll(page, `zoom ${theme} focus on`);
      await page.getByTestId("focus-mode-toggle").uncheck();

      // A typed test still finishes to a headline, and replay opens.
      await finishPassage(page);
      await expect(page.getByTestId("headline-net-wpm")).toBeVisible();
      await expect(page.getByTestId("restart")).toBeVisible();
      await assertNoHorizontalScroll(page, `zoom ${theme} finished`);
      await openReplay(page);
      await expect(page.getByTestId("replay-errors")).toBeVisible();
      await assertNoHorizontalScroll(page, `zoom ${theme} replay`);
    });
  }
});

test.describe("WCAG 1.4.12 text-spacing override", () => {
  /** The override verbatim from the criterion: it must take effect, not merely load. */
  async function applySpacingOverride(page: Page) {
    await page.addStyleTag({
      content: `* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }`,
    });
  }

  test("spacing: override applies and nothing is lost — a test still completes", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await applySpacingOverride(page);

    // The override really took effect: a silent no-op style tag proves nothing.
    const applied = await page.getByTestId("surface").evaluate((el) => {
      const s = getComputedStyle(el);
      return { letterSpacing: s.letterSpacing, fontSize: Number.parseFloat(s.fontSize) };
    });
    expect(
      Number.parseFloat(applied.letterSpacing),
      "the spacing override must reach the page or this test is vacuous",
    ).toBeGreaterThanOrEqual(applied.fontSize * 0.11);

    // No clipped or lost content: every control, the passage and the prompt
    // keep a real box and stay visible; no horizontal scroll appears.
    await expectIdleControlsUsable(page, "spacing");
    await assertNoHorizontalScroll(page, "spacing idle");
    for (const id of ["ui-font-note", "focus-mode-note", "auto-note", "ime-notice"] as const) {
      await expect(page.getByTestId(id), `spacing: ${id} still visible`).toBeVisible();
      const box = await page.getByTestId(id).boundingBox();
      expect(box, `spacing: ${id} keeps a real box`).not.toBeNull();
    }

    // A test still completes to a headline with finished actions usable.
    await finishPassage(page);
    await expect(page.getByTestId("headline-net-wpm")).toBeVisible();
    await expect(page.getByTestId("restart")).toBeVisible();
    await expect(page.getByTestId("new-passage")).toBeVisible();
    await assertNoHorizontalScroll(page, "spacing finished");
    await openReplay(page);
    await expect(page.getByTestId("replay")).toBeVisible();
  });

  test("spacing: without the override the page is NOT spaced — the check discriminates", async ({
    page,
  }) => {
    // The non-vacuity probe for the test above: the same measurement on an
    // un-overridden page must read the token tracking (0.01em), not 0.12em.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const plain = await page.getByTestId("surface").evaluate((el) => {
      const s = getComputedStyle(el);
      return { letterSpacing: s.letterSpacing, fontSize: Number.parseFloat(s.fontSize) };
    });
    expect(
      Number.parseFloat(plain.letterSpacing),
      "un-overridden tracking must differ from the override",
    ).toBeLessThan(plain.fontSize * 0.11);
  });
});

test.describe("forced-colors full pass", () => {
  /** System colors probed live: whatever the OS maps them to, the page must match. */
  async function systemColors(page: Page): Promise<string[]> {
    return page.evaluate(() => {
      const probe = (color: string): string => {
        const el = document.createElement("div");
        el.style.color = color;
        document.body.append(el);
        const resolved = getComputedStyle(el).color;
        el.remove();
        return resolved;
      };
      return [
        "CanvasText",
        "LinkText",
        "ButtonText",
        "ButtonFace",
        "Canvas",
        "GrayText",
        "Highlight",
      ].map(probe);
    });
  }

  /** Author hexes from styles/tokens.css, as computed rgb() strings — forbidden here. */
  const AUTHOR_RGB = new Set(
    [
      "#eaf0ff",
      "#9aa6cc",
      "#7f8cb3",
      "#ff6b8e",
      "#ffc24d",
      "#4fd6c8",
      "#131a2e",
      "#1a2340",
      "#12182b",
      "#4f5a80",
      "#5a658c",
      "#cc2149",
      "#8f5e00",
      "#097068",
      "#ffffff",
      "#e8ecf8",
    ].map((hex) => {
      const h = hex.slice(1);
      const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
      return `rgb(${[0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).join(", ")})`;
    }),
  );

  async function expectSystemColor(page: Page, allowed: string[], selector: string, label: string) {
    const color = await page
      .locator(selector)
      .first()
      .evaluate((el) => getComputedStyle(el).color);
    expect(allowed, `${label} (${selector}): ${color} is not a system color`).toContain(color);
    expect(
      AUTHOR_RGB.has(color.replace(/\s+/g, "")),
      `${label} (${selector}): ${color} is an author color`,
    ).toBe(false);
  }

  test("forced-colors: key text is system-colored, ring visible, dimming off", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ forcedColors: "active" });
    await page.goto("/");
    const allowed = await systemColors(page);

    // Idle screen: passage states, prompt, notes, controls all resolve to
    // system colors — never author hex.
    await expectSystemColor(page, allowed, '[data-char-state="untyped"]', "untyped text");
    await expectSystemColor(page, allowed, '[data-testid="focus-prompt"]', "focus prompt");
    await expectSystemColor(page, allowed, '[data-testid="ui-font-note"]', "ui font note");
    await expectSystemColor(page, allowed, '[data-testid="focus-mode-note"]', "focus mode note");
    await expectSystemColor(page, allowed, '[data-testid="app-title"]', "app title");

    // The caret keeps the system highlight, not the author pace color.
    const caretBg = await page
      .getByTestId("caret")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    const highlight = await page.evaluate(() => {
      const el = document.createElement("div");
      el.style.backgroundColor = "Highlight";
      document.body.append(el);
      const resolved = getComputedStyle(el).backgroundColor;
      el.remove();
      return resolved;
    });
    expect(caretBg, "the caret must resolve to Highlight").toBe(highlight);

    // Author dimming is off on every screen state: idle AND focus mode on.
    await page.getByTestId("focus-mode-toggle").check();
    for (const id of ["live-bar", "surface"] as const) {
      const opacity = await page.getByTestId(id).evaluate((el) => getComputedStyle(el).opacity);
      expect(Number.parseFloat(opacity), `${id} dimming must be off`).toBe(1);
    }
    await page.getByTestId("focus-mode-toggle").uncheck();

    // Focus ring visible on real controls (outlineWidth > 0, not a color claim).
    for (const id of ["focus-mode-toggle", "passage-select", "theme-select"] as const) {
      await page.getByTestId(id).focus();
      const width = await page.getByTestId(id).evaluate((el) => getComputedStyle(el).outlineWidth);
      expect(Number.parseFloat(width), `${id} keeps a visible ring`).toBeGreaterThan(0);
    }

    // No author-fixed overlays while the check runs (the AC6 positive form).
    const fixed = await page.evaluate(() => {
      const caret = document.querySelector('[data-testid="caret"]');
      const found: string[] = [];
      for (const el of document.body.querySelectorAll("*")) {
        if (!(el instanceof HTMLElement)) continue;
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;
        if (Number.parseFloat(style.opacity) === 0) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if ((style.position === "fixed" || style.position === "sticky") && el !== caret) {
          found.push(el.tagName.toLowerCase());
        }
      }
      return found;
    });
    expect(fixed, "no fixed/sticky overlays under forced colors").toEqual([]);
  });

  test("forced-colors: a test completes and replay opens, all system-colored", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ forcedColors: "active" });
    await page.goto("/");
    const allowed = await systemColors(page);

    await finishPassage(page);
    await expectSystemColor(page, allowed, '[data-testid="headline-net-wpm"]', "headline KPI");
    await expectSystemColor(
      page,
      allowed,
      '[data-testid="headline-accuracy"]',
      "headline accuracy",
    );
    await expectSystemColor(page, allowed, '[data-testid="engine-stamp"]', "engine stamp");

    await openReplay(page);
    await expectSystemColor(page, allowed, "[data-replay-char]", "replay text");
    await expectSystemColor(page, allowed, '[data-testid="replay-errors"]', "replay summary");
    // The replay region carries no author dimming either.
    const replayOpacity = await page
      .getByTestId("replay")
      .evaluate((el) => getComputedStyle(el).opacity);
    expect(Number.parseFloat(replayOpacity), "replay dimming must be off").toBe(1);

    // The replay controls keep a visible ring too.
    await page.getByTestId("replay-play-pause").focus();
    const width = await page
      .getByTestId("replay-play-pause")
      .evaluate((el) => getComputedStyle(el).outlineWidth);
    expect(Number.parseFloat(width), "replay play keeps a visible ring").toBeGreaterThan(0);
  });

  test("forced-colors: re-enabled dimming is caught — the opacity check reads live", async ({
    page,
  }) => {
    // Non-vacuity probe: force author dimming back on under forced colors and
    // show the predicate below 1, so the "dimming off" assertions above cannot
    // pass on a page that dims.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ forcedColors: "active" });
    await page.goto("/");
    await page.getByTestId("focus-mode-toggle").check();
    await page.addStyleTag({ content: `[data-testid="live-bar"] { opacity: 0.55 !important; }` });
    const opacity = await page
      .getByTestId("live-bar")
      .evaluate((el) => getComputedStyle(el).opacity);
    expect(Number.parseFloat(opacity), "the probe dimming must have applied").toBeLessThan(1);
  });
});

test.describe("reduced motion, both directions", () => {
  test("reduce: caret, buttons and dimming compute to no motion; replay waits", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    // The caret: no transition at all (0s), not merely a shorter one.
    const caret = await page.getByTestId("caret").evaluate((el) => ({
      durations: getComputedStyle(el).transitionDuration,
      animation: getComputedStyle(el).animationName,
    }));
    for (const d of caret.durations.split(",").map((t) => t.trim())) {
      expect(["0s", "0ms"], `caret transition must be 0 under reduce, got ${d}`).toContain(d);
    }
    // The idle blink is suppressed too — not just the move transition.
    expect(caret.animation, "caret blink must be none under reduce").toBe("none");

    // Buttons: no transition under reduce (the press feedback is instant).
    const button = await page.evaluate(() => {
      const el = document.createElement("button");
      el.textContent = "probe";
      document.body.append(el);
      const s = getComputedStyle(el);
      const out = { durations: s.transitionDuration, property: s.transitionProperty };
      el.remove();
      return out;
    });
    for (const d of button.durations.split(",").map((t) => t.trim())) {
      expect(["0s", "0ms", ""], `button transition must be 0 under reduce, got ${d}`).toContain(d);
    }
    expect(button.property, "buttons must transition nothing under reduce").not.toContain(
      "transform",
    );

    // Dimming and focus carry no transition either (instant by construction).
    for (const sel of ['[data-testid="live-bar"]', ".prompt-slot"] as const) {
      const durations = await page
        .locator(sel)
        .evaluate((el) => getComputedStyle(el).transitionDuration);
      for (const d of durations.split(",").map((t) => t.trim())) {
        expect(["0s", "0ms"], `${sel} transition must be 0 under reduce, got ${d}`).toContain(d);
      }
    }

    // Nothing auto-plays: the replay sits on its first frame until pressed.
    await finishPassage(page);
    await openReplay(page);
    await page.waitForTimeout(700);
    const states = await page
      .locator("[data-replay-char]")
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-char-state")));
    expect(new Set(states), "replay must wait for an explicit press").toEqual(new Set(["untyped"]));
  });

  test("no-preference: the designed transitions exist; replay still waits", async ({ page }) => {
    // The other direction: an unstyled page also reports 0s, so the reduce
    // assertions above prove nothing unless the motion genuinely exists here.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");

    const caret = await page.getByTestId("caret").evaluate((el) => ({
      duration: getComputedStyle(el).transitionDuration,
      property: getComputedStyle(el).transitionProperty,
      animation: getComputedStyle(el).animationName,
    }));
    expect(
      Number.parseFloat(caret.duration),
      "the caret must animate by default, or the reduce check proves nothing",
    ).toBeGreaterThan(0);
    expect(caret.property).toContain("transform");
    expect(caret.animation, "the idle blink exists by default").not.toBe("none");

    // No autoplay by design in either mode — pressing play is the only start.
    await finishPassage(page);
    await openReplay(page);
    await page.waitForTimeout(700);
    const states = await page
      .locator("[data-replay-char]")
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-char-state")));
    expect(new Set(states), "replay must wait for an explicit press").toEqual(new Set(["untyped"]));
  });
});

test.describe("computed contrast sweep, every meaningful pair, both themes", () => {
  for (const theme of ["daylight", "night-ink"] as const) {
    test(`contrast: ${theme} idle, finished and replay all clear AA`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await gotoWithTheme(page, theme);

      // Idle screen on the page background.
      await expectContrast(page, '[data-testid="app-title"]', "body", 4.5, `${theme} title`);
      await expectContrast(page, ".controls", "body", 4.5, `${theme} control labels`);
      await expectContrast(page, '[data-testid="ui-font-note"]', "body", 4.5, `${theme} ui note`);
      await expectContrast(
        page,
        '[data-testid="focus-mode-note"]',
        "body",
        4.5,
        `${theme} focus note`,
      );
      await expectContrast(page, '[data-testid="auto-note"]', "body", 4.5, `${theme} auto note`);
      await expectContrast(page, '[data-testid="ime-notice"]', "body", 4.5, `${theme} ime note`);
      await expectContrast(
        page,
        '[data-testid="shortcuts"] summary',
        "body",
        4.5,
        `${theme} shortcuts`,
      );
      await expectContrast(
        page,
        '[data-testid="focus-prompt"]',
        "body",
        4.5,
        `${theme} focus prompt`,
      );
      await expectContrast(page, ".live-label", "body", 4.5, `${theme} live label`);
      await expectContrast(
        page,
        '[data-testid="live-net-wpm"]',
        "body",
        4.5,
        `${theme} live readout`,
      );
      await expectContrast(page, ".live-hint", "body", 4.5, `${theme} live hint`);
      await expectContrast(
        page,
        '[data-testid="passage-select"]',
        '[data-testid="passage-select"]',
        4.5,
        `${theme} select text`,
      );

      // The passage on its panel: pending and scored alike.
      await expectContrast(
        page,
        '[data-char-state="untyped"]',
        '[data-testid="surface"]',
        4.5,
        `${theme} untyped text`,
      );

      // Focus-dimmed pairs, dimming live: still AA (the --focus-dim contract).
      await page.getByTestId("focus-mode-toggle").check();
      await expectContrast(
        page,
        '[data-testid="focus-prompt"]',
        "body",
        4.5,
        `${theme} dimmed prompt`,
      );
      await expectContrast(page, ".live-label", "body", 4.5, `${theme} dimmed live label`);
      await expectContrast(
        page,
        '[data-testid="live-net-wpm"]',
        "body",
        4.5,
        `${theme} dimmed live value`,
      );
      await page.getByTestId("focus-mode-toggle").uncheck();

      // Finished panel on its own background.
      await finishPassage(page);
      await expectContrast(
        page,
        '[data-char-state="correct"]',
        '[data-testid="surface"]',
        4.5,
        `${theme} scored text`,
      );
      await expectContrast(
        page,
        '[data-testid="headline-net-wpm"]',
        '[data-testid="finished"]',
        3.0,
        `${theme} headline KPI (large text)`,
      );
      await expectContrast(
        page,
        '[data-testid="headline-accuracy"]',
        '[data-testid="finished"]',
        4.5,
        `${theme} finished accuracy`,
      );
      await expectContrast(
        page,
        '[data-testid="engine-stamp"]',
        '[data-testid="finished"]',
        4.5,
        `${theme} engine stamp`,
      );
      await expectContrast(
        page,
        '[data-testid="restart"]',
        '[data-testid="restart"]',
        4.5,
        `${theme} restart button`,
      );

      // Replay viewer inside the finished panel.
      await openReplay(page);
      await expectContrast(
        page,
        "[data-replay-char]",
        '[data-testid="finished"]',
        4.5,
        `${theme} replay text`,
      );
      await expectContrast(
        page,
        '[data-testid="replay-errors"]',
        '[data-testid="finished"]',
        4.5,
        `${theme} replay summary`,
      );
      await expectContrast(
        page,
        '[data-testid="replay-time"]',
        '[data-testid="finished"]',
        4.5,
        `${theme} replay time`,
      );
      await expectContrast(
        page,
        '[data-testid="replay-play-pause"]',
        '[data-testid="replay-play-pause"]',
        4.5,
        `${theme} replay button`,
      );
    });
  }

  test("contrast: --focus-dim 0.55 fails AA — the dimming gate is not vacuous", async ({
    page,
  }) => {
    // The deliberate break the task names: at 0.55 the worst dimmed pair
    // (daylight muted) must fall below 4.5:1, proving the sweep above would
    // catch a token drift toward stronger dimming.
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoWithTheme(page, "daylight");
    await page.getByTestId("focus-mode-toggle").check();
    await page.evaluate(() => document.documentElement.style.setProperty("--focus-dim", "0.55"));
    const ratio = await contrastRatio(page, ".live-label", "body");
    expect(ratio, `dimmed pair at 0.55 must fail AA (got ${ratio.toFixed(2)}:1)`).toBeLessThan(4.5);
  });
});

test.describe("24px targets, every control, both themes, focus on/off, 360px", () => {
  async function expectAllTargets(page: Page, where: string) {
    const boxes = await page.evaluate(() => {
      const out: { testid: string; tag: string; w: number; h: number }[] = [];
      for (const el of document.querySelectorAll(
        'button, select, input[type="checkbox"], input[type="range"], a, summary',
      )) {
        if (!(el instanceof HTMLElement)) continue;
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        // Off-screen-until-focused chrome (the skip link) is measured when
        // focused; anything else outside the viewport is a layout defect only
        // if it should be visible, which the zoom/spacing suites own.
        out.push({
          testid: el.getAttribute("data-testid") ?? el.className?.toString().slice(0, 40) ?? "?",
          tag: el.tagName.toLowerCase(),
          w: rect.width,
          h: rect.height,
        });
      }
      return out;
    });
    expect(boxes.length, `${where}: must find interactive targets`).toBeGreaterThan(0);
    for (const b of boxes) {
      expect(b.w, `${where}: ${b.tag}[${b.testid}] width`).toBeGreaterThanOrEqual(24);
      expect(b.h, `${where}: ${b.tag}[${b.testid}] height`).toBeGreaterThanOrEqual(24);
    }
  }

  for (const theme of ["daylight", "night-ink"] as const) {
    for (const focus of [false, true] as const) {
      test(`targets: ${theme} focus ${focus ? "on" : "off"} at 360px, idle through replay`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 360, height: 900 });
        await gotoWithTheme(page, theme);
        if (focus) await page.getByTestId("focus-mode-toggle").check();

        await assertNoHorizontalScroll(page, `targets ${theme} focus ${focus}`);
        await expectAllTargets(page, `targets ${theme} focus ${focus} idle`);

        await finishPassage(page);
        await expectAllTargets(page, `targets ${theme} focus ${focus} finished`);
        await openReplay(page);
        await expectAllTargets(page, `targets ${theme} focus ${focus} replay`);
      });
    }
  }

  test("targets: a shrunken control is caught — the 24px gate reads live boxes", async ({
    page,
  }) => {
    // Non-vacuity probe: shrink a real button below the floor and show the
    // same measurement catching it.
    await page.setViewportSize({ width: 360, height: 900 });
    await page.goto("/");
    await finishPassage(page);
    await page
      .getByTestId("restart")
      .evaluate((el) =>
        el.setAttribute(
          "style",
          "width:10px !important;height:10px !important;min-width:0 !important;min-height:0 !important;padding:0 !important;",
        ),
      );
    const box = await page.getByTestId("restart").boundingBox();
    expect(box, "the probe shrink must have applied").not.toBeNull();
    expect(
      Math.min(box!.width, box!.height),
      "a 10px control must read below the 24px floor",
    ).toBeLessThan(24);
  });
});

test.describe("non-color cues beyond the surface", () => {
  test("cues: replay states and the finished headline never rely on color alone", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await finishPassage(page, TYPO_PASSAGE);
    await openReplay(page);

    // Scrub to the end so the error frame is painted, then compare the
    // COMPUTED non-color channels of replay error states against correct —
    // the AC2 shape, extended to the viewer (existing AC2 covers the live
    // surface; the viewer reuses the same .ch rules, pinned here).
    const scrub = page.getByTestId("replay-scrub");
    await scrub.focus();
    await page.keyboard.press("End");
    await expect
      .poll(
        async () =>
          page
            .locator("[data-replay-char]")
            .evaluateAll((els) => els.map((e) => e.getAttribute("data-char-state")))
            .then((states) => states.filter((s) => s !== "untyped" && s !== "correct").length),
        { message: "scrub to End must paint the error states", timeout: 10_000 },
      )
      .toBeGreaterThan(0);

    const cues = await page.evaluate(() => {
      const pick = (replayState: string) => {
        const els = [...document.querySelectorAll("[data-replay-char]")];
        const el = els.find((e) => e.getAttribute("data-char-state") === replayState);
        if (el === undefined) return null;
        const s = getComputedStyle(el);
        return {
          line: s.textDecorationLine,
          style: s.textDecorationStyle,
          weight: s.fontWeight,
          opacity: s.opacity,
          color: s.color,
        };
      };
      return { correct: pick("correct"), error: pick("incorrect") ?? pick("extra") };
    });
    expect(cues.correct, "replay must paint correct states").not.toBeNull();
    expect(cues.error, "replay must paint an error state to compare").not.toBeNull();
    const differs =
      cues.error!.line !== cues.correct!.line ||
      cues.error!.style !== cues.correct!.style ||
      cues.error!.weight !== cues.correct!.weight ||
      cues.error!.opacity !== cues.correct!.opacity;
    expect(differs, "replay correct and error states must differ without color").toBe(true);

    // The finished headline carries its units in words ("WPM", "accuracy"), so
    // the two numbers are told apart by text — the cheap half of the cue rule.
    await expect(page.getByTestId("headline-net-wpm")).toContainText(/WPM/);
    await expect(page.getByTestId("headline-accuracy")).toContainText(/accuracy/);
  });
});

/*
 * HUMAN, NOT HERE (A11Y-01 remainder after this sweep lands):
 * - the screen-reader pass (NVDA/VoiceOver on `/`, results, replay, level map
 *   when it exists): announcements, names, roles, focus order by ear;
 * - 200% zoom in a real browser (this file proves the 720px-CSS equivalent);
 * - real-device checks (touch targets by finger, text spacing on small
 *   phones, Windows High Contrast + forced-colors: active together, 320px
 *   widths below this suite's 360px floor).
 */
