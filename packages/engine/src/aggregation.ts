/**
 * RealType typing engine (open-core, MIT) â€” per-key and per-bigram
 * aggregation (D3), implementing Â§4.12 of
 * docs/chapter-4-deep-dive-typing-engine-part2.md.
 *
 * Two rules carry the whole point:
 *
 * 1. Outliers are excluded SELF-RELATIVELY: a sample beyond 3x the user's own
 *    median for that bigram is dropped from the speed aggregate (typing speed
 *    varies hugely between people, so a fixed millisecond threshold would be
 *    wrong for someone and useless for someone else). The excluded sample is
 *    still recorded as a hesitation event â€” that is a different, useful signal.
 *
 * 2. Finger/hand tags come from the ACTIVE layout's map, never hardcoded: the
 *    same bigram string can be same-finger on one layout and cross-hand on
 *    another. A layout with no map yet returns "unknown" rather than a guess.
 */

import type { KeyEvent, Layout } from "@realtype/schemas";

import { fingerFor, fingerForCode, productionFor, type Finger } from "./layout-fingers.js";

/** Self-relative outlier threshold: 3x the item's own median interval. */
export const OUTLIER_MULTIPLE = 3;

export interface Sample {
  intervalMs: number;
  /** Optional context carried through (e.g. which word it came from). */
  word?: string;
}

export interface AggregateResult {
  from: string;
  to: string;
  /** Mean interval of the retained (non-outlier) samples, ms. */
  meanMs: number;
  medianMs: number;
  /** Never present an aggregate without its sample count (D-M4-3). */
  sampleCount: number;
  excludedCount: number;
  /** Count of dropped samples, kept as a separate signal. */
  hesitationEvents: number;
  excluded: Sample[];
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle]!;
  return (sorted[middle - 1]! + sorted[middle]!) / 2;
}

export function aggregateBigram(from: string, to: string, samples: Sample[]): AggregateResult {
  if (samples.length === 0) {
    return {
      from,
      to,
      meanMs: 0,
      medianMs: 0,
      sampleCount: 0,
      excludedCount: 0,
      hesitationEvents: 0,
      excluded: [],
    };
  }

  const medianMs = median(samples.map((s) => s.intervalMs));
  const threshold = OUTLIER_MULTIPLE * medianMs;

  // A single sample cannot be an outlier against itself.
  const retained: Sample[] = [];
  const excluded: Sample[] = [];
  for (const sample of samples) {
    if (samples.length > 1 && sample.intervalMs > threshold) {
      excluded.push(sample);
    } else {
      retained.push(sample);
    }
  }

  const total = retained.reduce((sum, s) => sum + s.intervalMs, 0);
  return {
    from,
    to,
    meanMs: retained.length === 0 ? 0 : total / retained.length,
    medianMs,
    sampleCount: retained.length,
    excludedCount: excluded.length,
    hesitationEvents: excluded.length,
    excluded,
  };
}

export interface FingerTag {
  /** "cross" | "same" | "unknown" â€” unknown when the layout or character
   *  has no verified map (see layout-fingers.ts). */
  hand: "cross" | "same" | "unknown";
  sameFinger: boolean | null;
}

/**
 * Tag a bigram by the ACTIVE layout, using the physically verified maps in
 * layout-fingers.ts. Layouts and AltGr-dependent characters without a verified
 * map return "unknown" rather than inheriting another layout's answer, which
 * would be silently wrong and would corrupt the weakness model's data.
 */
export function fingerTag(from: string, to: string, layout: Layout): FingerTag {
  const a = fingerFor(layout, from);
  const b = fingerFor(layout, to);
  if (a === null || b === null) return { hand: "unknown", sameFinger: null };

  const sameFinger = a === b;
  const sameHand = a.startsWith("l") === b.startsWith("l");
  return { hand: sameHand ? "same" : "cross", sameFinger };
}

/**
 * Resolve one press to a finger via its PHYSICAL key (chapter-4 E8): the
 * on-grid code first (layout-independent column fact), then the verified
 * Shift/AltGr production table for that layout, else unknown. The produced
 * character is only ever a key into the verified table — never a canonical
 * key lookup — so an `s`-on-Semicolon press cannot inherit the canonical
 * KeyS finger.
 */
function fingerForPress(code: string, key: string, layout: Layout): Finger | null {
  return fingerForCode(code) ?? productionFor(layout, key)?.finger ?? null;
}

function tagFingers(a: Finger | null, b: Finger | null): FingerTag {
  if (a === null || b === null) return { hand: "unknown", sameFinger: null };
  const sameFinger = a === b;
  const sameHand = a.startsWith("l") === b.startsWith("l");
  return { hand: sameHand ? "same" : "cross", sameFinger };
}

/**
 * Tag a rollover/dual-key transition via physical `event.code` (ENG-06 E8),
 * following the metrics.ts code-matching precedent: the same character
 * typed on two different physical keys (e.g. `s` on KeyS vs on Semicolon)
 * attributes to the key that was actually pressed, never to a canonical
 * "the" key for that character. The KeyEvent shape is the merged CONTRACT
 * 1.4.0 log event (Slice 1); it is consumed as-is, never reshaped.
 *
 * Char-based fingerTag() intentionally keeps returning "unknown" for
 * AltGr/shift-layer characters: a bare character IS ambiguous without its
 * code, and guessing would corrupt the weakness model. This is the function
 * that resolves those presses once the code is known.
 */
export function fingerTagForEvents(prev: KeyEvent, curr: KeyEvent, layout: Layout): FingerTag {
  return tagFingers(
    fingerForPress(prev.code, prev.key, layout),
    fingerForPress(curr.code, curr.key, layout),
  );
}
