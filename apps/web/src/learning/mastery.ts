/**
 * Flexible mastery (LRN-04): what counts as "got it", per content type.
 *
 * The spec's rule, stated exactly: mastery is the best 3 of the last 5 runs
 * above the bar; "almost there" is within reach of it; thresholds are
 * adjustable; there is a no-timer path (prose, which has no clock) and an
 * auto-advance that moves a mastered visitor on rather than leaving them to
 * notice.
 *
 * AND the rule's hard edge, which is not negotiable: NO single-attempt
 * gating. Nothing here can fail a visitor on one run, lock content behind one
 * run, or present a single attempt as a verdict. The ledger marks that
 * `forbidden`, and this module has no code path that could do it — mastery is
 * always computed over a window, never a point.
 *
 * Separate averages per content type (LRN-03's companion rule): a bad numbers
 * drill must not drag down a prose average, so each type keeps its own window.
 */

/** The content types mastery is tracked for. */
export const MASTERY_TYPES = ["prose", "quotes", "numbers", "code"] as const;
export type MasteryType = (typeof MASTERY_TYPES)[number];

/** Runs in the window. */
export const MASTERY_WINDOW = 5;

/** Best runs counted. */
export const MASTERY_BEST_OF = 3;

/** How close counts as "almost there", in net WPM below the bar. */
export const ALMOST_WITHIN_WPM = 5;

/** The default bars, per type. Adjustable; these are starting values. */
export const DEFAULT_MASTERY_BARS: Readonly<Record<MasteryType, number>> = Object.freeze({
  prose: 40,
  quotes: 35,
  numbers: 30,
  code: 25,
});

/** One finished run, as far as mastery is concerned. */
export interface MasteryRun {
  readonly netWpm: number;
  readonly atMs: number;
}

export type MasteryState = "mastered" | "almost" | "practising" | "unstarted";

export interface Mastery {
  readonly state: MasteryState;
  /** The best-3-of-5 figure, or null when fewer than 3 runs exist. */
  readonly best3: number | null;
  /** Runs in the window. */
  readonly runs: number;
}

/**
 * The mastery of one content type.
 *
 * Pure and total: an empty window is `unstarted`, never an error, and a window
 * with fewer than three runs is `practising` no matter how fast those runs
 * were — three runs is the minimum evidence, not a suggestion.
 */
export function masteryFor(runs: readonly MasteryRun[], bar: number): Mastery {
  const window = runs.slice(-MASTERY_WINDOW);
  if (window.length === 0) return { state: "unstarted", best3: null, runs: 0 };
  if (window.length < MASTERY_BEST_OF) {
    return { state: "practising", best3: null, runs: window.length };
  }
  const speeds = window.map((r) => r.netWpm).sort((a, b) => b - a);
  // Best 3 of 5: the third-best decides, so one lucky run cannot carry the
  // other two and one bad run cannot sink them.
  const best3 = speeds.slice(0, MASTERY_BEST_OF);
  const score = best3[best3.length - 1]!;
  if (score >= bar) return { state: "mastered", best3: score, runs: window.length };
  if (score >= bar - ALMOST_WITHIN_WPM)
    return { state: "almost", best3: score, runs: window.length };
  return { state: "practising", best3: score, runs: window.length };
}

/**
 * Whether auto-advance should move the visitor on.
 *
 * Only when mastered AND the visitor asked for it: auto-advance is opt-in, and
 * it proposes rather than routes — the surface never changes mode without an
 * explicit choice, because an app that yanks the test out from under someone
 * is an app nobody trusts.
 */
export function shouldAdvance(mastery: Mastery, autoAdvance: boolean): boolean {
  return autoAdvance && mastery.state === "mastered";
}
