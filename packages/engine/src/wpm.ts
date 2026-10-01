/**
 * RealType typing engine (open-core, MIT) — the shared speed conversion.
 *
 * This exists as its own module for one reason: the final metrics
 * (`metrics.ts`) and the live metrics (`live-summary.ts`) must convert
 * characters and milliseconds to WPM the same way, forever. When the formula
 * lived in `metrics.ts` only, the live view had to either import a private
 * helper or copy the arithmetic — and a copy is exactly the second
 * implementation AGENTS.md rule 3 forbids, which is how a live figure and a
 * stored figure end up disagreeing under the same name.
 */

/** Words are five characters; WPM is characters ÷ 5 ÷ minutes. */
export function perMinuteWpm(chars: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  return chars / 5 / (durationMs / 60_000);
}
