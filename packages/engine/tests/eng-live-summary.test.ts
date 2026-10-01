import { describe, expect, it } from "vitest";

import { computeFromEvents, computeLiveSummary } from "../src/index";
import { keyDown } from "../fixtures/helpers.js";

/**
 * Live metrics for the typing surface (STEER-2 acceptance criterion 3: "live net
 * WPM and accuracy while typing").
 *
 * The constraint that shapes this function is AGENTS.md rule 3: metrics live
 * ONLY in packages/engine. A view that computed its own live WPM would be a
 * second implementation of the metric, which is exactly the drift the rule
 * exists to prevent — the number the user watches move must be the number that
 * gets stored.
 *
 * Two properties matter beyond "it returns numbers":
 *
 *  1. It agrees with computeFromEvents on the same events. If it ever disagrees,
 *     the live figure and the final figure are two different metrics wearing the
 *     same name.
 *  2. A test with nothing typed reports "not available" (null), never 0 — chapter
 *     4 E9. 0 WPM says the user tried and failed; null says there is no data.
 */

describe("computeLiveSummary — the live figures the typing surface shows", () => {
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

    expect(live.netWpm).toBeCloseTo(final.summary.netWpm, 10);
    expect(live.keystrokeAccuracy).toBeCloseTo(final.summary.keystrokeAccuracy, 10);
    expect(live.finalAccuracy).toBeCloseTo(final.summary.finalAccuracy, 10);
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
    expect(live.netWpm).toBeCloseTo(finished.summary.netWpm, 10);
  });

  it("counts the characters produced so far and their correctness", () => {
    const target = "cat";
    const events = [keyDown("c", 0), keyDown("a", 200), keyDown("X", 400)];
    const live = computeLiveSummary(target, events, "free", { nowMs: 500 });
    expect(live.typedChars).toBe(3);
    expect(live.correctChars).toBe(2);
    // 3 printable presses, 2 of them correct.
    expect(live.keystrokeAccuracy).toBeCloseTo((2 / 3) * 100, 10);
    // 3 characters produced, 2 matching the target.
    expect(live.finalAccuracy).toBeCloseTo((2 / 3) * 100, 10);
  });

  it("keeps keystroke accuracy and final accuracy distinct, as the metrics spec requires", () => {
    // Typed "cc" against "cat", then Backspace, then "c": 4 printable presses for
    // 3 produced characters, 3 of the presses correct. The two accuracies differ.
    const events = [
      keyDown("c", 0),
      keyDown("c", 150),
      keyDown("Backspace", 300),
      keyDown("c", 450),
    ];
    const live = computeLiveSummary("cat", events, "free", { nowMs: 600 });
    expect(live.typedChars).toBe(2);
    expect(live.correctChars).toBe(2);
    expect(live.keystrokeAccuracy).toBeCloseTo((3 / 4) * 100, 10);
    expect(live.finalAccuracy).toBeCloseTo(100, 10);
    expect(live.keystrokeAccuracy).not.toBeCloseTo(live.finalAccuracy, 5);
  });

  it("excludes auto-inserted characters from accuracy but keeps them in the text", () => {
    // ENG-09: an auto-paired bracket is in the produced text but was not a
    // keystroke, so it must not count against keystroke accuracy.
    const events = [
      keyDown("(", 0),
      { ...keyDown(")", 0), auto: true },
    ];
    const live = computeLiveSummary("()", events, "free", { nowMs: 100 });
    expect(live.typedChars).toBe(2);
    expect(live.keystrokeAccuracy).toBeCloseTo(100, 10);
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
    const events = [keyDown("a", 0), { ...keyDown("a", 30), repeat: true }];
    const live = computeLiveSummary("aa", events, "free", { nowMs: 60 });
    expect(live.keystrokeAccuracy).toBeCloseTo(50, 10);
  });

  it("uses elapsed wall time from the first keystroke, not the log's own span", () => {
    // The user typed two characters then sat still for ten seconds. The live WPM
    // must reflect the real elapsed time, because that is the honest number.
    const events = [keyDown("c", 0), keyDown("a", 200)];
    const live = computeLiveSummary("cat", events, "free", { nowMs: 10_200 });
    expect(live.elapsedMs).toBe(10_200);
    expect(live.netWpm).toBeCloseTo((2 / 5 / (10_200 / 60_000)), 10);
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
    // the live clock must not keep running on them.
    const events = [
      keyDown("c", 0),
      keyDown("X", 200), // halts here
      keyDown("a", 5_000),
      keyDown("t", 9_000),
    ];
    const live = computeLiveSummary("cat", events, "stop-on-error", { nowMs: 12_000 });
    expect(live.typedChars).toBe(2);
    // Duration ends at the halting press, not at nowMs.
    expect(live.elapsedMs).toBe(200);
  });

  it("honours no-backspace mode: Backspace changes nothing (D03)", () => {
    const events = [keyDown("c", 0), keyDown("Backspace", 150), keyDown("a", 300)];
    const live = computeLiveSummary("cat", events, "no-backspace", { nowMs: 400 });
    expect(live.typedChars).toBe(2);
  });

  it("holds the caret at the word boundary in word-locked mode (D04)", () => {
    // "ca" then a space: the word is wrong, so the space must be refused and the
    // buffer stays two characters long.
    const events = [keyDown("c", 0), keyDown("X", 150), keyDown(" ", 300)];
    const live = computeLiveSummary("cat sat", events, "word-locked", { nowMs: 400 });
    expect(live.typedChars).toBe(2);
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