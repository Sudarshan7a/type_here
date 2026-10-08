import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test, type Page } from "@playwright/test";

/**
 * ENG-02 / NFR-01 — input-to-paint p95 measured on the REAL typing surface.
 *
 * Spike S1 proved the budget on a minimal lab page (p95 15.2 ms, LAB PROXY).
 * This spec ports the same lab-proxy method — keydown→next-paint durations off
 * an in-page probe, nearest-rank p50/p95/max, a long-task observer, raw
 * per-key durations JSON — onto the product surface in apps/web, which also
 * runs character-state derivation, caret bookkeeping and live figures in its
 * paint frame.
 *
 * CI wiring: this spec runs inside `pnpm e2e` like every other spec, and the
 * Playwright config pins `workers: 1` because the long-task assertion needs a
 * quiet machine — six browsers sharing one box produced 1–2 long tasks per
 * run and failed the gate on ambient load, not on the surface. The output file
 * is named per Playwright project, so Firefox/WebKit runs light up with no
 * spec changes once their downloads succeed.
 *
 * Each pass is a FRESH PAGE, not a Tab restart: Tab-restart is already covered
 * by typing-surface.spec.ts AC5, and a fresh navigation means no cross-pass
 * engine or capture state can leak into the attribution. (An early draft
 * restarted with Tab and saw one unexplained mid-pass restart in ~17 runs;
 * the Tab path is not this harness's job to exercise, so it no longer does.)
 *
 * LAB PROXY, not REAL-DEVICE CONFIRMED: synthetic keystrokes through the
 * browser do not exercise the OS keyboard layout, IME, dead keys or physical
 * key positions, and headless Chromium does not schedule paint exactly like
 * a foreground window on real hardware. REAL-DEVICE confirmation (a human on
 * a real keyboard) is still pending per the loop's evidence labels.
 *
 * Privacy: the probe records numbers only — keydown timestamps, paint
 * timestamps, long-task durations. No keystroke content, no text, no keys ever
 * enter the buffer or the results JSON. The probe adds no DOM, no overlay and
 * no network; it is one listener and a numbers buffer on window.
 */

/** The first passage, from apps/web/src/passages.ts (PROSE-01-004). */
const PASSAGE =
  "Dinner's ready whenever you are. I made extra rice in case your brother stops by later tonight. There's also that soup from Sunday in the freezer if you're still hungry after. Just heat it on the stove and add a little pepper. I'll be in the garden until it gets dark, so come find me when you're done.";
/** Per-pass prefix: stops short of the end so no pass ever finishes the test. */
const CHUNK_LEN = 80;
/** 4 passes x 80 keystrokes = 320 (S1's bar is >= 300). */
const PASSES = 4;
/** NFR-01 budget. Never weakened to fit a measurement. */
const BUDGET_P95_MS = 16;
/** A "long task" is > 50 ms of blocked main thread. */
const LONG_TASK_MS = 50;

/** Shape of the measurement buffer the probe exposes on window. */
interface SurfaceLatencyBuffer {
  kd: number[];
  np: number[];
  longtasks: Array<{ start: number; duration: number }>;
  longtaskSupported: boolean;
}

declare global {
  interface Window {
    __surfaceLat: SurfaceLatencyBuffer;
  }
}

// Nearest-rank percentile: sorted[ceil(p*n)-1], clamped into range (as in S1).
function percentile(sorted: number[], p: number): number {
  const rank = Math.ceil(p * sorted.length);
  return sorted[Math.min(Math.max(rank, 1), sorted.length) - 1]!;
}

/**
 * Installed once with addInitScript, so it is in place before the app's
 * scripts run on EVERY navigation of this page.
 *
 * Ordering is the whole trick. React 19 handles the keydown at its root
 * container first, so the surface's scheduleFrame() has already queued its
 * paint frame before this window-level bubble listener queues its own rAF
 * behind it. The callback therefore lands after the surface's DOM writes and
 * before the paint — the same keydown→next-paint shape as S1's next_paint mark.
 */
function installLatencyProbe(): void {
  window.__surfaceLat = { kd: [], np: [], longtasks: [], longtaskSupported: false };
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__surfaceLat.longtasks.push({
          start: entry.startTime,
          duration: entry.duration,
        });
      }
    });
    observer.observe({ entryTypes: ["longtask"] });
    window.__surfaceLat.longtaskSupported = true;
  } catch {
    // "longtask" is unsupported in some engines (e.g. Firefox). The buffer
    // stays empty and longtaskSupported records that honestly.
  }
  window.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key.length !== 1) return;
    window.__surfaceLat.kd.push(performance.now());
    requestAnimationFrame(() => {
      window.__surfaceLat.np.push(performance.now());
    });
  });
}

/** One character through the real key pipeline (Space needs its key name). */
async function pressChar(page: Page, ch: string): Promise<void> {
  await page.keyboard.press(ch === " " ? "Space" : ch);
}

/** The surface's own caret index — its ground truth for "this key landed". */
async function caretIndex(page: Page): Promise<number> {
  return page.evaluate(() =>
    Number.parseInt(document.querySelector('[data-testid="caret"]')?.dataset.caretIndex ?? "", 10),
  );
}

test("input-to-paint p95 within 16 ms on the real surface (synthetic, headless)", async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(180_000);

  // A finished surface stops painting (typing-surface.spec.ts AC5: typing after
  // the end changes nothing), which would strand keystrokes with no paint and
  // corrupt the attribution below. The chunk must leave every pass unfinished.
  expect(
    PASSAGE.length,
    "the chunk must leave the test unfinished so every keystroke paints",
  ).toBeGreaterThan(CHUNK_LEN);
  const chunk = PASSAGE.slice(0, CHUNK_LEN);

  // Registered once; Playwright re-runs init scripts on every navigation, so
  // each pass below starts with a fresh empty buffer to attribute against.
  await page.addInitScript(installLatencyProbe);

  const durations: number[] = [];
  let longTasksOver50Ms = 0;
  let longtaskSupported = true;

  for (let pass = 0; pass < PASSES; pass++) {
    await page.goto("/");
    await page.getByTestId("surface").click();
    await expect
      .poll(async () => caretIndex(page), {
        message: `pass ${pass + 1}: the caret must start at index 0`,
        timeout: 10_000,
      })
      .toBe(0);

    // The observer has been watching since the init script ran — including
    // navigation, script parse/compile, React mount and font load. That boot
    // work is NFR-02's territory (page interactive), not this gate's: ENG-02
    // claims feedback within one frame DURING a test. A loaded CI runner can
    // push boot over 50 ms and fail the gate on work no keystroke caused, so
    // the buffer is reset here, at the last moment before the first keystroke.
    // The zero-long-task assertion below therefore measures the typing window
    // only — and stays at zero, never weakened.
    await page.evaluate(() => {
      window.__surfaceLat.longtasks = [];
    });

    for (let i = 0; i < chunk.length; i++) {
      await pressChar(page, chunk[i]!);
      // The read POLLS rather than sampling once: the surface batches its DOM
      // writes into a requestAnimationFrame (AGENTS.md rule 2 forbids a React
      // render per keystroke), so a read issued in the same task as the
      // keystroke sees the PREVIOUS frame — caret.spec.ts documents the same
      // constraint. Both halves must agree before the next key goes out: the
      // probe's paint count (this keystroke's frame landed) and the surface's
      // own caret index (the surface consumed THIS keystroke, not just any
      // frame). Poll strings carry indices only — no keystroke content.
      await expect
        .poll(
          async () =>
            page.evaluate(
              () =>
                `${window.__surfaceLat.np.length}:${document.querySelector('[data-testid="caret"]')?.dataset.caretIndex ?? "?"}`,
            ),
          {
            message: `pass ${pass + 1} keystroke ${i + 1}: its paint must land and move the caret to ${i + 1}`,
            timeout: 10_000,
          },
        )
        .toBe(`${i + 1}:${i + 1}`);
    }

    // The pass really went through the surface, not just the probe: the chunk
    // is the passage's own true prefix typed correctly, so the engine must
    // hold every typed character correct.
    const states = await page
      .locator("[data-char-state]")
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-char-state")));
    expect(
      states.slice(0, CHUNK_LEN).every((s) => s === "correct"),
      `pass ${pass + 1}: the typed prefix must read correct in the surface`,
    ).toBe(true);

    // Attribution integrity per pass: every keystroke owns exactly one paint.
    // A navigation resets the probe buffer, so this is exact, not cumulative.
    const lat = await page.evaluate(() => window.__surfaceLat);
    expect(lat.kd.length).toBe(CHUNK_LEN);
    expect(lat.np.length).toBe(CHUNK_LEN);
    for (let i = 0; i < CHUNK_LEN; i++) durations.push(lat.np[i]! - lat.kd[i]!);
    longTasksOver50Ms += lat.longtasks.filter((t) => t.duration > LONG_TASK_MS).length;
    longtaskSupported &&= lat.longtaskSupported;
  }

  durations.sort((a, b) => a - b);
  const n = durations.length;
  const p50 = percentile(durations, 0.5);
  const p95 = percentile(durations, 0.95);
  const max = durations[durations.length - 1]!;

  const HERE = fileURLToPath(new URL(".", import.meta.url));
  const summary = {
    project: testInfo.project.name,
    keystrokes: n,
    expectedKeystrokes: PASSES * CHUNK_LEN,
    budgetP95Ms: BUDGET_P95_MS,
    longTaskThresholdMs: LONG_TASK_MS,
    p50Ms: +p50.toFixed(2),
    p95Ms: +p95.toFixed(2),
    maxMs: +max.toFixed(2),
    longTasksOver50Ms,
    longtaskSupported,
    durationsMs: durations.map((d) => +d.toFixed(2)),
  };
  mkdirSync(resolve(HERE, "latency-results"), { recursive: true });
  const outFile = resolve(HERE, "latency-results", `surface-${testInfo.project.name}.json`);
  writeFileSync(outFile, JSON.stringify(summary, null, 2) + "\n");
  console.log(
    `[surface-latency][${testInfo.project.name}] n=${n} p50=${summary.p50Ms}ms ` +
      `p95=${summary.p95Ms}ms max=${summary.maxMs}ms longTasks>50ms=${summary.longTasksOver50Ms} ` +
      `(observer: ${longtaskSupported ? "supported" : "unsupported"}) -> ${outFile}`,
  );

  expect(n).toBe(PASSES * CHUNK_LEN);
  expect(n).toBeGreaterThanOrEqual(300);
  expect(longTasksOver50Ms).toBe(0);
  // The budget assertion. A failure here is a recorded finding (LAB PROXY),
  // not a flake to be retried away — the budget is never weakened to fit.
  expect(p95).toBeLessThanOrEqual(BUDGET_P95_MS);
});
