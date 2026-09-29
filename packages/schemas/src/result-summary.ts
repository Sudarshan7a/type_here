import { z } from "zod";

import { VersionSchema } from "./input-log.js";

/**
 * Result metrics (M1-01). Every metric defined by the typing-metrics-spec
 * skill, shape-only. Values are stored at full precision (display rounding
 * happens in the UI, never here). Percentages are 0-100; ratios are 0-1.
 * Consistency/IKI are nullable: null below the documented minimum scored
 * duration (engine decides; the contract just allows it).
 */
export const ResultSummarySchema = z.strictObject({
  /** (printable keystrokes / 5) / minutes. */
  rawWpm: z.number().nonnegative(),
  /** (characters in final text / 5) / minutes — details view only. */
  grossWpm: z.number().nonnegative(),
  /** (correct characters in final text / 5) / minutes — the headline. */
  netWpm: z.number().nonnegative(),
  /** correct keystrokes / total printable keystrokes, percent. */
  keystrokeAccuracy: z.number().min(0).max(100),
  /** correct chars / total chars at the end, percent. */
  finalAccuracy: z.number().min(0).max(100),
  /** total keystrokes (incl. Backspace) / characters in final text. */
  kspc: z.number().nonnegative(),
  /** keystrokes typed while the previous key was still down / total keystrokes. */
  rolloverRatio: z.number().min(0).max(1),
  /** 100 × (1 − CV) of per-second net speed; null below minimum duration. */
  consistency: z.number().min(0).max(100).nullable(),
  /** Best rolling 5-second window, WPM. */
  burstWpm: z.number().nonnegative(),
  /** Mean inter-keystroke interval, ms, gaps > 5 s excluded; null if none. */
  ikiMeanMs: z.number().nonnegative().nullable(),
  /** Version of the metric formulas that produced these numbers. */
  modelVersion: VersionSchema,
  /** Prose-only difficulty band; null for code/symbol texts (no validated model). */
  difficultyBand: z.enum(["easy", "typical", "hard"]).nullable(),
  /** True when the result was verified server-side (signed session + recompute). */
  verified: z.boolean(),
  /** Integrity/quality flags (e.g. "untrusted-events", "paused-abnormally"). */
  flags: z.array(z.string().min(1)),
});

export type ResultSummary = z.infer<typeof ResultSummarySchema>;
