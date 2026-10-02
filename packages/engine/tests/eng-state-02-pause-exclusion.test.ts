/**
 * ENG-STATE-02 — paused time must be excluded from the scored duration.
 *
 * Chapter 4 part 2 §4.10's worked example, verbatim:
 *
 *   "a practice-mode test starts (clock at 0ms), user types for 3000ms, then
 *    alt-tabs away at the 3000ms mark. They return and refocus at what would be
 *    wall-clock 13000ms (10 seconds later), then keep typing. The scored elapsed
 *    time must treat the resumption as if it happened at 3000ms, not 13000ms...
 *    If the test finishes after another 2000ms of typing post-resume, the total
 *    scored duration is 5000ms (3000 + 2000), not 15000ms."
 *
 * WHY THIS FILE EXISTS. The surface's own comment has claimed for two sessions
 * that "paused time is excluded from the scored duration", and `state-machine.ts`
 * implements that rule faithfully. But `summarise` in `metrics.ts` never called
 * the state machine: it computed `durationMs = last.t - first.t` over the raw
 * keystroke clock. Every speed figure for a paused-and-resumed test was therefore
 * computed on wall-clock time with the pause still in it — precisely the "very
 * easy bug to introduce" chapter 4 warns about, shipped anyway. The state machine
 * was exercised only by its own unit tests: dead code from the product's point
 * of view.
 *
 * This is the defect behind what the owner saw as the finished test reporting
 * 58.0 WPM while the live readout on the same screen said 14.3. One metric, two
 * clocks.
 */
import { describe, expect, it } from "vitest";
import type { LogMarker } from "@realtype/schemas";

import { computeFromEvents, computeLiveSummary } from "../src/index";
import { keyDown, withKeyups } from "../fixtures/helpers.js";

const TARGET = "the quick brown fox jumps over the lazy dog";
/** Everything up to and including the space before "fox". */
const FIRST_HALF = "the quick brown ";
const SECOND_HALF = "fox jumps over the lazy dog";

/** Keydowns spread evenly across [startT, endT], each with a paired keyup. */
function typeRange(text: string, startT: number, endT: number) {
  const span = Math.max(1, endT - startT);
  const step = span / Math.max(1, text.length - 1);
  const downs = [...text].map((ch, i) => keyDown(ch, startT + i * step));
  return withKeyups(downs, 20);
}

/** The chapter's worked example, as a full log: 3 s typing, 10 s away, 2 s typing. */
function workedExample() {
  return {
    events: [...typeRange(FIRST_HALF, 0, 3000), ...typeRange(SECOND_HALF, 13000, 15000)],
    markers: [
      { kind: "blur", t: 3000 },
      { kind: "focus", t: 13000 },
    ] as LogMarker[],
  };
}

describe("ENG-STATE-02 — pause-resume time exclusion", () => {
  it("scores 5000ms, not 15000ms, for the chapter's worked example", () => {
    const { events, markers } = workedExample();
    const result = computeFromEvents(TARGET, events, "free", { markers });
    expect(result.details.durationMs).toBe(5000);
  });

  it("leaves the duration untouched when there is no pause marker", () => {
    const result = computeFromEvents(TARGET, typeRange(TARGET, 0, 4000), "free");
    expect(result.details.durationMs).toBe(4000);
  });

  it("clips a pause that never closes to the end of the capture", () => {
    // The user alt-tabbed away and the tab was never switched back on screen.
    // An unterminated interval must not be ignored (that would count the whole
    // absence) and must not be treated as running to infinity either.
    const events = typeRange(FIRST_HALF, 0, 3000);
    const result = computeFromEvents(FIRST_HALF, events, "free", {
      markers: [{ kind: "blur", t: 1500 }],
    });
    expect(result.details.durationMs).toBe(1500);
  });

  it("ignores time blurred before the first keystroke (ENG-04)", () => {
    // The clock starts at the first accepted keystroke, so reading the passage
    // with the surface unfocused costs the user nothing. The input adapter drops
    // pre-origin markers, but a server-recomputed log is untrusted input, so the
    // engine clamps rather than trusting that.
    const result = computeFromEvents(TARGET, typeRange(TARGET, 1000, 5000), "free", {
      markers: [
        { kind: "blur", t: 0 },
        { kind: "focus", t: 1000 },
      ],
    });
    expect(result.details.durationMs).toBe(4000);
  });

  it("counts a blur/visibility pair only once when both fire for one absence", () => {
    // Switching tabs fires `blur` AND `visibility:hidden`. Counting both would
    // subtract the same span twice and inflate the score.
    const { events } = workedExample();
    const result = computeFromEvents(TARGET, events, "free", {
      markers: [
        { kind: "blur", t: 3000 },
        { kind: "visibility", t: 3000, detail: "hidden" },
        { kind: "visibility", t: 13000, detail: "visible" },
      ],
    });
    expect(result.details.durationMs).toBe(5000);
  });

  it("tolerates markers that arrive out of order", () => {
    // A corrupted capture is untrusted input (server recomputation replays
    // whatever arrived). A negative span must not reduce the scored duration
    // below the wall-clock truth, or a client could shorten its own score by
    // shipping junk markers.
    const { events } = workedExample();
    const result = computeFromEvents(TARGET, events, "free", {
      markers: [
        { kind: "focus", t: 13000 },
        { kind: "blur", t: 3000 },
      ],
    });
    expect(result.details.durationMs).toBeGreaterThanOrEqual(12000);
  });
});

describe("live and finished figures share one duration rule", () => {
  /**
   * The owner reported the live readout and the finished headline disagreeing on
   * the same test (14.3 WPM vs 58.0 WPM). Two causes lived here, and both were
   * about the CLOCK rather than the rendering:
   *
   *  1. `computeLiveSummary` measured to `now`, so any idle time between the last
   *     keystroke and the frame that painted it stayed in it.
   *  2. `computeFromEvents` did not exclude paused time at all.
   *
   * With one shared rule — wall clock from the first press to the last, minus
   * every closed pause span — the live figure evaluated at the instant the final
   * keystroke landed IS the headline figure. That equality is the property worth
   * pinning; anything looser lets the two drift apart again.
   */
  it("the live figure at the final keystroke equals the finished headline", () => {
    const { events, markers } = workedExample();
    const finished = computeFromEvents(TARGET, events, "free", { markers });
    const live = computeLiveSummary(TARGET, events, "free", { nowMs: 15000, markers });

    expect(live.hasData).toBe(true);
    expect(finished.summary.netWpm).toBeCloseTo(live.netWpm as number, 6);
  });

  it("the live figure equals the headline with no pause at all", () => {
    const events = typeRange(TARGET, 0, 4000);
    const finished = computeFromEvents(TARGET, events, "free");
    const live = computeLiveSummary(TARGET, events, "free", { nowMs: 4000 });
    expect(finished.summary.netWpm).toBeCloseTo(live.netWpm as number, 6);
  });

  it("still falls while the user is genuinely idle mid-test", () => {
    // Excluding PAUSES must not exclude THINKING. A gap with no blur marker is
    // real slow typing and must keep depressing the live figure — that is what
    // "your speed really is falling" means.
    const events = typeRange(TARGET, 0, 4000);
    const immediate = computeLiveSummary(TARGET, events, "free", { nowMs: 4000 });
    const afterIdling = computeLiveSummary(TARGET, events, "free", { nowMs: 9000 });
    expect(afterIdling.netWpm as number).toBeLessThan(immediate.netWpm as number);
  });

  it("does not fall while the user is away from the tab", () => {
    // The mirror of the previous test: absence is not slowness. The live figure
    // must not sag just because the user switched tabs.
    const { events, markers } = workedExample();
    const atReturn = computeLiveSummary(TARGET, events, "free", { nowMs: 13000, markers });
    const beforeLeaving = computeLiveSummary(TARGET, events.slice(0, 32), "free", { nowMs: 3000 });
    expect(atReturn.netWpm as number).toBeGreaterThan(0);
    expect(beforeLeaving.netWpm as number).toBeGreaterThan(0);
    // The away time is excluded, so the clock at the moment of return equals the
    // clock at the moment of leaving: nothing was spent while the tab was away.
    expect(atReturn.elapsedMs).toBe(3000);
  });

  it("still stops at the halt in stop-on-error (D02)", () => {
    const events = [
      ...withKeyups(
        ["t", "h", "e"].map((ch, i) => keyDown(ch, i * 200)),
        20,
      ),
      keyDown("x", 1200),
      keyDown("y", 1400),
    ];
    const live = computeLiveSummary("the quick brown fox", events, "stop-on-error", { nowMs: 9000 });
    expect(live.hasData).toBe(true);
    // The clock froze at the halt, so a much later `nowMs` cannot change it.
    const later = computeLiveSummary("the quick brown fox", events, "stop-on-error", {
      nowMs: 60000,
    });
    expect(later.netWpm).toBeCloseTo(live.netWpm as number, 6);
  });
});