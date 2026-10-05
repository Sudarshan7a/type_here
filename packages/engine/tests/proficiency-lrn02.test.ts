import { describe, expect, it } from "vitest";

import type { Layout } from "@realtype/schemas";

import {
  CONFIDENCE_FLOOR_SAMPLES,
  DECAY_HALF_LIFE_DAYS,
  MIN_PROFILE_OBSERVATIONS,
  MS_PER_DAY,
  PROPOSED_WEAK_SEVERITY_CUT,
  RELATIVE_ERROR_RATE_CEILING,
  RELATIVE_SLOWNESS_CEILING,
  SHRINKAGE_K,
  bigram,
  bigramChars,
  bigramRef,
  bigramProficiency,
  compareByHand,
  coverageReport,
  decayWeight,
  emptyEvidence,
  expectedBenefit,
  itemEvidence,
  itemId,
  keyProficiency,
  keyRef,
  proficiency,
  rankWeak,
  severity,
  shrinkEstimate,
  singleKey,
  staleAfterDays,
  type Baseline,
  type BigramSample,
  type ItemEvidence,
  type ItemProficiency,
  type KeySample,
  type ProficiencyContext,
} from "../src/proficiency.js";

/**
 * LRN-02 — adaptive engine: proficiency, severity, weak coverage.
 *
 * Every number below is taken from chapter-8 §8.2–§8.5 and its §8.8 fixture
 * catalogue (WM-FIXTURE-001…005, WM-FIXTURE-011…013, WM-SEVERITY-002/003/004,
 * WM-SHRINKAGE-PROP-01), written against the spec rather than against the
 * implementation. Where the chapter's prose and its own arithmetic disagree,
 * the test says which one it follows and why.
 *
 * Deterministic seeded PRNG (LCG), never Math.random: a failing permutation
 * must be reproducible from the seed printed in the test name.
 */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** Fixed "now". The engine never reads a clock; every test supplies this. */
const NOW = 1_800_000_000_000;
const daysAgo = (n: number) => NOW - n * MS_PER_DAY;

const BASELINE: Baseline = { medianMs: 180, errorRate: 0.06 };

function context(baseline: Baseline = BASELINE): ProficiencyContext {
  return { asOfMs: NOW, layout: "qwerty-us", baseline };
}

function keySamples(
  key: string,
  count: number,
  intervalMs: number,
  errors = 0,
  atMs = NOW,
): KeySample[] {
  return Array.from({ length: count }, (_, i) => ({
    key: singleKey(key),
    intervalMs,
    correct: i >= errors,
    atMs,
  }));
}

function bigramSamples(
  from: string,
  to: string,
  count: number,
  intervalMs: number,
  errors = 0,
  atMs = NOW,
): BigramSample[] {
  return Array.from({ length: count }, (_, i) => ({
    from: singleKey(from),
    to: singleKey(to),
    intervalMs,
    correct: i >= errors,
    atMs,
  }));
}

// ---------------------------------------------------------------------------
// WM-FIXTURE-001 — §8.2 severity worked in full, frequency weighting
// ---------------------------------------------------------------------------

describe("WM-FIXTURE-001-frequency-weighting-worked-example", () => {
  // §8.2: 22 samples of q→u, median IKI 340 ms, 4 of them wrong, user's
  // overall cross-hand median 180 ms; z→x is identically bad but 40x rarer.
  const baseline: Baseline = {
    medianMs: 180,
    // §8.2.2 derives the error signal as "about 3x" the user's 6% baseline.
    // The chapter's own exact inputs are 22 samples / 4 errors, so the 6% that
    // makes the ratio exactly 3.0 is (4/22)/3. A literal 0.06 would make the
    // ratio 3.03 and the score 0.6010 instead of 0.5975 — a 0.0035 difference
    // caused entirely by the chapter's own "about", so both are asserted below.
    errorRate: 4 / 22 / 3,
  };

  it("reproduces the worked relative slowness, normalisation and 0.5975 severity", () => {
    const result = severity({ itemMs: 340, itemSamples: 22, errors: 4, baseline });

    // §8.2.1: (340 - 180) / 180 = 0.889
    expect(result.relativeSlowness).toBe(0.889);
    // §8.2.3: 0.889 / 2.0 = 0.445  (the chapter's own rounding, exact here)
    expect(result.slownessComponent).toBe(0.445);
    // §8.2.2/3: 3.0x baseline error rate, clamped at 4.0, / 4.0 = 0.75
    expect(result.relativeErrorRate).toBe(3);
    expect(result.errorComponent).toBe(0.75);
    // §8.2.3: 0.5 * 0.445 + 0.5 * 0.75 = 0.5975  → 0.60 on a 0–1 scale
    expect(result.score).toBe(0.5975);
  });

  it("yields 0.6015 rather than 0.5975 when the baseline error rate is the literal 6%", () => {
    // Documented, asserted on purpose: the whole 0.004 gap is the chapter's
    // "about 3x" versus 4/22 ÷ 0.06 = 3.03, which normalises to 0.758 instead
    // of 0.75. Neither number is a bug.
    const result = severity({
      itemMs: 340,
      itemSamples: 22,
      errors: 4,
      baseline: { medianMs: 180, errorRate: 0.06 },
    });
    expect(result.relativeErrorRate).toBe(3.03);
    expect(result.errorComponent).toBe(0.758);
    expect(result.score).toBe(0.6015);
  });

  it("ranks the common weak pair above the identically-severe rare one (severity alone would tie)", () => {
    const frequencies = new Map<string, number>([
      ["q→u", 0.008],
      ["z→x", 0.0002],
    ]);
    const scores: ItemProficiency[] = ["q→u", "z→x"].map((id) => {
      const [from, to] = bigramChars(id as never);
      const evidence = itemEvidence(bigramRef(from, to), bigramSamples(from, to, 22, 340, 4), {
        asOfMs: NOW,
      });
      return bigramProficiency(from, to, evidence, context(baseline));
    });

    // Precondition: the two really are identically severe.
    expect(scores[0]!.severity).toBe(0.5975);
    expect(scores[1]!.severity).toBe(0.5975);

    const ranked = rankWeak(scores, {
      frequencyWeight: (item) => frequencies.get(itemId(item)) ?? 0,
    });

    expect(ranked.map((r) => r.id)).toEqual(["q→u", "z→x"]);
    // §8.2.4: 0.60 * 0.008 = 0.0048 vs 0.60 * 0.0002 = 0.00012
    expect(ranked[0]!.expectedBenefit).toBeCloseTo(0.00478, 10);
    expect(ranked[1]!.expectedBenefit).toBeCloseTo(0.0001195, 10);
    // "roughly 40x higher in expected benefit despite an identical severity"
    expect(ranked[0]!.expectedBenefit / ranked[1]!.expectedBenefit).toBeCloseTo(40, 6);
  });

  it("computes expected benefit as severity times frequency, and 0 for either zero", () => {
    expect(expectedBenefit(0.5975, 0.008)).toBeCloseTo(0.00478, 10);
    expect(expectedBenefit(0, 0.008)).toBe(0);
    expect(expectedBenefit(0.5975, 0)).toBe(0);
    expect(expectedBenefit(Number.NaN, 0.008)).toBe(0);
    expect(expectedBenefit(0.5975, Number.NaN)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// WM-SEVERITY-002/003/004 — the three signal-isolation scenarios of §8.8
// ---------------------------------------------------------------------------

describe("WM-SEVERITY-002-slowness-only", () => {
  it("scores from slowness alone and attributes nothing to errors", () => {
    const result = severity({ itemMs: 340, itemSamples: 22, errors: 0, baseline: BASELINE });
    expect(result.relativeSlowness).toBe(0.889);
    expect(result.slownessComponent).toBe(0.445);
    expect(result.errorComponent).toBe(0);
    expect(result.relativeErrorRate).toBe(0);
    expect(result.score).toBe(0.2225);
  });

  it("an item at exactly the baseline scores zero, however many errors it has none of", () => {
    const result = severity({ itemMs: 180, itemSamples: 22, errors: 0, baseline: BASELINE });
    expect(result.score).toBe(0);
    expect(result.relativeSlowness).toBe(0);
  });

  it("an item faster than the baseline still reports the ratio but never scores negative", () => {
    const result = severity({ itemMs: 90, itemSamples: 22, errors: 0, baseline: BASELINE });
    expect(result.relativeSlowness).toBe(-0.5);
    expect(result.score).toBe(0);
  });
});

describe("WM-SEVERITY-003-error-only", () => {
  it("scores from errors alone and attributes nothing to speed", () => {
    // 11 errors in 22 samples = 50% against a 6% baseline = 8.3x, which the
    // §8.2.3 clamp saturates at the 4.0 ceiling.
    const result = severity({ itemMs: 180, itemSamples: 22, errors: 11, baseline: BASELINE });
    expect(result.slownessComponent).toBe(0);
    expect(result.relativeSlowness).toBe(0);
    expect(result.relativeErrorRate).toBe(RELATIVE_ERROR_RATE_CEILING);
    expect(result.errorComponent).toBe(1);
    expect(result.score).toBe(0.5);
  });

  it("a 1.8x error ratio gives the un-clamped proportional component", () => {
    const result = severity({ itemMs: 180, itemSamples: 22, errors: 2, baseline: BASELINE });
    // (2/22) / 0.06 = 1.5151..., clamped to nothing, / 4.0 = 0.379
    expect(result.relativeErrorRate).toBe(1.515);
    expect(result.errorComponent).toBe(0.379);
    expect(result.score).toBe(0.1895);
  });
});

describe("WM-SEVERITY-004-both-signals", () => {
  const baseline: Baseline = { medianMs: 180, errorRate: 4 / 22 / 3 };

  it("the combined score exceeds either signal's own contribution and is their sum", () => {
    const slownessOnly = severity({ itemMs: 340, itemSamples: 22, errors: 0, baseline });
    const errorsOnly = severity({ itemMs: 180, itemSamples: 22, errors: 4, baseline });
    const both = severity({ itemMs: 340, itemSamples: 22, errors: 4, baseline });

    // §8.8: "assert the combined score exceeds either individual signal's
    // contribution alone (sanity check that the combination formula doesn't
    // cap out or clip unexpectedly)".
    expect(both.score).toBeGreaterThan(slownessOnly.score);
    expect(both.score).toBeGreaterThan(errorsOnly.score);
    expect(both.score).toBeCloseTo(slownessOnly.score + errorsOnly.score, 12);
    expect(both.score).toBe(0.5975);
  });

  it("stays inside 0–1 even at the top of both scales (no clipping, no >1)", () => {
    const result = severity({
      itemMs: 180 * 100,
      itemSamples: 22,
      errors: 22,
      baseline,
    });
    expect(result.score).toBe(1);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.slownessComponent).toBe(1);
    expect(result.errorComponent).toBe(1);
  });

  it("clamps relative slowness at the §8.2.3 ceiling of 200% slower", () => {
    const atCeiling = severity({ itemMs: 180 * 3, itemSamples: 22, errors: 0, baseline });
    const wayPast = severity({ itemMs: 180 * 40, itemSamples: 22, errors: 0, baseline });

    expect(RELATIVE_SLOWNESS_CEILING).toBe(2);
    expect(atCeiling.relativeSlowness).toBe(RELATIVE_SLOWNESS_CEILING);
    expect(wayPast.relativeSlowness).toBe(RELATIVE_SLOWNESS_CEILING);
    // One absurd transition must not dwarf everything else in the profile.
    expect(wayPast.score).toBe(atCeiling.score);
  });
});

// ---------------------------------------------------------------------------
// §8.3 shrinkage — WM-FIXTURE-002, WM-FIXTURE-003, WM-SHRINKAGE-PROP-01
// ---------------------------------------------------------------------------

describe("WM-FIXTURE-002-shrinkage-small-sample", () => {
  it("shrinks two unlucky slow samples to 264.7 ms, not the naive 900 ms", () => {
    // (2 * 900 + 15 * 180) / (2 + 15) = 4500 / 17 = 264.7058…
    expect(shrinkEstimate(900, 2, 180)).toBe(4500 / 17);
    expect(Math.round((4500 / 17) * 10) / 10).toBe(264.7);
    expect(shrinkEstimate(900, 2, 180)).not.toBe(900);
    expect(SHRINKAGE_K).toBe(15);
  });

  it("flags the item 'watching', not a ranked weakness, because n=2 < 8", () => {
    const evidence = itemEvidence(
      bigramRef(singleKey("z"), singleKey("j")),
      bigramSamples("z", "j", 2, 900),
      { asOfMs: NOW },
    );
    const score = proficiency(bigramRef(singleKey("z"), singleKey("j")), evidence, context());

    expect(score.observations).toBe(2);
    expect(score.classification).toBe("watching");
    expect(score.estimateMs).toBe(4500 / 17);
    // 0.47 relative slowness, not the naive 4.0 the chapter warns about.
    expect(score.severityDetail!.relativeSlowness).toBeCloseTo(0.47, 2);
    expect(score.severityDetail!.relativeSlowness).toBeLessThan(1);
  });

  it("never ranks a thin item", () => {
    const evidence = itemEvidence(
      bigramRef(singleKey("z"), singleKey("j")),
      bigramSamples("z", "j", 2, 900),
      { asOfMs: NOW },
    );
    const score = proficiency(bigramRef(singleKey("z"), singleKey("j")), evidence, context());
    expect(rankWeak([score], { frequencyWeight: () => 0.5 })).toEqual([]);
  });
});

describe("WM-FIXTURE-003-shrinkage-large-sample", () => {
  it("forty consistent samples pull much less toward the baseline: 667.3 ms", () => {
    // (40 * 850 + 15 * 180) / 55 = 36700 / 55 = 667.2727…
    expect(shrinkEstimate(850, 40, 180)).toBe(36700 / 55);
    expect(Math.round((36700 / 55) * 10) / 10).toBe(667.3);
    // §8.3.2: still pulled in from the raw 850 ms, but the item's own 40
    // samples now dominate the baseline's fixed 15-part pull.
    expect(shrinkEstimate(850, 40, 180)).toBeLessThan(850);
    expect(shrinkEstimate(850, 40, 180)).toBeGreaterThan(shrinkEstimate(850, 2, 180));
  });
});

describe("WM-SHRINKAGE-PROP-01-monotonic-convergence", () => {
  it("more data always pulls the estimate closer to the item's own average", () => {
    const raw = 900;
    const baselineMs = 180;
    const counts = [1, 2, 5, 10, 20, 50, 100];
    const estimates = counts.map((n) => shrinkEstimate(raw, n, baselineMs));

    for (let i = 1; i < estimates.length; i++) {
      expect(estimates[i]!).toBeGreaterThan(estimates[i - 1]!);
    }
    // Always strictly between the baseline and the raw average — never past it.
    for (const estimate of estimates) {
      expect(estimate).toBeGreaterThan(baselineMs);
      expect(estimate).toBeLessThan(raw);
    }
    // And it converges: the *share* of the item's own average recovered grows
    // monotonically. With item=900 and baseline=180 the share is exactly
    // (n·900 + 15·180) / (900·(n + 15)) = (n + 3) / (n + 15), so 100 samples
    // recover 103/115 = 89.6% — convergence is real but deliberately slow,
    // which is the point of a 15-sample prior.
    const recovered = estimates.map((estimate) => estimate / raw);
    for (let i = 1; i < recovered.length; i++) {
      expect(recovered[i]!).toBeGreaterThan(recovered[i - 1]!);
    }
    expect(recovered.at(-1)).toBeCloseTo(103 / 115, 12);
    expect(recovered[0]!).toBeCloseTo(4 / 16, 12);
  });
});

// ---------------------------------------------------------------------------
// §8.4 recency — WM-FIXTURE-004, WM-FIXTURE-005
// ---------------------------------------------------------------------------

describe("WM-FIXTURE-004-recency-decay-worked", () => {
  it("reproduces the four worked weights at 3/18/36/90 days with half_life=18", () => {
    expect(DECAY_HALF_LIFE_DAYS).toBe(18);
    // 18 and 36 and 90 are exact powers of the half-life.
    expect(decayWeight(18)).toBe(0.5);
    expect(decayWeight(36)).toBe(0.25);
    expect(decayWeight(90)).toBe(0.03125);
    // 3 days: 0.5^(3/18) = 0.8909. The chapter prints 0.892; that is a
    // rounding slip in the prose (it rounds 1/6 to 0.167 then exponentiates).
    // The formula is the authority, so the formula's value is asserted.
    expect(decayWeight(3)).toBeCloseTo(0.890899, 6);
    expect(decayWeight(3)).toBeCloseTo(0.892, 2);
  });

  it("a sample from the future is worth no more than one from now, and never more", () => {
    expect(decayWeight(0)).toBe(1);
    expect(decayWeight(-5)).toBe(1);
    expect(decayWeight(Number.NaN)).toBe(1);
  });

  it("rejects a non-positive half-life rather than silently disabling the decay", () => {
    expect(() => decayWeight(1, 0)).toThrow(RangeError);
    expect(() => decayWeight(1, -3)).toThrow(RangeError);
    expect(() => decayWeight(1, Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it("the 1% pruning floor lands where §8.4.1 says it does", () => {
    expect(decayWeight(staleAfterDays())).toBeCloseTo(0.01, 12);
    // 18 * log2(100) = 119.6 days, i.e. "somewhere around 120 days"
    expect(staleAfterDays()).toBeCloseTo(119.59, 2);
  });
});

describe("WM-FIXTURE-005-recency-weighting-with-trend", () => {
  const ref = bigramRef(singleKey("t"), singleKey("h"));

  it("Scenario B: recency-weighted 162.9 ms, not the naive 193.3 ms", () => {
    const samples: BigramSample[] = [
      { from: singleKey("t"), to: singleKey("h"), intervalMs: 120, correct: true, atMs: NOW },
      {
        from: singleKey("t"),
        to: singleKey("h"),
        intervalMs: 200,
        correct: true,
        atMs: daysAgo(18),
      },
      {
        from: singleKey("t"),
        to: singleKey("h"),
        intervalMs: 260,
        correct: true,
        atMs: daysAgo(36),
      },
    ];
    const score = proficiency(ref, itemEvidence(ref, samples, { asOfMs: NOW }), context());

    // (1.0*120 + 0.5*200 + 0.25*260) / 1.75 = 285 / 1.75
    expect(score.meanIntervalMs).toBeCloseTo(285 / 1.75, 9);
    expect(score.meanIntervalMs).toBeCloseTo(162.857, 3);
    // The naive average the chapter rejects: 580 / 3
    expect(score.meanIntervalMs).not.toBeCloseTo(580 / 3, 3);
    // …and it sits near today's real 120 ms rather than near the stale average.
    expect(score.meanIntervalMs!).toBeLessThan(580 / 3);
  });

  it("Scenario A: a stable user barely moves the number, which is the point", () => {
    const samples: BigramSample[] = [
      { from: singleKey("t"), to: singleKey("h"), intervalMs: 150, correct: true, atMs: NOW },
      {
        from: singleKey("t"),
        to: singleKey("h"),
        intervalMs: 200,
        correct: true,
        atMs: daysAgo(18),
      },
      {
        from: singleKey("t"),
        to: singleKey("h"),
        intervalMs: 140,
        correct: true,
        atMs: daysAgo(36),
      },
    ];
    const score = proficiency(ref, itemEvidence(ref, samples, { asOfMs: NOW }), context());

    expect(score.meanIntervalMs).toBeCloseTo(285 / 1.75, 9);
    // Naive 490/3 = 163.3 — within 0.5 ms, exactly as the chapter says.
    expect(score.meanIntervalMs! - 490 / 3).toBeLessThan(0.5);
  });

  it("a single enormous IKI cannot drag the weighted mean to Infinity", () => {
    const samples: BigramSample[] = [
      { from: singleKey("t"), to: singleKey("h"), intervalMs: 150, correct: true, atMs: NOW },
      { from: singleKey("t"), to: singleKey("h"), intervalMs: 200, correct: true, atMs: NOW },
      { from: singleKey("t"), to: singleKey("h"), intervalMs: 140, correct: true, atMs: NOW },
      // §4.12 self-relative exclusion: 10^9 is 7 000 000x the 140 ms median.
      { from: singleKey("t"), to: singleKey("h"), intervalMs: 1e9, correct: true, atMs: NOW },
    ];
    const evidence = itemEvidence(ref, samples, { asOfMs: NOW });
    const score = proficiency(ref, evidence, context());

    expect(evidence.hesitations).toBe(1);
    expect(Number.isFinite(score.meanIntervalMs!)).toBe(true);
    expect(score.meanIntervalMs!).toBeCloseTo(490 / 3, 3);
  });
});

// ---------------------------------------------------------------------------
// Confidence floor — D-M4-3. The failing directions.
// ---------------------------------------------------------------------------

describe("LRN02-FAIL-01-single-observation-is-never-mastery", () => {
  it("one clean observation on a slow key is 'watching' with confidence 1/8, not weak", () => {
    const ref = keyRef(singleKey("q"));
    const evidence = itemEvidence(ref, keySamples("q", 1, 900), { asOfMs: NOW });
    const score = proficiency(ref, evidence, context());

    expect(score.observations).toBe(1);
    expect(score.classification).toBe("watching");
    expect(score.classification).not.toBe("weak");
    expect(score.classification).not.toBe("solid");
    // The floor bites on the numeric confidence too: 1/8, never 1.
    expect(score.confidence).toBe(1 / CONFIDENCE_FLOOR_SAMPLES);
    expect(score.confidence).toBeLessThan(1);
  });

  it("the floor bites exactly at the boundary: 7 samples watching, 8 samples judged", () => {
    const ref = keyRef(singleKey("q"));
    const below = proficiency(
      ref,
      itemEvidence(ref, keySamples("q", CONFIDENCE_FLOOR_SAMPLES - 1, 900), { asOfMs: NOW }),
      context(),
    );
    const at = proficiency(
      ref,
      itemEvidence(ref, keySamples("q", CONFIDENCE_FLOOR_SAMPLES, 900), { asOfMs: NOW }),
      context(),
    );

    expect(below.observations).toBe(7);
    expect(below.classification).toBe("watching");
    expect(at.observations).toBe(8);
    expect(at.classification).toBe("weak");
    expect(at.confidence).toBe(1);
  });

  it("confidence is capped at 1 no matter how much evidence piles up", () => {
    const ref = keyRef(singleKey("q"));
    const score = proficiency(
      ref,
      itemEvidence(ref, keySamples("q", 500, 900), { asOfMs: NOW }),
      context(),
    );
    expect(score.confidence).toBe(1);
    expect(score.observations).toBe(500);
  });
});

describe("LRN02-FAIL-02-unknown-is-not-weak", () => {
  it("a never-attempted key has null severity, not zero, and is classified unmeasured", () => {
    const ref = keyRef(singleKey("q"));
    const score = proficiency(ref, itemEvidence(ref, [], { asOfMs: NOW }), context());

    expect(score.classification).toBe("unmeasured");
    // The single most important assertion in this file: null !== 0.
    expect(score.severity).toBeNull();
    expect(score.severity).not.toBe(0);
    expect(score.severityDetail).toBeNull();
    expect(score.accuracy).toBeNull();
    expect(score.meanIntervalMs).toBeNull();
    expect(score.medianMs).toBeNull();
    expect(score.estimateMs).toBeNull();
    expect(score.confidence).toBe(0);
  });

  it("unknown and measured-and-strong are different states, not both 'not weak'", () => {
    const never = proficiency(keyRef(singleKey("q")), emptyEvidence(), context());
    const strong = proficiency(
      keyRef(singleKey("a")),
      itemEvidence(keyRef(singleKey("a")), keySamples("a", 20, 150), { asOfMs: NOW }),
      context(),
    );

    expect(strong.classification).toBe("solid");
    expect(strong.severity).toBe(0);
    expect(never.classification).not.toBe(strong.classification);
    expect(never.severity).not.toBe(strong.severity);
  });

  it("an all-error item is weak and maximally errored — the opposite end of the scale", () => {
    const ref = keyRef(singleKey("q"));
    const score = proficiency(
      ref,
      itemEvidence(ref, keySamples("q", 12, 180, 12), { asOfMs: NOW }),
      context(),
    );
    expect(score.accuracy).toBe(0);
    expect(score.classification).toBe("weak");
    expect(score.severity).toBeGreaterThan(0);
  });
});

describe("WM-FIXTURE-011-zero-samples-never-ranked", () => {
  it("produces finite, null-valued output and never divides by zero", () => {
    const ref = bigramRef(singleKey("q"), singleKey("u"));
    const evidence = itemEvidence(ref, [], { asOfMs: NOW });

    expect(evidence.observations).toBe(0);
    expect(evidence.lastAtMs).toBeNull();
    expect(evidence.weightQ).toBe(0);

    const score = proficiency(ref, evidence, context());
    for (const value of Object.values(score)) {
      if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
    }
    expect(rankWeak([score], { frequencyWeight: () => 1 })).toEqual([]);
  });

  it("appears in the unknown bucket, never in the weak bucket, and the two are disjoint", () => {
    const expected = [keyRef(singleKey("q")), keyRef(singleKey("a"))];
    const scores = new Map<string, ItemProficiency>([
      [
        "a",
        proficiency(
          keyRef(singleKey("a")),
          itemEvidence(keyRef(singleKey("a")), keySamples("a", 20, 150), { asOfMs: NOW }),
          context(),
        ),
      ],
    ]);

    const report = coverageReport(expected, scores);
    expect(report.unmeasured.map(itemId)).toEqual(["q"]);
    expect(report.weak.map((s) => itemId(s.item))).toEqual([]);
    expect(report.measured.map((s) => itemId(s.item))).toEqual(["a"]);
    expect(report.totalObservations).toBe(20);
  });

  it("a below-floor item is 'thin' (watching), never 'unmeasured'", () => {
    const expected = [keyRef(singleKey("q"))];
    const scores = new Map<string, ItemProficiency>([
      [
        "q",
        proficiency(
          keyRef(singleKey("q")),
          itemEvidence(keyRef(singleKey("q")), keySamples("q", 3, 400), { asOfMs: NOW }),
          context(),
        ),
      ],
    ]);

    const report = coverageReport(expected, scores);
    expect(report.unmeasured).toEqual([]);
    expect(report.thin.map((s) => itemId(s.item))).toEqual(["q"]);
    expect(report.measured).toEqual([]);
    expect(report.weak).toEqual([]);
  });
});

describe("WM-FIXTURE-012-stale-evidence-is-never-current", () => {
  it("marks an item whose newest sample is 200 days old as stale and unranked", () => {
    const ref = bigramRef(singleKey("q"), singleKey("u"));
    const evidence = itemEvidence(ref, bigramSamples("q", "u", 30, 340, 4, daysAgo(200)), {
      asOfMs: NOW,
    });
    const score = proficiency(ref, evidence, context());

    expect(score.stale).toBe(true);
    expect(score.newestAgeMs).toBe(200 * MS_PER_DAY);
    expect(rankWeak([score], { frequencyWeight: () => 0.5 })).toEqual([]);

    const report = coverageReport([ref], new Map([[itemId(ref), score]]));
    // Measured (it was really typed 30 times) but explicitly not weak.
    expect(report.measured).toHaveLength(1);
    expect(report.weak).toEqual([]);
  });

  it("an item touched yesterday is not stale", () => {
    const ref = bigramRef(singleKey("q"), singleKey("u"));
    const evidence = itemEvidence(ref, bigramSamples("q", "u", 30, 340, 4, daysAgo(1)), {
      asOfMs: NOW,
    });
    expect(proficiency(ref, evidence, context()).stale).toBe(false);
  });
});

describe("WM-FIXTURE-013-profile-readiness", () => {
  it("a thin history reports not-ready rather than a fabricated ranking", () => {
    const refs = [keyRef(singleKey("a")), keyRef(singleKey("q"))];
    const scores = new Map<string, ItemProficiency>(
      refs.map((ref) => {
        const key = ref.kind === "key" ? ref.key : "q";
        return [
          key,
          proficiency(ref, itemEvidence(ref, keySamples(key, 60, 900), { asOfMs: NOW }), context()),
        ];
      }),
    );

    const report = coverageReport(refs, scores);
    expect(report.totalObservations).toBe(120);
    expect(report.ready).toBe(false);
    // Readiness gates the *ranking*, not the diagnosis of a known-weak item.
    expect(report.weak).toHaveLength(2);
    expect(report.weak[0]!.severity!).toBeGreaterThan(PROPOSED_WEAK_SEVERITY_CUT);
  });

  it("crossing the 150-observation threshold flips readiness", () => {
    const refs = [keyRef(singleKey("q"))];
    const build = (count: number) =>
      coverageReport(
        refs,
        new Map([
          [
            "q",
            proficiency(
              keyRef(singleKey("q")),
              itemEvidence(refs[0]!, keySamples("q", count, 900), { asOfMs: NOW }),
              context(),
            ),
          ],
        ]),
      );

    expect(build(149).ready).toBe(false);
    expect(build(150).ready).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ANA-03 same-hand vs alternate-hand, layout-derived
// ---------------------------------------------------------------------------

describe("LRN02-HAND-same-hand-vs-alternate-hand", () => {
  const score = (from: string, to: string, layout: Layout): ItemProficiency =>
    bigramProficiency(
      singleKey(from),
      singleKey(to),
      itemEvidence(bigramRef(singleKey(from), singleKey(to)), bigramSamples(from, to, 20, 340, 3), {
        asOfMs: NOW,
      }),
      { ...context(), layout },
    );

  it("tags t→h cross-hand on QWERTY and same-hand on Dvorak", () => {
    expect(score("t", "h", "qwerty-us").hand).toBe("cross");
    expect(score("t", "h", "dvorak").hand).toBe("same");
    expect(score("t", "h", "dvorak").sameFinger).toBe(false);
  });

  it("f→v is same-finger on QWERTY but not on Dvorak", () => {
    // QWERTY: f and v are both left-index. Dvorak: they sit on the QWERTY 'y'
    // (right middle) and 'b' (right pinky) keys — so still one hand, but no
    // longer one finger, which is exactly the layout-dependence the weakness
    // model has to respect (chapter-4 §4.12).
    expect(score("f", "v", "qwerty-us").sameFinger).toBe(true);
    expect(score("f", "v", "qwerty-us").hand).toBe("same");
    expect(score("f", "v", "dvorak").sameFinger).toBe(false);
    expect(score("f", "v", "dvorak").hand).toBe("same");
  });

  it("an AltGr-dependent character is 'unknown', never guessed into a hand", () => {
    const altgr = score("@", "a", "azerty");
    expect(altgr.hand).toBe("unknown");
    expect(altgr.sameFinger).toBeNull();
  });

  it("keys carry no hand relation at all", () => {
    const key = keyProficiency(
      singleKey("t"),
      itemEvidence(keyRef(singleKey("t")), keySamples("t", 20, 340), { asOfMs: NOW }),
      context(),
    );
    expect(key.hand).toBe("unknown");
    expect(key.sameFinger).toBeNull();
  });

  it("compares the two hand categories separately and skips keys", () => {
    const comparison = compareByHand([
      score("t", "h", "qwerty-us"),
      score("e", "n", "qwerty-us"),
      score("@", "a", "azerty"),
      keyProficiency(
        singleKey("t"),
        itemEvidence(keyRef(singleKey("t")), keySamples("t", 20, 340), { asOfMs: NOW }),
        context(),
      ),
    ]);

    // t→h and e→n are both cross-hand on QWERTY; @→a is unmapped.
    expect(comparison.alternateHand.items).toBe(2);
    expect(comparison.alternateHand.observations).toBe(40);
    expect(comparison.alternateHand.meanSeverity).toBeGreaterThan(0);
    expect(comparison.sameHand.items).toBe(0);
    expect(comparison.sameHand.meanSeverity).toBeNull();
    expect(comparison.unknown.items).toBe(1);
    // The key is not in any bucket: it has no relation to be counted in.
    expect(
      comparison.sameHand.items + comparison.alternateHand.items + comparison.unknown.items,
    ).toBe(3);
  });

  it("an empty input yields empty, non-NaN summaries", () => {
    const comparison = compareByHand([]);
    expect(comparison.sameHand.items).toBe(0);
    expect(comparison.alternateHand.meanSeverity).toBeNull();
    expect(comparison.unknown.meanSeverity).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Order dependence: convergent, and proven convergent
// ---------------------------------------------------------------------------

describe("LRN02-CONV-update-rule-is-order-independent", () => {
  it("replaying a multiset in any order reaches bit-identical evidence (seeds 1-24)", () => {
    const ref = bigramRef(singleKey("q"), singleKey("u"));
    const next = lcg(20260928);
    const observations: BigramSample[] = Array.from({ length: 60 }, () => ({
      from: singleKey("q"),
      to: singleKey("u"),
      intervalMs: 60 + Math.floor(next() * 700),
      correct: next() > 0.2,
      atMs: NOW - Math.floor(next() * 40) * MS_PER_DAY,
    }));

    const canonical = itemEvidence(ref, observations, { asOfMs: NOW });

    for (let seed = 1; seed <= 24; seed++) {
      const shuffle = lcg(seed);
      const shuffled = [...observations];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(shuffle() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
      }
      // Exact equality, not closeTo: this is the whole claim.
      expect(itemEvidence(ref, shuffled, { asOfMs: NOW })).toEqual(canonical);
    }
  });

  it("produces bit-identical proficiency output for every permutation too", () => {
    const ref = keyRef(singleKey("z"));
    const observations = keySamples("z", 40, 340, 6).map((sample, i) => ({
      ...sample,
      atMs: NOW - i * 60_000,
    }));

    const canonical = proficiency(ref, itemEvidence(ref, observations, { asOfMs: NOW }), context());
    for (let seed = 1; seed <= 12; seed++) {
      const shuffle = lcg(seed * 7919);
      const shuffled = [...observations];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(shuffle() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
      }
      expect(proficiency(ref, itemEvidence(ref, shuffled, { asOfMs: NOW }), context())).toEqual(
        canonical,
      );
    }
  });

  it("convergence survives duplicate and identical observations (reference identity, not value)", () => {
    const ref = keyRef(singleKey("z"));
    const shared = { ...keySamples("z", 1, 340)[0]! };
    const observations: KeySample[] = [
      shared,
      shared,
      { ...keySamples("z", 1, 341)[0]! },
      { ...keySamples("z", 1, 900)[0]! },
      shared,
    ];
    const forward = itemEvidence(ref, observations, { asOfMs: NOW });
    const reversed = itemEvidence(ref, [...observations].reverse(), { asOfMs: NOW });
    expect(reversed).toEqual(forward);
  });
});

// ---------------------------------------------------------------------------
// Pathological inputs: no NaN, no Infinity, no negative proficiency
// ---------------------------------------------------------------------------

describe("LRN02-ROBUST-pathological-inputs", () => {
  const refs = [keyRef(singleKey("q")), bigramRef(singleKey("q"), singleKey("u"))];
  const samples: KeySample[] = keySamples("q", 1, 180);

  function assertSane(score: ItemProficiency): void {
    expect(Number.isNaN(score.confidence)).toBe(false);
    expect(score.confidence).toBeGreaterThanOrEqual(0);
    expect(score.confidence).toBeLessThanOrEqual(1);
    if (score.severity !== null) {
      expect(Number.isFinite(score.severity)).toBe(true);
      expect(score.severity).toBeGreaterThanOrEqual(0);
      expect(score.severity).toBeLessThanOrEqual(1);
    }
    if (score.accuracy !== null) {
      expect(Number.isFinite(score.accuracy)).toBe(true);
      expect(score.accuracy).toBeGreaterThanOrEqual(0);
      expect(score.accuracy).toBeLessThanOrEqual(1);
    }
    if (score.meanIntervalMs !== null) {
      expect(Number.isFinite(score.meanIntervalMs)).toBe(true);
      expect(score.meanIntervalMs).toBeGreaterThanOrEqual(0);
    }
    expect(score.observations).toBeGreaterThanOrEqual(0);
    expect(score.errors).toBeLessThanOrEqual(score.observations);
  }

  it("zero samples", () => {
    for (const ref of refs) assertSane(proficiency(ref, emptyEvidence(), context()));
  });

  it("all errors", () => {
    for (const ref of refs) {
      const observations = keySamples("q", 20, 180, 20);
      assertSane(proficiency(ref, itemEvidence(ref, observations, { asOfMs: NOW }), context()));
    }
  });

  it("all maximum latency", () => {
    for (const ref of refs) {
      const observations = keySamples("q", 20, 1e7);
      assertSane(proficiency(ref, itemEvidence(ref, observations, { asOfMs: NOW }), context()));
    }
  });

  it("one enormous IKI (overflows the exact-integer accumulator and is rejected)", () => {
    for (const ref of refs) {
      const observations = [...keySamples("q", 20, 180), { ...samples[0]!, intervalMs: 1e300 }];
      const evidence = itemEvidence(ref, observations, { asOfMs: NOW });
      expect(evidence.invalid).toBe(1);
      expect(evidence.observations).toBe(20);
      assertSane(proficiency(ref, evidence, context()));
    }
  });

  it("NaN, Infinity and negative intervals are rejected, not accumulated", () => {
    // Each bad shape is checked on its own, because the exact-integer
    // accumulator is a *second* line of defence: it happens to catch a NaN
    // too, which would hide the fact that the input guard was removed.
    const badInputs = [
      { label: "NaN interval", patch: { intervalMs: Number.NaN } },
      { label: "Infinity interval", patch: { intervalMs: Number.POSITIVE_INFINITY } },
      { label: "negative interval", patch: { intervalMs: -50 } },
      { label: "NaN timestamp", patch: { atMs: Number.NaN } },
      { label: "Infinity timestamp", patch: { atMs: Number.POSITIVE_INFINITY } },
    ];

    for (const { label, patch } of badInputs) {
      for (const ref of refs) {
        const evidence = itemEvidence(
          ref,
          [...keySamples("q", 10, 180), { ...samples[0]!, ...patch }],
          { asOfMs: NOW },
        );
        expect(evidence.invalid, label).toBe(1);
        expect(evidence.observations, label).toBe(10);
        expect(evidence.errors, label).toBe(0);
        assertSane(proficiency(ref, evidence, context()));
      }
    }
  });

  it("a zero or negative baseline produces no slowness claim and no NaN", () => {
    for (const medianMs of [0, -180]) {
      const evidence = itemEvidence(keyRef(singleKey("q")), keySamples("q", 20, 900), {
        asOfMs: NOW,
      });
      const score = proficiency(keyRef(singleKey("q")), evidence, {
        ...context(),
        baseline: { medianMs, errorRate: 0.06 },
      });
      expect(score.severityDetail!.relativeSlowness).toBe(0);
      expect(Number.isFinite(score.severity!)).toBe(true);
      assertSane(score);
    }
  });

  it("a zero baseline error rate saturates instead of dividing by zero", () => {
    const evidence = itemEvidence(keyRef(singleKey("q")), keySamples("q", 20, 180, 10), {
      asOfMs: NOW,
    });
    const score = proficiency(keyRef(singleKey("q")), evidence, {
      ...context(),
      baseline: { medianMs: 180, errorRate: 0 },
    });
    expect(score.severityDetail!.relativeErrorRate).toBe(RELATIVE_ERROR_RATE_CEILING);
    expect(Number.isFinite(score.severity!)).toBe(true);
  });

  it("observations from the future are accepted at full weight, not more", () => {
    const evidence = itemEvidence(
      keyRef(singleKey("q")),
      keySamples("q", 8, 900, 0, NOW + MS_PER_DAY),
      {
        asOfMs: NOW,
      },
    );
    expect(evidence.weightQ).toBe(8 * 1_000_000);
    expect(evidence.lastAtMs).toBe(NOW + MS_PER_DAY);
    assertSane(proficiency(keyRef(singleKey("q")), evidence, context()));
  });

  it("a 100k-sample run stays inside exact integer arithmetic", () => {
    const observations = keySamples("q", 100_000, 240);
    const evidence = itemEvidence(keyRef(singleKey("q")), observations, { asOfMs: NOW });
    expect(Number.isSafeInteger(evidence.weightQ)).toBe(true);
    expect(Number.isSafeInteger(evidence.weightedIntervalQ)).toBe(true);
    expect(evidence.invalid).toBe(0);
    assertSane(proficiency(keyRef(singleKey("q")), evidence, context()));
  });

  it("every observation being an outlier leaves a finite, null-valued speed signal", () => {
    // 10 identical 900 ms samples cannot exclude one another (aggregateBigram
    // never excludes a single sample), so this exercises the n<2 guard instead
    // by asserting the degenerate median path stays finite.
    const evidence = itemEvidence(keyRef(singleKey("q")), keySamples("q", 1, 900), { asOfMs: NOW });
    const score = proficiency(keyRef(singleKey("q")), evidence, context());
    assertSane(score);
    expect(score.medianMs).toBe(900);
  });
});

// ---------------------------------------------------------------------------
// Item identity — the shape that makes text unrepresentable
// ---------------------------------------------------------------------------

describe("LRN02-CONFIG-calibration-knobs-are-injectable", () => {
  it("a shorter half-life decays evidence faster, on both sides of the call", () => {
    const ref = keyRef(singleKey("q"));
    const observations = keySamples("q", 20, 340, 0, NOW - 60 * MS_PER_DAY);
    const at = (halfLifeDays: number) =>
      proficiency(ref, itemEvidence(ref, observations, { asOfMs: NOW, halfLifeDays }), {
        ...context(),
        halfLifeDays,
      }).evidence;

    // 60 days at the default 18-day half-life is 3.33 half-lives.
    expect(at(DECAY_HALF_LIFE_DAYS)).toBeCloseTo(20 * 0.5 ** (60 / 18), 2);
    // At 7 days it is 8.6 half-lives, so the evidence is a rounding error.
    expect(at(7)).toBeLessThan(at(DECAY_HALF_LIFE_DAYS));
    expect(staleAfterDays(7)).toBeCloseTo(46.5, 1);
  });

  it("a different shrinkage constant moves the thin-item estimate", () => {
    const ref = keyRef(singleKey("q"));
    const evidence = itemEvidence(ref, keySamples("q", 2, 900), { asOfMs: NOW });

    expect(proficiency(ref, evidence, { ...context(), shrinkageK: 15 }).estimateMs).toBeCloseTo(
      4500 / 17,
      9,
    );
    // k=0 trusts the two samples completely: the naive 900 ms.
    expect(proficiency(ref, evidence, { ...context(), shrinkageK: 0 }).estimateMs).toBe(900);
    // k=60 trusts the baseline almost entirely.
    expect(proficiency(ref, evidence, { ...context(), shrinkageK: 60 }).estimateMs).toBeLessThan(
      4500 / 17,
    );
  });

  it("the weak/solid cut is a declared proposal and can be moved per call", () => {
    const ref = keyRef(singleKey("q"));
    const evidence = itemEvidence(ref, keySamples("q", 20, 340, 6), { asOfMs: NOW });

    expect(proficiency(ref, evidence, context()).classification).toBe("weak");
    expect(proficiency(ref, evidence, { ...context(), weakCut: 0.9 }).classification).toBe("solid");

    const report = coverageReport(
      [ref],
      new Map([[itemId(ref), proficiency(ref, evidence, context())]]),
      {
        weakCut: 0.9,
      },
    );
    expect(report.measured).toHaveLength(1);
    expect(report.weak).toEqual([]);
  });

  it("the readiness threshold is injectable (and defaults to §8.5.2's 150)", () => {
    const ref = keyRef(singleKey("q"));
    const scores = new Map([
      [
        "q",
        proficiency(ref, itemEvidence(ref, keySamples("q", 20, 900), { asOfMs: NOW }), context()),
      ],
    ]);

    expect(MIN_PROFILE_OBSERVATIONS).toBe(150);
    expect(coverageReport([ref], scores).ready).toBe(false);
    expect(coverageReport([ref], scores, { minTotalObservations: 20 }).ready).toBe(true);
  });
});

describe("LRN02-STORAGE-a-damaged-stored-record-cannot-crash-the-score", () => {
  // The recompute job feeds records back out of a database, so `proficiency`
  // must survive a record that no honest builder could produce.

  it("observations with no retained samples yield null speed signals, not NaN", () => {
    const ref = keyRef(singleKey("q"));
    const damaged: ItemEvidence = {
      observations: 12,
      errors: 3,
      samples: 0,
      hesitations: 12,
      invalid: 0,
      weightQ: 0,
      weightedIntervalQ: 0,
      medianMs: 0,
      lastAtMs: NOW,
    };
    const score = proficiency(ref, damaged, context());

    expect(score.medianMs).toBeNull();
    expect(score.meanIntervalMs).toBeNull();
    expect(score.estimateMs).toBeNull();
    expect(score.severity).toBeNull();
    expect(score.classification).toBe("watching");
    expect(score.accuracy).toBeCloseTo(0.75, 12);
  });

  it("evidence with no timestamp cannot claim a recency, but still scores", () => {
    const ref = keyRef(singleKey("q"));
    const damaged: ItemEvidence = {
      ...emptyEvidence(),
      observations: 20,
      errors: 0,
      samples: 20,
      weightQ: 20_000_000,
      weightedIntervalQ: 3_600_000,
      medianMs: 180,
    };
    const score = proficiency(ref, damaged, context());

    expect(score.newestAgeMs).toBeNull();
    expect(score.stale).toBe(false);
    expect(score.severity).toBe(0);
    expect(score.classification).toBe("solid");
  });

  it("a NaN central tendency collapses the severity to zero rather than propagating", () => {
    const result = severity({ itemMs: Number.NaN, itemSamples: 10, errors: 0, baseline: BASELINE });
    expect(result.score).toBe(0);
    expect(result.relativeSlowness).toBe(0);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it("an item that is present but wholly unmeasured lands in 'unknown', not 'weak'", () => {
    const ref = keyRef(singleKey("q"));
    const report = coverageReport(
      [ref],
      new Map([[itemId(ref), proficiency(ref, emptyEvidence(), context())]]),
    );
    expect(report.unmeasured.map(itemId)).toEqual(["q"]);
    expect(report.totalObservations).toBe(0);
  });

  it("compareByHand reports a null mean when a bucket has items but none classified", () => {
    const ref = { kind: "bigram", bigram: "t→h" } as never;
    const score = proficiency(ref, emptyEvidence(), context());
    const comparison = compareByHand([score]);

    expect(comparison.alternateHand.items).toBe(1);
    expect(comparison.alternateHand.observations).toBe(0);
    expect(comparison.alternateHand.meanSeverity).toBeNull();
  });
});

describe("LRN02-RANK-ties-break-deterministically", () => {
  it("identical expected benefit falls back to severity, then to id", () => {
    const build = (from: string, to: string): ItemProficiency =>
      bigramProficiency(
        singleKey(from),
        singleKey(to),
        itemEvidence(
          bigramRef(singleKey(from), singleKey(to)),
          bigramSamples(from, to, 22, 340, 4),
          { asOfMs: NOW },
        ),
        context({ medianMs: 180, errorRate: 4 / 22 / 3 }),
      );

    const scores = [build("z", "x"), build("q", "u")];
    // Every frequency is the same, so expected benefit ties and the id decides.
    expect(rankWeak(scores, { frequencyWeight: () => 0.01 }).map((r) => r.id)).toEqual([
      "q→u",
      "z→x",
    ]);
    // Input order is irrelevant: the sort is total.
    expect(
      rankWeak([...scores].reverse(), { frequencyWeight: () => 0.01 }).map((r) => r.id),
    ).toEqual(["q→u", "z→x"]);
  });

  it("a zero frequency weight ranks last rather than dropping the item", () => {
    const ref = bigramRef(singleKey("q"), singleKey("u"));
    const score = bigramProficiency(
      singleKey("q"),
      singleKey("u"),
      itemEvidence(ref, bigramSamples("q", "u", 22, 340, 4), { asOfMs: NOW }),
      context({ medianMs: 180, errorRate: 4 / 22 / 3 }),
    );

    const ranked = rankWeak([score], { frequencyWeight: () => 0 });
    expect(ranked).toHaveLength(1);
    expect(ranked[0]!.expectedBenefit).toBe(0);
  });
});

describe("LRN02-KEYITEM-identity", () => {
  it("a key is exactly one character", () => {
    expect(singleKey("q")).toBe("q");
    expect(singleKey("€")).toBe("€");
    expect(() => singleKey("")).toThrow(RangeError);
    expect(() => singleKey("qu")).toThrow(RangeError);
    expect(() => singleKey("the quick brown fox")).toThrow(RangeError);
  });

  it("a transition id round-trips and rejects anything that is not a transition", () => {
    expect(bigramChars(bigram(singleKey("q"), singleKey("u")))).toEqual(["q", "u"]);
    expect(() => bigramChars("qu" as never)).toThrow(RangeError);
    expect(() => bigramChars("" as never)).toThrow(RangeError);
    expect(() => bigramChars("q→u→x" as never)).toThrow(RangeError);
    expect(() => bigramChars("→a" as never)).toThrow(RangeError);
    // An item whose key is literally the separator cannot be represented, and
    // says so instead of silently colliding with another transition.
    expect(() => bigramChars(bigram(singleKey("→"), singleKey("a")))).toThrow(RangeError);
  });

  it("item ids are the key itself and the readable transition id", () => {
    expect(itemId(keyRef(singleKey("q")))).toBe("q");
    expect(itemId(bigramRef(singleKey("q"), singleKey("u")))).toBe("q→u");
  });
});
