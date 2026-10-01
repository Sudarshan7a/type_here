/**
 * RealType typing engine (open-core, MIT) — metrics (E3, E5, E6).
 *
 * Every formula here is the one in docs/spec/master-spec-v1.md §6 and the
 * typing-metrics-spec skill. Worked numbers in the deep-dive chapters are
 * illustrations; where they disagree, fixtures/recompute.mjs wins (see
 * fixtures/PROVENANCE.md for the full decision record).
 *
 * Metrics live ONLY in this package (AGENTS.md rule 3). A formula change
 * requires bumping ENGINE_MODEL_VERSION and updating /how-we-calculate.
 */
import type { KeyEvent, LogMarker } from "@realtype/schemas";

import { filterEvents, integrityFlags } from "./input-filter.js";
import { applyPress, correctCharsInFinalText, createTextModel, finalText } from "./text-model.js";

/** Version of the metric formulas below. Old results keep their own stamp. */
export const ENGINE_MODEL_VERSION = "1.0.0";

/** IKI statistics exclude gaps longer than this (typing-metrics-spec). */
export const IKI_GAP_EXCLUSION_MS = 5_000;

/** Consistency is null below this scored duration (documented decision). */
export const MIN_CONSISTENCY_DURATION_MS = 10_000;

/** Burst window width (typing-metrics-spec: best rolling 5-second window). */
export const BURST_WINDOW_MS = 5_000;

/** Seconds excluded at the start of the per-second consistency series. */
const CONSISTENCY_LEAD_IN_SECONDS = 2;

export interface EngineDetails {
  durationMs: number;
  printableKeystrokes: number;
  correctKeystrokes: number;
  correctCharsInFinalText: number;
  finalTextLength: number;
  bufferInserts: number;
  backspaces: number;
  rejectedAttempts: number;
  totalAttempts: number;
  /** Rejected attempts as a share of total attempts (must-correct mode). */
  rejectedAttemptRate: number;
  autoInserts: number;
  untrustedEvents: number;
  repeatDrops: number;
  /** Presses typed while the previous key was still down. */
  overlappedPresses: number;
  rolloverTransitions: number;
  /** Gaps between consecutive scoring presses that exceeded the IKI exclusion. */
  ikiExcludedGaps: number;
  ikiSampleCount: number;
  /** Characters in the best burst window. */
  burstWindowChars: number;
  scoredDurationMs: number;
  wallDurationMs: number;
}

export interface EngineResult {
  summary: {
    rawWpm: number;
    grossWpm: number;
    netWpm: number;
    keystrokeAccuracy: number;
    finalAccuracy: number;
    kspc: number;
    rolloverRatio: number;
    consistency: number | null;
    burstWpm: number;
    ikiMeanMs: number | null;
    modelVersion: string;
    difficultyBand: "easy" | "typical" | "hard" | null;
    verified: boolean;
    flags: string[];
  };
  details: EngineDetails;
  /** The text the user actually produced (for replay and the results screen). */
  finalText: string;
}

function perMinuteWpm(chars: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  return chars / 5 / (durationMs / 60_000);
}

/**
 * Rollover ratio (E5): presses typed while the immediately preceding press's
 * physical key was still down, over presses that have a predecessor. Key
 * matching is by `event.code` so a shifted key still matches its physical key.
 */
function rollover(
  presses: KeyEvent[],
  keyUps: KeyEvent[],
): {
  ratio: number;
  transitions: number;
  overlaps: number;
} {
  const upTimes = new Map<string, number[]>();
  for (const up of keyUps) {
    const list = upTimes.get(up.code) ?? [];
    list.push(up.t);
    upTimes.set(up.code, list);
  }
  const firstUpAfter = (code: string, after: number): number | null => {
    const list = upTimes.get(code);
    if (list === undefined) return null;
    for (const t of list) {
      if (t > after) return t;
    }
    return null;
  };

  let transitions = 0;
  let overlaps = 0;
  for (let i = 1; i < presses.length; i++) {
    const previous = presses[i - 1]!;
    const current = presses[i]!;
    transitions += 1;
    const released = firstUpAfter(previous.code, previous.t);
    if (released !== null && current.t < released) overlaps += 1;
  }
  return {
    ratio: transitions === 0 ? 0 : overlaps / transitions,
    transitions,
    overlaps,
  };
}

/** IKI: gaps between consecutive scoring presses; gaps > 5 s are excluded. */
function ikiMean(presses: KeyEvent[]): { mean: number | null; samples: number; excluded: number } {
  const gaps: number[] = [];
  let excluded = 0;
  for (let i = 1; i < presses.length; i++) {
    const gap = presses[i]!.t - presses[i - 1]!.t;
    if (gap > IKI_GAP_EXCLUSION_MS) {
      excluded += 1;
      continue;
    }
    gaps.push(gap);
  }
  if (gaps.length === 0) return { mean: null, samples: 0, excluded };
  const total = gaps.reduce((sum, g) => sum + g, 0);
  return { mean: total / gaps.length, samples: gaps.length, excluded };
}

/**
 * Burst WPM: best rolling 5-second window anchored at accepted user inserts.
 * The denominator is the full 5 s window; later-deleted inserts still count
 * (they were typed). Auto-inserted characters never count.
 */
function burst(inserts: { t: number }[]): { wpm: number; chars: number } {
  if (inserts.length === 0) return { wpm: 0, chars: 0 };
  let best = 0;
  for (const anchor of inserts) {
    const end = anchor.t + BURST_WINDOW_MS;
    let count = 0;
    for (const insert of inserts) {
      if (insert.t >= anchor.t && insert.t < end) count += 1;
    }
    if (count > best) best = count;
  }
  return { wpm: perMinuteWpm(best, BURST_WINDOW_MS), chars: best };
}

/**
 * Consistency (E3): 100 × (1 − CV) of per-second net speed, excluding the
 * first 2 seconds, clamped 0–100, null below MIN_CONSISTENCY_DURATION_MS.
 * Pauses are deliberately NOT excluded (chapter 4 §4.7 wants them penalised).
 */
function consistency(correctInserts: { t: number }[], scoredDurationMs: number): number | null {
  if (scoredDurationMs < MIN_CONSISTENCY_DURATION_MS) return null;
  const fullSeconds = Math.floor(scoredDurationMs / 1000);
  const buckets: number[] = [];
  for (let second = CONSISTENCY_LEAD_IN_SECONDS; second < fullSeconds; second++) {
    const start = second * 1000;
    const end = start + 1000;
    let correct = 0;
    for (const insert of correctInserts) {
      if (insert.t >= start && insert.t < end) correct += 1;
    }
    // chars ÷ 5 ÷ (1/60) minutes = chars × 12 WPM
    buckets.push(correct * 12);
  }
  if (buckets.length === 0) return null;
  const mean = buckets.reduce((sum, v) => sum + v, 0) / buckets.length;
  if (mean === 0) return 0;
  const variance = buckets.reduce((sum, v) => sum + (v - mean) * (v - mean), 0) / buckets.length;
  const cv = Math.sqrt(variance) / mean;
  return Math.max(0, Math.min(100, 100 * (1 - cv)));
}

export interface ComputeOptions {
  /** Whether the result is claimed server-verified. */
  verified?: boolean;
  markers?: LogMarker[];
}

export function computeFromEvents(
  target: string,
  events: KeyEvent[],
  errorMode: "free" | "must-correct" | "stop-on-error",
  options: ComputeOptions = {},
): EngineResult {
  const filtered = filterEvents(events);
  const model = createTextModel(target, errorMode);
  for (const press of filtered.scoringPresses) {
    applyPress(model, press);
  }
  return summarise(target, model, filtered, options);
}

type Filtered = ReturnType<typeof filterEvents>;

function summarise(
  target: string,
  model: ReturnType<typeof createTextModel>,
  filtered: Filtered,
  options: ComputeOptions,
): EngineResult {
  /**
   * Scoring presses that belong to the attempt.
   *
   * In stop-on-error (D02) the run halts at the first error, so every press
   * after `haltedAtT` happened *after the attempt was over*. The capture keeps
   * recording them, but they are not part of the test: including them would
   * extend the scored duration, drag IKI down, and let a halted run be dragged
   * out to the end of the target by typing on. Truncating at the halt is what
   * makes "elapsed time freezes at that instant" true.
   */
  const allPresses = filtered.scoringPresses;
  // Captured in a local const so the narrowing survives into the closure:
  // `model` is mutable, so TS cannot narrow `model.haltedAtT` inside `filter`.
  const haltedAtT = model.haltedAtT;
  const presses = haltedAtT === null ? allPresses : allPresses.filter((p) => p.t <= haltedAtT);
  const printable = presses.filter((p) => p.key !== "Backspace");
  const first = presses[0];
  const last = presses[presses.length - 1];
  // A corrupted capture can carry an out-of-order timestamp (the second event
  // claiming an earlier time). A negative span would make every speed metric
  // negative or NaN, so the span is clamped to zero and the log is reported as
  // unusable for speed rather than silently producing nonsense.
  const rawDuration = first === undefined || last === undefined ? 0 : last.t - first.t;
  const durationMs = Math.max(0, rawDuration);

  const final = finalText(model);
  const correctFinal = correctCharsInFinalText(model);
  const correctPrintable = model.inserts.filter((i) => i.correct).length;

  // Raw WPM counts printable presses only (Backspace is not printable).
  const rawWpm = perMinuteWpm(printable.length, durationMs);
  const grossWpm = perMinuteWpm(final.length, durationMs);
  const netWpm = perMinuteWpm(correctFinal, durationMs);

  const keystrokeAccuracy =
    printable.length === 0 ? 0 : (correctPrintable / printable.length) * 100;
  const finalAccuracy = final.length === 0 ? 0 : (correctFinal / final.length) * 100;

  // KSPC counts every buffer-affecting keystroke, Backspace included;
  // rejected attempts never touched the buffer (chapter 4 §4.5).
  const kspcNumerator = model.inserts.length + model.backspaces;
  const kspc = final.length === 0 ? 0 : kspcNumerator / final.length;

  const roll = rollover(presses, filtered.keyUps);
  const iki = ikiMean(presses);
  const userInserts = model.inserts;
  const correctInserts = model.inserts.filter((i) => i.correct);
  const burstStats = burst(userInserts);

  const mode = options.verified === true ? "verified" : "practice";
  const integrity = integrityFlags(filtered, options.markers, mode);

  return {
    summary: {
      rawWpm,
      grossWpm,
      netWpm,
      keystrokeAccuracy,
      finalAccuracy,
      kspc,
      rolloverRatio: roll.ratio,
      consistency: consistency(correctInserts, durationMs),
      burstWpm: burstStats.wpm,
      ikiMeanMs: iki.mean,
      modelVersion: ENGINE_MODEL_VERSION,
      difficultyBand: null,
      verified: options.verified === true && !integrity.verifiedInvalid,
      flags: integrity.flags,
    },
    details: {
      durationMs,
      printableKeystrokes: printable.length,
      correctKeystrokes: correctPrintable,
      correctCharsInFinalText: correctFinal,
      finalTextLength: final.length,
      bufferInserts: model.inserts.length,
      backspaces: model.backspaces,
      rejectedAttempts: model.rejectedAttempts,
      totalAttempts: model.totalAttempts,
      rejectedAttemptRate:
        model.totalAttempts === 0 ? 0 : (model.rejectedAttempts / model.totalAttempts) * 100,
      autoInserts: model.autoInserts,
      untrustedEvents: filtered.untrusted.length,
      repeatDrops: filtered.repeatDrops.length,
      overlappedPresses: roll.overlaps,
      rolloverTransitions: roll.transitions,
      ikiExcludedGaps: iki.excluded,
      ikiSampleCount: iki.samples,
      burstWindowChars: burstStats.chars,
      scoredDurationMs: durationMs,
      wallDurationMs: durationMs,
    },
    finalText: final,
  };
}
