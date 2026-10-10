/**
 * Where the goal and the practice history live (LRN-06).
 *
 * Guest-first localStorage, exactly like every other selection in this app.
 *
 * WHAT IS STORED
 *
 * The goal (two numbers), and a capped history of (net WPM, timestamp) pairs.
 * No text, no keystrokes, no passage id — the history is the only shape that
 * can support a trend without storing anything about what was typed
 * (keystroke-privacy skill, D-M4-6).
 *
 * The history is CAPPED, and the cap is a design decision rather than a
 * convenience: an ever-growing array in localStorage is both a quota problem
 * and a privacy problem, and a trend computed from three months of runs is not
 * meaningfully different from one computed from the last thirty.
 */

// Re-exported so the App can type its history from one module: the record and
// the sample are one shape, from one place.
export type { Goal, GoalSample } from "./goals";
import { EMPTY_GOAL, type Goal, type GoalSample } from "./goals";

/** localStorage key for the goal. Namespaced like every other key in the app. */
export const GOAL_STORAGE_KEY = "realtype.goal";

/** How many finished attempts the trend is computed over. */
export const MAX_HISTORY_SAMPLES = 40;

export interface GoalRecord {
  readonly version: 1;
  readonly goal: Goal;
  /** Newest last. Capped at MAX_HISTORY_SAMPLES. */
  readonly history: readonly GoalSample[];
}

/** The record for a visitor who has not set anything. */
export function emptyGoalRecord(): GoalRecord {
  return { version: 1, goal: EMPTY_GOAL, history: [] };
}

function store(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

/** Read the record. A corrupt or partial record is read as empty, never patched. */
export function readGoalRecord(): GoalRecord {
  const raw = store()?.getItem(GOAL_STORAGE_KEY);
  if (raw === null || raw === undefined) return emptyGoalRecord();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyGoalRecord();
  }
  if (typeof parsed !== "object" || parsed === null) return emptyGoalRecord();
  const record = parsed as Record<string, unknown>;
  if (record.version !== 1) return emptyGoalRecord();

  const goal = record.goal as Record<string, unknown> | undefined;
  const target =
    typeof goal?.targetNetWpm === "number" && Number.isFinite(goal.targetNetWpm)
      ? goal.targetNetWpm
      : 0;
  const weekly =
    typeof goal?.weeklyMinutes === "number" && Number.isFinite(goal.weeklyMinutes)
      ? goal.weeklyMinutes
      : 0;

  // A history entry is two numbers or it is nothing: a half-written entry
  // voids itself rather than contributing a NaN to a trend.
  const history = Array.isArray(record.history)
    ? record.history
        .filter(
          (entry): entry is GoalSample =>
            typeof entry === "object" &&
            entry !== null &&
            typeof (entry as GoalSample).netWpm === "number" &&
            Number.isFinite((entry as GoalSample).netWpm) &&
            typeof (entry as GoalSample).atMs === "number" &&
            Number.isFinite((entry as GoalSample).atMs),
        )
        .slice(-MAX_HISTORY_SAMPLES)
    : [];

  return {
    version: 1,
    goal: { targetNetWpm: Math.max(0, target), weeklyMinutes: Math.max(0, weekly) },
    history,
  };
}

/** Persist the record. Returns whether it was actually written. */
export function writeGoalRecord(record: GoalRecord): boolean {
  const store_ = store();
  if (store_ === null) return false;
  try {
    store_.setItem(GOAL_STORAGE_KEY, JSON.stringify(record));
    return readGoalRecord().goal.targetNetWpm === record.goal.targetNetWpm;
  } catch {
    return false;
  }
}

/** Replace the goal, keeping the history. */
export function saveGoal(goal: Goal): boolean {
  return writeGoalRecord({ ...readGoalRecord(), goal });
}

/**
 * Append one finished attempt.
 *
 * Only `classic`-family practice runs are recorded: a baseline is a
 * measurement, not practice, and mixing the two would make the trend describe
 * something it never measured.
 */
export function recordAttempt(netWpm: number, atMs: number): boolean {
  const current = readGoalRecord();
  const history = [...current.history, { netWpm, atMs }].slice(-MAX_HISTORY_SAMPLES);
  return writeGoalRecord({ ...current, history });
}
