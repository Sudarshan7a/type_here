import { describe, expect, it } from "vitest";

import { KeyEventSchema } from "@realtype/schemas";

import { fingerTagForEvents } from "../src/aggregation.js";
import {
  flagPasteBurst,
  flagSustainedFloor,
  singleOutliers,
  windowMeans,
} from "../src/plausibility.js";
import { keyDown } from "../fixtures/helpers.js";

import * as int001 from "../fixtures/int-fixture-001.js";
import * as int002 from "../fixtures/int-fixture-002.js";
import * as epaste from "../fixtures/e-paste.js";

// All policy numbers below are injected here, at the call site —
// plausibility.ts stores none of them. Each is a `[proposal]` from the
// deep-dive chapters: defensible starting guesses, explicitly uncalibrated
// (no real typist data exists yet), for the WAVE-1 server to own.
const WINDOW_SIZE = 10; // Ch.10 §10.2.2 worked window — uncalibrated
const FLOOR_MS = 45; // [proposal] Ch.10 §10.2.2 — uncalibrated
const DIFF_FINGER_MS = 15; // [proposal] Ch.10 §10.3.1 — uncalibrated
const SAME_FINGER_MS = 35; // [proposal] Ch.10 §10.3.1 — uncalibrated
const PASTE_MIN_CHARS = 40; // [proposal] Ch.4 E7 — uncalibrated
const PASTE_MAX_SPAN_MS = 5; // [proposal] Ch.4 E7 — uncalibrated

describe("INT plausibility backstop helpers (ENG-07, INT-02)", () => {
  it("builds fixtures from well-formed key events", () => {
    for (const downs of [int001.botDowns, int001.eliteDowns, int002.logDowns, epaste.pasteDowns]) {
      expect(() => KeyEventSchema.array().parse(downs)).not.toThrow();
    }
    expect(int001.botDowns).toHaveLength(11);
    expect(int001.eliteDowns).toHaveLength(11);
    expect(int002.logDowns).toHaveLength(int002.PRESS_COUNT);
    expect(epaste.pasteDowns).toHaveLength(epaste.PASTE_PRESS_COUNT);
  });

  it("windowMeans reproduces the hand-computed INT-001 means", () => {
    // Bot: ten gaps of 20 ms → 200/10 = 20.0. Elite: gap sum 529 → 52.9.
    // Eleven presses hold exactly ten gaps, so each log yields one window.
    const botWindows = windowMeans(int001.botDowns, { windowSize: WINDOW_SIZE });
    const eliteWindows = windowMeans(int001.eliteDowns, { windowSize: WINDOW_SIZE });
    expect(botWindows).toHaveLength(1);
    expect(eliteWindows).toHaveLength(1);
    expect(botWindows[0]).toBeCloseTo(int001.BOT_WINDOW_MEAN, 9);
    expect(eliteWindows[0]).toBeCloseTo(int001.ELITE_WINDOW_MEAN, 9);
  });

  it("windowMeans yields no windows from fewer presses than one full window", () => {
    // Nine presses hold nine gaps: no ten-gap window exists, so a short log
    // can never trip the sustained-rate check, however fast it is.
    const nine = int001.botDowns.slice(0, 9);
    expect(windowMeans(nine, { windowSize: WINDOW_SIZE })).toEqual([]);
    expect(flagSustainedFloor([], { floorMs: FLOOR_MS })).toEqual({
      code: "sustained-floor",
      flagged: false,
      flaggedWindows: [],
    });
  });

  it("windowMeans rejects a degenerate window size without inventing data", () => {
    expect(windowMeans(int001.botDowns, { windowSize: 0 })).toEqual([]);
  });

  it("flagSustainedFloor divides 44.9 / 45.0 / 45.1 at floor 45", () => {
    // Strictly-below flags; exactly-at passes — the boundary is exclusive so
    // the dividing line needs no tie-break rule.
    expect(flagSustainedFloor([44.9], { floorMs: FLOOR_MS }).flagged).toBe(true);
    expect(flagSustainedFloor([45.1], { floorMs: FLOOR_MS }).flagged).toBe(false);
    expect(flagSustainedFloor([45], { floorMs: FLOOR_MS }).flagged).toBe(false);
    expect(flagSustainedFloor([20, 52.9], { floorMs: FLOOR_MS }).flaggedWindows).toEqual([0]);
  });

  it("INT-001: the 20 ms bot flags, the 52.9 ms elite passes", () => {
    // Margin, by hand: 52.9 − 45 = 7.9 ms, about 18% headroom — the floor
    // sits clearly below the fastest genuine burst and clearly above the bot.
    const bot = flagSustainedFloor(windowMeans(int001.botDowns, { windowSize: WINDOW_SIZE }), {
      floorMs: FLOOR_MS,
    });
    expect(bot).toEqual({ code: "sustained-floor", flagged: true, flaggedWindows: [0] });
    const elite = flagSustainedFloor(windowMeans(int001.eliteDowns, { windowSize: WINDOW_SIZE }), {
      floorMs: FLOOR_MS,
    });
    expect(elite).toEqual({ code: "sustained-floor", flagged: false, flaggedWindows: [] });
  });

  it("INT-001: removing one press breaks the flag (no full window remains)", () => {
    // Eleven presses → ten gaps → one window. Ten presses → nine gaps → no
    // ten-gap window, so the verdict must go quiet, not crash or guess.
    const shortened = int001.botDowns.filter((_, i) => i !== 5);
    const windows = windowMeans(shortened, { windowSize: WINDOW_SIZE });
    expect(windows).toEqual([]);
    expect(flagSustainedFloor(windows, { floorMs: FLOOR_MS }).flagged).toBe(false);
  });

  it("INT-002: check 1 passes — worst window mean is the hand-computed 135.4", () => {
    // 200 presses → 190 ten-gap windows. The window starting at press 91
    // holds nine 150 ms gaps plus the 4 ms outlier: (9×150+4)/10 = 135.4,
    // the minimum; the recovery-gap window sits at 150.0 exactly.
    const windows = windowMeans(int002.logDowns, { windowSize: WINDOW_SIZE });
    expect(windows).toHaveLength(190);
    expect(Math.min(...windows)).toBeCloseTo(int002.MIN_WINDOW_MEAN, 9);
    expect(flagSustainedFloor(windows, { floorMs: FLOOR_MS }).flagged).toBe(false);
  });

  it("INT-002: check 2 flags exactly the one 4 ms same-finger pair", () => {
    // t(101) − t(100) = 15004 − 15000 = 4 ms on KeyF → KeyR (both left
    // index): sub-threshold under the same-finger floor, and the ONLY pair
    // in the log that is — every other gap is 150 ms or the 296 ms recovery.
    const result = singleOutliers(int002.logDowns, "qwerty-us", {
      diffFingerMs: DIFF_FINGER_MS,
      sameFingerMs: SAME_FINGER_MS,
    });
    expect(result.code).toBe("single-outlier");
    expect(result.flagged).toBe(true);
    expect(result.outliers).toEqual([
      { index: int002.OUTLIER_PAIR_INDEX, ikiMs: int002.OUTLIER_IKI_MS, sameFinger: true },
    ]);
  });

  it("INT-002: shifting the outlier timestamp to a plausible pace breaks the flag", () => {
    // Restore the base pace: t(101) = 15000 + 150 = 15150, so both adjacent
    // gaps read exactly 150 ms and no pair is left to flag.
    const shifted = int002.logDowns.map((e, i) => (i === 101 ? { ...e, t: 15150 } : e));
    const result = singleOutliers(shifted, "qwerty-us", {
      diffFingerMs: DIFF_FINGER_MS,
      sameFingerMs: SAME_FINGER_MS,
    });
    expect(result).toEqual({ code: "single-outlier", flagged: false, outliers: [] });
  });

  it("INT-002: removing the outlier press breaks the flag without tripping check 1", () => {
    // Without press 101 the local gap reads 15300 − 15000 = 300 ms: slow,
    // never sub-threshold — and the sustained check stays quiet too.
    const dropped = int002.logDowns.filter((_, i) => i !== 101);
    const outliers = singleOutliers(dropped, "qwerty-us", {
      diffFingerMs: DIFF_FINGER_MS,
      sameFingerMs: SAME_FINGER_MS,
    });
    expect(outliers.flagged).toBe(false);
    const windows = windowMeans(dropped, { windowSize: WINDOW_SIZE });
    expect(flagSustainedFloor(windows, { floorMs: FLOOR_MS }).flagged).toBe(false);
  });

  it("layout plumbing (INT-CHECK-007): one pair, two declared layouts, two verdicts", () => {
    // `a` on KeyA is on-grid left pinky everywhere. `@` on an off-grid code
    // resolves through the VERIFIED production table per layout: right pinky
    // on qwerty-uk, left pinky on qwertz — so the same 20 ms pair is
    // different-finger under one declaration and same-finger under the other.
    const prev = keyDown("a", 0);
    const curr = keyDown("@", 20, { code: "Unidentified" });
    expect(() => KeyEventSchema.array().parse([prev, curr])).not.toThrow();
    expect(fingerTagForEvents(prev, curr, "qwerty-uk")).toEqual({
      hand: "cross",
      sameFinger: false,
    });
    expect(fingerTagForEvents(prev, curr, "qwertz")).toEqual({ hand: "same", sameFinger: true });
    // 20 ms clears the different-finger floor but not the same-finger one:
    // the declared layout — never a hardcoded map — decides the verdict.
    const uk = singleOutliers([prev, curr], "qwerty-uk", {
      diffFingerMs: DIFF_FINGER_MS,
      sameFingerMs: SAME_FINGER_MS,
    });
    expect(uk).toEqual({ code: "single-outlier", flagged: false, outliers: [] });
    const de = singleOutliers([prev, curr], "qwertz", {
      diffFingerMs: DIFF_FINGER_MS,
      sameFingerMs: SAME_FINGER_MS,
    });
    expect(de.flagged).toBe(true);
    expect(de.outliers).toEqual([{ index: 1, ikiMs: 20, sameFinger: true }]);
  });

  it("unknown attribution never flags, however fast the pair", () => {
    // Dvorak has no verified production for `@`: the pair is unattributed,
    // so even a 10 ms gap — under EITHER floor — is skipped, not guessed.
    // Flagging on a guess would punish legitimate atypical mappings.
    const prev = keyDown("a", 0);
    const curr = keyDown("@", 10, { code: "Unidentified" });
    expect(fingerTagForEvents(prev, curr, "dvorak")).toEqual({
      hand: "unknown",
      sameFinger: null,
    });
    const result = singleOutliers([prev, curr], "dvorak", {
      diffFingerMs: DIFF_FINGER_MS,
      sameFingerMs: SAME_FINGER_MS,
    });
    expect(result).toEqual({ code: "single-outlier", flagged: false, outliers: [] });
  });

  it("ENG-FIXTURE-E-PASTE: the worked burst flags with its hand-computed span", () => {
    // 40 presses, t(39) − t(0) = 39/8 = 4.875 ms: the whole log is one
    // triggering run starting at press 0.
    const result = flagPasteBurst(epaste.pasteDowns, {
      minChars: PASTE_MIN_CHARS,
      maxSpanMs: PASTE_MAX_SPAN_MS,
    });
    expect(result.code).toBe("paste-burst");
    expect(result.flagged).toBe(true);
    expect(result.windowStart).toBe(0);
    expect(result.spanMs).toBeCloseTo(epaste.PASTE_SPAN_MS, 9);
  });

  it("paste backstop stays quiet at 39 presses", () => {
    const short = epaste.pasteDowns.slice(0, 39);
    expect(
      flagPasteBurst(short, { minChars: PASTE_MIN_CHARS, maxSpanMs: PASTE_MAX_SPAN_MS }),
    ).toEqual({ code: "paste-burst", flagged: false, windowStart: null, spanMs: null });
  });

  it("paste backstop stays quiet when the span reaches 6 ms", () => {
    // Push the last press out: 4.875 + 1.125 = 6.0 ms exactly (both exactly
    // representable), so the single forty-press run no longer fits the span.
    const stretched = epaste.pasteDowns.map((e, i) =>
      i === epaste.pasteDowns.length - 1 ? { ...e, t: e.t + 1.125 } : e,
    );
    const result = flagPasteBurst(stretched, {
      minChars: PASTE_MIN_CHARS,
      maxSpanMs: PASTE_MAX_SPAN_MS,
    });
    expect(result.flagged).toBe(false);
    expect(result.windowStart).toBeNull();
  });

  it("paste backstop finds a burst buried inside a longer log", () => {
    // Five slow presses (one per second) followed by the worked burst at
    // +10 s: the sliding run — not whole-log span — reports start index 5.
    const prefix = ["a", "b", "c", "d", "e"].map((k, i) => keyDown(k, i * 1000));
    const burst = epaste.pasteDowns.map((e) => ({ ...e, t: e.t + 10000 }));
    const result = flagPasteBurst([...prefix, ...burst], {
      minChars: PASTE_MIN_CHARS,
      maxSpanMs: PASTE_MAX_SPAN_MS,
    });
    expect(result.flagged).toBe(true);
    expect(result.windowStart).toBe(5);
    expect(result.spanMs).toBeCloseTo(epaste.PASTE_SPAN_MS, 9);
  });

  it("paste backstop rejects a degenerate run length without inventing a flag", () => {
    const result = flagPasteBurst(epaste.pasteDowns, { minChars: 0, maxSpanMs: PASTE_MAX_SPAN_MS });
    expect(result.flagged).toBe(false);
  });
});
