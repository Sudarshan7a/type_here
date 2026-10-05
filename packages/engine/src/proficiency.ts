/**
 * RealType typing engine (open-core, MIT) — adaptive proficiency model
 * (LRN-02): per-key and per-bigram proficiency, severity scoring, and
 * weak-coverage detection.
 *
 * WHAT THIS MODULE OWNS. The ledger's LRN-02 and CNT-03 list each other as a
 * dependency, which cannot both be true. The honest split, and the one
 * implemented here:
 *
 *   - HERE (pure, engine-side, testable): turn observations into (a) compact
 *     evidence, (b) a proficiency score with an honest confidence floor,
 *     (c) the §8.2 severity score, and (d) a coverage report that separates
 *     "never attempted" from "demonstrably weak".
 *   - CNT-03 (needs the corpus + generators): turn that weakness state into
 *     *content* — which sentence covers the most weak pairs this week. The
 *     boundary is `rankWeak()`, which takes a caller-supplied frequency-weight
 *     function, so corpus frequencies stay in the content layer and never
 *     enter a metric.
 *
 * PURE BY CONSTRUCTION (non-negotiable, AGENTS.md rule 3 + INT-05): no
 * `Date.now()`, no `Math.random()`, no I/O, no module state. Every timestamp
 * arrives as a parameter, so the server recompute reproduces the client's
 * numbers bit for bit.
 *
 * PRIVACY (keystroke-privacy skill): observations carry a single character
 * (or a pair), a duration and a timestamp. There is deliberately NO field for
 * text — not even the optional `Sample.word` that aggregation.ts carries —
 * so a typed word or snippet is structurally unrepresentable in this model.
 * The tests prove it twice: a compile-time rejection of a text field, and a
 * runtime check that a hostile extra field never reaches the output.
 *
 * WHERE THE NUMBERS COME FROM (read from the spec, not invented):
 *   - §8.2.1 relative slowness = (item − baseline) / baseline
 *   - §8.2.3 severity = 0.5·norm(slowness) + 0.5·norm(error ratio), each
 *     clamped then divided by its ceiling (2.0 and 4.0)
 *   - §8.2.4 expected benefit = severity × frequency
 *   - §8.3.1 shrinkage toward the baseline, k = 15
 *   - §8.3.1 / D-M4-3 the n ≥ 8 per-item confidence floor ("watching" below)
 *   - §8.4.1 recency weight = 0.5 ^ (ageDays / 18), 1% pruning floor
 *   - §8.4.2 the recency-weighted average
 *   - §8.5.2 a profile needs 150 observations before it may rank anything
 *   - §8.8 WM-FIXTURE-011 zero samples is never ranked
 */

import type { Layout } from "@realtype/schemas";

import { aggregateBigram, fingerTag, type FingerTag, type Sample } from "./aggregation.js";

/**
 * Version of the rules in this file.
 *
 * Deliberately NOT `ENGINE_MODEL_VERSION`: nothing here changes the number
 * that any existing result was stamped with. WPM, accuracy, consistency, burst
 * and the per-test aggregates are untouched, so every stored result stamped
 * `1.1.0` still recomputes to the same figures alongside this module. What
 * lives here is a *new derived model* over already-stored observations — the
 * same relationship `TOKENIZER_VERSION` has to `ENGINE_MODEL_VERSION`. Bumping
 * the engine version would instead claim that historical headline numbers
 * changed, which is false and would make honest stored results look invalid.
 *
 * Persisted alongside a profile so a later change to these rules is detectable
 * rather than silently rewriting a user's diagnosis.
 */
export const PROFICIENCY_MODEL_VERSION = "1.0.0";

/** Milliseconds in a day, for the §8.4.1 decay. */
export const MS_PER_DAY = 86_400_000;

/** §8.4.1 / D-M4-4 recency half-life, in days. */
export const DECAY_HALF_LIFE_DAYS = 18;

/**
 * §8.4.1 pruning floor: samples below 1% weight are dropped rather than kept
 * forever. Used to mark an item *stale* (WM-FIXTURE-012) rather than treating
 * year-old evidence as current.
 */
export const RECENCY_WEIGHT_FLOOR = 0.01;

/** §8.3.1 shrinkage constant: samples' worth of trust placed in the baseline. */
export const SHRINKAGE_K = 15;

/**
 * D-M4-3 / §8.3.1 per-item confidence floor. At or above this many
 * observations an item may be *ranked*; below it, only "watching"; at zero, it
 * is unknown (WM-FIXTURE-011).
 */
export const CONFIDENCE_FLOOR_SAMPLES = 8;

/** §8.2.3 clamp: "200% slower" is the top of the slowness scale. */
export const RELATIVE_SLOWNESS_CEILING = 2;

/** §8.2.3 clamp on the error-rate ratio to baseline (4x). */
export const RELATIVE_ERROR_RATE_CEILING = 4;

/** §8.2.3 equal weighting — the documented starting point to calibrate (§8.9). */
export const SEVERITY_SLOWNESS_WEIGHT = 0.5;
export const SEVERITY_ERROR_WEIGHT = 0.5;

/**
 * The cut between `weak` and `solid` for an item that already has enough
 * samples to be ranked.
 *
 * HONESTY NOTE: chapter 8 defines the severity *score* precisely (§8.2.3) but
 * never states a numeric cut, and §8.9 says outright that its numbers are
 * calibratable starting points rather than fitted results. This constant is
 * therefore a declared `[proposal]`, not a spec figure — a named constant
 * precisely so §8.9's "validate the severity weighting on real data" pass has
 * one place to move. Everything the chapter *does* pin (the score, the
 * confidence floor, the shrinkage, the decay) is implemented exactly and
 * fixture-tested.
 */
export const PROPOSED_WEAK_SEVERITY_CUT = 0.2;

/** §8.5.2 / D-M4-5: minimum total observations before a ranked diagnosis. */
export const MIN_PROFILE_OBSERVATIONS = 150;

/**
 * Internal integer scales.
 *
 * Accumulation is integer so that replaying the same observations in any order
 * produces bit-identical state: IEEE-754 addition is commutative but NOT
 * associative, so a float fold would drift in the last bits with sample order.
 * Integers remove the question (see the `LRN02-CONV-*` tests).
 *
 * WEIGHT_SCALE: decay weights as millionths (resolution 1e-6 — an 18-day-old
 * sample keeps weight 500_000).
 * INTERVAL_SCALE: 1, i.e. intervals quantised to whole milliseconds. Nothing is
 * lost: typing-metrics-spec puts keyboard/USB/OS timing noise at ~10 ms and
 * forbids presenting differences below that as meaningful, and `KeyEvent.t` is
 * a millisecond figure in any case. Coarser quantisation is what buys the
 * headroom: with millisecond integers the accumulator stays exact past 37
 * million observations on one key, so the safe-integer guard below is a
 * backstop for absurd input rather than something a real profile can hit.
 */
const WEIGHT_SCALE = 1_000_000;
const INTERVAL_SCALE = 1;

/** Severity components are carried in thousandths, so §8.2.3 rounds half-up. */
const SCORE_SCALE = 1_000;
const WEIGHT_QUANTUM = 10_000;

const SEPARATOR = "→";

declare const singleKeyBrand: unique symbol;
declare const bigramBrand: unique symbol;

/**
 * Exactly one character: a key's own identity.
 *
 * Branded so a `SingleKey` does not read as an arbitrary word at a glance, and
 * validated at runtime by `singleKey()`. A cast can defeat any brand; an
 * assertion cannot.
 */
export type SingleKey = string & { readonly [singleKeyBrand]: true };

/**
 * Two keys, stored as `from` + "→" + `to` so a transition stays readable in a
 * transition table (ANA-03) and in a log line.
 *
 * `bigramChars()` fails closed: it splits on the separator and requires exactly
 * two single-character halves. The one thing it cannot represent is an item
 * whose key is literally U+2192 — `bigram("→", "a")` produces an id that will
 * not parse, which throws instead of corrupting a profile. No verified layout
 * map (layout-fingers.ts) places that character on a key.
 */
export type BigramId = string & { readonly [bigramBrand]: true };

/**
 * One observation of one key: no text field, and no way to add one without a
 * cast. `intervalMs` is the IKI from the previous accepted press, `correct`
 * whether the press was accepted, `atMs` a caller-supplied monotonic
 * timestamp — required, because a sample with no time cannot be recency
 * weighted and must not be representable.
 */
export interface KeySample {
  key: SingleKey;
  intervalMs: number;
  correct: boolean;
  atMs: number;
}

/** One observation of one adjacent key pair. Same shape, deliberately. */
export interface BigramSample {
  from: SingleKey;
  to: SingleKey;
  intervalMs: number;
  correct: boolean;
  atMs: number;
}

/** What kind of item a proficiency score describes. */
export type ItemRef = { kind: "key"; key: SingleKey } | { kind: "bigram"; bigram: BigramId };

/** Stable string identity of an item, for maps and storage. */
export function itemId(item: ItemRef): string {
  return item.kind === "key" ? item.key : item.bigram;
}

/** Validate a single character. Throws on anything that is not exactly one. */
export function singleKey(ch: string): SingleKey {
  if (ch.length !== 1) {
    throw new RangeError(
      `A key is exactly one character, got ${ch.length}. Keys identify presses; text never enters the model.`,
    );
  }
  return ch as SingleKey;
}

/** Build a transition id from two validated keys. */
export function bigram(from: SingleKey, to: SingleKey): BigramId {
  return `${from}${SEPARATOR}${to}` as BigramId;
}

/** Split a transition id back into its two keys. Fails closed (see BigramId). */
export function bigramChars(id: BigramId): [SingleKey, SingleKey] {
  const parts = id.split(SEPARATOR);
  if (parts.length !== 2) {
    throw new RangeError(`Not a transition id: ${JSON.stringify(id)}`);
  }
  const [from, to] = parts as [string, string];
  if (from.length !== 1 || to.length !== 1) {
    throw new RangeError(`Not a transition id: ${JSON.stringify(id)}`);
  }
  return [from as SingleKey, to as SingleKey];
}

/** Build the item reference for a key. */
export function keyRef(key: SingleKey): ItemRef {
  return { kind: "key", key };
}

/** Build the item reference for a transition from its two keys. */
export function bigramRef(from: SingleKey, to: SingleKey): ItemRef {
  return { kind: "bigram", bigram: bigram(from, to) };
}

/**
 * §8.4.1 recency weight: `0.5 ^ (ageDays / halfLifeDays)`.
 *
 * A sample at or after the supplied "now" gets full weight: the caller may
 * compute weights against the newest observation rather than a later instant,
 * and a future-dated sample must never be worth *more* than a present one.
 *
 * @throws RangeError on a non-positive or non-finite half-life — that is a
 * programming error in the caller, not data, and silently disabling the decay
 * would make every later profile quietly wrong.
 */
export function decayWeight(ageDays: number, halfLifeDays = DECAY_HALF_LIFE_DAYS): number {
  if (!Number.isFinite(halfLifeDays) || halfLifeDays <= 0) {
    throw new RangeError(`halfLifeDays must be a positive finite number, got ${halfLifeDays}`);
  }
  if (!Number.isFinite(ageDays) || ageDays <= 0) return 1;
  return 0.5 ** (ageDays / halfLifeDays);
}

/** Age in days at which the §8.4.1 weight reaches the pruning floor. */
export function staleAfterDays(halfLifeDays = DECAY_HALF_LIFE_DAYS): number {
  return halfLifeDays * Math.log2(1 / RECENCY_WEIGHT_FLOOR);
}

/**
 * §8.3.1 shrinkage toward the user's own baseline:
 * `(n·item + k·baseline) / (n + k)`.
 *
 * Two slow samples taken by coincidence become 264.7 ms rather than a
 * headline-grabbing 900 ms (WM-FIXTURE-002); forty consistent ones come back at
 * 667.3 ms (WM-FIXTURE-003).
 */
export function shrinkEstimate(
  itemMs: number,
  itemSamples: number,
  baselineMs: number,
  k = SHRINKAGE_K,
): number {
  return (itemSamples * itemMs + k * baselineMs) / (itemSamples + k);
}

/**
 * Compact, text-free facts about one item — what D-M4-6 says to store.
 *
 * Every accumulator is an integer, so the record is a function of the
 * *multiset* of observations rather than their order.
 */
export interface ItemEvidence {
  /** Accepted observations, self-relative outliers included. */
  observations: number;
  /** Of those, the ones that were wrong. */
  errors: number;
  /** Observations retained for timing after §4.12 outlier exclusion. */
  samples: number;
  /** Retained observations dropped as self-relative outliers (hesitations). */
  hesitations: number;
  /** Observations with no usable interval (non-finite, negative, overflowing). */
  invalid: number;
  /** Σ recency weight of retained samples, in millionths. */
  weightQ: number;
  /** Σ (weight × interval) of retained samples, in millionths × 1e-3 ms. */
  weightedIntervalQ: number;
  /** Outlier-excluded median interval via `aggregateBigram`, ms. */
  medianMs: number;
  /** Timestamp of the newest observation; null when there are none. */
  lastAtMs: number | null;
}

export interface EvidenceOptions {
  /**
   * The instant weights are computed against — supplied, never read from a
   * clock. Rebuilding evidence at a later `asOfMs` is what re-applies decay
   * (the recompute job, impl-guide M4-01.5).
   */
  asOfMs: number;
  halfLifeDays?: number;
}

const EMPTY_EVIDENCE: ItemEvidence = Object.freeze({
  observations: 0,
  errors: 0,
  samples: 0,
  hesitations: 0,
  invalid: 0,
  weightQ: 0,
  weightedIntervalQ: 0,
  medianMs: 0,
  lastAtMs: null,
});

/** Evidence for an item nobody has ever typed (WM-FIXTURE-011). */
export function emptyEvidence(): ItemEvidence {
  return EMPTY_EVIDENCE;
}

/**
 * Reduce observations to compact evidence.
 *
 * Outlier exclusion is delegated to `aggregateBigram` (chapter-4 §4.12) rather
 * than reimplemented: the self-relative 3×-median rule must exist in exactly
 * one place or two copies will drift. Each observation is wrapped in a fresh
 * object so the returned `excluded` list identifies retained samples by
 * reference identity alone — no index bookkeeping, and no chance of two equal
 * observations aliasing each other.
 */
export function itemEvidence(
  item: ItemRef,
  observations: readonly (KeySample | BigramSample)[],
  options: EvidenceOptions,
): ItemEvidence {
  const halfLifeDays = options.halfLifeDays ?? DECAY_HALF_LIFE_DAYS;
  const label: [SingleKey, SingleKey] =
    item.kind === "key" ? [item.key, item.key] : bigramChars(item.bigram);

  const wrapped: Sample[] = [];
  const quantised: { intervalQ: number; wQ: number }[] = [];
  let accepted = 0;
  let errors = 0;
  let invalid = 0;
  let lastAtMs: number | null = null;
  let weightQ = 0;
  let weightedIntervalQ = 0;

  for (const observation of observations) {
    if (
      !Number.isFinite(observation.intervalMs) ||
      observation.intervalMs < 0 ||
      !Number.isFinite(observation.atMs)
    ) {
      invalid++;
      continue;
    }
    const ageDays = (options.asOfMs - observation.atMs) / MS_PER_DAY;
    const wQ = Math.round(decayWeight(ageDays, halfLifeDays) * WEIGHT_SCALE);
    const intervalQ = Math.round(observation.intervalMs * INTERVAL_SCALE);
    // A fully-decayed sample still counts as an observation (it happened, and
    // its accuracy is real) but contributes nothing to the speed estimate.
    // Samples that would leave the exact-integer range are counted as invalid
    // rather than silently folded into a value that is no longer exactly
    // order-independent.
    const nextWeight = weightQ + wQ;
    const nextWeighted = weightedIntervalQ + intervalQ * wQ;
    if (!Number.isSafeInteger(nextWeight) || !Number.isSafeInteger(nextWeighted)) {
      invalid++;
      continue;
    }
    const sample: Sample = { intervalMs: observation.intervalMs };
    wrapped.push(sample);
    quantised.push({ intervalQ, wQ });
    weightQ = nextWeight;
    weightedIntervalQ = nextWeighted;
    accepted++;
    errors += observation.correct ? 0 : 1;
    lastAtMs = lastAtMs === null ? observation.atMs : Math.max(lastAtMs, observation.atMs);
  }

  const aggregate = aggregateBigram(label[0], label[1], wrapped);
  const excluded = new Set(aggregate.excluded);

  // Re-accumulate over the retained set so the self-relative outlier rule
  // applies to the speed estimate as well as to the median. Integer in,
  // integer out: the retained sums are a subset of the running sums above, so
  // they are still exact integers.
  let retainedWeightQ = 0;
  let retainedWeightedQ = 0;
  let samples = 0;
  for (let i = 0; i < quantised.length; i++) {
    if (excluded.has(wrapped[i]!)) continue;
    const entry = quantised[i]!;
    retainedWeightQ += entry.wQ;
    retainedWeightedQ += entry.intervalQ * entry.wQ;
    samples++;
  }

  return {
    observations: accepted,
    errors,
    samples,
    hesitations: aggregate.excludedCount,
    invalid,
    weightQ: retainedWeightQ,
    weightedIntervalQ: retainedWeightedQ,
    medianMs: aggregate.medianMs,
    lastAtMs,
  };
}

/** The user's own comparable-item baseline (D-M4-2: compare against yourself). */
export interface Baseline {
  /** Median interval for comparable items, ms. Must be > 0 to be usable. */
  medianMs: number;
  /** Overall error rate across comparable items, 0–1. */
  errorRate: number;
}

/** Inputs to the §8.2.3 severity score. */
export interface SeverityInput {
  /** The item's central tendency, ms — already shrunk if it is thin. */
  itemMs: number;
  /** Observations behind `itemMs`. */
  itemSamples: number;
  /** Errors on the item. */
  errors: number;
  baseline: Baseline;
}

export interface SeverityResult {
  /** 0–1, exactly §8.2.3. */
  score: number;
  /** §8.2.1 relative slowness, reported clamped to [−1, RELATIVE_SLOWNESS_CEILING]. */
  relativeSlowness: number;
  /** Error rate relative to baseline, clamped to [0, RELATIVE_ERROR_RATE_CEILING]. */
  relativeErrorRate: number;
  /** The slowness half of the score (0–1). */
  slownessComponent: number;
  /** The error half of the score (0–1). */
  errorComponent: number;
}

/**
 * §8.2.3, carried in integer thousandths.
 *
 * Integer arithmetic is what makes the chapter's own worked example come out
 * exactly rather than approximately: it rounds relative slowness to 0.889 and
 * then divides by the 2.0 ceiling to get 0.445, and 0.4445 must round *up* to
 * be 0.445. Through floats it is 0.44449999999999998 and rounds down.
 *
 * A non-positive baseline yields a zero slowness signal rather than NaN: with
 * no usable baseline there is nothing to be "slower than", so the honest answer
 * is "no slowness evidence", not a fabricated severity. A zero baseline error
 * rate with a non-zero item error rate saturates the error component at its
 * ceiling instead of dividing by zero.
 */
export function severity(input: SeverityInput): SeverityResult {
  const { itemMs, itemSamples, errors, baseline } = input;
  const baselineUsable = Number.isFinite(baseline.medianMs) && baseline.medianMs > 0;

  const rawSlowness = baselineUsable ? (itemMs - baseline.medianMs) / baseline.medianMs : 0;
  const slownessQ = Math.round(clamp(rawSlowness, -1, RELATIVE_SLOWNESS_CEILING) * SCORE_SCALE);
  // Speed *faster* than the baseline contributes nothing to a weakness score,
  // but the reported ratio still says so ("20% quicker than your average pair").
  // Integer division all the way down: 889 * 1000 / 2000 is exactly 444.5,
  // which rounds up to 0.445 as the chapter's worked example requires.
  const slownessComponentQ = Math.min(
    Math.round((Math.max(0, slownessQ) * SCORE_SCALE) / (RELATIVE_SLOWNESS_CEILING * SCORE_SCALE)),
    SCORE_SCALE,
  );

  const itemRate = itemSamples > 0 ? clamp(errors / itemSamples, 0, 1) : 0;
  const baselineRate = clamp(baseline.errorRate, 0, 1);
  const ratio = baselineRate > 0 ? itemRate / baselineRate : itemRate > 0 ? Infinity : 0;
  const ratioQ = Math.min(
    Math.round(ratio * SCORE_SCALE),
    RELATIVE_ERROR_RATE_CEILING * SCORE_SCALE,
  );
  const errorComponentQ = Math.round(
    (ratioQ * SCORE_SCALE) / (RELATIVE_ERROR_RATE_CEILING * SCORE_SCALE),
  );

  const weightQ = Math.round(SEVERITY_SLOWNESS_WEIGHT * WEIGHT_QUANTUM);
  const errorWeightQ = Math.round(SEVERITY_ERROR_WEIGHT * WEIGHT_QUANTUM);

  return {
    score:
      (weightQ * slownessComponentQ + errorWeightQ * errorComponentQ) /
      (WEIGHT_QUANTUM * SCORE_SCALE),
    relativeSlowness: slownessQ / SCORE_SCALE,
    relativeErrorRate: ratioQ / SCORE_SCALE,
    slownessComponent: slownessComponentQ / SCORE_SCALE,
    errorComponent: errorComponentQ / SCORE_SCALE,
  };
}

/** Clamp into [min, max]; a non-finite value collapses to 0, never to NaN. */
function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, min), max);
}

/** §8.2.4 expected benefit: severity weighted by how often the item appears. */
export function expectedBenefit(severityScore: number, frequencyWeight: number): number {
  if (!Number.isFinite(severityScore) || severityScore <= 0) return 0;
  if (!Number.isFinite(frequencyWeight) || frequencyWeight <= 0) return 0;
  return severityScore * frequencyWeight;
}

/**
 * D-M4-3's four states. The distinction that matters and is easy to lose:
 *
 *   - `unmeasured` — nobody has typed this key or pair. UNKNOWN, not weak, and
 *     never ranked (WM-FIXTURE-011).
 *   - `watching` — attempted, but too few samples to conclude anything
 *     (WM-FIXTURE-002).
 *   - `weak` / `solid` — enough evidence to judge. A fast, accurate item is
 *     explicitly `solid`, not merely "not weak", so "never measured" and
 *     "measured and found strong" stay distinguishable states — the principle
 *     WM-FIXTURE-015 states for token classes, applied to keys and pairs.
 */
export type WeaknessClass = "unmeasured" | "watching" | "weak" | "solid";

export interface ProficiencyContext {
  /** The instant this profile is scored at. Supplied; no clock is read here. */
  asOfMs: number;
  /** Active layout, for the same-hand / alternate-hand tag (ANA-03). */
  layout: Layout;
  baseline: Baseline;
  halfLifeDays?: number;
  shrinkageK?: number;
  /** The declared `[proposal]` cut between `weak` and `solid`. */
  weakCut?: number;
}

/** One item's diagnosis. Every nullable field is null precisely when unknown. */
export interface ItemProficiency {
  item: ItemRef;
  classification: WeaknessClass;
  /** 0–1 severity, or **null** when there is no evidence. null is not 0. */
  severity: number | null;
  /** §8.2.3 detail, or null when unmeasured. */
  severityDetail: SeverityResult | null;
  /** D-M4-3 sample count. */
  observations: number;
  /** Of those, how many were wrong — the raw count behind the error signal. */
  errors: number;
  /** Σ recency weights — evidence that is still current. */
  evidence: number;
  /** 0–1, `min(1, evidence / floor)`. Zero when there are no observations. */
  confidence: number;
  /** Recency-weighted mean interval, ms (§8.4.2), or null. */
  meanIntervalMs: number | null;
  /** Outlier-excluded median interval, ms, or null. */
  medianMs: number | null;
  /** Shrunk estimate fed to the severity slowness signal, ms, or null. */
  estimateMs: number | null;
  /** Recency-weighted accuracy 0–1, or null. */
  accuracy: number | null;
  /** Every observation has decayed below the pruning floor (WM-FIXTURE-012). */
  stale: boolean;
  /** Age of the newest observation at scoring time, ms, or null. */
  newestAgeMs: number | null;
  /** Layout-resolved hand tag. Keys are always `unknown`: a key has no relation. */
  hand: FingerTag["hand"];
  sameFinger: boolean | null;
}

/** Hand buckets the {@link compareByHand} sums are keyed by. */
type HandBucket = "same" | "cross" | "unknown";

/**
 * Score one item.
 *
 * Two central tendencies, deliberately, because the chapter uses two:
 * `medianMs` is the §4.12 outlier-excluded median that §8.2.1's severity is
 * defined over, while `meanIntervalMs` is the §8.4.2 recency-weighted average
 * that WM-FIXTURE-005 pins and that the trend view needs — a mean is what moves
 * when the user improves; the median of a stale set is not.
 *
 * Shrinkage applies to the severity input ONLY below the confidence floor.
 * Both fixtures force that rule and contradict each other otherwise:
 * WM-FIXTURE-001 pins severity 0.5975 from a *raw* 340 ms median at n=22,
 * while WM-FIXTURE-002 pins a *shrunk* 264.7 ms at n=2. Shrinkage exists to
 * stop a thin item from reading as an extreme, and n ≥ 8 is exactly where an
 * item stops being thin — so the two are reconciled at the floor rather than by
 * declaring one of them wrong.
 */
export function proficiency(
  item: ItemRef,
  evidence: ItemEvidence,
  context: ProficiencyContext,
): ItemProficiency {
  const halfLifeDays = context.halfLifeDays ?? DECAY_HALF_LIFE_DAYS;
  const shrinkK = context.shrinkageK ?? SHRINKAGE_K;
  const floor = CONFIDENCE_FLOOR_SAMPLES;

  let tag: FingerTag = { hand: "unknown", sameFinger: null };
  if (item.kind === "bigram") {
    const [from, to] = bigramChars(item.bigram);
    tag = fingerTag(from, to, context.layout);
  }

  if (evidence.observations === 0) {
    return {
      item,
      classification: "unmeasured",
      severity: null,
      severityDetail: null,
      observations: 0,
      errors: 0,
      evidence: 0,
      confidence: 0,
      meanIntervalMs: null,
      medianMs: null,
      estimateMs: null,
      accuracy: null,
      stale: false,
      newestAgeMs: null,
      hand: tag.hand,
      sameFinger: tag.sameFinger,
    };
  }

  const evidenceWeight = evidence.weightQ / WEIGHT_SCALE;
  const newestAgeMs = evidence.lastAtMs === null ? null : context.asOfMs - evidence.lastAtMs;
  const stale = newestAgeMs !== null && newestAgeMs / MS_PER_DAY > staleAfterDays(halfLifeDays);
  const accuracy = 1 - evidence.errors / evidence.observations;
  const meanIntervalMs =
    evidence.weightQ > 0 ? evidence.weightedIntervalQ / evidence.weightQ / INTERVAL_SCALE : null;
  const medianMs = evidence.samples > 0 ? evidence.medianMs : null;

  const estimateMs =
    medianMs === null
      ? null
      : evidence.observations < floor
        ? shrinkEstimate(medianMs, evidence.observations, context.baseline.medianMs, shrinkK)
        : medianMs;

  const detail =
    estimateMs === null
      ? null
      : severity({
          itemMs: estimateMs,
          itemSamples: evidence.observations,
          errors: evidence.errors,
          baseline: context.baseline,
        });

  const cut = context.weakCut ?? PROPOSED_WEAK_SEVERITY_CUT;
  // `detail === null` means no usable speed sample survived, so there is nothing
  // to conclude from however many observations the record claims. Calling that
  // "solid" would repeat the exact conflation WM-FIXTURE-015 warns about in
  // another shape: an unmeasured item must never read as a strong one.
  const classification: WeaknessClass =
    detail === null || evidence.observations < floor
      ? "watching"
      : detail.score >= cut
        ? "weak"
        : "solid";

  return {
    item,
    classification,
    severity: detail?.score ?? null,
    severityDetail: detail,
    observations: evidence.observations,
    errors: evidence.errors,
    evidence: evidenceWeight,
    confidence: Math.min(1, evidenceWeight / floor),
    meanIntervalMs,
    medianMs,
    estimateMs,
    accuracy,
    stale,
    newestAgeMs,
    hand: tag.hand,
    sameFinger: tag.sameFinger,
  };
}

/** Shorthand for `proficiency(keyRef(key), evidence, context)`. */
export function keyProficiency(
  key: SingleKey,
  evidence: ItemEvidence,
  context: ProficiencyContext,
): ItemProficiency {
  return proficiency(keyRef(key), evidence, context);
}

/** Shorthand for `proficiency(bigramRef(from, to), evidence, context)`. */
export function bigramProficiency(
  from: SingleKey,
  to: SingleKey,
  evidence: ItemEvidence,
  context: ProficiencyContext,
): ItemProficiency {
  return proficiency(bigramRef(from, to), evidence, context);
}

/**
 * Weak-coverage detection.
 *
 * The bug this shape exists to prevent: a never-attempted key scoring 0
 * severity and topping a "weakest keys" list, because 0/0 was quietly read as
 * 0. The unknown bucket holds the *references*, not scores — there is no score
 * to hold — and it is provably disjoint from `weak`.
 */
export interface CoverageReport {
  /** In the expected set, never attempted. Unknown — never ranked. */
  unmeasured: readonly ItemRef[];
  /** Attempted, below the confidence floor: "watching" (D-M4-3). */
  thin: readonly ItemProficiency[];
  /** Enough evidence to judge anything at all. */
  measured: readonly ItemProficiency[];
  /** Demonstrably weak: measured, above the cut, and not stale. */
  weak: readonly ItemProficiency[];
  /** Enough total observations for a ranked diagnosis (§8.5.2). */
  ready: boolean;
  totalObservations: number;
}

export interface CoverageOptions {
  minTotalObservations?: number;
  weakCut?: number;
}

/**
 * Compare the items a caller *expects* to have data for (the layout's keys, the
 * bigrams a content index says occur) against the items it actually holds
 * scores for. Absent ids are unknown; present-but-thin ids are watching.
 */
export function coverageReport(
  expected: readonly ItemRef[],
  scores: ReadonlyMap<string, ItemProficiency>,
  options: CoverageOptions = {},
): CoverageReport {
  const cut = options.weakCut ?? PROPOSED_WEAK_SEVERITY_CUT;
  const unmeasured: ItemRef[] = [];
  const thin: ItemProficiency[] = [];
  const measured: ItemProficiency[] = [];
  const weak: ItemProficiency[] = [];
  let totalObservations = 0;

  for (const item of expected) {
    const score = scores.get(itemId(item));
    if (score === undefined || score.classification === "unmeasured") {
      unmeasured.push(item);
      continue;
    }
    totalObservations += score.observations;
    if (score.observations < CONFIDENCE_FLOOR_SAMPLES) {
      thin.push(score);
      continue;
    }
    measured.push(score);
    if ((score.severity ?? 0) >= cut && !score.stale) weak.push(score);
  }

  return {
    unmeasured,
    thin,
    measured,
    weak,
    ready: totalObservations >= (options.minTotalObservations ?? MIN_PROFILE_OBSERVATIONS),
    totalObservations,
  };
}

/** One ranked weakness, with the frequency weighting left visible. */
export interface RankedItem {
  id: string;
  item: ItemRef;
  severity: number;
  frequencyWeight: number;
  expectedBenefit: number;
  observations: number;
}

/**
 * §8.2.4 ranking by expected benefit.
 *
 * The frequency weight arrives as a CALLER-SUPPLIED FUNCTION, not as data from
 * the engine: where a bigram is common is a fact about the corpus, and the
 * corpus is CNT-03's. That one parameter IS the LRN-02/CNT-03 boundary — this
 * function ranks, and cannot look content up.
 *
 * Unmeasured, thin and stale items are excluded: there is nothing to rank
 * (WM-FIXTURE-011), and stale evidence must not read as current
 * (WM-FIXTURE-012). Ties break on severity then id, so the ordering is total
 * and two clients holding the same scores rank identically.
 */
export function rankWeak(
  scores: Iterable<ItemProficiency>,
  options: { frequencyWeight: (item: ItemRef) => number },
): RankedItem[] {
  const ranked: RankedItem[] = [];
  for (const score of scores) {
    if (score.classification !== "weak" || score.stale || score.severity === null) continue;
    const frequencyWeight = options.frequencyWeight(score.item);
    ranked.push({
      id: itemId(score.item),
      item: score.item,
      severity: score.severity,
      frequencyWeight,
      expectedBenefit: expectedBenefit(score.severity, frequencyWeight),
      observations: score.observations,
    });
  }
  return ranked.sort(
    (a, b) =>
      b.expectedBenefit - a.expectedBenefit || b.severity - a.severity || (a.id < b.id ? -1 : 1),
  );
}

/** Aggregate view of one hand category. */
export interface HandSummary {
  items: number;
  observations: number;
  /** Mean severity over the classified items, or null when none are classified. */
  meanSeverity: number | null;
}

/** ANA-03's same-hand vs alternate-hand comparison. */
export interface HandComparison {
  sameHand: HandSummary;
  alternateHand: HandSummary;
  /** Layouts or characters with no verified finger map (§4.12). */
  unknown: HandSummary;
}

const EMPTY_HAND: HandSummary = Object.freeze({ items: 0, observations: 0, meanSeverity: null });

/**
 * Compare same-hand and alternate-hand transitions (ANA-03, SC-1).
 *
 * Keys are skipped rather than folded into `unknown`: a key has no hand
 * *relation*, so counting it there would pad the unknown bucket with non-data.
 */
export function compareByHand(scores: Iterable<ItemProficiency>): HandComparison {
  const sums: Record<
    HandBucket,
    { total: number; items: number; classified: number; observations: number }
  > = {
    same: { total: 0, items: 0, classified: 0, observations: 0 },
    cross: { total: 0, items: 0, classified: 0, observations: 0 },
    unknown: { total: 0, items: 0, classified: 0, observations: 0 },
  };

  for (const score of scores) {
    if (score.item.kind !== "bigram") continue;
    const bucket = sums[score.hand];
    bucket.items++;
    bucket.observations += score.observations;
    if (score.severity !== null) {
      bucket.total += score.severity;
      bucket.classified++;
    }
  }

  const finish = (bucket: {
    total: number;
    classified: number;
    items: number;
    observations: number;
  }): HandSummary => {
    if (bucket.items === 0) return EMPTY_HAND;
    return {
      items: bucket.items,
      observations: bucket.observations,
      meanSeverity: bucket.classified === 0 ? null : bucket.total / bucket.classified,
    };
  };

  return {
    sameHand: finish(sums.same),
    alternateHand: finish(sums.cross),
    unknown: finish(sums.unknown),
  };
}
