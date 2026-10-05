/**
 * Syllable counting for the typability scorer (CNT-02).
 *
 * master-spec §6.2 lists "syllables per word" as a harder-direction feature;
 * implementation guide §6.5 step 2 asks for a syllable method whose licence has
 * been checked. This is a *method*, not a data resource: it is our own
 * vowel-group heuristic, so there is nothing to license, and its accuracy
 * limits are stated rather than hidden.
 *
 * The rules, in the order they are applied (all on a lower-cased, letters-only
 * word, so callers never pass punctuation in):
 *
 *   1. Count maximal runs of the vowels `aeiouy` as one syllable each. `y` is a
 *      vowel because English uses it as one ("yes", "rhythm"), and a run like
 *      "eau" is one syllable in practice.
 *   2. Words of three letters or fewer are one syllable. The rules below do not
 *      do better than that on "the", "ion" or "ion" - and a short word is one
 *      syllable in the overwhelming majority of cases anyway.
 *   3. Silent final `e`: a word ending in `e` loses one syllable, UNLESS the
 *      word ends in a consonant + `le` ("table", "little", "simple"), where the
 *      `le` is itself the syllable.
 *   4. Silent `-ed`: a word ending in `ed` preceded by a letter other than `t`
 *      or `d` loses one syllable ("asked" is one, "wanted" is two). `t` and `d`
 *      are excluded because they are pronounced.
 *   5. Never return less than 1.
 *
 * Known inaccuracies, stated so nobody treats the feature as ground truth: this
 * counts "-es" as pronounced ("wishes" → 2, defensible), does not know that
 * "-ia"/"-io" are often two syllables ("media", "ratio"), and treats a final
 * `-le` after a vowel as one syllable ("while" → 1, correct by luck of rule 2
 * being applied first only for ≤3 letters, so "while" → 1 via the `i` + silent
 * `e`). The corpus word-length distribution means the feature moves the total
 * score by a fraction of a point per item; docs/typability-scoring.md §5 records
 * the measured effect rather than claiming the method is right.
 */

const VOWELS = /[aeiouy]/;

/** Letters-only guard: everything the counter looks at is in this class. */
function lettersOnly(word: string): string {
  return String(word ?? "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

/**
 * Syllables in one English word form. Total: never throws, never returns a
 * non-finite number, and never returns less than 1 for any non-empty word.
 * Empty / punctuation-only input returns 0 so a caller summing over words can
 * tell "no word" from "a word with no syllable".
 */
export function countSyllables(word: string): number {
  const clean = lettersOnly(word);
  if (clean === "") return 0;
  if (clean.length <= 3) return 1;

  let count = 0;
  let previousWasVowel = false;
  for (let i = 0; i < clean.length; i++) {
    const isVowel = VOWELS.test(clean.charAt(i));
    if (isVowel && !previousWasVowel) count++;
    previousWasVowel = isVowel;
  }

  if (clean.endsWith("e")) {
    const consonantBeforeLe = clean.length >= 3 && !VOWELS.test(clean.charAt(clean.length - 3));
    if (!consonantBeforeLe) count--;
  } else if (clean.endsWith("ed")) {
    const before = clean.charAt(clean.length - 3);
    if (before !== "t" && before !== "d") count--;
  }

  return Math.max(1, count);
}
