import { test, expect } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const TARGET_URL = pathToFileURL(resolve(__dirname, "target.html")).href;

/** Shape of the measurement buffer target.html exposes on window.__lat. */
interface LatencyBuffer {
  kd: number[];
  np: number[];
  longtasks: number[];
  textLength: number;
}
declare global {
  interface Window {
    __lat: LatencyBuffer;
  }
}
const TEXT =
  "the quick brown fox jumps over the lazy dog while the calm river flows past green hills.";
const PASSES = 4; // 4 passes x 88 chars = 352 synthetic keystrokes (> 300 required)
const KEY_DELAY_MS = 8;

// Nearest-rank percentile: sorted[ceil(p*n)-1], clamped into range.
function percentile(sorted: number[], p: number): number {
  const rank = Math.ceil(p * sorted.length);
  return sorted[Math.min(Math.max(rank, 1), sorted.length) - 1];
}

test("keydown-to-next-paint p95 within 16 ms budget (synthetic, headless)", async ({
  page,
}, testInfo) => {
  await page.goto(TARGET_URL);
  await page.waitForFunction(() => window.__lat.textLength > 0);

  for (let pass = 0; pass < PASSES; pass++) {
    await page.keyboard.type(TEXT, { delay: KEY_DELAY_MS });
  }
  // Let the final rAF marks land before reading the buffer.
  await page.waitForTimeout(250);

  const lat = await page.evaluate(() => window.__lat);
  const n = Math.min(lat.kd.length, lat.np.length);
  const durations: number[] = [];
  for (let i = 0; i < n; i++) durations.push(lat.np[i] - lat.kd[i]);
  durations.sort((a, b) => a - b);

  const p50 = percentile(durations, 0.5);
  const p95 = percentile(durations, 0.95);
  const max = durations[durations.length - 1];

  const summary = {
    project: testInfo.project.name,
    keystrokes: n,
    p50Ms: +p50.toFixed(2),
    p95Ms: +p95.toFixed(2),
    maxMs: +max.toFixed(2),
    longTasksOver50Ms: lat.longtasks.length,
    longtasks: lat.longtasks,
    durationsMs: durations.map((d) => +d.toFixed(2)),
  };
  mkdirSync(resolve(__dirname, "results"), { recursive: true });
  const outFile = resolve(__dirname, "results", `bench-${testInfo.project.name}.json`);
  writeFileSync(outFile, JSON.stringify(summary, null, 2) + "\n");
  console.log(
    `[S1][${testInfo.project.name}] n=${n} p50=${summary.p50Ms}ms p95=${summary.p95Ms}ms ` +
      `max=${summary.maxMs}ms longTasks>50ms=${summary.longTasksOver50Ms} -> ${outFile}`,
  );

  expect(n).toBeGreaterThanOrEqual(300);
  expect(summary.longTasksOver50Ms).toBe(0);
  // Assert against the proposed 16 ms p95 budget. A failure here is a recorded
  // spike finding (Result: FAIL), not a flake to be retried away.
  expect(p95).toBeLessThanOrEqual(16);
});
