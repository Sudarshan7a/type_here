import { expect, test } from "@playwright/test";
import { replayText, type CapturedKeyEvent } from "./replay";

declare global {
  interface Window {
    __keyLog: CapturedKeyEvent[];
    __displayText: string;
  }
}

const pageUrl = new URL("./page.html", import.meta.url).href;

test.beforeEach(async ({ page }) => {
  await page.goto(pageUrl);
  await page.locator("#surface").focus();
});

test("simple typing: down before up, monotonic t, trusted events", async ({ page }) => {
  await page.keyboard.type("cat");

  const log = await page.evaluate(() => window.__keyLog);
  expect(log.length).toBe(6);

  let lastT = -Infinity;
  const byCode = new Map<string, CapturedKeyEvent[]>();
  for (const e of log) {
    expect(Number.isFinite(e.t)).toBe(true);
    expect(e.t).toBeGreaterThanOrEqual(lastT);
    lastT = e.t;
    expect(e.isTrusted).toBe(true);
    const seq = byCode.get(e.code) ?? [];
    seq.push(e);
    byCode.set(e.code, seq);
  }

  expect([...byCode.keys()].sort()).toEqual(["KeyA", "KeyC", "KeyT"]);
  for (const [code, seq] of byCode) {
    expect(seq.length, code).toBe(2);
    expect(seq[0].type, code).toBe("down");
    expect(seq[1].type, code).toBe("up");
    expect(seq[0].t, code).toBeLessThanOrEqual(seq[1].t);
  }
});

test("rollover: j keydown precedes f keyup (overlap captured)", async ({ page }) => {
  await page.keyboard.down("f");
  await page.keyboard.down("j");
  await page.waitForTimeout(40);
  await page.keyboard.up("f");
  await page.keyboard.up("j");

  const log = await page.evaluate(() => window.__keyLog);
  expect(log.map((e) => `${e.code}:${e.type}`)).toEqual([
    "KeyF:down",
    "KeyJ:down",
    "KeyF:up",
    "KeyJ:up",
  ]);

  const fUp = log.find((e) => e.code === "KeyF" && e.type === "up");
  const jDown = log.find((e) => e.code === "KeyJ" && e.type === "down");
  expect(fUp && jDown).toBeTruthy();
  expect(jDown!.t).toBeLessThan(fUp!.t);

  const overlapMs = fUp!.t - jDown!.t;
  const note = `rollover overlap (f.up.t - j.down.t) = ${overlapMs.toFixed(2)} ms`;
  console.log(note);
  test.info().annotations.push({ type: "note", description: note });
  expect(overlapMs).toBeGreaterThan(5);
});

test("repeat flag captured from synthetic dispatch (and does not echo a character)", async ({
  page,
}) => {
  const before = await page.evaluate(() => window.__keyLog.length);
  await page.evaluate(() => {
    document.getElementById("surface")!.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "a",
        code: "KeyA",
        bubbles: true,
        cancelable: true,
        repeat: true,
      }),
    );
  });

  const log = await page.evaluate(() => window.__keyLog);
  expect(log.length).toBe(before + 1);
  const evt = log[log.length - 1];
  expect(evt.repeat).toBe(true);
  expect(evt.isTrusted).toBe(false);

  const display = await page.evaluate(() => window.__displayText);
  expect(display).toBe("");
});

test("replay(log) reconstructs the displayed text", async ({ page }) => {
  await page.keyboard.press("Shift+H");
  await page.keyboard.type("elo");
  await page.keyboard.press("Backspace");
  await page.keyboard.type("lo");

  const log = await page.evaluate(() => window.__keyLog);
  const display = await page.evaluate(() => window.__displayText);
  expect(display).toBe("Hello");
  expect(replayText(log)).toBe(display);
  expect(replayText(log)).toBe("Hello");
});
