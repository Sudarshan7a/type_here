/**
 * The results screen's formatting layer (ANA-01).
 *
 * Rule 3: metrics live only in packages/engine. Nothing here computes a metric,
 * combines two engine numbers, or re-rounds one. Every function takes a value
 * the engine already produced and renders it, and the companion module
 * (./metrics.ts) is the table that says which engine field each displayed
 * figure comes from — so a number cannot appear on this screen that is not read
 * straight off the engine's result object.
 *
 * THAT IS WHAT "numbers must match server recomputation" (ANA-01, INT-01) MEANS
 * HERE. `computeResult` in @realtype/engine is documented as the single entry
 * point the client and the server both call (packages/engine/src/index.ts). This
 * module never touches the log, never re-derives a duration, and never rounds a
 * value twice. So the displayed string is the engine value at one stated
 * precision — not a second opinion about it.
 *
 * PRECISION, chosen once and stated rather than sprinkled:
 *
 *  - `speed`, one decimal. A figure finer than a tenth of a WPM is finer than
 *    the keystroke timestamps can support, and the live readout beside it has
 *    always used the same one decimal.
 *  - `percent`, one decimal, for every ratio the engine reports out of 100
 *    (accuracy, consistency, rollover) so the three are comparable by eye.
 *  - `ratio`, two decimals, for keystrokes per character. The interesting range
 *    is around 1.0, and one decimal cannot tell 1.02 from 1.04 — which is the
 *    whole difference between "no corrections" and "some corrections".
 *  - `seconds`, one decimal, matching the replay timestamp's own format.
 *  - `speech`, whole numbers, for the live-region sentence only. A decimal
 *    point is noise in an audio channel; the visual panel keeps full precision,
 *    and the two formats live here together so the choice is reviewable rather
 *    than scattered.
 *
 * `displayNumber` returns null for a value that is not finite. The engine has no
 * such value today; returning null rather than the string "NaN" means a future
 * engine change surfaces as "Not reported for this test" — a statement that can
 * be checked — instead of a NaN on screen that nobody can.
 */

/** Decimal places per figure class. See the note above for why each one. */
export const PRECISION = {
  speed: 1,
  percent: 1,
  ratio: 2,
  seconds: 1,
  speech: 0,
} as const;

/**
 * `toFixed`, with the two things it does that a display layer must not leave
 * behind: `-0` becomes `0` (a signed zero reads as a bug to a reader), and a
 * non-finite value yields null instead of "NaN" or "Infinity".
 */
export function displayNumber(value: number, decimals: number): string | null {
  if (!Number.isFinite(value)) return null;
  return (Object.is(value, -0) ? 0 : value).toFixed(decimals);
}

/** A speed figure: words per minute. One decimal. */
export function formatSpeed(value: number): string | null {
  return displayNumber(value, PRECISION.speed);
}

/** A ratio the engine reports out of 100. One decimal. */
export function formatPercent(value: number): string | null {
  return displayNumber(value, PRECISION.percent);
}

/** Keystrokes per character. Two decimals — see PRECISION.ratio. */
export function formatRatio(value: number): string | null {
  return displayNumber(value, PRECISION.ratio);
}

/** A duration in seconds, from milliseconds. One decimal. */
export function formatSeconds(ms: number): string | null {
  if (!Number.isFinite(ms)) return null;
  return displayNumber(ms / 1000, PRECISION.seconds);
}

/**
 * A whole number for the live region. Speech only — never on screen, where the
 * full precision is shown. `toFixed(0)` is used rather than `Math.round` so the
 * two channels share one rounding rule.
 */
export function formatSpeech(value: number): string {
  return Number.isFinite(value) ? value.toFixed(PRECISION.speech) : "0";
}
