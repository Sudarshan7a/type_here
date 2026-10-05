/**
 * The `naming` family (CNT-05; master-spec §7 tier 7 / skill tier 6 "Identifiers by
 * style", implementation guide M6-03 "Naming Style Switcher", levels 26-30).
 *
 * BOUNDARY WITH PRG-14. PRG-14 owns the switcher - the drill that shows an identifier
 * in one convention and asks for another - and the switch-cost metric that comes out
 * of it. This module owns two things only: an original technical vocabulary, and
 * `renderIdentifier`, which turns a word sequence into one of the seven conventions.
 * The *inverse* parse (an identifier back into words) is deliberately not built here:
 * a second definition of the same transformation is exactly how a switch-cost metric
 * ends up measuring the wrong thing, so the inverse belongs with the metric that needs
 * it.
 *
 * SEVEN STYLES, matching PRG-14's "120 phrases x 7 styles = 840 cases": snake,
 * screaming snake, camel, Pascal, kebab, dotted and namespaced. The styles are the
 * ones master-spec §7 tier 7 and M6-03 name; nothing here invents an eighth.
 */

import type { SeededRng } from "./prng.js";
import { SeededRng as Rng, deriveSeed } from "./prng.js";
import {
  UnsupportedFormError,
  asArray,
  clampCount,
  clampInt,
  clampLevel,
  makeItem,
  pickForm,
  resolveSkin,
} from "./shared.js";
import type { GeneratedItem, IdentifierStyle, NamingSetOptions } from "./types.js";
import { TECH_WORDS } from "./words.js";

export const IDENTIFIER_STYLES: readonly IdentifierStyle[] = Object.freeze([
  "camel",
  "pascal",
  "snake",
  "screaming_snake",
  "kebab",
  "dot",
  "namespace",
]);

/**
 * Style pools per level, following levels 26-30: snake/screaming, camel/pascal,
 * kebab/dotted/namespaced. `[proposal]` (§10.5).
 */
const STYLES_BY_LEVEL: Readonly<Record<number, readonly IdentifierStyle[]>> = Object.freeze({
  1: ["snake", "screaming_snake"],
  2: ["snake", "screaming_snake", "camel"],
  3: ["snake", "screaming_snake", "camel", "pascal"],
  4: ["snake", "screaming_snake", "camel", "pascal", "kebab"],
  5: IDENTIFIER_STYLES,
});

/**
 * The `namespace` style is only offered to a skin that has `::` as a token. The generic
 * profile lists it among its chords; the JavaScript profile does not, because `::` is
 * not JavaScript - and a drill that shows `db::migrations` under a JavaScript skin would
 * teach punctuation the learner will never type in that language. Requesting it
 * explicitly on such a skin throws rather than silently rendering something else.
 */
function styleAvailable(style: IdentifierStyle, language: string | undefined): boolean {
  if (style !== "namespace") return true;
  return resolveSkin(language).chords.includes("::");
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Render one word sequence in one convention.
 *
 * Each rule is a pure string transformation with exactly one joiner, so the same word
 * sequence rendered two ways differs only in the joiner and the capitalisation - which
 * is the property that makes a switch-cost measurement meaningful rather than a
 * measurement of two unrelated strings.
 */
export function renderIdentifier(words: readonly string[], style: IdentifierStyle): string {
  if (words.length === 0) throw new RangeError("renderIdentifier needs at least one word");
  switch (style) {
    case "camel":
      return words.map((word, index) => (index === 0 ? word : capitalize(word))).join("");
    case "pascal":
      return words.map(capitalize).join("");
    case "snake":
      return words.join("_");
    case "screaming_snake":
      return words.join("_").toUpperCase();
    case "kebab":
      return words.join("-");
    case "dot":
      return words.join(".");
    case "namespace":
      return words.join("::");
  }
}

/**
 * A word sequence with no repeats at all: `bufferBuffer` and `bufferCursorBuffer` are
 * legal identifiers that no code style guide would produce, and both would train a
 * transition the learner will never meet.
 */
function wordSequence(rng: SeededRng, count: number): string[] {
  const words: string[] = [];
  while (words.length < count) {
    const next = rng.pick(TECH_WORDS);
    if (!words.includes(next)) words.push(next);
  }
  return words;
}

export function generateIdentifiers(options: NamingSetOptions): readonly GeneratedItem[] {
  const level = clampLevel(options.level);
  const count = clampCount(options.count);
  const wordCount = clampInt(options.wordCount, 1, 4, level >= 4 ? 3 : 2);
  const allowed = STYLES_BY_LEVEL[level]!.filter((style) =>
    styleAvailable(style, options.language),
  );
  const profile = resolveSkin(options.language);
  if (options.style !== undefined) {
    for (const style of asArray(options.style)) {
      if (!styleAvailable(style, options.language)) {
        throw new UnsupportedFormError(
          style,
          profile.id,
          "the profile has no `::` token, so a namespaced name would not be this language's syntax",
        );
      }
    }
  }
  return Array.from({ length: count }, (_, index) => {
    const rng = new Rng(deriveSeed(options.seed, "naming", index));
    const style = pickForm(options.style, allowed, rng);
    // A qualified name with one segment is not a qualified name: `config` is an
    // identifier, not a dotted path, and treating it as `dot` style would make the two
    // styles indistinguishable on exactly the identifiers a switch drill compares.
    const words = wordSequence(rng, style === "dot" ? Math.max(wordCount, 2) : wordCount);
    return makeItem("naming", `naming/${style}`, profile, renderIdentifier(words, style), {
      style,
      wordCount,
      words: words.join("|"),
    });
  });
}
