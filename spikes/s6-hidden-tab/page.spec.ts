import { test, expect } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const PAGE_URL = pathToFileURL(resolve(__dirname, "page.html")).href;

/** Test hooks page.html exposes for the spec (and manual run). */
interface S6Result {
  state: string;
  valid: boolean;
  keystrokes: number;
  scoredDurationMs: number;
  wallDurationMs: number;
}
declare global {
  interface Window {
    __setMode: (mode: "practice" | "verified") => void;
    __start: () => void;
    __stop: () => S6Result;
    __state: () => string;
  }
}

// Timing method (documented in README): short REAL waits (~300-700 ms) on a
// genuinely visible page while overriding document.visibilityState and
// dispatching synthetic events. This verifies the page wiring around the model;
// it can NOT prove real browser background throttling -- that is the manual run.
async function setHidden(page: import("@playwright/test").Page, hidden: boolean) {
  await page.evaluate((h) => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => (h ? "hidden" : "visible"),
    });
    Object.defineProperty(document, "hidden", { configurable: true, get: () => h });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}

test("practice mode: hidden span is excluded from scored duration", async ({ page }) => {
  await page.goto(PAGE_URL);
  await page.evaluate(() => window.__setMode("practice"));
  await page.evaluate(() => window.__start());
  await page.keyboard.type("ab", { delay: 20 });
  await page.waitForTimeout(300);
  await setHidden(page, true);
  await page.waitForTimeout(700);
  await setHidden(page, false);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.keyboard.type("cd", { delay: 20 });
  await page.waitForTimeout(300);
  const result = await page.evaluate(() => window.__stop());
  const pauseMs = result.wallDurationMs - result.scoredDurationMs;
  console.log(
    `[S6][practice] wall=${result.wallDurationMs.toFixed(1)}ms scored=${result.scoredDurationMs.toFixed(1)}ms ` +
      `excludedPause=${pauseMs.toFixed(1)}ms keystrokes=${result.keystrokes} state=${result.state}`,
  );
  expect(result.state).toBe("finished");
  expect(result.valid).toBe(true);
  expect(result.keystrokes).toBe(4);
  expect(result.wallDurationMs).toBeGreaterThan(1250);
  expect(result.scoredDurationMs).toBeGreaterThan(300);
  // The synthetic hidden span was ~700 ms of wall time; allow generous slop
  // for event-delivery jitter, but the pause must clearly be excluded.
  expect(pauseMs).toBeGreaterThan(450);
  expect(pauseMs).toBeLessThan(1100);
});

test("practice mode: window blur pauses, focus resumes", async ({ page }) => {
  await page.goto(PAGE_URL);
  await page.evaluate(() => window.__setMode("practice"));
  await page.evaluate(() => window.__start());
  await page.keyboard.type("ab", { delay: 20 });
  await page.waitForTimeout(200);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.waitForTimeout(400);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.keyboard.type("cd", { delay: 20 });
  await page.waitForTimeout(200);
  const result = await page.evaluate(() => window.__stop());
  const pauseMs = result.wallDurationMs - result.scoredDurationMs;
  console.log(
    `[S6][blur] wall=${result.wallDurationMs.toFixed(1)}ms scored=${result.scoredDurationMs.toFixed(1)}ms ` +
      `excludedPause=${pauseMs.toFixed(1)}ms state=${result.state}`,
  );
  expect(result.state).toBe("finished");
  expect(result.valid).toBe(true);
  expect(pauseMs).toBeGreaterThan(150);
  expect(pauseMs).toBeLessThan(700);
});

test("verified mode: hidden mid-test marks the attempt invalid", async ({ page }) => {
  await page.goto(PAGE_URL);
  await page.evaluate(() => window.__setMode("verified"));
  await page.evaluate(() => window.__start());
  await page.keyboard.type("ab", { delay: 20 });
  await page.waitForTimeout(200);
  await setHidden(page, true);
  const state = await page.evaluate(() => window.__state());
  expect(state).toBe("invalid");
  const result = await page.evaluate(() => window.__stop());
  console.log(
    `[S6][verified] state=${result.state} valid=${result.valid} ` +
      `scored=${result.scoredDurationMs.toFixed(1)}ms wall=${result.wallDurationMs.toFixed(1)}ms`,
  );
  expect(result.state).toBe("invalid");
  expect(result.valid).toBe(false);
  // Elapsed before invalidation is preserved for the local (unverified) result.
  expect(result.scoredDurationMs).toBeGreaterThan(0);
});
