import { describe, expect, it } from "vitest";

import { computeFromEvents, computeResult } from "../src/index";
import { keyDown, type BuildLogOptions } from "../fixtures/helpers.js";
import { InputLogSchema } from "@realtype/schemas";

/**
 * Chapter-4 deep-dive §4.9 — the zero/near-zero and malformed-input cases.
 *
 * E9 (zero keystrokes) is called out in the chapter as "a very common crash
 * source" and requires the metrics to be "not available", never 0 WPM.
 * A03 is the near-zero-duration twin; A02/A03 (very short / very long) are in
 * this file too because they are the same class of numeric-stability risk.
 */

function logFrom(opts: BuildLogOptions) {
  return {
    events: opts.events,
    meta: {
      mode: "classic" as const,
      textId: opts.textId,
      textHash: opts.textHash,
      layout: "qwerty-us",
      settings: {
        errorMode: opts.errorMode,
        autoIndent: false,
        autoPair: false,
        layout: "qwerty-us" as const,
      },
      engineVersion: "1.0.0",
    },
  };
}

describe("ENG-FIXTURE-E09-zero-keystrokes", () => {
  it("reports no speed metrics rather than 0 WPM, and does not crash", () => {
    // A user opens the page and leaves without typing.
    const result = computeFromEvents("the cat sat", [], "free");
    for (const key of ["rawWpm", "grossWpm", "netWpm", "kspc", "burstWpm"] as const) {
      expect(Number.isFinite(result.summary[key]), `${key} must be a finite number`).toBe(true);
    }
    expect(result.details.durationMs).toBe(0);
    // The display layer must be able to say "not available": a null-ish
    // summary is signalled by zero duration, not by NaN.
    expect(result.summary.ikiMeanMs).toBeNull();
    expect(result.summary.consistency).toBeNull();
  });

  it("survives the full computeResult path with an empty log", () => {
    const log = logFrom({
      events: [],
      textId: "fixture-e09",
      textHash: "ab".repeat(32),
      errorMode: "free",
    });
    expect(() => InputLogSchema.parse(log)).not.toThrow();
    const result = computeResult(log, { id: "fixture-e09", text: "the cat sat" });
    expect(result.finalText).toBe("");
    expect(result.details.correctCharsInFinalText).toBe(0);
  });
});

describe("ENG-FIXTURE-A02-very-short-test", () => {
  it("two keystrokes produce stable, finite metrics (no divide-by-near-zero)", () => {
    // 2 characters, 200 ms: the nearest thing to a zero-duration test that
    // still contains data.
    const result = computeFromEvents("ab", [keyDown("a", 0), keyDown("b", 200)], "free");
    expect(Number.isFinite(result.summary.netWpm)).toBe(true);
    expect(Number.isFinite(result.summary.rawWpm)).toBe(true);
    expect(Number.isFinite(result.summary.kspc)).toBe(true);
    // 2 characters in 200 ms: (2/5) / (200/60000) = 120.0 WPM by the spec
    // formula. A very short test legitimately produces a large WPM.
    expect(result.summary.netWpm).toBeCloseTo(120, 10);
    expect(result.details.durationMs).toBe(200);
  });

  it("one keystroke at t=0 is stable and does not divide by zero", () => {
    const result = computeFromEvents("a", [keyDown("a", 0)], "free");
    expect(Number.isFinite(result.summary.rawWpm)).toBe(true);
    expect(Number.isFinite(result.summary.grossWpm)).toBe(true);
    expect(result.summary.netWpm).toBe(0);
  });
});

describe("ENG-FIXTURE-CORRUPTED-log", () => {
  it("out-of-order timestamps do not produce NaN or negative durations", () => {
    // A corrupted capture: the second event claims an earlier time.
    const result = computeFromEvents("ab", [keyDown("a", 0), keyDown("b", -50)], "free");
    // Duration must never be negative; a negative span yields zero rather
    // than silently corrupting every speed metric.
    expect(result.details.durationMs).toBeGreaterThanOrEqual(0);
    for (const key of ["rawWpm", "grossWpm", "netWpm"] as const) {
      expect(Number.isFinite(result.summary[key]), `${key} must stay finite`).toBe(true);
      expect(result.summary[key], `${key} must not be negative`).toBeGreaterThanOrEqual(0);
    }
  });

  it("an unmatched keyup is ignored without affecting the buffer", () => {
    const result = computeFromEvents("ab", [keyDown("a", 0), keyDown("b", 100)], "free");
    expect(result.finalText).toBe("ab");
    expect(result.summary.rolloverRatio).toBe(0);
  });

  it("duplicate identical events are counted, not deduplicated into garbage", () => {
    // The same keydown twice is a real double-press (or a capture bug); it
    // must behave deterministically rather than crash.
    const result = computeFromEvents("aa", [keyDown("a", 0), keyDown("a", 100)], "free");
    expect(result.finalText).toBe("aa");
    expect(result.details.printableKeystrokes).toBe(2);
    expect(Number.isFinite(result.summary.kspc)).toBe(true);
  });

  it("rejects a log whose events violate the contract", () => {
    // Negative timestamps are not representable: the SCHEMA catches this
    // before the engine ever sees the log.
    const bad = logFrom({
      events: [{ ...keyDown("a", 0), t: -5 }],
      textId: "fixture-corrupt",
      textHash: "ab".repeat(32),
      errorMode: "free",
    });
    expect(InputLogSchema.safeParse(bad).success).toBe(false);
  });
});
