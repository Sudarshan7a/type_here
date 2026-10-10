import { describe, expect, it } from "vitest";

import {
  REPEAT_THRESHOLD,
  confusionsFromAttempt,
  drillTextFor,
  notableConfusions,
} from "../src/learning/errors";

/**
 * LRN-05 — learn from errors, on the read side.
 *
 * The engine owns the classification; what is pinned here is that this module
 * reports it faithfully (no re-derived counts, no invented categories) and that
 * it refuses to make a pattern out of a single slip.
 */

const PERFECT = "the cat sat on the mat";

describe("a clean attempt", () => {
  it("reports no confusions and no noise", () => {
    const report = confusionsFromAttempt(PERFECT, PERFECT);
    expect(report.confusions).toEqual([]);
    expect(report.totalErrors).toBe(0);
    expect(notableConfusions(report)).toEqual([]);
  });
});

describe("substitutions", () => {
  it("counts how often each intended→typed pair happened", () => {
    // `e` typed as `r` three times, and as `w` once.
    const target = "e e e e";
    const typed = "r r r w";
    const report = confusionsFromAttempt(target, typed);
    const find = (t: string) => report.confusions.find((c) => c.typed === t);
    expect(find("r")?.count).toBe(3);
    expect(find("r")?.intended).toBe("e");
    expect(find("r")?.kind).toBe("substitution");
    expect(find("w")?.count).toBe(1);
    expect(report.totalErrors).toBe(4);
  });

  it("keeps the first position, which is where the pattern started", () => {
    const report = confusionsFromAttempt("a a", "b b");
    expect(report.confusions[0]!.position).toBe(0);
  });
});

describe("transpositions", () => {
  it("separates a swapped pair from two substitutions", () => {
    // The engine's rule (alignment.ts): two adjacent positions where the typed
    // characters are the intended ones swapped is ONE transposition, not two
    // substitutions — the fix is sequencing, not two key drills.
    const report = confusionsFromAttempt("teh order is quiet", "the order is quiet");
    const swapped = report.confusions.find((c) => c.kind === "transposition");
    expect(swapped).toBeDefined();
    // The engine records the two intended characters, not one: the confusion is
    // the PAIR, which is what the drill has to fix.
    expect(swapped!.intended).toBe("eh");
    expect(swapped!.typed).toBe("he");
    expect(report.confusions.filter((c) => c.kind === "substitution")).toHaveLength(0);
  });

  it("is always notable, even when it happened once", () => {
    // A swap in a short passage is still a sequencing problem worth naming.
    const report = confusionsFromAttempt("the quick brown fox jumps", "teh quick brown fox jumps");
    expect(report.confusions).toHaveLength(1);
    expect(notableConfusions(report)).toHaveLength(1);
  });
});

describe("omissions and insertions", () => {
  it("reports a skipped character with nothing typed beside it", () => {
    // §4.11 I01: "cats" typed as "cts" — the `a` was skipped while the user
    // kept typing, which is an omission and not an early stop. The engine
    // calls the skipped character `expected`.
    const report = confusionsFromAttempt("the cat sat", "the ct sat");
    const omission = report.confusions.find((c) => c.kind === "omission");
    expect(omission).toBeDefined();
    expect(omission!.typed).toBeNull();
    // Nothing was typed in its place, and the drill targets it.
    expect(omission!.intended).toBe("a");
    expect(drillTextFor(omission!)).toBe("a a a");
  });

  it("reports an extra character that has no intended position", () => {
    // §4.11 I02.
    const report = confusionsFromAttempt("the cat", "the caat");
    const insertion = report.confusions.find((c) => c.kind === "insertion");
    expect(insertion).toBeDefined();
    expect(insertion!.intended).toBe("");
    expect(insertion!.typed).toBe("a");
  });
});

describe("notability", () => {
  it("hides a single slip", () => {
    // One mistyped character in a long passage is noise: a screen listing it
    // teaches nothing and buries the real patterns.
    const target = `${"the cat sat on the mat ".repeat(20)}x`;
    const typed = `${"the cat sat on the mat ".repeat(20)}y`;
    const report = confusionsFromAttempt(target, typed);
    expect(report.totalErrors).toBe(1);
    expect(notableConfusions(report)).toEqual([]);
  });

  it("shows a confusion that repeated", () => {
    const report = confusionsFromAttempt("e e e", "r r r");
    expect(notableConfusions(report)).toHaveLength(1);
    expect(notableConfusions(report)[0]!.count).toBeGreaterThanOrEqual(REPEAT_THRESHOLD);
  });

  it("orders the worst offender first", () => {
    const report = confusionsFromAttempt("a w m m m", "b x n n n");
    const notable = notableConfusions(report);
    // `m`→`n` happened three times; `a`→`b` and `w`→`x` happened once each and
    // are hidden.
    expect(notable).toHaveLength(1);
    expect(notable[0]!.count).toBe(3);
  });
});

describe("the drill", () => {
  it("pairs the intended character with the typed one for a substitution", () => {
    // Typing them alternately is the discrimination practice: the confusion is
    // not "I do not know e", it is "e and r come out of the same finger".
    const [substitution] = confusionsFromAttempt("e e e", "r r r").confusions;
    expect(drillTextFor(substitution!)).toBe("er er er");
  });

  it("drills the intended pair for a transposition", () => {
    // §4.11 worked example: "the quick brown" typed as "teh qiuck brwon". The
    // engine records each swap as intended/typed in TARGET order, pinned as
    // "he->eh" by eng-alignment.test.ts.
    const [swap] = confusionsFromAttempt("the quick brown", "teh qiuck brwon").confusions;
    expect(swap!.kind).toBe("transposition");
    expect(swap!.intended).toBe("he");
    expect(swap!.typed).toBe("eh");
    // The pair in target order, typed correctly — the sequencing practice.
    expect(drillTextFor(swap!)).toBe("he he he");
    // Not the order that was typed, which is the error itself.
    expect(drillTextFor(swap!)).not.toContain("eh");
  });

  it("drills the skipped character for an omission", () => {
    const [omission] = confusionsFromAttempt("the cat", "the ct").confusions;
    expect(omission!.kind).toBe("omission");
    expect(drillTextFor(omission!)).toBe("a a a");
  });

  it("is deterministic: the same confusion drills the same text", () => {
    const [confusion] = confusionsFromAttempt("e e e", "r r r").confusions;
    expect(drillTextFor(confusion!)).toBe(drillTextFor(confusion!));
    expect(drillTextFor(confusion!, 5).split(" ")).toHaveLength(5);
  });
});
