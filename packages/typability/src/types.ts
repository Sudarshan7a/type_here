/**
 * Public types for the typability scorer (CNT-02).
 *
 * Kept in one file so the shape of a verdict can be read without opening three
 * modules, and so `verbatimModuleSyntax` type-only imports stay honest.
 */

/** The closed band enum. A band outside this set is a gate failure, never a default. */
export const DIFFICULTY_BANDS = ["easy", "typical", "hard"] as const;

/** One of `DIFFICULTY_BANDS`. */
export type DifficultyBand = (typeof DIFFICULTY_BANDS)[number];

/**
 * Why an item got no band. Every `null` band in the artifact carries one of
 * these; a `null` band with a null reason is a gate failure, because silence is
 * not an honest answer.
 */
export const OUT_OF_SCOPE_REASONS = [
  /** Code or snippet text: master-spec §6.2 Stage C, no validated model yet. */
  "out-of-scope-code",
  /** A word-list pool: a bag of words, not a passage. See docs §9. */
  "out-of-scope-word-pool",
  /** Symbol- or digit-dense text, past the model's stated coverage. */
  "out-of-scope-symbol-dense",
  /** Text whose language the authored resources do not cover (the lists are English). */
  "out-of-scope-non-english",
  /** No letters at all: nothing in the model applies. */
  "out-of-scope-no-letters",
] as const;

/** One of `OUT_OF_SCOPE_REASONS`. */
export type OutOfScopeReason = (typeof OUT_OF_SCOPE_REASONS)[number];

/** Where a band's value came from. */
export const BAND_SOURCES = ["computed", "unbanded"] as const;

/** One of `BAND_SOURCES`. */
export type BandSource = (typeof BAND_SOURCES)[number];

/** The minimal input the scorer needs. Every field is explicit; nothing is inferred from globals. */
export interface TypabilityInput {
  /** The typing text. The only input that affects a feature value. */
  readonly text: string;
  /** Corpus family (`PROSE`, `QUOTE`, `CODE`, `WORDLIST`, `COMP`). */
  readonly family?: string;
  /** Item language (`en`, `javascript`). */
  readonly language?: string;
  /**
   * The band the source document declared, if any. Echoed back on the verdict
   * for comparison and never used as the answer.
   */
  readonly declaredBand?: string | null;
}

/**
 * The per-item verdict. This is the ONLY shape a product surface may consume,
 * and it carries no score: master-spec §6.2 Stage A says the band is a label and
 * "no score multiplication yet".
 */
export interface TypabilityVerdict {
  /** The band, or null when the item is honestly out of the model's scope. */
  readonly band: DifficultyBand | null;
  /** Why there is no band. Null exactly when `band` is non-null. */
  readonly reason: OutOfScopeReason | null;
  /** The band the source document itself declared, verbatim. Never overwritten, never trusted. */
  readonly declaredBand: DifficultyBand | null;
  /** Whether the computed band agrees with the declared one. Null when either side is null. */
  readonly declaredBandAgrees: boolean | null;
  /** `computed` when a band came from the model, `unbanded` when the item is out of scope. */
  readonly source: BandSource;
  /** The scoring model that produced this verdict. Pin it with the result. */
  readonly modelVersion: string;
}

/**
 * One raw feature. `raw` is the measured value in its natural units (a share, a
 * count, a mean); `component` is the normalised 0-1 value the score actually
 * uses, where 1 always means "easier" regardless of the feature's direction.
 */
export interface TypabilityFeature {
  readonly name: string;
  readonly raw: number;
  readonly component: number;
}

/** The full deterministic feature vector for one text. */
export interface TypabilityFeatures {
  readonly chars: number;
  readonly nonSpaceChars: number;
  readonly words: number;
  readonly letters: number;
  readonly features: ReadonlyArray<TypabilityFeature>;
}

/** One weighted line of the model config, published for /how-we-calculate and the artifact digest. */
export interface TypabilityFeatureSpec {
  readonly name: string;
  readonly weight: number;
  /** What the raw feature measures, in one line. */
  readonly measure: string;
  /** The two anchor values that normalise it, as `raw -> component`. */
  readonly anchors: readonly [number, number];
  /** Which end of the anchor range is the easy one. */
  readonly direction: "increasing-is-easier" | "decreasing-is-easier";
}

/**
 * The audit explanation. Carries the numeric difficulty score, which exists for
 * human review and the calibration report ONLY - see
 * `explainTypabilityBand`'s doc comment and docs/typability-scoring.md §6.
 */
export interface TypabilityExplanation extends TypabilityVerdict {
  readonly features: TypabilityFeatures;
  /** 0-100, higher is easier. Never a multiplier; never stored per item. */
  readonly score: number;
  /** The quantised score the band was actually read from. */
  readonly quantisedScore: number;
  /** Absolute distance from the nearest band boundary: the churn-risk number. */
  readonly distanceToBoundary: number;
}
