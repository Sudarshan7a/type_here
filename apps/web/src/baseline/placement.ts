import type { EngineResult } from "@realtype/engine";

/**
 * Placement — where a visitor starts, once a baseline has been measured
 * (MOD-05, LRN-01).
 *
 * WHY THIS IS A MEASUREMENT AND THE ONBOARDING PLAN IS NOT
 *
 * The onboarding plan derives a band from what the visitor SAID about
 * themselves, and it labels that a self-report — `plan.ts` refuses to call it
 * anything else. A baseline is the one thing in this app that IS a
 * measurement: three minutes of typing, scored by the same engine that scores
 * every practice test, against the same target text. So the placement it
 * produces is labelled `measured`, because it is.
 *
 * WHAT IT IS NOT is a promise. A band is where the surface starts you; it is
 * not a claim about what you will achieve. That is why every string this
 * module feeds names the two numbers and the band, and nothing else.
 *
 * THE THRESHOLDS ARE A PROPOSAL, marked as one the way the engine marks its
 * own. Net WPM of a three-minute English prose run is a defensible thing to
 * threshold, but the specific numbers are starting values to calibrate
 * against real people — the same convention `proficiency.ts` uses for
 * `PROPOSED_WEAK_SEVERITY_CUT`. They are constants rather than inline literals
 * so they can be found and changed in one place.
 */

/** The band a visitor is placed in. Same three values the corpus carries. */
export type PlacementBand = "easy" | "typical" | "hard";

/**
 * [proposal] Net-WPM thresholds, inclusive lower bounds.
 *
 * 0–19 easy, 20–39 typical, 40+ hard. Chosen so a slow first run does not land
 * someone in content that will read as punishment, and a fluent typist is not
 * held back to "the quick brown fox". Calibrate against real baselines before
 * treating these as settled.
 */
export const BAND_NET_WPM_FLOOR: Readonly<Record<PlacementBand, number>> = Object.freeze({
  easy: 0,
  typical: 20,
  hard: 40,
});

/** How long the general baseline runs. MOD-05: about 3 minutes. */
export const BASELINE_SECONDS = 180;

/** M4-08 item 4: the day-30 retest window. */
export const RETEST_DAYS = 30;

export interface Placement {
  /** Where to start. */
  readonly band: PlacementBand;
  /** The measured figure that produced it, at the engine's own precision. */
  readonly netWpm: number;
  /** The measured accuracy that produced it. */
  readonly finalAccuracy: number;
  /** Always `measured` here: a baseline is a measurement, not a self-report. */
  readonly basis: "measured";
}

/**
 * The band a measured baseline places a visitor in.
 *
 * Pure and total: a non-finite or negative figure falls to the easiest band
 * rather than throwing, because a crashed placement must not take the results
 * screen with it.
 */
export function bandForNetWpm(netWpm: number): PlacementBand {
  if (!Number.isFinite(netWpm) || netWpm < BAND_NET_WPM_FLOOR.typical) return "easy";
  if (netWpm < BAND_NET_WPM_FLOOR.hard) return "typical";
  return "hard";
}

/**
 * The placement a finished baseline produces.
 *
 * Reads only the engine's summary — no text, no keystrokes, nothing that could
 * identify anyone. A short run is still a placement: three minutes is far above
 * the engine's ten-second consistency floor, but a visitor who stops early has
 * still been measured over what they typed, and the honesty note belongs to the
 * results screen rather than here.
 */
export function placementFromResult(result: EngineResult): Placement {
  return {
    band: bandForNetWpm(result.summary.netWpm),
    netWpm: result.summary.netWpm,
    finalAccuracy: result.summary.finalAccuracy,
    basis: "measured",
  };
}

/**
 * When a retest is due, in epoch ms, or null when there is no baseline.
 *
 * M4-08 item 4 and M4-13's baseline/retest pairing both need a date; the
 * record carries `takenAtMs` so this is arithmetic rather than a stored
 * promise. Nothing here schedules a notification — reminders are V1 work.
 */
export function retestDueAt(takenAtMs: number): number {
  return takenAtMs + RETEST_DAYS * 86_400_000;
}
