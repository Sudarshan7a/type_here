/**
 * Band behaviour (CNT-02).
 *
 * The headline requirement is master-spec §6.2 Stage A: an Easy / Typical / Hard
 * label for prose, from a transparent score, with no multiplication. These tests
 * pin the label, the enum, the tie-break and the offline sanity check that
 * implementation guide §6.5 step 6 asks for ("obviously hard texts score Hard and
 * simple lowercase common-word texts score Easy").
 */
import { describe, expect, it } from "vitest";

import {
  BAND_BOUNDARIES,
  DIFFICULTY_BANDS,
  OUT_OF_SCOPE_REASONS,
  SCORE_QUANTISATION_STEP,
  TYPABILITY_FEATURE_SPECS,
  TYPABILITY_VERSION,
  TOTAL_FEATURE_WEIGHT,
  explainTypabilityBand,
  typabilityBand,
  type DifficultyBand,
} from "../src/index.ts";
import { bandForScore, distanceToBoundary, quantiseScore } from "../src/scoring.ts";

/** A real corpus passage (PROSE-01-001), so the fixtures are content someone will actually type. */
const PROSE =
  "Can you pick up milk on your way home? We're also out of bread and there's barely any coffee left in the jar.";

function bandOf(text: string, extra: Record<string, unknown> = {}): DifficultyBand | null {
  return typabilityBand({ text, family: "PROSE", language: "en", ...extra }).band;
}

describe("CNT-02 bands", () => {
  it("bands clean prose deterministically, and the same text always gets the same band", () => {
    const first = typabilityBand({ text: PROSE, family: "PROSE", language: "en" });
    const second = typabilityBand({ text: PROSE, family: "PROSE", language: "en" });
    expect(first).toEqual(second);
    expect(DIFFICULTY_BANDS).toContain(first.band);
    expect(first.source).toBe("computed");
    expect(first.reason).toBeNull();
    expect(first.modelVersion).toBe(TYPABILITY_VERSION);
  });

  it("gives the same band when the input is re-ordered or re-created, i.e. no hidden state", () => {
    const inputs = [
      { text: PROSE, family: "PROSE", language: "en" },
      {
        text: "the cat sat on the mat and then it went home again",
        family: "PROSE",
        language: "en",
      },
      { text: "short", family: "QUOTE", language: "en" },
    ];
    const forward = inputs.map((input) => typabilityBand(input).band);
    const backward = [...inputs]
      .reverse()
      .map((input) => typabilityBand(input).band)
      .reverse();
    expect(forward).toEqual(backward);
  });

  it("§6.5 step 6: a simple lowercase common-word text is Easy", () => {
    expect(bandOf("the cat sat on the mat and then it went home again to sleep for a while")).toBe(
      "easy",
    );
  });

  it("§6.5 step 6: an all-caps text is Hard", () => {
    expect(bandOf("MEETING AGENDA TOMORROW MORNING CONFERENCE ROOM BRING YOUR NOTES")).toBe("hard");
  });

  it("§6.5 step 6: rare long words are Hard", () => {
    expect(
      bandOf(
        "The pneumonoultramicroscopicsilicovolcanoconiosis diagnosis required interdisciplinary reconsideration.",
      ),
    ).toBe("hard");
  });

  it("is monotone: more awkward text never scores higher than the same text made easier", () => {
    const easy = explainTypabilityBand({
      text: "we can meet at the shop on friday",
    }).quantisedScore;
    const awkward = explainTypabilityBand({
      text: "We CAN meet at the SHOP on FRIDAY!!!",
    }).quantisedScore;
    expect(awkward).toBeLessThan(easy);
  });

  it("closes the band enum: every band the model can emit is in DIFFICULTY_BANDS", () => {
    const samples = [
      "the cat sat on the mat",
      PROSE,
      "MEETING AGENDA TOMORROW MORNING CONFERENCE ROOM BRING YOUR NOTES",
      "Pneumonoultramicroscopicsilicovolcanoconiosis reorganisation interdepartmental.",
    ];
    const emitted = new Set(samples.map((text) => bandOf(text)));
    for (const band of emitted) expect(DIFFICULTY_BANDS).toContain(band);
    expect(DIFFICULTY_BANDS).toEqual(["easy", "typical", "hard"]);
  });

  it("treats a non-finite score as zero rather than producing a band from NaN", () => {
    // Not reachable from a real text - `explainTypabilityBand` guards upstream -
    // but the scorer is the thing that must never emit a band from a NaN, and a
    // guard nobody exercises is a guard that stops working.
    expect(quantiseScore(Number.NaN)).toBe(0);
    expect(quantiseScore(Number.POSITIVE_INFINITY)).toBe(0);
    expect(bandForScore(quantiseScore(Number.NaN))).toBe("hard");
    // Zero is 57 points from the nearest boundary (hardMin), not from the midpoint.
    expect(distanceToBoundary(quantiseScore(Number.NaN))).toBe(BAND_BOUNDARIES.hardMin);
  });

  it("reports the distance to the nearer of the two boundaries", () => {
    expect(distanceToBoundary(BAND_BOUNDARIES.typicalMax)).toBe(0);
    expect(distanceToBoundary(BAND_BOUNDARIES.hardMin)).toBe(0);
    expect(distanceToBoundary(BAND_BOUNDARIES.typicalMax + 1)).toBe(1);
    // Exactly halfway between the boundaries is where the distance peaks.
    const middle = (BAND_BOUNDARIES.typicalMax + BAND_BOUNDARIES.hardMin) / 2;
    expect(distanceToBoundary(middle)).toBeCloseTo(
      (BAND_BOUNDARIES.typicalMax - BAND_BOUNDARIES.hardMin) / 2,
      10,
    );
  });

  it("puts a score exactly on a boundary in the EASIER band, so the tie-break is total", () => {
    // `bandForScore` is the one function that decides a band, so the tie-break is
    // checked there rather than inferred from corpus items that happen to sit
    // near a boundary.
    expect(bandForScore(BAND_BOUNDARIES.typicalMax)).toBe("easy");
    expect(bandForScore(BAND_BOUNDARIES.hardMin)).toBe("typical");
    expect(bandForScore(BAND_BOUNDARIES.typicalMax - 0.01)).toBe("typical");
    expect(bandForScore(BAND_BOUNDARIES.hardMin - 0.01)).toBe("hard");
    expect(bandForScore(0)).toBe("hard");
    expect(bandForScore(100)).toBe("easy");
  });

  it("is monotone in the score: a higher score never produces a harder band", () => {
    // Ranked by HARDNESS, not by the declaration order of DIFFICULTY_BANDS (which
    // is alphabetical-ish: easy, typical, hard). Getting that backwards would make
    // this assertion vacuous in the other direction, which is why the rank is
    // spelled out here rather than read off the enum.
    const HARDNESS: Record<DifficultyBand, number> = { hard: 0, typical: 1, easy: 2 };
    let previous = 0;
    for (let score = 0; score <= 100; score += 0.25) {
      const rank = HARDNESS[bandForScore(score)];
      expect(rank).toBeGreaterThanOrEqual(previous);
      previous = rank;
    }
    expect(HARDNESS[bandForScore(0)]).toBe(0);
    expect(HARDNESS[bandForScore(100)]).toBe(2);
  });

  it("keeps the score on the quantisation grid, and the step is finer than any band gap", () => {
    const explanation = explainTypabilityBand({ text: PROSE });
    const steps = explanation.quantisedScore / SCORE_QUANTISATION_STEP;
    expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-9);
    const gap = BAND_BOUNDARIES.typicalMax - BAND_BOUNDARIES.hardMin;
    expect(gap).toBeGreaterThan(SCORE_QUANTISATION_STEP);
  });

  it("weights no single feature above ~12% of the model, so 'equal-ish' is true of the whole", () => {
    for (const spec of TYPABILITY_FEATURE_SPECS) {
      expect(spec.weight / TOTAL_FEATURE_WEIGHT).toBeLessThan(0.12);
      expect(spec.weight).toBeGreaterThan(0);
    }
    expect(TYPABILITY_FEATURE_SPECS).toHaveLength(13);
  });

  it("has a score inside 0-100 for every sample, so a band can never come from an out-of-range score", () => {
    for (const text of ["a", PROSE, "x".repeat(10_000), "!!!", " ".repeat(50)]) {
      const explanation = explainTypabilityBand({ text });
      expect(Number.isFinite(explanation.score)).toBe(true);
      expect(explanation.score).toBeGreaterThanOrEqual(0);
      expect(explanation.score).toBeLessThanOrEqual(100);
    }
  });

  it("closes the out-of-scope reason enum", () => {
    expect(OUT_OF_SCOPE_REASONS).toEqual([
      "out-of-scope-code",
      "out-of-scope-word-pool",
      "out-of-scope-symbol-dense",
      "out-of-scope-non-english",
      "out-of-scope-no-letters",
    ]);
  });
});
