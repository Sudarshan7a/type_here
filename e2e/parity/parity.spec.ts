import { expect, test } from "@playwright/test";

/**
 * ENG-PARITY-01 / ENG-PARITY-02 â€” browser vs Node parity over every
 * chapter-4 fixture, using the engine's own compiled output on both sides.
 *
 * Why this matters: the server recomputes submitted results with the same code
 * the browser ran. If the two runtimes disagree by even a floating-point ULP,
 * every verified result is silently downgraded to "unverified".
 */

const FIXTURES = [
  "a01",
  "b01",
  "c01",
  "d01",
  "d02",
  "d03",
  "d04",
  "e01",
  "e02",
  "e03",
  "f01",
  "g01",
] as const;

interface Summary {
  rawWpm: number;
  grossWpm: number;
  netWpm: number;
  keystrokeAccuracy: number;
  finalAccuracy: number;
  kspc: number;
  rolloverRatio: number;
  consistency: number | null;
  burstWpm: number;
  ikiMeanMs: number | null;
  modelVersion: string;
  difficultyBand: string | null;
  verified: boolean;
  flags: string[];
}
interface ParityPayload {
  results: Record<string, { summary: Summary; details: Record<string, number>; finalText: string }>;
  engineModelVersion: string;
  error?: string;
}

/** The engine's compiled ESM output, loaded under Node. */
async function nodeResults() {
  const engine = await import("../../packages/engine/dist/src/index.js");
  const out: ParityPayload["results"] = {};
  for (const id of FIXTURES) {
    const mod = await import(`../../packages/engine/dist/fixtures/${id}.js`);
    const { summary, details, finalText } = engine.computeResult(mod.log, mod.text);
    out[id] = { summary, details, finalText };
  }
  return { results: out, engineModelVersion: engine.ENGINE_MODEL_VERSION };
}

test("ENG-PARITY-01 every fixture produces identical numbers in Node and Chromium", async ({
  page,
}) => {
  const node = await nodeResults();

  await page.goto("/");
  await page.waitForFunction(
    () => (window as unknown as { __parity?: unknown }).__parity !== undefined,
  );
  const browser = (await page.evaluate(
    () => (window as unknown as { __parity: ParityPayload }).__parity,
  )) as ParityPayload;

  expect(browser.error, `browser harness error: ${browser.error ?? ""}`).toBeUndefined();
  expect(browser.engineModelVersion).toBe(node.engineModelVersion);

  for (const id of FIXTURES) {
    const a = node.results[id]!;
    const b = browser.results[id]!;
    const label = `fixture ${id}`;

    // Strings and flags must match exactly.
    expect(b.finalText, `${label} finalText`).toBe(a.finalText);
    expect(b.summary.modelVersion, `${label} modelVersion`).toBe(a.summary.modelVersion);
    expect(b.summary.difficultyBand, `${label} band`).toBe(a.summary.difficultyBand);
    expect(b.summary.verified, `${label} verified`).toBe(a.summary.verified);
    expect(b.summary.flags, `${label} flags`).toEqual(a.summary.flags);

    // Numbers must agree to 1e-9 (the metrics spec's parity requirement).
    for (const key of Object.keys(a.summary) as (keyof Summary)[]) {
      const left = a.summary[key];
      const right = b.summary[key];
      if (typeof left === "number" && typeof right === "number") {
        expect(
          Math.abs(left - right),
          `${label}.${key}: node ${left} vs browser ${right}`,
        ).toBeLessThanOrEqual(1e-9);
      }
    }
    for (const [key, value] of Object.entries(a.details)) {
      const right = b.details[key];
      expect(typeof right, `${label} details.${key} missing in browser`).toBe("number");
      expect(
        Math.abs(value - (right as number)),
        `${label} details.${key}: node ${value} vs browser ${right}`,
      ).toBeLessThanOrEqual(1e-9);
    }
  }
});

test("ENG-PARITY-02 aggregates identically too (alignment, aggregation, state machine)", async ({
  page,
}) => {
  const engine = await import("../../packages/engine/dist/src/index.js");

  const nodeSide = {
    alignment: engine.alignText("the quick brown", "teh qiuck brwon"),
    aggregate: engine.aggregateBigram(
      "t",
      "h",
      [180, 195, 1200, 175, 190].map((intervalMs) => ({ intervalMs })),
    ),
    fingerTag: engine.fingerTag("t", "h", "qwerty-us"),
  };

  await page.goto("/");
  await page.waitForFunction(
    () => (window as unknown as { __parity?: unknown }).__parity !== undefined,
  );
  const browserSide = await page.evaluate(async () => {
    const e = await import("/packages/engine/dist/src/index.js");
    return {
      alignment: e.alignText("the quick brown", "teh qiuck brwon"),
      aggregate: e.aggregateBigram(
        "t",
        "h",
        [180, 195, 1200, 175, 190].map((intervalMs) => ({ intervalMs })),
      ),
      fingerTag: e.fingerTag("t", "h", "qwerty-us"),
    };
  });

  expect(JSON.stringify(browserSide.alignment)).toBe(JSON.stringify(nodeSide.alignment));
  expect(JSON.stringify(browserSide.aggregate)).toBe(JSON.stringify(nodeSide.aggregate));
  expect(JSON.stringify(browserSide.fingerTag)).toBe(JSON.stringify(nodeSide.fingerTag));
});
