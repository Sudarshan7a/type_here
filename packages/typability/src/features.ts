/**
 * Feature extraction (CNT-02). Pure: text in, numbers out.
 *
 * Every definition here states its numerator, its denominator and what happens
 * to punctuation, digits and case, because implementation guide §6.5 step 3
 * requires exactly that ("define each feature precisely in a written spec") and
 * because a feature whose denominator changes silently is how a corpus's bands
 * drift without anyone editing a boundary.
 *
 * Three denominators that matter, stated once:
 *   - `nonSpaceChars`: every character that is not whitespace. Newlines count as
 *     whitespace, so a multi-line code block and a one-line sentence are measured
 *     over the same kind of denominator.
 *   - `wordTokens`: maximal runs of letters, optionally joined by an apostrophe
 *     ("don't" is one token). Each token is lower-cased and its apostrophes are
 *     stripped before any lookup, which is why the word lists in
 *     `./resources/word-frequency.ts` hold letters only.
 *   - `letters`: [A-Za-z] characters anywhere in the text, upper and lower.
 *
 * Total by construction: every division has a denominator guarded against zero,
 * so a one-character item, an empty item and an all-punctuation item all produce
 * finite numbers. The one deliberate exception is `classTransitionRate`, which is
 * 0 for a text with fewer than two non-space characters, because there are no
 * pairs to divide by - that is stated at the function, not hidden.
 */
import { TYPABILITY_FEATURE_SPEC_BY_NAME, TYPABILITY_FEATURE_SPECS } from "./config.ts";
import type { TypabilityFeature, TypabilityFeatures } from "./types.ts";
import { bigramWeight } from "./resources/bigram-frequency.ts";
import { QWERTY_US_RIGHT_HAND_LETTERS } from "./resources/layout.ts";
import { isCommonWord, isHighFrequencyWord } from "./resources/word-frequency.ts";
import { countSyllables } from "./resources/syllables.ts";

/** Character classes, in the order they are named in the feature definition. */
const CLASS_LOWER = "lower";
const CLASS_UPPER = "upper";
const CLASS_DIGIT = "digit";
const CLASS_SYMBOL = "symbol";

function characterClass(ch: string): string {
  if (ch >= "a" && ch <= "z") return CLASS_LOWER;
  if (ch >= "A" && ch <= "Z") return CLASS_UPPER;
  if (ch >= "0" && ch <= "9") return CLASS_DIGIT;
  return CLASS_SYMBOL;
}

/** One token's normalised form: lower-cased, apostrophes removed, letters only. */
function tokenForm(token: string): string {
  return token.toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * Word tokens as the scorer defines them, with their normalised forms. Single
 * pass over the text; no regex with a global flag and `lastIndex` state, so the
 * result cannot depend on a previous call.
 */
export function tokeniseWords(text: string): ReadonlyArray<string> {
  const matches = String(text ?? "").match(/[A-Za-z]+(?:'[A-Za-z]+)*/g);
  if (matches === null) return [];
  return matches.map(tokenForm);
}

/** Guarded ratio: any zero or negative denominator yields 0 rather than NaN or Infinity. */
function ratio(numerator: number, denominator: number): number {
  if (!Number.isFinite(denominator) || denominator <= 0) return 0;
  return numerator / denominator;
}

/**
 * Clamp a raw feature value onto its 0-1 component.
 *
 * `anchors` is `[rawAt0, rawAt1]`, so an increasing feature divides by
 * `rawAt1 - rawAt0` and a decreasing one divides by `rawAt0 - rawAt1`. Values
 * beyond an anchor clamp: the anchor says "past here this feature is as extreme
 * as it usefully measures", which is a different claim from "this value cannot
 * occur".
 */
export function normaliseFeature(
  raw: number,
  anchors: readonly [number, number],
  direction: "increasing-is-easier" | "decreasing-is-easier",
): number {
  const value = Number.isFinite(raw) ? raw : 0;
  const [atZero, atOne] = anchors;
  const increasing = direction === "increasing-is-easier";
  const span = increasing ? atOne - atZero : atZero - atOne;
  if (span === 0) return 0;
  // Both directions move "away from the hard anchor, toward the easy one", so the
  // numerator is the distance from `atZero` and the span is the distance between
  // the anchors. Writing it as one subtraction rather than two mirrored branches
  // is what stops a decreasing feature from silently clamping to 0.
  const component = (increasing ? value - atZero : atZero - value) / span;
  if (component <= 0) return 0;
  if (component >= 1) return 1;
  return component;
}

/** The raw (un-normalised) value of every feature, before weighting. */
export interface RawTypabilityFeatures {
  readonly chars: number;
  readonly nonSpaceChars: number;
  readonly words: number;
  readonly letters: number;
  readonly lowercaseAmongNonSpace: number;
  readonly frequentWordShare: number;
  readonly knownWordShare: number;
  readonly meanBigramWeight: number;
  readonly rightHandLetterShare: number;
  readonly meanWordLength: number;
  readonly longWordShare: number;
  readonly symbolShare: number;
  readonly digitShare: number;
  readonly uppercaseShare: number;
  readonly classTransitionRate: number;
  readonly syllablesPerWord: number;
  readonly keystrokes: number;
}

/** Every raw feature name, in model order. Used by the tests that keep names and specs aligned. */
export const RAW_FEATURE_NAMES: ReadonlyArray<string> = Object.freeze([
  "lowercaseAmongNonSpace",
  "frequentWordShare",
  "knownWordShare",
  "meanBigramWeight",
  "rightHandLetterShare",
  "meanWordLength",
  "longWordShare",
  "symbolShare",
  "digitShare",
  "uppercaseShare",
  "classTransitionRate",
  "syllablesPerWord",
  "keystrokes",
]);

/**
 * Every raw feature value for one text.
 *
 * The names here and the names in `TYPABILITY_FEATURE_SPECS` are the same set;
 * `packages/typability/tests/features.test.ts` asserts that they stay the same,
 * because a feature with no spec silently contributes nothing to the score and a
 * spec with no raw value scores as `undefined`.
 */
export function rawFeatures(text: string): RawTypabilityFeatures {
  const value = String(text ?? "");
  const tokens = tokeniseWords(value);

  let nonSpaceChars = 0;
  let letters = 0;
  let lowerLetters = 0;
  let upperLetters = 0;
  let digits = 0;
  let symbols = 0;
  let rightHandLetters = 0;
  let changedPairs = 0;
  let pairs = 0;
  let previousClass: string | null = null;

  for (const ch of value) {
    if (/\s/.test(ch)) continue;
    nonSpaceChars++;
    const cls = characterClass(ch);
    if (previousClass !== null) {
      pairs++;
      if (cls !== previousClass) changedPairs++;
    }
    previousClass = cls;
    if (cls === CLASS_LOWER || cls === CLASS_UPPER) {
      letters++;
      const lower = ch.toLowerCase();
      if (cls === CLASS_LOWER) lowerLetters++;
      else upperLetters++;
      if (QWERTY_US_RIGHT_HAND_LETTERS.has(lower)) rightHandLetters++;
    } else if (cls === CLASS_DIGIT) {
      digits++;
    } else {
      symbols++;
    }
  }

  // Within-word bigrams only. A bigram spanning the space between two words
  // ("e h" in "the house") is an artefact of the space, not a letter pair, and
  // counting it would make a passage of short words look harder for no reason.
  let bigramTotal = 0;
  let bigramCount = 0;
  let wordLetters = 0;
  let longWords = 0;
  let syllables = 0;
  let frequentWords = 0;
  let knownWords = 0;
  for (const token of tokens) {
    const length = token.length;
    wordLetters += length;
    if (length >= 7) longWords++;
    if (isHighFrequencyWord(token)) frequentWords++;
    if (isCommonWord(token)) knownWords++;
    syllables += countSyllables(token);
    for (let i = 0; i + 1 < length; i++) {
      bigramTotal += bigramWeight(token.charAt(i), token.charAt(i + 1));
      bigramCount++;
    }
  }

  const words = tokens.length;
  return {
    chars: value.length,
    nonSpaceChars,
    words,
    letters,
    lowercaseAmongNonSpace: ratio(lowerLetters, nonSpaceChars),
    frequentWordShare: ratio(frequentWords, words),
    knownWordShare: ratio(knownWords, words),
    meanBigramWeight: ratio(bigramTotal, bigramCount),
    rightHandLetterShare: ratio(rightHandLetters, letters),
    meanWordLength: ratio(wordLetters, words),
    longWordShare: ratio(longWords, words),
    symbolShare: ratio(symbols, nonSpaceChars),
    digitShare: ratio(digits, nonSpaceChars),
    uppercaseShare: ratio(upperLetters, nonSpaceChars),
    classTransitionRate: ratio(changedPairs, pairs),
    syllablesPerWord: ratio(syllables, words),
    keystrokes: value.length,
  };
}

/**
 * The feature vector the score is computed from: raw value plus the normalised
 * component for each declared feature, in `TYPABILITY_FEATURE_SPECS` order, so a
 * stored or printed vector is comparable field by field.
 */
export function typabilityFeatures(text: string): TypabilityFeatures {
  const raw = rawFeatures(text);
  const features: TypabilityFeature[] = [];
  for (const spec of TYPABILITY_FEATURE_SPECS) {
    const value = raw[spec.name as keyof RawTypabilityFeatures] as number;
    features.push({
      name: spec.name,
      raw: value,
      component: normaliseFeature(value, spec.anchors, spec.direction),
    });
  }
  return {
    chars: raw.chars,
    nonSpaceChars: raw.nonSpaceChars,
    words: raw.words,
    letters: raw.letters,
    features,
  };
}

/** Names of the declared features, for tests and for the calibration report. */
export function typabilityFeatureNames(): ReadonlyArray<string> {
  return TYPABILITY_FEATURE_SPECS.map((spec) => spec.name);
}

export { TYPABILITY_FEATURE_SPEC_BY_NAME };
