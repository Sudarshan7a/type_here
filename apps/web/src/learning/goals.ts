/**
 * Goals (LRN-06): a target net WPM and a weekly commitment, with an ETA
 * derived from what the visitor has actually done.
 *
 * THE RULE THIS MODULE EXISTS TO ENFORCE
 *
 * An ETA is a DATE. A date is a prediction, and a prediction about a person's
 * progress is the most dangerous kind of copy this product could ship — so
 * the arithmetic here is deliberately small, and it refuses to produce a date
 * at all when there is not enough evidence to have one.
 *
 * What it has to work with is the run history in localStorage: net WPM and a
 * timestamp per attempt. That is enough for a trend, and a trend is enough for
 * a suggestion. It is not enough for a promise, and `etaFor` returns null
 * rather than guessing.
 *
 * "Never promise outcomes" (rule 9) is enforced by the shape of the return
 * value, not by a lint rule the copy could route around.
 */

/** The goal a visitor sets. Stored, and re-derived on read. */
export interface Goal {
  /** Target net WPM. Always > 0; 0 is "not set", not "zero WPM". */
  readonly targetNetWpm: number;
  /** Minutes per week they intend to practise. 0 is "not set". */
  readonly weeklyMinutes: number;
}

/** One finished attempt, as far as this module is concerned. */
export interface GoalSample {
  readonly netWpm: number;
  /** Epoch ms. Sorted by the caller; this module does not sort. */
  readonly atMs: number;
}

/** The minimum span before a trend means anything at all. */
export const MIN_TREND_DAYS = 7;

/** The minimum attempts before a trend means anything at all. */
export const MIN_TREND_SAMPLES = 3;

export interface GoalEta {
  /** The weeks the trend implies, or null when there is no usable trend. */
  readonly weeks: number | null;
  /** Why there is no ETA, named rather than implied. */
  readonly reason: EtaBlocker | null;
}

export type EtaBlocker = "no-goal" | "not-enough-history" | "already-there" | "no-progress";

/** The default weekly commitment offered in the picker. */
export const WEEKLY_MINUTES = [15, 30, 45, 60] as const;

/** Net WPM targets offered in the picker. */
export const TARGET_SPEEDS = [30, 40, 50, 60, 80, 100] as const;

/** A goal with nothing set, which is not the same as a goal of zero. */
export const EMPTY_GOAL: Goal = { targetNetWpm: 0, weeklyMinutes: 0 };

/**
 * The ETA for a goal, given the run history.
 *
 * Pure: the clock is a parameter, so a test can pin the answer. Returns null
 * with a NAMED reason whenever the honest answer is "not yet" — and every one
 * of those is a case where a guessed number would be worse than no number.
 */
export function etaFor(goal: Goal, samples: readonly GoalSample[], nowMs: number): GoalEta {
  if (goal.targetNetWpm <= 0) return { weeks: null, reason: "no-goal" };

  // Already met: the goal is achieved, not estimated.
  const latest = samples.length > 0 ? samples[samples.length - 1]! : null;
  if (latest !== null && latest.netWpm >= goal.targetNetWpm) {
    return { weeks: null, reason: "already-there" };
  }

  if (samples.length < MIN_TREND_SAMPLES) {
    return { weeks: null, reason: "not-enough-history" };
  }

  const first = samples[0]!;
  const elapsedMs = Math.max(1, nowMs - first.atMs);
  if (elapsedMs < MIN_TREND_DAYS * 86_400_000) {
    return { weeks: null, reason: "not-enough-history" };
  }

  const gain = latest!.netWpm - first.netWpm;
  // A gain of zero or less is real data: the trend is flat. Reporting a date
  // for it would be a lie, and the screen says so instead.
  if (gain <= 0) return { weeks: null, reason: "no-progress" };

  const perWeek = gain / (elapsedMs / (7 * 86_400_000));
  const remaining = goal.targetNetWpm - latest!.netWpm;
  const weeks = Math.ceil(remaining / perWeek);

  // A trend that implies more than two years is not a trend, it is noise that
  // has not been recognised as noise yet.
  if (!Number.isFinite(weeks) || weeks <= 0 || weeks > 104) {
    return { weeks: null, reason: "no-progress" };
  }

  return { weeks, reason: null };
}

/** Whether a goal is set at all, in either field. */
export function hasGoal(goal: Goal): boolean {
  return goal.targetNetWpm > 0 || goal.weeklyMinutes > 0;
}

/**
 * The weekly commitment, as sessions of a workable length.
 *
 * 45 minutes is not "practise for 45 minutes" — nobody practises for 45
 * minutes on their third day — it is three 15-minute sessions. The split is
 * derived here so the screen can say "three 15-minute sessions" rather than
 * making the visitor do the arithmetic.
 */
export function sessionsPerWeek(weeklyMinutes: number, sessionMinutes = 15): number {
  if (weeklyMinutes <= 0) return 0;
  return Math.round(weeklyMinutes / sessionMinutes);
}
