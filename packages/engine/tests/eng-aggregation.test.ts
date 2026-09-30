import { describe, expect, it } from "vitest";

import { OUTLIER_MULTIPLE, aggregateBigram, fingerTag, type Sample } from "../src/aggregation.js";

/**
 * Chapter-4 deep-dive §4.12 — per-key / per-bigram aggregation.
 * Written before the implementation. The numeric expectations come from the
 * chapter's worked example, recomputed by hand (see each test).
 */

describe("ENG-AGG-FIXTURE-01-bigram-outlier-exclusion", () => {
  // §4.12 worked example: five instances of `th` with intervals
  // 180, 195, 1200, 175, 190 ms. The naive mean is 388 ms; the correct
  // aggregate drops the 1200 ms hesitation and yields 185 ms with n=4.
  const samples: Sample[] = [180, 195, 1200, 175, 190].map((intervalMs) => ({ intervalMs }));

  it("excludes the self-relative outlier and aggregates 185 ms with n=4", () => {
    const result = aggregateBigram("t", "h", samples);
    expect(result.meanMs).toBe(185);
    expect(result.sampleCount).toBe(4);
    expect(result.excludedCount).toBe(1);
    expect(result.hesitationEvents).toBe(1);
  });

  it("never reports an aggregate without its sample count (weakness-model rule D-M4-3)", () => {
    const result = aggregateBigram("t", "h", samples);
    expect(result.sampleCount).toBeGreaterThan(0);
    expect(result).toHaveProperty("sampleCount");
    expect(result).toHaveProperty("excludedCount");
  });

  it("the naive mean the chapter warns about is not what we report", () => {
    const naive = samples.reduce((s, x) => s + x.intervalMs, 0) / samples.length;
    expect(naive).toBe(388);
    expect(aggregateBigram("t", "h", samples).meanMs).not.toBe(naive);
  });

  it("keeps the excluded sample's value in the record rather than dropping it silently", () => {
    const result = aggregateBigram("t", "h", samples);
    expect(result.excluded).toHaveLength(1);
    expect(result.excluded[0]?.intervalMs).toBe(1200);
  });
});

describe("ENG-AGG-FIXTURE-02-layout-dependent-hand-finger-tagging", () => {
  it("tags the same bigram differently under QWERTY and Dvorak", () => {
    // Verified by construction (docs/recompute-fingermap.mjs), not memory:
    // QWERTY: t = left index, h = right index -> cross-hand.
    // Dvorak: t sits on the QWERTY 'k' key (right middle), h on 'j' (right
    // index) -> same hand, different finger.
    const qwerty = fingerTag("t", "h", "qwerty-us");
    const dvorak = fingerTag("t", "h", "dvorak");

    expect(qwerty).toEqual({ hand: "cross", sameFinger: false });
    expect(dvorak.hand).toBe("same");
    expect(dvorak.sameFinger).toBe(false);
  });

  it("a same-finger pair on QWERTY is not same-finger on Dvorak", () => {
    // f and v are both left-index on QWERTY; on Dvorak they sit on the QWERTY
    // 'y' and 'b' keys (right middle and right pinky).
    expect(fingerTag("f", "v", "qwerty-us").sameFinger).toBe(true);
    expect(fingerTag("f", "v", "dvorak").sameFinger).toBe(false);
  });

  it("an unmapped layout returns unknown rather than guessing (§4.12: never hardcode)", () => {
    // Finger maps for the remaining layouts are filled in during Phase 6. A
    // wrong tag is worse than no tag: silently mis-attributing a bigram's hand
    // would feed the weakness model bad data.
    const tag = fingerTag("t", "h", "azerty");
    expect(tag.hand).toBe("unknown");
    expect(tag.sameFinger).toBeNull();
  });
});

describe("ENG-AGG-PROP-01", () => {
  function rng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0x100000000;
    };
  }

  it("never reports fewer than one sample and never hides an excluded sample", () => {
    const next = rng(20260928);
    for (let run = 0; run < 500; run++) {
      const count = 1 + Math.floor(next() * 12);
      const samples: Sample[] = Array.from({ length: count }, () => ({
        intervalMs: 80 + Math.floor(next() * 1200),
      }));
      const result = aggregateBigram("a", "s", samples);

      expect(result.sampleCount).toBeGreaterThanOrEqual(1);
      expect(result.sampleCount + result.excludedCount).toBe(samples.length);
      // Every sample either counted or explicitly listed as excluded.
      for (const excluded of result.excluded) {
        expect(excluded.intervalMs).toBeGreaterThan(OUTLIER_MULTIPLE * result.medianMs);
      }
    }
  });

  it("a single sample is never excluded as an outlier", () => {
    const result = aggregateBigram("q", "w", [{ intervalMs: 5000 }]);
    expect(result.sampleCount).toBe(1);
    expect(result.excludedCount).toBe(0);
    expect(result.meanMs).toBe(5000);
  });
});
