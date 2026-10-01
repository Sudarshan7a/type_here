import { describe, expect, it } from "vitest";

import { computeFromEvents, computeLiveSummary, type LiveSummary } from "../src/index";
import { keyDown } from "../fixtures/helpers.js";

/**
 * Assert the live figures exist, and return them narrowed.
 *
 * The speed fields are `number | null` on purpose (chapter 4 E9), so every numeric
 * comparison has to state first that data exists. Going through this helper means
 * a regression that returned null fails as a null, instead of quietly comparing
 * against a `?? 0` fallback and passing.
 */
function figures(live: LiveSummary) {
  expect(live.hasData, "expected the live summary to have data").toBe(true);
  expect(live.netWpm).not.toBeNull();
  expect(live.keystrokeAccuracy).not.toBeNull();
  expect(live.finalAccuracy).not.toBeNull();
  return {
    netWpm: live.netWpm as number,
    keystrokeAccuracy: live.keystrokeAccuracy as number,
    finalAccuracy: live.finalAccuracy as number,
  };
}

/**
 * Live metrics for the typing surface (STEER-2 acceptance criterion 3: "live net
 * WPM and accuracy while typing").
 *
 * The constraint that shapes this function is AGENTS.md rule 3: metrics live
 * ONLY in packages/engine. A view that computed its own live WPM would be a
 * second implementation of the metric, which is exactly the drift the rule
 * exists to prevent â€” the number the user watches move must be the number that
 * gets stored.
 *
 * Two properties matter beyond "it returns numbers":
 *
 *  1. It agrees with computeFromEvents on the same events. If it ever disagrees,
 *     the live figure and the final figure are two different metrics wearing the
 *     same name.
 *  2. A test with nothing typed reports "not available" (null), never 0 â€” chapter
 *     4 E9. 0 WPM says the user tried and failed; null says there is no data.
 */

describe("computeLiveSummary â€” the live figures the typing surface shows", () => {
  it("reports not-available rather than zero before the first keystroke (E9)", () => {
    const live = computeLiveSummary("the cat sat", [], "free", { nowMs: 0 });
    expect(live.hasData).toBe(false);
    expect(live.netWpm).toBeNull();
    expect(live.keystrokeAccuracy).toBeNull();
    expect(live.finalAccuracy).toBeNull();
    expect(live.elapsedMs).toBe(0);
    expect(live.typedChars).toBe(0);
  });

  it("reports not-available when every keystroke was undone", () => {
    // One character typed and one Backspace: no character of the text was
    // produced, so there is still no speed to report.
    const events = [keyDown("t", 0), keyDown("Backspace", 120)];
    const live = computeLiveSummary("the cat sat", events, "free", { nowMs: 400 });
    expect(live.typedChars).toBe(0);
    expect(live.netWpm).toBeNull();
  });

  it("matches computeFromEvents on the same events (one metric, not two)", () => {
    const target = "the cat sat";
    const typed = "the cat";
    const events = typed.split("").map((k, i) => keyDown(k, i * 180));
    const nowMs = events[events.length - 1]!.t;

    const live = computeLiveSummary(target, events, "free", { nowMs });
    const final = computeFromEvents(target, events, "free");

    expect(figures(live).netWpm).toBeCloseTo(final.summary.netWpm, 10);
    expect(figures(live).keystrokeAccuracy).toBeCloseTo(final.summary.keystrokeAccuracy, 10);
    expect(figures(live).finalAccuracy).toBeCloseTo(final.summary.finalAccuracy, 10);
  });

  it("keeps the same net WPM the finished result reports (STEER-2 criterion 5)", () => {
    // The headline at finish and the live figure on the last keystroke are the
    // same metric. If they ever diverged, the number would jump at the moment
    // the user is most likely to be looking at it.
    const target = "the quick brown fox";
    const typed = "the quick brown fox";
    const events = typed.split("").map((k, i) => keyDown(k, i * 150));
    const nowMs = events[events.length - 1]!.t;

    const live = computeLiveSummary(target, events, "free", { nowMs });
    const finished = computeFromEvents(target, events, "free");
    expect(figures(live).netWpm).toBeCloseTo(finished.summary.netWpm, 10);
  });

  it("counts the characters produced so far and their correctness", () => {
    const target = "cat";
    const events = [keyDown("c", 0), keyDown("a", 200), keyDown("X", 400)];
    const live = computeLiveSummary(target, events, "free", { nowMs: 500 });
    expect(live.typedChars).toBe(3);
    expect(live.correctChars).toBe(2);
    // 3 printable presses, 2 of them correct.
    expect(figures(live).keystrokeAccuracy).toBeCloseTo((2 / 3) * 100, 10);
    // 3 characters produced, 2 matching the target.
    expect(figures(live).finalAccuracy).toBeCloseTo((2 / 3) * 100, 10);
  });

  it("keeps keystroke accuracy and final accuracy distinct, as the metrics spec requires", () => {
    // Typed "cc" against "cat", then Backspace, then "c" again. The buffer ends
    // as "cc": 2 characters produced, 1 of which is right. But 3 printable
    // presses were made and only 1 was correct â€” the wrong "c" was pressed twice.
    // The two accuracies are therefore genuinely different numbers.
    const events = [
      keyDown("c", 0),
      keyDown("c", 150),
      keyDown("Backspace", 300),
      keyDown("c", 450),
    ];
    const live = computeLiveSummary("cat", events, "free", { nowMs: 600 });
    expect(live.typedChars).toBe(2);
    expect(live.correctChars).toBe(1);
    expect(figures(live).keystrokeAccuracy).toBeCloseTo((1 / 3) * 100, 10);
    expect(figures(live).finalAccuracy).toBeCloseTo((1 / 2) * 100, 10);
    expect(figures(live).keystrokeAccuracy).not.toBeCloseTo(figures(live).finalAccuracy, 5);
  });

  it("excludes auto-inserted characters from accuracy but keeps them in the text", () => {
    // ENG-09: an auto-paired bracket is in the produced text but was not a
    // keystroke, so it must not count against keystroke accuracy.
    const events = [keyDown("(", 0), { ...keyDown(")", 0), auto: true }];
    const live = computeLiveSummary("()", events, "free", { nowMs: 100 });
    expect(live.typedChars).toBe(2);
    expect(live.correctChars).toBe(2);
    expect(figures(live).keystrokeAccuracy).toBeCloseTo(100, 10);
  });

  it("ENG-09: auto-inserted characters reach the produced text at all", () => {
    // This is a regression test for a real defect found by the test above. The
    // input filter routes auto events into their own bucket, and the compute
    // path replayed only the scoring presses â€” so an auto-paired bracket was in
    // NEITHER the produced text NOR the metrics, and every character after it
    // would have been compared against the wrong target position.
    const events = [keyDown("(", 0), { ...keyDown(")", 10), auto: true }];
    const live = computeLiveSummary("()", events, "free", { nowMs: 100 });
    expect(live.typedChars, "the auto-inserted bracket must be in the text").toBe(2);

    const finished = computeFromEvents("()", events, "free");
    expect(finished.finalText, "and in the finished result too").toBe("()");
    expect(finished.details.autoInserts).toBe(1);
    // It is in the text but was not a keystroke: accuracy is untouched.
    expect(finished.summary.finalAccuracy).toBeCloseTo(100, 10);
  });

  it("ignores untrusted (synthetic) events entirely", () => {
    // ENG-07 / integrity: input the engine will not score must not reach the
    // live figure either, or a forged buffer would show up as real progress.
    const events = [keyDown("t", 0), { ...keyDown("h", 100), isTrusted: false }];
    const live = computeLiveSummary("the", events, "free", { nowMs: 200 });
    expect(live.typedChars).toBe(1);
    expect(live.hasData).toBe(true);
  });

  it("drops OS key repeat rather than counting it as typing speed", () => {
    // Held-down `a` against a two-character target. The repeat is not a
    // keystroke (chapter 4 Â§4.8), so only one character exists and that one
    // character is right: 100%, not 50%. If repeat leaked in, the buffer would be
    // "aa" and the second press would be a substitution.
    const events = [keyDown("a", 0), { ...keyDown("a", 30), repeat: true }];
    const live = computeLiveSummary("aa", events, "free", { nowMs: 60 });
    expect(live.typedChars).toBe(1);
    expect(figures(live).keystrokeAccuracy).toBeCloseTo(100, 10);
  });

  it("uses elapsed wall time from the first keystroke, not the log's own span", () => {
    // The user typed two characters then sat still for ten seconds. The live WPM
    // must reflect the real elapsed time, because that is the honest number.
    const events = [keyDown("c", 0), keyDown("a", 200)];
    const live = computeLiveSummary("cat", events, "free", { nowMs: 10_200 });
    expect(live.elapsedMs).toBe(10_200);
    expect(figures(live).netWpm).toBeCloseTo(2 / 5 / (10_200 / 60_000), 10);
  });

  it("never returns a negative elapsed time for a corrupted timestamp", () => {
    const events = [keyDown("c", 0), { ...keyDown("a", -500) }];
    const live = computeLiveSummary("cat", events, "free", { nowMs: 100 });
    expect(live.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(live.netWpm).not.toBeNull();
    expect(Number.isFinite(live.netWpm ?? Number.NaN)).toBe(true);
  });

  it("reports progress in must-correct mode without letting the rejected press in", () => {
    // D01: the wrong character never entered the text, so the live buffer must
    // show it as not yet typed, not as a wrong character sitting in the passage.
    const events = [keyDown("c", 0), keyDown("X", 150)];
    const live = computeLiveSummary("cat", events, "must-correct", { nowMs: 300 });
    expect(live.typedChars).toBe(1);
    expect(live.correctChars).toBe(1);
  });

  it("freezes elapsed time at the halt in stop-on-error mode (D02)", () => {
    // The first error ends the run. Keystrokes after it are real but unscored, so
    // the live clock must not keep running on them â€” otherwise a halted test
    // could be dragged out to the end of the target by typing on.
    const events = [
      keyDown("c", 0),
      keyDown("X", 200), // halts here
      keyDown("a", 5_000),
      keyDown("t", 9_000),
    ];
    const live = computeLiveSummary("cat", events, "stop-on-error", { nowMs: 12_000 });
    // "c" was inserted; the wrong "X" halted the run and never entered the text,
    // and nothing after it counted.
    expect(live.typedChars).toBe(1);
    expect(live.correctChars).toBe(1);
    // Duration ends at the halting press, not at nowMs.
    expect(live.elapsedMs).toBe(200);
  });

  it("honours no-backspace mode: Backspace changes nothing (D03)", () => {
    const events = [keyDown("c", 0), keyDown("Backspace", 150), keyDown("a", 300)];
    const live = computeLiveSummary("cat", events, "no-backspace", { nowMs: 400 });
    expect(live.typedChars).toBe(2);
  });

  it("holds the caret at the word boundary in word-locked mode (D04)", () => {
    // "cxa" fills the word "cat" wrongly, so the space that would carry the
    // mistake into the next word must be refused. Two presses are still inside
    // the word, so the third is kept.
    const events = [keyDown("c", 0), keyDown("X", 150), keyDown("a", 300), keyDown(" ", 450)];
    const live = computeLiveSummary("cat sat", events, "word-locked", { nowMs: 500 });
    expect(live.typedChars).toBe(3);
  });

  it("carries the engine's model version so the live figure is attributable", () => {
    const live = computeLiveSummary("cat", [keyDown("c", 0)], "free", { nowMs: 100 });
    expect(live.modelVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("survives an empty target", () => {
    const live = computeLiveSummary("", [], "free", { nowMs: 500 });
    expect(live.hasData).toBe(false);
    expect(live.netWpm).toBeNull();
  });

  it("treats a nowMs before the first keystroke as zero elapsed, not negative", () => {
    const live = computeLiveSummary("cat", [keyDown("c", 500)], "free", { nowMs: 100 });
    expect(live.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(live.netWpm ?? Number.NaN)).toBe(true);
  });
});
