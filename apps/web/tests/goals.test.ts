import { describe, expect, it } from "vitest";

import {
  MIN_TREND_DAYS,
  WEEKLY_MINUTES,
  TARGET_SPEEDS,
  etaFor,
  hasGoal,
  sessionsPerWeek,
  type Goal,
  type GoalSample,
} from "../src/learning/goals";
import {
  MAX_HISTORY_SAMPLES,
  emptyGoalRecord,
  readGoalRecord,
} from "../src/learning/goal-storage";

/**
 * LRN-06 — goals.
 *
 * The module's whole job is refusing to produce a date it cannot justify, so
 * these tests are mostly about the refusal paths: an ETA is a promise, and a
 * promise is the one thing this screen must never make.
 */

const DAY = 86_400_000;

/** A steady climb: `weeklyGain` WPM a week, for `weeks` samples. */
function trend(from: number, weeklyGain: number, weeks: number, nowMs: number): GoalSample[] {
  return Array.from({ length: weeks }, (_, i) => ({
    netWpm: from + weeklyGain * i,
    atMs: nowMs - (weeks - i) * 7 * DAY,
  }));
}

const GOAL: Goal = { targetNetWpm: 80, weeklyMinutes: 45 };
const NOW = 1_700_000_000_000;

describe("the ETA refuses when it should (rule 9)", () => {
  it("names 'no goal' rather than inventing a target", () => {
    expect(etaFor({ targetNetWpm: 0, weeklyMinutes: 0 }, [], NOW)).toEqual({
      weeks: null,
      reason: "no-goal",
    });
  });

  it("says the goal is met instead of projecting past it", () => {
    expect(etaFor(GOAL, [{ netWpm: 85, atMs: NOW }], NOW)).toEqual({
      weeks: null,
      reason: "already-there",
    });
    // A target reached exactly is reached, not nearly.
    expect(etaFor(GOAL, [{ netWpm: 80, atMs: NOW }], NOW)).toEqual({
      weeks: null,
      reason: "already-there",
    });
  });

  it("withholds a date from one afternoon of practice", () => {
    // Three runs in one day is not a trend, however encouraging the numbers.
    const samples = [
      { netWpm: 30, atMs: NOW - 3 * DAY },
      { netWpm: 32, atMs: NOW - 2 * DAY },
      { netWpm: 34, atMs: NOW },
    ];
    expect(samples.length).toBeGreaterThanOrEqual(3);
    expect(etaFor(GOAL, samples, NOW).reason).toBe("not-enough-history");
  });

  it("withholds a date from too few attempts", () => {
    expect(etaFor(GOAL, trend(30, 2, 2, NOW), NOW).reason).toBe("not-enough-history");
    // Three attempts over three weeks is the floor, and it produces a date.
    expect(etaFor(GOAL, trend(30, 2, 3, NOW), NOW).reason).toBeNull();
  });

  it("reports a flat trend as flat, not as infinity", () => {
    // The honest answer to "my runs are not improving" is that sentence, not a
    // date computed by dividing by a gain of zero.
    const flat = [
      { netWpm: 40, atMs: NOW - 14 * DAY },
      { netWpm: 40, atMs: NOW - 7 * DAY },
      { netWpm: 40, atMs: NOW },
    ];
    expect(etaFor(GOAL, flat, NOW)).toEqual({ weeks: null, reason: "no-progress" });
    // Going backwards is the same answer.
    const down = [
      { netWpm: 40, atMs: NOW - 14 * DAY },
      { netWpm: 38, atMs: NOW - 7 * DAY },
      { netWpm: 36, atMs: NOW },
    ];
    expect(etaFor(GOAL, down, NOW).reason).toBe("no-progress");
  });

  it("treats a two-year projection as noise, not a date", () => {
    // A gain of 0.01 WPM/week toward 80 from 30 is arithmetic that means
    // nothing. Refusing it is the only honest option.
    const barely = [
      { netWpm: 30, atMs: NOW - 14 * DAY },
      { netWpm: 30.01, atMs: NOW - 7 * DAY },
      { netWpm: 30.02, atMs: NOW },
    ];
    expect(etaFor(GOAL, barely, NOW).reason).toBe("no-progress");
  });

  it("requires the trend to span a real week", () => {
    expect(MIN_TREND_DAYS).toBe(7);
  });
});

describe("the ETA when there is one", () => {
  it("projects the remaining gain at the observed rate", () => {
    // 6 samples a week apart, +2 WPM each: 30 → 40 over 6 weeks, so the rate is
    // 2/6 WPM per week and the remaining 40 WPM implies 24 weeks.
    const eta = etaFor(GOAL, trend(30, 2, 6, NOW), NOW);
    expect(eta.reason).toBeNull();
    expect(eta.weeks).toBe(24);
  });

  it("is rounded up, because a week is not a fraction", () => {
    const eta = etaFor(GOAL, trend(30, 2.1, 6, NOW), NOW);
    expect(eta.weeks).toBe(23); // 40 remaining at 1.75/week = 22.86
    expect(Number.isInteger(eta.weeks)).toBe(true);
  });

  it("uses the first and last sample, not an average of the slope", () => {
    const eta = etaFor(GOAL, trend(30, 3, 5, NOW), NOW);
    expect(eta.reason).toBeNull();
    // 30 → 42 over 5 weeks = 2.4/week; 38 remaining ÷ 2.4 = 15.83 → 16.
    expect(eta.weeks).toBe(16);
  });

  it("is pure: the clock is a parameter, not a hidden now()", () => {
    const samples = trend(30, 2, 6, NOW);
    expect(etaFor(GOAL, samples, NOW)).toEqual(etaFor(GOAL, samples, NOW));
  });
});

describe("the weekly commitment", () => {
  it("splits the commitment into sessions, so nobody is told to practise 45 minutes", () => {
    expect(sessionsPerWeek(45)).toBe(3);
    expect(sessionsPerWeek(15)).toBe(1);
    expect(sessionsPerWeek(60)).toBe(4);
    expect(sessionsPerWeek(0)).toBe(0);
  });

  it("offers commitments and targets that are round numbers", () => {
    expect(WEEKLY_MINUTES).toContain(15);
    expect(WEEKLY_MINUTES).toContain(45);
    expect(TARGET_SPEEDS).toEqual([30, 40, 50, 60, 80, 100]);
    for (const speed of TARGET_SPEEDS) expect(speed).toBeGreaterThan(0);
  });
});

describe("the goal record (storage)", () => {
  it("stores two numbers and a capped history, and no text", () => {
    expect(Object.keys(emptyGoalRecord().goal).sort()).toEqual(["targetNetWpm", "weeklyMinutes"]);
    expect(MAX_HISTORY_SAMPLES).toBeGreaterThan(10);
  });

  it("defaults to nothing set, which is not a goal of zero", () => {
    // A visitor who has never chosen has no goal at all — a target of zero
    // would read as "type nothing", so the empty record is a separate state.
    expect(hasGoal(emptyGoalRecord().goal)).toBe(false);
    expect(readGoalRecord().goal).toEqual(emptyGoalRecord().goal);
  });

  it("knows when a goal exists in either field", () => {
    expect(hasGoal({ targetNetWpm: 60, weeklyMinutes: 0 })).toBe(true);
    expect(hasGoal({ targetNetWpm: 0, weeklyMinutes: 30 })).toBe(true);
    expect(hasGoal({ targetNetWpm: 0, weeklyMinutes: 0 })).toBe(false);
  });
});
