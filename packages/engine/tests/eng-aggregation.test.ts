import { describe, expect, it } from "vitest";

import {
  OUTLIER_MULTIPLE,
  aggregateBigram,
  fingerTag,
  type Sample,
} from "../src/aggregation.js";

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
    // On QWERTY: t = left index, h = right index -> cross-hand.
    const qwerty = fingerTag("t", "h", "qwerty-us");
    // On Dvorak, 't' sits on the QWERTY 'y' key (right index) and 'h' stays
    // on the right index -> same-finger.
    const dvorak = fingerTag("t", "h", "dvorak");

    expect(qwerty).toEqual({ hand: "cross", sameFinger: false });
    expect(dvorak.sameFinger).toBe(true);
    expect(dvorak.hand).toBe("same");
  });

  it("a same-finger pair stays same-finger on every layout", () => {
    for (const layout of ["qwerty-us", "dvorak", "colemak-dh"] as const) {
      const tag = fingerTag("f", "j", layout);
      expect(tag.hand).toBe("same");
    }
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
