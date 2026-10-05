import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MS_PER_DAY,
  bigramProficiency,
  compareByHand,
  coverageReport,
  itemEvidence,
  itemId,
  keyProficiency,
  keyRef,
  proficiency,
  rankWeak,
  singleKey,
  type BigramSample,
  type ItemProficiency,
  type KeySample,
  type ProficiencyContext,
} from "../src/proficiency.js";

/**
 * LRN-02 — the two properties that are not about numbers.
 *
 * 1. PRIVACY (AGENTS.md rule 4, keystroke-privacy skill): the model works on
 *    keys, bigrams and timings. Typed text must be structurally unable to
 *    enter it — proven at compile time (the type has no field for it) and at
 *    run time (a field added by force still never reaches the output).
 * 2. PURITY (AGENTS.md rule 3, INT-05 server recompute): no clock, no
 *    randomness, no I/O, no module state. Proven by making `Date.now` and
 *    `Math.random` throw for the duration of a full pipeline run and by
 *    scoring the same history twice for bit-identical results.
 */

const NOW = 1_800_000_000_000;
const context: ProficiencyContext = {
  asOfMs: NOW,
  layout: "qwerty-us",
  baseline: { medianMs: 180, errorRate: 0.06 },
};

/** A word no metric should ever be able to see, in one place only. */
const SECRET = "correcthorsebatterystaple";

describe("LRN02-PRIVACY-text-is-unrepresentable", () => {
  it("KeySample has no place to put text — the compiler refuses", () => {
    const sample: KeySample = {
      key: singleKey("q"),
      intervalMs: 180,
      correct: true,
      atMs: NOW,
      // @ts-expect-error A text field has no meaning here and must not typecheck.
      word: SECRET,
    };
    expect(sample.key).toBe("q");
  });

  it("BigramSample has no place to put text either", () => {
    const sample: BigramSample = {
      from: singleKey("q"),
      to: singleKey("u"),
      intervalMs: 180,
      correct: true,
      atMs: NOW,
      // @ts-expect-error Same for the transition shape.
      text: SECRET,
    };
    expect(sample.to).toBe("u");
  });

  it("even a force-added text field never reaches the evidence or the score", () => {
    const hostile = {
      key: singleKey("q"),
      intervalMs: 180,
      correct: true,
      atMs: NOW,
      word: SECRET,
      text: SECRET,
      value: SECRET,
    } as unknown as KeySample;

    const ref = keyRef(singleKey("q"));
    const evidence = itemEvidence(ref, [hostile], { asOfMs: NOW });
    const score = proficiency(ref, evidence, context);

    expect(JSON.stringify(evidence)).not.toContain(SECRET);
    expect(JSON.stringify(score)).not.toContain(SECRET);
    // Only the single-character identity survives.
    expect(JSON.stringify(score)).toContain('"key":"q"');
    expect(JSON.stringify(score)).not.toContain("word");
  });

  it("a whole hostile history leaves no trace of the words behind it", () => {
    const hostile = Array.from({ length: 40 }, (_, i) => ({
      key: singleKey("q"),
      intervalMs: 300 + i,
      correct: true,
      atMs: NOW,
      word: `${SECRET}-${i}`,
    })) as unknown as KeySample[];

    const ref = keyRef(singleKey("q"));
    const score = keyProficiency(
      singleKey("q"),
      itemEvidence(ref, hostile, { asOfMs: NOW }),
      context,
    );
    const serialised = JSON.stringify([
      score,
      coverageReport([ref], new Map([[itemId(ref), score]])),
      rankWeak([score], { frequencyWeight: () => 1 }),
      compareByHand([score]),
    ]);

    expect(serialised).not.toContain(SECRET);
    expect(serialised).not.toContain("correcthorse");
  });
});

describe("LRN02-PURITY-no-clock-no-randomness", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("a full pipeline runs with Date.now and Math.random booby-trapped", () => {
    // `vi.spyOn(Date, "now")` rather than a literal `Date.now` reference: the
    // eslint ban on wall-clock reads exists for timing code (chapter 4 E10),
    // and this test is the opposite — it proves the engine refuses to read one.
    vi.spyOn(Date, "now").mockImplementation(() => {
      throw new Error("the engine must not read a wall clock");
    });
    vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("the engine must not be nondeterministic");
    });

    const observations: KeySample[] = Array.from({ length: 30 }, (_, i) => ({
      key: singleKey("q"),
      intervalMs: 200 + (i % 7) * 30,
      correct: i % 5 !== 0,
      atMs: NOW - i * 60_000,
    }));
    const ref = keyRef(singleKey("q"));
    const score = keyProficiency(
      singleKey("q"),
      itemEvidence(ref, observations, { asOfMs: NOW }),
      context,
    );

    expect(score.classification).toBe("weak");
    expect(score.observations).toBe(30);
    expect(score.meanIntervalMs).toBeGreaterThan(0);
  });

  it("scoring the same history twice is bit-identical (no hidden state)", () => {
    const build = (): ItemProficiency => {
      const observations: KeySample[] = Array.from({ length: 25 }, (_, i) => ({
        key: singleKey("q"),
        intervalMs: 180 + (i % 9) * 40,
        correct: i % 4 !== 0,
        atMs: NOW - i * 3_600_000,
      }));
      return keyProficiency(
        singleKey("q"),
        itemEvidence(keyRef(singleKey("q")), observations, { asOfMs: NOW }),
        context,
      );
    };

    expect(build()).toEqual(build());
  });

  it("the only thing that moves the numbers is the supplied asOfMs", () => {
    const observations: KeySample[] = Array.from({ length: 25 }, (_, i) => ({
      key: singleKey("q"),
      intervalMs: 180 + (i % 9) * 40,
      correct: i % 4 !== 0,
      atMs: NOW - 30 * MS_PER_DAY,
    }));
    const ref = keyRef(singleKey("q"));
    // Build AND score at the same instant, which is what any consumer does:
    // evidence weights are relative to the asOfMs the caller is scoring at.
    const at = (asOfMs: number): ItemProficiency =>
      keyProficiency(singleKey("q"), itemEvidence(ref, observations, { asOfMs }), {
        ...context,
        asOfMs,
      });

    const atNow = at(NOW);
    expect(at(NOW)).toEqual(atNow);

    // Shifting "now" by exactly one half-life (18 days) halves every weight —
    // this is what a server recompute at a later date has to reproduce, and it
    // can only do so because no clock was read inside the model.
    expect(at(NOW + 18 * MS_PER_DAY).evidence).toBeCloseTo(atNow.evidence * 0.5, 9);

    // And far enough out the same evidence is marked stale rather than current.
    const muchLater = at(NOW + 200 * MS_PER_DAY);
    expect(muchLater.stale).toBe(true);
    expect(rankWeak([muchLater], { frequencyWeight: () => 1 })).toEqual([]);
  });
});

describe("LRN02-BIGRAM-tag-survives-the-pipeline", () => {
  it("keeps the layout-derived hand tag on a scored transition", () => {
    const ref = { kind: "bigram", bigram: "t→h" } as never;
    const samples: BigramSample[] = Array.from({ length: 12 }, () => ({
      from: singleKey("t"),
      to: singleKey("h"),
      intervalMs: 200,
      correct: true,
      atMs: NOW,
    }));
    const score = bigramProficiency(
      singleKey("t"),
      singleKey("h"),
      itemEvidence(ref, samples, { asOfMs: NOW }),
      context,
    );

    expect(score.hand).toBe("cross");
    expect(score.sameFinger).toBe(false);
    expect(score.classification).toBe("solid");
  });
});
