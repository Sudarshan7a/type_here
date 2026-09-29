/**
 * Shared limits for data contracts (M1-01). Shape-only; no metric logic
 * lives in this package (AGENTS.md rule 3).
 */

export const LIMITS = {
  /** Maximum key events in one InputLog. */
  maxEventsPerLog: 20_000,
  /** Maximum text length in characters. */
  maxTextLength: 10_000,
} as const;
