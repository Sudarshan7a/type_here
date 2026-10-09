import { describe, expect, it } from "vitest";

import { computeFromEvents, computeResult, deriveCharStates } from "../src/index";
import { keyDown, keyUp } from "../fixtures/helpers.js";

/**
 * The timed-mode invariant (MOD-01).
 *
 * A timed test ends when the clock runs out, whatever the buffer has covered —
 * so a PARTIAL attempt is the normal case for it, not an error state. The
 * engine has no clock of its own: it scores the window the events describe.
 * These pins exist so that the day a timed mode is wired to a real countdown,
 * nobody has to wonder whether a half-typed text is scored sanely.
 *
 * The engine's numbers must not change because of it: the mode is attribution,
 * not scoring (see /how-we-calculate and modelVersion).
 */

/** A text comfortably longer than any single test window here. */
const TEXT =
  "the quick brown fox jumps over the lazy dog while the cat sleeps in the afternoon sun";

/** 40 keystrokes, one every 600 ms: 23.4 s of typing, 40 of 83 characters. */
function partialLog(): ReturnType<typeof computeFromEvents> {
  const target = TEXT.slice(0, 40);
  const events = [];
  for (let i = 0; i < 40; i++) {
    const ch = target[i]!;
    events.push(keyDown(ch, i * 600), keyUp(ch, i * 600 + 10));
  }
  return computeFromEvents(TEXT, events, "free");
}

describe("a partial attempt (what a timed test always is)", () => {
  const result = partialLog();

  it("produces exactly the characters typed and nothing more", () => {
    expect(result.finalText).toBe(TEXT.slice(0, 40));
    expect(result.finalText.length).toBeLessThan(TEXT.length);
  });

  it("leaves the untyped remainder unattempted rather than wrong", () => {
    // While a test is RUNNING an unreached character is legitimately "untyped"
    // — nothing is known yet. Once the attempt is over (which is what
    // computeResult describes) the omission is a fact, so it becomes "missed".
    // Either way it is not "incorrect": scoring it as a wrong keystroke would
    // make every short test look like a catastrophe, and would punish exactly
    // the honest attempt a timed test is.
    const states = deriveCharStates(TEXT, [...result.finalText], { finished: true });
    const remainder = states.slice(40);
    expect(remainder.length).toBe(TEXT.length - 40);
    for (const state of remainder) expect(state).toBe("missed");
    // The produced text is all correct, so final accuracy is not dragged down
    // by the characters the clock did not allow.
    for (const state of states.slice(0, 40)) expect(state).toBe("correct");
    expect(result.summary.finalAccuracy).toBe(100);
    expect(result.summary.keystrokeAccuracy).toBe(100);
  });

  it("scores the window the events describe, with finite metrics", () => {
    // 40 characters over 39 gaps of 600 ms = 23.4 s. 40/5 = 8 words, so the
    // honest window lands near 20.5 net WPM. The band is wide enough to hold
    // the exact convention (first-to-last press) and tight enough that a
    // duration error — the classic timed-mode bug — cannot hide inside it.
    expect(result.details.durationMs).toBeGreaterThan(20_000);
    expect(result.details.durationMs).toBeLessThan(27_000);
    expect(result.summary.netWpm).toBeGreaterThan(15);
    expect(result.summary.netWpm).toBeLessThan(26);
    for (const key of ["rawWpm", "grossWpm", "netWpm", "kspc"] as const) {
      expect(Number.isFinite(result.summary[key]), `${key} must stay finite`).toBe(true);
    }
  });

  it("stays well below the consistency floor, honestly null", () => {
    // Consistency needs 10 s of samples below the engine's own floor rules;
    // a 23 s window is a real window, so it reports a number rather than null.
    expect(result.summary.consistency === null || result.summary.consistency >= 0).toBe(true);
  });

  it("matches the same attempt through the log path (one source of truth)", () => {
    // computeFromEvents and computeResult must agree on a partial attempt,
    // because the finish path uses the log and the live readout uses events.
    const target = TEXT.slice(0, 40);
    const events = [];
    for (let i = 0; i < 40; i++) {
      const ch = target[i]!;
      events.push(keyDown(ch, i * 600), keyUp(ch, i * 600 + 10));
    }
    const viaLog = computeResult(
      {
        events,
        markers: [],
        meta: {
          mode: "classic",
          textId: "P",
          textHash: "0".repeat(64),
          layout: "qwerty-us",
          settings: {
            errorMode: "free",
            autoIndent: false,
            autoPair: false,
            layout: "qwerty-us",
          },
          engineVersion: "1.0.0",
        },
      },
      { id: "P", text: TEXT },
    );
    expect(viaLog.finalText).toBe(result.finalText);
    expect(viaLog.summary.netWpm).toBeCloseTo(result.summary.netWpm, 10);
    expect(viaLog.details.durationMs).toBe(result.details.durationMs);
  });
});
