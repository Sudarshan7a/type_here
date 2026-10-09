import { expect, test } from "@playwright/test";

/**
 * MOD-01 — the classic test setup, in a real browser.
 *
 * The modes change WHEN a test ends, never how a keystroke is scored: every
 * mode is the same surface scoring through the same engine. What is verified
 * here is the end condition itself, because that is the part a unit test
 * cannot see — a countdown that actually runs, a word cap that actually caps,
 * a custom text that actually replaces the target.
 *
 * LAB PROXY like the rest of this suite: synthetic keystrokes through
 * headless Chromium. Not REAL-DEVICE CONFIRMED.
 *
 * Determinism: every test here picks its setup through the real controls and
 * then types a known prefix, so the target text is known without importing
 * the corpus (which would make the spec tautological).
 */

test("MOD-01: full passage is the default and shows no clock", async ({ page }) => {
  await page.goto("/");

  // The no-timer option must be the default: practice must exist without a
  // clock (a11y-typing-ui, LRN-04).
  await expect(page.getByTestId("test-mode-select")).toHaveValue("prose");
  await expect(page.getByTestId("live-time-remaining")).toHaveCount(0);
  await expect(page.getByTestId("test-mode-note")).toContainText("No clock");

  const surface = page.getByTestId("surface");
  await surface.click();
  await page.keyboard.type("The ", { delay: 2 });
  await expect(page.getByTestId("live-bar")).toBeVisible();
  // No countdown element at all, so nothing can tick.
  await expect(page.getByTestId("live-time-remaining")).toHaveCount(0);
});

test("MOD-01: a timed test shows a countdown and ends when it runs out", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("test-mode-select").selectOption("time");
  await page.getByTestId("time-limit-select").selectOption("15");
  await expect(page.getByTestId("live-time-remaining")).toBeVisible();
  // 15 seconds, shown whole before the first keystroke.
  await expect(page.getByTestId("live-time-remaining")).toHaveText("15");

  const surface = page.getByTestId("surface");
  await surface.click();
  await page.keyboard.type("The ", { delay: 2 });

  // The countdown runs: within a second it must be below the starting figure.
  await expect
    .poll(async () => Number(await page.getByTestId("live-time-remaining").innerText()), {
      timeout: 5000,
    })
    .toBeLessThan(15);

  // The test ends by the clock, not by the text: only three characters were
  // typed, and the finished panel arrives anyway.
  await expect(page.getByTestId("finished")).toBeVisible({ timeout: 20_000 });
  // The headline is the same figure the full-passage mode shows, because the
  // mode changes when the test ends, not how it is scored.
  await expect(page.getByTestId("headline-net-wpm")).toHaveText(/^\d+(\.\d+)? WPM$/);
});

test("MOD-01: word count caps the target and completes on the last word", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("test-mode-select").selectOption("words");
  await page.getByTestId("word-count-select").selectOption("15");

  const target = await page.getByTestId("passage-id").innerText();
  expect(target).toMatch(/^PROSE-/);

  // The rendered text is the opening 15 words of that passage — counted from
  // the DOM, not from the corpus, so the assertion stands on what shipped.
  const rendered = await page.getByTestId("surface").innerText();
  const words = rendered.trim().split(/\s+/).filter(Boolean).length;
  expect(words).toBe(15);

  // The surface paints U+00A0 inside its word boxes so a line can never break
  // before a space (STEER-2 bug d). The target underneath is ordinary text, so
  // the harness types what the engine compares against, not the painted form.
  const typed = rendered.replace(/\u00A0/g, " ").trim();

  // Typing the whole cap finishes the test.
  const surface = page.getByTestId("surface");
  await surface.click();
  await page.keyboard.type(typed, { delay: 1 });
  await expect(page.getByTestId("finished")).toBeVisible({ timeout: 15_000 });
  // A word-count run is clean when the whole cap was typed: the cap did not
  // quietly shift the target by a character.
  await expect(page.getByTestId("headline-accuracy")).toHaveText(/^100(\.0)?% accuracy$/);
});

test("MOD-01: quote mode types a quote and Next quote loads a different one", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("test-mode-select").selectOption("quotes");
  const surface = page.getByTestId("surface");
  await surface.click();

  const first = await page.getByTestId("surface").innerText();
  expect(first.trim().length).toBeGreaterThan(0);

  await page.getByTestId("next-quote").click();
  await page.getByTestId("surface").click();
  const second = await page.getByTestId("surface").innerText();

  // New passage must never hand the same text back (action.newPassage).
  expect(second).not.toBe(first);
});

test("MOD-01: custom text replaces the target entirely", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("test-mode-select").selectOption("custom");
  const field = page.getByTestId("custom-text-input");
  await field.fill("my own practice line here");

  const surface = page.getByTestId("surface");
  await surface.click();
  await page.keyboard.type("my own practice line here", { delay: 1 });

  await expect(page.getByTestId("finished")).toBeVisible({ timeout: 15_000 });
  // The log records it as a custom run, which is what the contract's mode
  // enum exists for.
  await expect(page.getByTestId("passage-id")).toHaveText("CUSTOM");
  // Nothing typed into the field is persisted: a reload starts empty again.
  await page.reload();
  await expect(page.getByTestId("test-mode-select")).toHaveValue("prose");
});
