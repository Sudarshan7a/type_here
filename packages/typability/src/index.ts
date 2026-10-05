/**
 * RealType typability scorer (CNT-02) - prose difficulty bands.
 *
 * A deterministic, pure function of one text and the versioned model config:
 *
 *   typabilityBand(text) -> "easy" | "typical" | "hard" | null + a reason
 *
 * STAGE A, AND HOW IT IS ENFORCED
 *
 * master-spec §6.2 Stage A: "output Easy / Typical / Hard bands. No score
 * multiplication yet." Three things make that structural rather than a promise:
 *
 *   1. `typabilityBand` returns a LABEL. `TypabilityVerdict` has no numeric
 *      score field, so there is nothing to multiply by.
 *   2. The numeric score lives in `./scoring.ts`, which this barrel does NOT
 *      re-export. The only way to reach it from outside the package is to import
 *      a private file path, which `tests/stage-a.test.ts` asserts nobody does.
 *   3. `tests/stage-a.test.ts` also scans the repository for any consumer that
 *      multiplies a speed by a typability quantity, so the prohibition is
 *      checked against the whole tree, not against this package's own exports.
 *
 * The score remains reachable through `explainTypabilityBand`, named and shaped
 * for the audit CLI (`scripts/check-typability.mjs --calibration`, `--item ID`).
 * That is the honest way to publish a "transparent" score: available to a
 * reviewer on request, absent from every product path.
 *
 * CODE AND SYMBOL TEXT (master-spec §6.2 Stage C)
 *
 * Out of scope by construction, never scored, therefore never banded. Such an
 * item gets `band: null` plus one of the closed `OUT_OF_SCOPE_REASONS`. The
 * honest substitute is the token-class mix the source already carries
 * (`tokenMix` in the corpus artifact), which is what Stage C says to show until a
 * per-token cost model exists.
 */
export {
  BAND_BOUNDARIES,
  CODE_FAMILIES,
  SCOPE_CEILINGS,
  SCORE_QUANTISATION_STEP,
  TYPABILITY_FEATURE_SPECS,
  TYPABILITY_VERSION,
  TOTAL_FEATURE_WEIGHT,
  typabilityConfigDigestInput,
  WORD_POOL_FAMILIES,
} from "./config.ts";

export {
  BAND_SOURCES,
  DIFFICULTY_BANDS,
  OUT_OF_SCOPE_REASONS,
  type BandSource,
  type DifficultyBand,
  type OutOfScopeReason,
  type TypabilityExplanation,
  type TypabilityFeature,
  type TypabilityFeatureSpec,
  type TypabilityFeatures,
  type TypabilityInput,
  type TypabilityVerdict,
} from "./types.ts";

export { TYPABILITY_VERSION_NOTES, type TypabilityVersionNote } from "./version-notes.ts";

export { classifyScope, SUPPORTED_LANGUAGES, type ScopeDecision } from "./classify.ts";

export { explainTypabilityBand, normaliseDeclaredBand, typabilityBand } from "./band.ts";

export {
  normaliseFeature,
  RAW_FEATURE_NAMES,
  rawFeatures,
  tokeniseWords,
  typabilityFeatureNames,
  typabilityFeatures,
  type RawTypabilityFeatures,
} from "./features.ts";

export {
  bigramWeight,
  ENGLISH_BIGRAM_RANKS,
  RANKED_BIGRAM_COUNT,
  UNRANKED_BIGRAM_WEIGHT,
} from "./resources/bigram-frequency.ts";
export { countSyllables } from "./resources/syllables.ts";
export { QWERTY_US_RIGHT_HAND_LETTERS, RIGHT_HAND_FINGERS } from "./resources/layout.ts";
export {
  COMMON_WORD_COUNT,
  COMMON_WORDS,
  HIGH_FREQUENCY_WORD_COUNT,
  HIGH_FREQUENCY_WORDS,
  isCommonWord,
  isHighFrequencyWord,
} from "./resources/word-frequency.ts";
