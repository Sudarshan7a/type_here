import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { ResultsPanel } from "../src/ResultsPanel";
import type { EngineResult } from "@realtype/engine";
import { PASSAGES, placeholderHash } from "../src/passages";

/**
 * ResultsPanel and the passage data are pure enough to assert in node. The
 * interactive surface (ManualTestApp) is covered by the Playwright suite,
 * which drives a real browser and real keystrokes.
 */

const result: EngineResult = {
  summary: {
    rawWpm: 60,
    grossWpm: 55,
    netWpm: 54.5,
    keystrokeAccuracy: 97.5,
    finalAccuracy: 100,
    kspc: 1.03,
    rolloverRatio: 0.12,
    consistency: 88.2,
    burstWpm: 74.5,
    ikiMeanMs: 142.85,
    modelVersion: "1.0.0",
    difficultyBand: null,
    verified: false,
    flags: [],
  },
  details: {
    durationMs: 10_000,
    printableKeystrokes: 120,
    correctKeystrokes: 117,
    correctCharsInFinalText: 100,
    finalTextLength: 100,
    bufferInserts: 122,
    backspaces: 2,
    rejectedAttempts: 0,
    totalAttempts: 124,
    rejectedAttemptRate: 0,
    autoInserts: 0,
    untrustedEvents: 0,
    repeatDrops: 1,
    overlappedPresses: 2,
    rolloverTransitions: 100,
    ikiExcludedGaps: 0,
    ikiSampleCount: 100,
    burstWindowChars: 12,
    scoredDurationMs: 10_000,
    wallDurationMs: 10_000,
  },
  finalText: "abc",
};

describe("ResultsPanel renders engine output faithfully", () => {
  it("shows the headline metrics and the engine's model version", () => {
    const html = renderToStaticMarkup(<ResultsPanel result={result} />);
    expect(html).toContain("54.5"); // net WPM, one decimal
    expect(html).toContain("100.0%"); // final accuracy
    expect(html).toContain("model 1.0.0");
    expect(html).toContain("1.03"); // KSPC
    expect(html).toContain("12.0%"); // rollover
  });

  it("renders n/a, never 0, for a metric that could not be computed (E9)", () => {
    const noConsistency: EngineResult = {
      ...result,
      summary: { ...result.summary, consistency: null, ikiMeanMs: null },
    };
    const html = renderToStaticMarkup(<ResultsPanel result={noConsistency} />);
    // Consistency and the mean key interval both render as "n/a"; neither may
    // show a numeric zero, which would imply the user typed at zero speed.
    const cells = html.match(/data-testid="(consistency|iki)"[^>]*>([^<]*)</g) ?? [];
    expect(cells).toHaveLength(2);
    for (const cell of cells) {
      expect(cell).toContain("n/a");
    }
  });

  it("states plainly when a test had no timing data (E9)", () => {
    const noData: EngineResult = { ...result, details: { ...result.details, durationMs: 0 } };
    const html = renderToStaticMarkup(<ResultsPanel result={noData} />);
    expect(html).toContain("not available");
  });
});

describe("passage data", () => {
  it("carries original prose with ids from the content library", () => {
    expect(PASSAGES.length).toBeGreaterThanOrEqual(4);
    for (const p of PASSAGES) {
      expect(p.id).toMatch(/^PROSE-01-\d{3}$/);
      expect(p.text.length).toBeGreaterThan(40);
    }
  });

  it("produces a 64-char hex placeholder hash (contract-compatible until sha256 lands)", () => {
    const hash = placeholderHash("hello");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(placeholderHash("hello")).toBe(placeholderHash("hello"));
    expect(placeholderHash("hello")).not.toBe(placeholderHash("hellp"));
  });
});
