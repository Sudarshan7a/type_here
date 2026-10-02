/**
 * RealType typing engine (open-core, MIT) — paused-time arithmetic.
 *
 * Chapter 4 part 2 §4.10, verbatim: "a practice-mode test starts (clock at
 * 0ms), user types for 3000ms, then alt-tabs away at the 3000ms mark. They
 * return and refocus at what would be wall-clock 13000ms (10 seconds later)...
 * the 10-second pause is subtracted entirely from the duration used in every
 * speed formula... the total scored duration is 5000ms (3000 + 2000), not
 * 15000ms."
 *
 * WHY THIS FILE HAD TO BE WRITTEN. `state-machine.ts` already implemented the
 * rule, and the typing surface's comment already claimed the rule was applied.
 * Neither was true: `summarise` computed `last.t - first.t` and never consulted
 * anything else, so the state machine was exercised only by its own unit tests.
 * Every speed figure for a paused-and-resumed test was therefore computed on
 * wall-clock time with the pause still in it — the "very easy bug to introduce"
 * chapter 4 names, shipped for two sessions.
 *
 * This module is the one place that turns focus/blur/visibility markers into a
 * duration, and both `summarise` and `computeLiveSummary` call it. Two paths,
 * one rule: if they ever compute a duration separately, the live figure and the
 * headline figure drift apart again, which is the exact bug the owner's report
 * exposed (14.3 WPM on screen, 58.0 WPM in the panel).
 *
 * Two rules about the input:
 *
 *  - **Untrusted.** A `LogMarker` arrives in a client-supplied log that the
 *    server will recompute from (Phase 4). Markers therefore only ever REMOVE
 *    time from the clock, never add it: `pausedMs` is clamped to the window it
 *    was asked about, so junk markers cannot lengthen a test and cannot produce
 *    a negative duration. They can still shorten one — that is a client
 *    shortening its own score, which is an integrity problem owned by INT-05..08
 *    and the server recomputation, not something this function can solve.
 *  - **Order comes from the timestamps.** Array position is not authoritative in
 *    a log that may have been written by two different code paths, so the
 *    markers are sorted by `t` before the timeline is walked.
 */
import type { LogMarker } from "@realtype/schemas";

/** Markers that open an absence, matched by kind and (for visibility) detail. */
function opens(marker: LogMarker): boolean {
  return marker.kind === "blur" || (marker.kind === "visibility" && marker.detail === "hidden");
}

/** Markers that close one. */
function closes(marker: LogMarker): boolean {
  return marker.kind === "focus" || (marker.kind === "visibility" && marker.detail === "visible");
}

/**
 * The intervals, in `[start, end]`, during which the user was not at the
 * keyboard, clipped to `[fromT, toT]` and merged where they overlap.
 *
 * An absence that never closes is treated as lasting until `toT`. Ignoring it
 * would count the whole absence; extending it to infinity would subtract the
 * user's entire test.
 */
export function pausedSpans(
  markers: readonly LogMarker[] | undefined,
  fromT: number,
  toT: number,
): Array<[number, number]> {
  if (markers === undefined || markers.length === 0 || toT <= fromT) return [];

  const ordered = [...markers].sort((a, b) => a.t - b.t);
  const spans: Array<[number, number]> = [];
  let openAt: number | null = null;

  for (const marker of ordered) {
    if (opens(marker)) {
      // A second opening marker for the same absence (a tab switch fires `blur`
      // AND `visibility:hidden`) must not restart the span, or the same ten
      // seconds would be subtracted twice and the score would be inflated.
      if (openAt === null) openAt = marker.t;
    } else if (closes(marker) && openAt !== null) {
      spans.push([openAt, marker.t]);
      openAt = null;
    }
  }
  if (openAt !== null) spans.push([openAt, toT]);

  const clipped = spans
    .map(([a, b]) => [Math.max(a, fromT), Math.min(b, toT)] as [number, number])
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);

  const merged: Array<[number, number]> = [];
  for (const span of clipped) {
    const last = merged[merged.length - 1];
    if (last !== undefined && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
    else merged.push([span[0], span[1]]);
  }
  return merged;
}

/**
 * Total milliseconds inside `[fromT, toT]` that the user was away.
 *
 * Bounded by `toT - fromT` by construction, so a caller can subtract it from a
 * duration without any risk of the duration going negative.
 */
export function pausedMs(
  markers: readonly LogMarker[] | undefined,
  fromT: number,
  toT: number,
): number {
  return pausedSpans(markers, fromT, toT).reduce((total, [a, b]) => total + (b - a), 0);
}

/**
 * Scored duration for a window of the keystroke clock: wall time minus paused
 * time. Never negative — a corrupted or hostile marker list can shorten a test
 * but must not produce an impossible one.
 */
export function scoredDurationMs(
  markers: readonly LogMarker[] | undefined,
  fromT: number,
  toT: number,
): number {
  const wall = Math.max(0, toT - fromT);
  return Math.max(0, wall - pausedMs(markers, fromT, toT));
}
