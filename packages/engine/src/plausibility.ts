/**
 * RealType typing engine (open-core, MIT) — server plausibility backstop
 * helpers (ENG-07, INT-02).
 *
 * Pure, threshold-free building blocks for the timing plausibility checks
 * (chapter-10 integrity scoring, checks 1-2, plus the chapter-4 E7 paste
 * backstop). Every limit arrives as an injected parameter — this module
 * stores no floors, no counts-as-policy, and no combination logic, so there
 * is nothing here for a client bundle to leak (the WAVE-1 server injects the
 * calibrated values at request time and keeps them server-side).
 *
 * Privacy (keystroke-privacy skill): inputs are press times, physical codes,
 * and finger tags only. Outputs carry opaque flag codes plus counts,
 * durations, and finger tags — never key content, never substrings of typed
 * text. A flag says *which shape* was implausible, never *what* was typed.
 */

import type { KeyEvent, Layout } from "@realtype/schemas";

import { fingerTagForEvents } from "./aggregation.js";

/** Opaque code for a sustained-rate floor violation (check 1 shape). */
export const SUSTAINED_FLOOR_CODE = "sustained-floor" as const;

/** Opaque code for an impossibly fast single pair (check 2 shape). */
export const SINGLE_OUTLIER_CODE = "single-outlier" as const;

/** Opaque code for a pasted-burst shape (chapter-4 E7 backstop). */
export const PASTE_BURST_CODE = "paste-burst" as const;

/**
 * Per-window mean inter-key interval, in event order.
 *
 * `windowSize` counts intervals, not presses: a window of size N spans N+1
 * consecutive presses and its mean is the sum of the N gaps divided by N.
 * Fewer presses than one full window yields zero windows (never an error —
 * a short log simply has no sustained-rate evidence either way). Carries no
 * verdict; the caller applies its own injected floor to the result.
 *
 * @param events pre-filtered scoring presses only (WAVE-1: pass the
 * `filterEvents` output, never raw log events — untrusted/auto/repeat/
 * composition events would dilute the means and corrupt the verdict).
 */
export function windowMeans(
  events: ReadonlyArray<Pick<KeyEvent, "t">>,
  options: { windowSize: number },
): number[] {
  const { windowSize } = options;
  if (windowSize < 1) return [];
  const means: number[] = [];
  for (let start = 0; start + windowSize <= events.length - 1; start += 1) {
    let total = 0;
    for (let gap = start; gap < start + windowSize; gap += 1) {
      total += events[gap + 1]!.t - events[gap]!.t;
    }
    means.push(total / windowSize);
  }
  return means;
}

export interface SustainedFloorResult {
  code: typeof SUSTAINED_FLOOR_CODE;
  flagged: boolean;
  /** Indices into the caller's window-means array that fell below the floor. */
  flaggedWindows: number[];
}

/**
 * Sustained-rate floor verdict over precomputed window means.
 *
 * Flags every window whose mean sits strictly below the injected floor; a
 * window exactly at the floor passes (the boundary is exclusive on purpose,
 * so the dividing line is unambiguous). An empty input flags nothing.
 */
export function flagSustainedFloor(
  windows: readonly number[],
  options: { floorMs: number },
): SustainedFloorResult {
  const { floorMs } = options;
  const flaggedWindows: number[] = [];
  for (let index = 0; index < windows.length; index += 1) {
    if (windows[index]! < floorMs) flaggedWindows.push(index);
  }
  return {
    code: SUSTAINED_FLOOR_CODE,
    flagged: flaggedWindows.length > 0,
    flaggedWindows,
  };
}

export interface SingleOutlier {
  /** Index of the later press of the pair (the gap ends here). */
  index: number;
  ikiMs: number;
  sameFinger: boolean;
}

export interface SingleOutlierResult {
  code: typeof SINGLE_OUTLIER_CODE;
  flagged: boolean;
  outliers: SingleOutlier[];
}

/**
 * Single-pair outlier scan (the complement to the sustained-window check:
 * one impossible pair buried in an otherwise plausible log barely moves any
 * window mean, so it needs its own scan).
 *
 * Each consecutive pair is resolved to same/different finger via
 * `fingerTagForEvents` on the caller's DECLARED layout (never a hardcoded
 * assumption — the INT-CHECK-007 shape), and compared against the matching
 * injected floor. Pairs whose finger attribution is unknown are skipped, not
 * guessed: flagging on a guessed finger would punish legitimate typists with
 * atypical mappings (the integrity skill's false-positive discipline).
 *
 * @param events pre-filtered scoring presses only (same contract as
 * `windowMeans` — raw log events corrupt the verdict).
 */
export function singleOutliers(
  events: readonly KeyEvent[],
  layout: Layout,
  options: { diffFingerMs: number; sameFingerMs: number },
): SingleOutlierResult {
  const { diffFingerMs, sameFingerMs } = options;
  const outliers: SingleOutlier[] = [];
  for (let index = 1; index < events.length; index += 1) {
    const prev = events[index - 1]!;
    const curr = events[index]!;
    const ikiMs = curr.t - prev.t;
    const tag = fingerTagForEvents(prev, curr, layout);
    if (tag.sameFinger === null) continue;
    const floorMs = tag.sameFinger ? sameFingerMs : diffFingerMs;
    if (ikiMs < floorMs) outliers.push({ index, ikiMs, sameFinger: tag.sameFinger });
  }
  return { code: SINGLE_OUTLIER_CODE, flagged: outliers.length > 0, outliers };
}

export interface PasteBurstResult {
  code: typeof PASTE_BURST_CODE;
  flagged: boolean;
  /** Start index of the first triggering run, or null when clean. */
  windowStart: number | null;
  /** Span of that run in ms (a duration, never content). */
  spanMs: number | null;
}

/**
 * Paste-burst backstop (chapter-4 E7 corollary): flags when any run of
 * `minChars` consecutive presses spans at most `maxSpanMs` — the shape of a
 * block of characters arriving far faster than any physical typing, as when
 * the client-side paste block is bypassed. A sliding run (not whole-log
 * span) so a burst buried inside a longer log is still caught. Reports the
 * first triggering run's position and duration only.
 *
 * @param events pre-filtered scoring presses only (same contract as
 * `windowMeans` — raw log events corrupt the verdict).
 */
export function flagPasteBurst(
  events: ReadonlyArray<Pick<KeyEvent, "t">>,
  options: { minChars: number; maxSpanMs: number },
): PasteBurstResult {
  const { minChars, maxSpanMs } = options;
  const clean: PasteBurstResult = {
    code: PASTE_BURST_CODE,
    flagged: false,
    windowStart: null,
    spanMs: null,
  };
  if (minChars < 1) return clean;
  for (let start = 0; start + minChars <= events.length; start += 1) {
    const spanMs = events[start + minChars - 1]!.t - events[start]!.t;
    if (spanMs <= maxSpanMs)
      return { code: PASTE_BURST_CODE, flagged: true, windowStart: start, spanMs };
  }
  return clean;
}
