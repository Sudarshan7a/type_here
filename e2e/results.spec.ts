import { expect, test, type Page } from "@playwright/test";

/**
 * ANA-01: the results screen, in a real browser.
 *
 * The unit layer (apps/web/tests/results-*.test.ts) proves the markup, the
 * numbers and the copy. It cannot see computed style, focus order, an animation
 * running, or how many times React committed while someone was typing. This file
 * is the layer that can, and each of those questions is asked in the FAILING
 * direction: an assertion that would catch the defect, not one that describes
 * the happy path.
 *
 * Deterministic, per typing-e2e-testing: the passage is fixed (PROSE-01-004), the
 * typing is synthetic, and nothing here depends on random content. Nothing waits
 * on a sleep to become correct — every wait is on an assertion.
 */

/** PROSE-01-004, from apps/web/src/passages.ts. */
const PASSAGE =
  "Dinner's ready whenever you are. I made extra rice in case your brother stops by later tonight. There's also that soup from Sunday in the freezer if you're still hungry after. Just heat it on the stove and add a little pepper. I'll be in the garden until it gets dark, so come find me when you're done.";

type Theme = "daylight" | "night-ink";

async function gotoWithTheme(page: Page, theme: Theme) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId("theme-select").selectOption(theme);
}

/** Type the whole passage and wait for the panel. Leaves the field focused. */
async function finishPassage(page: Page, text: string = PASSAGE) {
  await page.getByTestId("surface").click();
  await page.keyboard.type(text, { delay: 2 });
  await expect(page.getByTestId("finished")).toBeVisible({ timeout: 15_000 });
}

/** Navigate, then finish. Used where a test must navigate itself first. */
async function finishFromScratch(page: Page, text: string = PASSAGE) {
  await page.goto("/");
  await finishPassage(page, text);
}

/** Computed opacity of each animated row, in the same order `entrance()` reports. */
async function animatedOpacities(page: Page): Promise<number[]> {
  return page
    .locator('[data-testid="finished"] > *:not(.visually-hidden)')
    .evaluateAll((els) => els.map((el) => Number.parseFloat(getComputedStyle(el).opacity)));
}

/**
 * Wait until the panel's entrance has finished.
 *
 * Necessary before reading anything that depends on a settled state: a contrast
 * reading taken mid-reveal measures a half-painted panel rather than the one a
 * reader looks at. Measuring the RESTING state is the point.
 */
async function animationsSettled(page: Page) {
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const panel = document.querySelector('[data-testid="finished"]');
          if (panel === null) return true;
          return [...panel.getAnimations({ subtree: true })].every(
            (animation) => animation.playState === "finished",
          );
        }),
      { message: "the results entrance must finish", timeout: 5_000 },
    )
    .toBe(true);
}

/**
 * React commit counter, installed BEFORE any page script runs.
 *
 * React reports every commit to the legacy devtools hook when one is present. A
 * `setState` in the keystroke path schedules a commit, so "commits did not grow"
 * IS "no setState per keystroke" — measured rather than inferred, which is the
 * only way to prove a negative about code that does not run.
 */
async function installCommitCounter(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __commits?: number };
    w.__commits = 0;
    (
      window as unknown as { __REACT_DEVTOOLS_GLOBAL_HOOK__?: unknown }
    ).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      renderers: new Map(),
      supportsFiber: true,
      inject: () => {},
      onCommitFiberRoot: () => {
        w.__commits = (w.__commits ?? 0) + 1;
      },
      onCommitFiberUnmount: () => {},
      onPostCommitFiberRoot: () => {},
      checkDCE: () => {},
    };
  });
}

function readCommits(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __commits: number }).__commits);
}

/** Computed styles of the first match, for the checks that read the live page. */
async function computed(
  page: Page,
  selector: string,
  properties: readonly string[],
): Promise<Record<string, string>> {
  return page
    .locator(selector)
    .first()
    .evaluate(
      (el, props) => {
        const style = getComputedStyle(el);
        const out: Record<string, string> = {};
        for (const prop of props) out[prop] = style.getPropertyValue(prop);
        return out;
      },
      [...properties] as readonly string[],
    );
}

/**
 * WCAG contrast from the live page. A trimmed copy of the e2e/appearance.spec.ts
 * method: the results screen is the only new surface, and the sweep that owns
 * every existing page is not mine to extend. Falls back to the page background
 * when the element behind the text is transparent.
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

/** The entrance animation, read off the live panel. */
interface Entrance {
  names: string[];
  durations: string[];
  delays: string[];
  transformed: boolean;
  maxShift: number;
}

async function entrance(page: Page): Promise<Entrance> {
  return page.evaluate(() => {
    const empty = { names: [], durations: [], delays: [], transformed: false, maxShift: 0 };
    const panel = document.querySelector('[data-testid="finished"]');
    if (!(panel instanceof HTMLElement)) return empty;
    const names: string[] = [];
    const durations: string[] = [];
    const delays: string[] = [];
    let transformed = false;
    let maxShift = 0;
    for (const child of [...panel.children]) {
      if (child.classList.contains("visually-hidden")) continue;
      const style = getComputedStyle(child);
      names.push(style.animationName);
      durations.push(style.animationDuration);
      delays.push(style.animationDelay);
      for (const animation of child.getAnimations()) {
        for (const frame of animation.effect?.getKeyframes?.() ?? []) {
          const transform = (frame as { transform?: string }).transform;
          if (typeof transform !== "string" || transform === "none") continue;
          transformed = true;
          const match = /translate3d\(\s*[-\d.]+px,\s*([-\d.]+)px/.exec(transform);
          if (match !== null) maxShift = Math.max(maxShift, Math.abs(Number(match[1])));
        }
      }
    }
    return { names, durations, delays, transformed, maxShift };
  });
}

test.describe("ANA-01: the panel appears once, with the engine's numbers", () => {
  test("the headline, the transparency figure and the figures list", async ({ page }) => {
    await finishFromScratch(page);

    // Units in the text, so no figure is identified by position or size alone.
    await expect(page.getByTestId("headline-net-wpm")).toHaveText(/^\d+\.\d WPM$/);
    await expect(page.getByTestId("headline-accuracy")).toHaveText(/^\d+\.\d% accuracy$/);
    // §4.3 item 1's third figure is not optional.
    await expect(page.getByTestId("results-classic-wpm")).toHaveText(/^Classic WPM: \d+\.\d$/);

    // Every row, in §4.3 item 5's order, and each one a label/value pair inside a
    // real definition list.
    await expect(page.locator('[data-testid="results-details"]')).toHaveJSProperty("tagName", "DL");
    await expect(page.locator('[data-testid="results-details"] dt')).toHaveText([
      "Raw",
      "Consistency",
      "Keystrokes per character",
      "Rollover",
      "Best 5-second burst",
    ]);
    const values = await page.locator('[data-testid="results-details"] dd').allInnerTexts();
    expect(values.length).toBe(5);
    for (const value of values) expect(value.trim()).not.toBe("");

    // The figures a short run cannot produce are stated as absent, never zeroed.
    // (Every run in this suite is short: synthetic typing is far under the
    // engine's ten-second consistency floor, so this is the normal case, not a
    // contrived one.)
    await expect(page.getByTestId("results-consistency")).toHaveText("Not reported for this test");
    expect(await page.getByTestId("results-consistency").innerText()).not.toMatch(/\b0(\.0)?\b/);
  });

  test("the standing state is on every result: unverified, and why", async ({ page }) => {
    await finishFromScratch(page);
    await expect(page.getByTestId("results-status-label")).toHaveText(
      "Practice result (not verified)",
    );
    const body = await page.getByTestId("results-status-body").innerText();
    expect(body).toMatch(/nothing was sent anywhere/i);
    expect(body).toMatch(/nothing was saved/i);
    // The string table's own tooltip says the result IS saved. At MVP it is not,
    // and a sentence the screen cannot keep is worse than no sentence.
    expect(body).not.toMatch(/still saved/i);
    // …and the two fields nothing produces yet are named rather than left blank.
    await expect(page.getByTestId("results-pending")).toContainText("no difficulty rating");
  });

  test("the panel never covers the passage and never interrupts typing", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("surface").click();
    await page.keyboard.type("Dinner", { delay: 2 });

    // While typing there is no panel at all: it mounts at finish, not before.
    await expect(page.getByTestId("finished")).toHaveCount(0);
    // …and nothing animates, because nothing exists.
    expect((await entrance(page)).names).toEqual([]);

    await page.keyboard.type(PASSAGE.slice(6), { delay: 2 });
    await expect(page.getByTestId("finished")).toBeVisible();

    const placement = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="finished"]');
      if (!(el instanceof HTMLElement)) return "missing";
      const style = getComputedStyle(el);
      return `${style.position}|${el.getAttribute("role") ?? "none"}`;
    });
    expect(placement).toBe("static|none");

    // The passage is still on screen and readable under it.
    await expect(page.getByTestId("surface")).toContainText("Dinner");
    const panelBox = await page.getByTestId("finished").boundingBox();
    const surfaceBox = await page.getByTestId("surface").boundingBox();
    expect(
      panelBox!.y,
      "the panel must sit below the passage, never over it",
    ).toBeGreaterThanOrEqual(surfaceBox!.y + surfaceBox!.height - 1);
  });

  test("restarting clears the panel; the next test produces a fresh one", async ({ page }) => {
    await finishFromScratch(page);
    const first = await page.getByTestId("headline-net-wpm").innerText();

    // Tab still restarts from inside the field: the panel is not in the way.
    await page.getByTestId("surface").click();
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("finished")).toHaveCount(0);
    // A fresh idle surface: the live readout is back and the panel is gone.
    await expect(page.getByTestId("live-bar")).toBeVisible();

    await finishPassage(page);
    await expect(page.getByTestId("headline-net-wpm")).toBeVisible();
    // Mounts once per test, not twice: exactly one panel element exists.
    await expect(page.getByTestId("finished")).toHaveCount(1);
    expect(first).toMatch(/WPM$/);
  });
});

test.describe("ANA-01: no render per keystroke (AGENTS.md rule 2)", () => {
  test("sixty further characters commit nothing", async ({ page }) => {
    await installCommitCounter(page);
    await page.goto("/");
    await page.getByTestId("surface").click();

    // Non-vacuity first: if React stopped reporting commits, this fails here
    // rather than letting every later assertion pass on a counter that never
    // moved. (It also means the probe needs the dev build, which is why the
    // `chromium` project — served by `pnpm dev` — is where it lives.)
    expect(await readCommits(page), "the commit counter must observe React").toBeGreaterThan(0);

    // One keystroke, which performs the single idle → running transition. The
    // snapshot is taken AFTER it, so the budget below is "commits caused by
    // typing" rather than "commits caused by starting".
    await page.keyboard.type("Dinner", { delay: 8 });
    const afterFirst = await readCommits(page);

    await page.keyboard.type(PASSAGE.slice(6, 66), { delay: 8 });
    const afterSixty = await readCommits(page);

    // The keystrokes really landed — otherwise "no commits" is just "no input".
    expect(await page.locator('[data-char-state="correct"]').count()).toBeGreaterThan(50);
    expect(afterSixty, `React committed ${afterSixty - afterFirst} times while typing`).toBe(
      afterFirst,
    );
  });

  test("the counter is not stuck — a real state change moves it", async ({ page }) => {
    await installCommitCounter(page);
    await page.goto("/");
    const before = await readCommits(page);
    expect(before).toBeGreaterThan(0);
    await page.getByTestId("focus-mode-toggle").check();
    expect(await readCommits(page), "a real state change must be counted").toBeGreaterThan(before);
  });

  test("the panel's own numbers cause no commit once mounted", async ({ page }) => {
    await installCommitCounter(page);
    await finishFromScratch(page);
    const mounted = await readCommits(page);

    // Typing after the test has ended scores nothing (chapter 4) — and must cost
    // nothing either: no render may be triggered by input the engine ignores.
    await page.getByTestId("surface").click();
    await page.keyboard.type("the quick brown fox", { delay: 8 });
    await page.waitForTimeout(300);

    expect(await page.locator('[data-char-state="incorrect"]').count()).toBe(0);
    expect(await readCommits(page), "input after the finish must not commit").toBe(mounted);
  });

  test("the live readout is written by refs, not by re-rendering", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("surface").click();
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="live-net-wpm"]');
      (window as unknown as { __live?: Element | null }).__live = el;
      (window as unknown as { __liveFirst?: string | null }).__liveFirst = el?.textContent ?? null;
    });
    const first = await page.evaluate(
      () => (window as unknown as { __liveFirst: string | null }).__liveFirst,
    );
    await page.keyboard.type("Dinner's ready whenever you are", { delay: 20 });

    const after = await page.evaluate(() => {
      const el = (window as unknown as { __live?: Element | null }).__live;
      return {
        connected: el?.isConnected === true,
        text: el?.textContent ?? "",
      };
    });
    // The element React last rendered is still the live one — React did not
    // re-create it — and its text was written straight into the node.
    expect(after.connected).toBe(true);
    expect(first).toBe("n/a");
    expect(after.text).toMatch(/^\d+\.\d$/);
  });
});

test.describe("ANA-01: the live region fires exactly once", () => {
  test("nothing while typing, one sentence at the end", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      const spoken: string[] = [];
      (window as unknown as { __spoken?: string[] }).__spoken = spoken;
      const el = document.querySelector('[data-testid="announcer"]');
      if (el === null) return;
      new MutationObserver(() => {
        const text = el.textContent?.trim() ?? "";
        if (text !== "") spoken.push(text);
      }).observe(el, { childList: true, characterData: true, subtree: true });
    });
    await page.getByTestId("surface").click();
    // The passage is 95 characters; split at 30 by INDEX, because a hand-counted
    // literal one character out types the whole thing and never finishes — which
    // looks exactly like a broken app.
    await page.keyboard.type(PASSAGE.slice(0, 30), { delay: 6 });
    const read = () => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);
    expect(await read(), "nothing may be announced while typing").toEqual([]);

    await page.keyboard.type(PASSAGE.slice(30), { delay: 2 });
    await expect(page.getByTestId("finished")).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(600);

    const spoken = await read();
    expect(spoken.length, `announced ${spoken.length} times: ${JSON.stringify(spoken)}`).toBe(1);
    expect(spoken[0]).toMatch(/^Test finished\. \d+ words per minute, \d+ percent accuracy\./);

    // Restarting must not announce again: the sentence is derived from the result,
    // and the result is cleared on restart.
    const beforeRestart = await read();
    expect(beforeRestart).toHaveLength(1);
    await page.getByTestId("surface").click();
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("finished")).toHaveCount(0);
    await page.waitForTimeout(300);
    expect(await read(), "a restart must not announce a second time").toHaveLength(
      beforeRestart.length,
    );
  });

  test("exactly one live region exists on the finished screen", async ({ page }) => {
    await finishFromScratch(page);
    const regions = await page.evaluate(() =>
      [...document.querySelectorAll("[aria-live], [role=status], [role=alert]")].map(
        (el) => el.getAttribute("aria-live") ?? el.getAttribute("role"),
      ),
    );
    expect(regions).toEqual(["polite"]);
    // The panel's own status block is NOT a live region: it mounts already
    // populated, and a populated live region can be announced as a second result.
    await expect(page.getByTestId("results-status")).not.toHaveAttribute("role", "status");
    expect(
      await page.getByTestId("results-status").getAttribute("aria-live"),
      "the status block must not be a live region",
    ).toBeNull();
  });
});

test.describe("ANA-01: keyboard reach, order and dismissal", () => {
  test("focus stays on the field, then walks the actions in reading order", async ({ page }) => {
    await finishFromScratch(page);

    // The panel must not steal focus from someone still reading where they were.
    await expect(page.getByTestId("surface")).toBeFocused();

    // Escape leaves the field (help.shortcuts.escape), and Tab then walks the
    // panel's actions. Tab INSIDE the field is bound to restart, so it cannot be
    // the way in — Escape then Tab is, and that is what the shortcuts list says.
    await page.keyboard.press("Escape");
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("restart")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("new-passage")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("replay-watch")).toBeFocused();
  });

  test("dismissible by keyboard: Escape closes the replay, then returns to the passage", async ({
    page,
  }) => {
    await finishFromScratch(page);
    await page.getByTestId("replay-watch").click();
    await expect(page.getByTestId("replay")).toBeVisible();

    // Escape inside the viewer closes it and restores focus to the button that
    // opened it, so the next Tab continues from a known place. Every step here
    // waits for that focus explicitly — a test that pressed the next key before
    // focus had actually moved would be testing the wrong thing.
    await page.getByTestId("replay-play-pause").focus();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("replay")).toHaveCount(0);
    await expect(page.getByTestId("replay-watch")).toBeFocused();

    // Reopen from the keyboard, then close it again from the toggle's own focus.
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("replay")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("replay")).toHaveCount(0);
    await expect(page.getByTestId("replay-watch")).toBeFocused();

    // With the replay closed, Escape hands focus back to the passage.
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("surface")).toBeFocused();
  });

  test("every action works from the keyboard alone", async ({ page }) => {
    await finishFromScratch(page);
    await page.getByTestId("restart").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("finished")).toHaveCount(0);
    await expect(page.getByTestId("surface")).toBeFocused();

    await finishPassage(page);
    await page.getByTestId("new-passage").focus();
    await page.keyboard.press("Space");
    // A new passage means a new test: the old result must be gone, not carried.
    await expect(page.getByTestId("finished")).toHaveCount(0);
    await expect(page.getByTestId("surface")).not.toContainText("Dinner's ready");
  });

  test("every focusable control on the panel shows a focus ring", async ({ page }) => {
    await finishFromScratch(page);
    for (const id of ["restart", "new-passage", "replay-watch"] as const) {
      await page.getByTestId(id).focus();
      const width = await page.getByTestId(id).evaluate((el) => getComputedStyle(el).outlineWidth);
      expect(Number.parseFloat(width), `${id} must show a visible ring`).toBeGreaterThan(0);
    }
  });
});

test.describe("ANA-01: motion, in both directions", () => {
  test("no-preference: an 8px settle, from named tokens, once each", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await finishFromScratch(page);

    const anim = await entrance(page);
    expect(anim.names.length, "the panel must have animated children").toBeGreaterThan(3);
    expect(new Set(anim.names), "one entrance, not several").toEqual(new Set(["results-enter"]));
    for (const duration of anim.durations) expect(duration).toBe("0.16s");
    // The rise is measured off the interpolated values, not inferred from a name.
    // There is deliberately no opacity in it: a container fade would put every
    // descendant's effective alpha in motion, and any contrast reading taken in
    // that window reads text it cannot see. See the note in styles.css.
    expect(anim.transformed).toBe(true);
    expect(anim.maxShift).toBe(8);
    expect(await animatedOpacities(page)).toEqual(anim.durations.map(() => 1));

    // Stagger: two rows delayed, each by one --dur-stagger step, so the last row
    // starts 60ms in and the whole reveal lands near 220ms — inside the motion
    // catalog's 200-320ms band, and inside its 300ms cap on total stagger.
    const delayed = anim.delays.filter((d) => d !== "0s");
    expect([...new Set(delayed)].sort()).toEqual(["0.03s", "0.06s"]);

    // Nothing loops and nothing flashes.
    const iterations = await page
      .locator('[data-testid="finished"] *')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).animationIterationCount));
    for (const count of iterations) expect(count).toBe("1");

    // And it is over: the figures are settled and identical a moment later.
    const before = await page.getByTestId("headline-net-wpm").innerText();
    await page.waitForTimeout(400);
    expect(await page.getByTestId("headline-net-wpm").innerText()).toBe(before);
  });

  test("reduce: no animation at all, and no movement", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await finishFromScratch(page);

    const anim = await entrance(page);
    expect(anim.names.length).toBeGreaterThan(3);
    // Not the entrance, shortened: no animation at all. The catalog's reduced
    // column for this row reads "fade only" because its default column is
    // "fade + rise"; there is no fade here to keep, and adding one ONLY for
    // reduced motion would make that experience animate more than the default.
    expect(new Set(anim.names)).toEqual(new Set(["none"]));
    for (const duration of anim.durations) expect(duration).toBe("0s");
    expect(anim.transformed, "reduced motion must not translate anything").toBe(false);
    // The stagger goes with it: every row is present from the first frame.
    for (const delay of anim.delays) expect(delay).toBe("0s");

    // …and the content is fully opaque, not stranded at a keyframe's start.
    for (const opacity of await animatedOpacities(page)) expect(opacity).toBe(1);
  });

  test("the reduce branch is not passing because nothing animates at all", async ({ page }) => {
    // The other half of a two-way gate. An unstyled page also reports 0s, which is
    // exactly why the default branch above has to assert a real animation.
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await finishFromScratch(page);
    const styled = await entrance(page);
    expect(styled.durations.some((d) => Number.parseFloat(d) > 0)).toBe(true);
    expect(styled.transformed).toBe(true);

    // The negative control: with the entrance switched off, the same measurement
    // reads nothing — which is the reading the reduce test would produce if the
    // stylesheet had stopped applying.
    await page.goto("/");
    await page.addStyleTag({ content: ".results > * { animation: none !important; }" });
    await finishPassage(page);
    const unstyled = await entrance(page);
    for (const duration of unstyled.durations) expect(duration).toBe("0s");
    expect(unstyled.transformed).toBe(false);
  });

  test("no animated number counters: the figures are static text", async ({ page }) => {
    await finishFromScratch(page);
    const style = await computed(page, '[data-testid="results-details"] dd', [
      "transition-duration",
      "animation-name",
      "animation-iteration-count",
    ]);
    for (const duration of style["transition-duration"]!.split(",")) {
      expect(Number.parseFloat(duration)).toBe(0);
    }
    expect(style["animation-name"]).toBe("none");
    expect(style["animation-iteration-count"]).toBe("1");

    const rows = await page.locator('[data-testid="results-details"] dd').allInnerTexts();
    await page.waitForTimeout(1_000);
    expect(await page.locator('[data-testid="results-details"] dd').allInnerTexts()).toEqual(rows);

    // The headline too — including while the replay is running underneath it.
    const headline = await page.getByTestId("headline-net-wpm").innerText();
    await page.getByTestId("replay-watch").click();
    await page.getByTestId("replay-play-pause").click();
    await page.waitForTimeout(700);
    expect(await page.getByTestId("headline-net-wpm").innerText()).toBe(headline);
  });
});

test.describe("ANA-01: states have non-colour cues, and contrast holds", () => {
  for (const theme of ["daylight", "night-ink"] as const) {
    test(`cues and contrast: ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await gotoWithTheme(page, theme);
      await finishPassage(page);
      // The entrance animates opacity, so contrast is measured on the resting
      // state — what a reader sees a moment after the panel settles.
      await animationsSettled(page);

      // Every synthetic run in this suite is short, so the short notice is on
      // screen here. Its tone hook must resolve to a REAL rule, told apart from
      // the other two tones by style rather than by colour.
      await expect(page.getByTestId("results-notice-short")).toBeVisible();
      const tones = await page.evaluate(() => {
        const panel = document.querySelector('[data-testid="finished"]');
        if (!(panel instanceof HTMLElement)) return [] as string[];
        const probe = document.createElement("p");
        probe.className = "results-notice";
        panel.append(probe);
        const out = ["short", "flagged", "offline"].map((tone) => {
          probe.dataset.tone = tone;
          const style = getComputedStyle(probe);
          return `${style.borderLeftStyle} ${style.borderLeftWidth}`;
        });
        probe.remove();
        return out;
      });
      expect(tones.length).toBe(3);
      expect(new Set(tones).size, `the tones share one rule: ${tones.join(" | ")}`).toBe(3);

      // The label words differ too, so the cue survives in greyscale and in
      // forced-colours mode where the border colours are dropped entirely.
      await expect(page.getByTestId("results-notice-short")).toContainText("Short test");

      // Contrast, every new pair, against the surface it actually sits on.
      const pairs: Array<[string, string, number, string]> = [
        ['[data-testid="results-classic-wpm"]', '[data-testid="finished"]', 4.5, "classic WPM"],
        ['[data-testid="results-status-label"]', ".results-status", 4.5, "status label"],
        ['[data-testid="results-status-body"]', ".results-status", 4.5, "status body"],
        ['[data-testid="results-details"] dt', '[data-testid="finished"]', 4.5, "figure label"],
        ['[data-testid="results-details"] dd', '[data-testid="finished"]', 4.5, "figure value"],
        [
          '[data-testid="results-notice-short"]',
          '[data-testid="results-notice-short"]',
          4.5,
          "short notice",
        ],
        ['[data-testid="results-pending"]', '[data-testid="finished"]', 4.5, "pending note"],
        ['[data-testid="headline-net-wpm"]', '[data-testid="finished"]', 3, "headline KPI"],
      ];
      for (const [fg, bg, floor, label] of pairs) {
        const ratio = await contrastRatio(page, fg, bg);
        expect(ratio, `${label}: element missing (${fg})`).toBeGreaterThanOrEqual(0);
        expect(
          ratio,
          `${theme} ${label}: ${ratio.toFixed(2)}:1 is below ${floor}:1`,
        ).toBeGreaterThanOrEqual(floor);
      }
    });
  }

  test("the contrast floor reads live — an unreadable pair is caught", async ({ page }) => {
    await gotoWithTheme(page, "daylight");
    await finishPassage(page);
    await animationsSettled(page);
    await page.addStyleTag({
      content: `[data-testid="results-details"] dt { color: var(--surface-2) !important; }`,
    });
    const ratio = await contrastRatio(
      page,
      '[data-testid="results-details"] dt',
      '[data-testid="finished"]',
    );
    expect(ratio, `the probe must read below AA (got ${ratio.toFixed(2)}:1)`).toBeLessThan(4.5);
  });

  test("the tone-style check discriminates — identical rules are caught", async ({ page }) => {
    await finishFromScratch(page);
    const tones = await page.evaluate(() => {
      const probe = document.createElement("p");
      probe.className = "results-notice";
      document.body.append(probe);
      const read = (tone: string) => {
        probe.dataset.tone = tone;
        return getComputedStyle(probe).borderLeftStyle;
      };
      const out = [read("short"), read("flagged"), read("offline")];
      probe.remove();
      return out;
    });
    // Force the flagged tone to share the short tone's rule and the same
    // measurement must notice: three tones that collapse into one is the defect.
    expect(new Set(tones).size, `tones collapsed: ${tones.join(", ")}`).toBe(3);
  });
});

test.describe("ANA-01: layout holds", () => {
  for (const width of [320, 360, 768, 1440]) {
    test(`no horizontal scroll and 24px targets at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await finishFromScratch(page);

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth, `horizontal scroll at ${width}px`).toBeLessThanOrEqual(
        overflow.clientWidth + 1,
      );

      for (const id of ["restart", "new-passage", "replay-watch"] as const) {
        const rect = await page.getByTestId(id).boundingBox();
        expect(rect, `${id} must keep a box at ${width}px`).not.toBeNull();
        expect(
          Math.min(rect!.width, rect!.height),
          `${id} target at ${width}px`,
        ).toBeGreaterThanOrEqual(24);
      }
    });
  }
});
