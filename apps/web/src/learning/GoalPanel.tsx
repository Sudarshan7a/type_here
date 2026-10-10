import { useState } from "react";

import { COPY } from "../copy";
import { EMPTY_GOAL } from "./goals";
import {
  TARGET_SPEEDS,
  WEEKLY_MINUTES,
  etaFor,
  hasGoal,
  sessionsPerWeek,
  type EtaBlocker,
  type Goal,
  type GoalSample,
} from "./goals";
import { readGoalRecord, saveGoal } from "./goal-storage";

/**
 * LRN-06: the goal panel.
 *
 * Two selects and a sentence. The target and the weekly commitment are the
 * only inputs, and the ETA is derived from the visitor's own runs — shown
 * only when there is enough evidence to have one, and otherwise replaced by
 * what is missing. A guessed ETA would be the single most dishonest thing this
 * app could render, so `etaFor` refuses to produce one and this panel says
 * why instead.
 *
 * It sits BELOW the results panel in normal flow, covering nothing, and it is
 * not a live region: the surface's single polite announcer stays the only
 * thing announced.
 */

export interface GoalPanelProps {
  /** The practice history, newest last. Passed in: the App owns the record. */
  readonly history: readonly GoalSample[];
}

/** Why there is no ETA, in words. Every case has a sentence, not a blank. */
const BLOCKER_COPY: Readonly<Record<EtaBlocker, string>> = {
  "no-goal": "Pick a target and the ETA appears once your runs can support one.",
  "not-enough-history":
    "The ETA appears after a few runs spread over at least a week — a trend made of one afternoon is not a trend.",
  "already-there": "You are already at your target. Raise it when you want to.",
  "no-progress":
    "Your recent runs are not trending upward yet, so there is no honest ETA to show. The target stays; the date does not.",
};

/** Fill a `{slot}` template. Copy stays a string table; the UI does the fill. */
function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);
}

export function GoalPanel({ history }: GoalPanelProps) {
  // The goal is read once on mount and written on change, the same
  // guest-first pattern as every other selection in this app. It is never
  // written in the key path.
  const [goal, setGoal] = useState<Goal>(() => readGoalRecord().goal ?? EMPTY_GOAL);

  // Keep the panel honest about what the history supports, computed on change
  // rather than on a timer.
  const eta = etaFor(goal, history, Date.now());
  const sessions = sessionsPerWeek(goal.weeklyMinutes);

  const change = (next: Partial<Goal>): void => {
    const merged = { ...goal, ...next };
    setGoal(merged);
    saveGoal(merged);
  };

  // A goal that exists has at least one field set; `hasGoal` is that test.
  const set = hasGoal(goal);

  return (
    <section className="goal" aria-labelledby="goal-title" data-testid="goal">
      <h3 id="goal-title" data-testid="goal-title">
        {COPY.goal.title}
      </h3>

      <div className="goal-fields">
        <label htmlFor="goal-target">{COPY.goal.targetLabel}</label>
        <select
          id="goal-target"
          data-testid="goal-target"
          value={goal.targetNetWpm > 0 ? String(goal.targetNetWpm) : ""}
          onChange={(event) => change({ targetNetWpm: Number(event.target.value) || 0 })}
        >
          <option value="">{COPY.goal.noneOption}</option>
          {TARGET_SPEEDS.map((speed) => (
            <option key={speed} value={speed}>
              {fill(COPY.goal.targetOption, { wpm: String(speed) })}
            </option>
          ))}
        </select>

        <label htmlFor="goal-weekly">{COPY.goal.weeklyLabel}</label>
        <select
          id="goal-weekly"
          data-testid="goal-weekly"
          value={goal.weeklyMinutes > 0 ? String(goal.weeklyMinutes) : ""}
          onChange={(event) => change({ weeklyMinutes: Number(event.target.value) || 0 })}
        >
          <option value="">{COPY.goal.noneOption}</option>
          {WEEKLY_MINUTES.map((minutes) => (
            <option key={minutes} value={minutes}>
              {fill(COPY.goal.weeklyOption, { minutes: String(minutes) })}
            </option>
          ))}
        </select>
      </div>

      {/*
        The ETA, or the reason there is not one. The blocker text is the whole
        of the honesty here: it names what is missing rather than rendering a
        number that would be a guess.
      */}
      {set && (
        <p className="goal-eta" data-testid="goal-eta" data-blocker={eta.reason ?? "none"}>
          {eta.reason === null
            ? fill(COPY.goal.eta, { weeks: String(eta.weeks), sessions: String(sessions) })
            : BLOCKER_COPY[eta.reason]}
        </p>
      )}

      <p className="note" data-testid="goal-note">
        {COPY.goal.note}
      </p>
    </section>
  );
}
