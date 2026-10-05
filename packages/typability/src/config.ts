/**
 * The versioned typability model config (CNT-02).
 *
 * Implementation guide §6.5 step 5: "choose band thresholds ... store thresholds
 * in the versioned model config". Everything that can move a band lives in this
 * file and nowhere else - feature definitions, weights, normalisation anchors,
 * the two band boundaries, the score quantisation and the out-of-scope
 * ceilings. `typabilityConfigDigestInput()` serialises the lot in a canonical
 * form; the corpus artifact stores its SHA-256, and `scripts/check-typability.mjs`
 * fails when the digest moves without a `TYPABILITY_VERSION` bump.
 *
 * WHY THE WEIGHTS LOOK LIKE THIS
 *
 * §6.5 step 4 asks for "a simple, documented weighting (start with published
 * directions of effect; use conservative equal-ish weights and label as v0)".
 * Every feature here therefore carries a weight of 1.0 except three, and no
 * single feature exceeds 11% of the total weight - that is what "equal-ish"
 * means here, not "mathematically equal". The deviations, each with its reason:
 *
 *   - `frequentWordShare`, `knownWordShare`, `meanBigramWeight` at 1.5: these are
 *     the three content features the published model family identifies as
 *     predicting speed, and they are the only ones that measure the WORDS
 *     rather than the SURFACE of the text. The other ten measure character
 *     composition, which is what separates prose from code, not what separates
 *     an easy sentence from a hard one.
 *   - `keystrokes` at 0.5: the length feature is the weakest of the thirteen
 *     here. Total keystrokes is a session-length property, not a per-character
 *     typability property - a long passage is not harder to type, it is longer
 *     to type. master-spec §6.2 lists it, so it is kept, but at half weight so
 *     it cannot dominate; it is the main reason short quotes band easier than
 *     long prose, which is a property of the published feature family rather
 *     than a validated effect. See docs/typability-scoring.md §5.
 *
 * LABEL: this is a v0 model. It is validated offline against this repository's
 * own corpus (§6.5 step 6) and NOT against user speeds (§6.5 step 7, which is
 * beta work). No band it produces has been reviewed by a person; see
 * docs/typability-scoring.md §7.
 */
import type { TypabilityFeatureSpec } from "./types.ts";

/**
 * Scoring model version. Bump on ANY change to this file: a weight, an anchor, a
 * boundary, a quantisation step, a ceiling, or the feature set itself.
 *
 * Version note format (the record the gate requires, mirroring how the engine
 * versions its metrics): see `./version-notes.ts`.
 */
export const TYPABILITY_VERSION = "0.1.0";

/**
 * Score quantisation step, in score points (the score is 0-100).
 *
 * This is the stability mechanism for the band label: the band is read from a
 * score snapped to a 0.05 grid, so two builds of the same text that differ only
 * by floating-point noise cannot land in different bands. See
 * docs/typability-scoring.md §6 "Band stability".
 */
export const SCORE_QUANTISATION_STEP = 0.05;

/**
 * The two band boundaries, in score points (higher score = easier).
 *
 *   score >= typicalMax -> "easy"
 *   score >= hardMin    -> "typical"
 *   otherwise           -> "hard"
 *
 * `>=` on both boundaries is the tie-break rule: a score sitting exactly on a
 * boundary belongs to the EASIER band, so a boundary is never a coin flip and
 * the mapping is monotone and total.
 *
 * Values are absolute, not derived from the corpus at run time. §6.5 step 5 asks
 * for roughly a third of the content in each band; that is achieved by choosing
 * these two numbers once, from the tertiles of the banded corpus at
 * TYPABILITY_VERSION 0.1.0, and then freezing them. Deriving them from whatever
 * corpus happens to be loaded would make every added item move every other item's
 * band, which is the churn requirement 4 forbids.
 *
 * The calibration run at 0.1.0, over the 704 banded items of this corpus:
 *
 *   tertiles of the score distribution   57.30 and 65.15
 *   boundaries chosen                    57.0  and 65.0
 *   resulting split                      hard 228 / typical 237 / easy 239
 *                                        (32.4% / 33.7% / 33.9%)
 *
 * Each boundary is the round value on the side that keeps its own band at or
 * above a third. Reproduce with `node scripts/check-typability.mjs --calibration`,
 * which recomputes the tertiles from `content/corpus.json` and prints how far the
 * frozen pair has drifted from them.
 */
export const BAND_BOUNDARIES = Object.freeze({
  /** Score at or above this is "easy". */
  typicalMax: 65,
  /** Score at or above this is "typical"; below it, "hard". */
  hardMin: 57,
});

/**
 * Out-of-scope ceilings for prose-family text, as shares of non-space
 * characters. master-spec §6.2 states the published model's limits: it was
 * trained on "English prose sentences <= 70 characters with simple punctuation
 * and few digits" and "does not cover code or symbol-heavy text".
 *
 * The ceilings are set above every non-code item in this corpus and below every
 * code item in it (measured: prose/quote/composition max symbol share 0.115,
 * code min 0.181; prose max digit share 0.218), so the rule separates cleanly
 * rather than clipping the edges of the prose distribution. A prose-family item
 * that crosses a ceiling gets no band and an explicit reason - it does not get a
 * prose-derived band that would be misleading.
 */
export const SCOPE_CEILINGS = Object.freeze({
  /** Above this symbol share, the text is symbol-dense rather than prose. */
  symbolShare: 0.15,
  /** Above this digit share, the text is number-dense rather than prose. */
  digitShare: 0.3,
});

/** Corpus families whose text is code: no validated code typability model exists (Stage C). */
export const CODE_FAMILIES: ReadonlyArray<string> = Object.freeze(["CODE"]);

/**
 * Corpus families whose text is a word POOL rather than a passage. A pool has no
 * sentence context, and its length is the pool's length rather than the length of
 * anything a user would type, so the length feature and the word-content features
 * contradict each other on a 6,000-word pool. See docs/typability-scoring.md §9.
 */
export const WORD_POOL_FAMILIES: ReadonlyArray<string> = Object.freeze(["WORDLIST"]);

/**
 * The feature vector: name, weight, definition and normalisation anchors.
 *
 * `anchors` is `[rawAtComponent0, rawAtComponent1]` - the raw values that map to
 * "hardest" and "easiest" for that feature. `direction` records which way round
 * they are, so a reader never has to infer it from the numbers. Outside the
 * anchor range the component is clamped to 0 or 1: an anchor is a statement that
 * beyond this point the feature says nothing more, not a claim that the value
 * cannot occur.
 */
export const TYPABILITY_FEATURE_SPECS: ReadonlyArray<TypabilityFeatureSpec> = Object.freeze([
  {
    name: "lowercaseAmongNonSpace",
    weight: 1.0,
    measure: "lower-case letters / non-space characters",
    anchors: [0.85, 1.0] as const,
    direction: "increasing-is-easier",
  },
  {
    name: "frequentWordShare",
    weight: 1.5,
    measure: "word tokens in the high-frequency list / word tokens",
    anchors: [0.3, 0.85] as const,
    direction: "increasing-is-easier",
  },
  {
    name: "knownWordShare",
    weight: 1.5,
    measure: "word tokens in the common-word list / word tokens",
    anchors: [0.5, 1.0] as const,
    direction: "increasing-is-easier",
  },
  {
    name: "meanBigramWeight",
    weight: 1.5,
    measure: "mean rank-decayed weight of within-word letter bigrams",
    anchors: [0.15, 0.32] as const,
    direction: "increasing-is-easier",
  },
  {
    name: "rightHandLetterShare",
    weight: 1.0,
    measure: "letters on a right-hand QWERTY-US column / letters",
    anchors: [0.3, 0.55] as const,
    direction: "increasing-is-easier",
  },
  {
    name: "meanWordLength",
    weight: 1.0,
    measure: "letters per word token (word-length distribution, first moment)",
    anchors: [6.5, 3.0] as const,
    direction: "decreasing-is-easier",
  },
  {
    name: "longWordShare",
    weight: 1.0,
    measure: "word tokens of 7+ letters / word tokens (word-length distribution, tail)",
    anchors: [0.5, 0.0] as const,
    direction: "decreasing-is-easier",
  },
  {
    name: "symbolShare",
    weight: 1.0,
    measure: "non-alphanumeric non-space characters / non-space characters",
    anchors: [0.1, 0.0] as const,
    direction: "decreasing-is-easier",
  },
  {
    name: "digitShare",
    weight: 1.0,
    measure: "digits / non-space characters",
    anchors: [0.08, 0.0] as const,
    direction: "decreasing-is-easier",
  },
  {
    name: "uppercaseShare",
    weight: 1.0,
    measure: "upper-case letters / non-space characters",
    anchors: [0.06, 0.0] as const,
    direction: "decreasing-is-easier",
  },
  {
    name: "classTransitionRate",
    weight: 1.0,
    measure:
      "adjacent non-space character pairs whose class changes (lower/upper/digit/symbol) / pairs",
    anchors: [0.25, 0.0] as const,
    direction: "decreasing-is-easier",
  },
  {
    name: "syllablesPerWord",
    weight: 1.0,
    measure: "countSyllables summed over word tokens / word tokens",
    anchors: [2.25, 0.75] as const,
    direction: "decreasing-is-easier",
  },
  {
    name: "keystrokes",
    weight: 0.5,
    measure: "characters in the text (one printable keystroke each)",
    anchors: [220, 40] as const,
    direction: "decreasing-is-easier",
  },
] satisfies ReadonlyArray<TypabilityFeatureSpec>);

/** Feature lookup by name. Frozen, so a caller cannot add a feature to the model. */
export const TYPABILITY_FEATURE_SPEC_BY_NAME: ReadonlyMap<string, TypabilityFeatureSpec> = new Map(
  TYPABILITY_FEATURE_SPECS.map((spec) => [spec.name, spec]),
);

/** Total weight of the model. Published so a reader can check "equal-ish" for themselves. */
export const TOTAL_FEATURE_WEIGHT = TYPABILITY_FEATURE_SPECS.reduce(
  (sum, spec) => sum + spec.weight,
  0,
);

/** The closed band enum, re-exported from types so the config is the one import a gate needs. */
export { DIFFICULTY_BANDS } from "./types.ts";

/**
 * Canonical, order-stable serialisation of everything that can move a band.
 *
 * Deliberately NOT a hash: hashing needs a crypto import, and this package stays
 * importable from a browser with no 
ode:` dependency (packages/generators
 * enforces the same rule). The corpus pipeline hashes this string with the SHA-256
 * it already uses, and stores the digest in the artifact.
 *
 * Canonical means: keys written by this function, not by `JSON.stringify`'s
 * insertion order of some object, and numbers emitted through the same rounding
 * path every time. Two runs of the same model produce the same string.
 */
export function typabilityConfigDigestInput(): string {
  const lines: string[] = [
    `version=${TYPABILITY_VERSION}`,
    `quantisation=${SCORE_QUANTISATION_STEP}`,
  ];
  lines.push(`boundary.typicalMax=${BAND_BOUNDARIES.typicalMax}`);
  lines.push(`boundary.hardMin=${BAND_BOUNDARIES.hardMin}`);
  lines.push(`ceiling.symbolShare=${SCOPE_CEILINGS.symbolShare}`);
  lines.push(`ceiling.digitShare=${SCOPE_CEILINGS.digitShare}`);
  for (const spec of TYPABILITY_FEATURE_SPECS) {
    lines.push(
      [
        `feature.${spec.name}`,
        `weight=${spec.weight}`,
        `anchors=${spec.anchors[0]}..${spec.anchors[1]}`,
        `direction=${spec.direction}`,
      ].join(";"),
    );
  }
  return `${lines.join("\n")}\n`;
}
