/**
 * The single dispatch entry point (CNT-05).
 *
 * The skill's contract is `generate(tier, level, seed, skin) -> text`. This takes the
 * same inputs as an options object, keyed by *family* rather than tier number because
 * the repo carries two tier numberings (see `TIER_BY_FAMILY` in ./types.ts), and
 * returns a set rather than one string because a drill needs a set plus the parameters
 * that produced it.
 *
 * The family switch is exhaustive by type: adding a family to `GENERATOR_FAMILIES`
 * without a branch here is a compile error, which is the point of the discriminated
 * union in ./types.ts.
 */

import { generateBrackets } from "./brackets.js";
import { generateIds } from "./ids.js";
import { generateIdentifiers } from "./naming.js";
import { generateNumbers } from "./numbers.js";
import { GENERATORS_VERSION, clampCount, clampLevel, resolveSkin } from "./shared.js";
import { generateStrings } from "./strings.js";
import type { GeneratedItem, GeneratedSet, GenerateOptions } from "./types.js";

function generateItems(options: GenerateOptions): readonly GeneratedItem[] {
  switch (options.family) {
    case "numbers":
      return generateNumbers(options);
    case "ids":
      return generateIds(options);
    case "naming":
      return generateIdentifiers(options);
    case "brackets":
      return generateBrackets(options);
    case "strings":
      return generateStrings(options);
  }
}

export function generate(options: GenerateOptions): GeneratedSet {
  return {
    version: GENERATORS_VERSION,
    family: options.family,
    seed: options.seed,
    language: resolveSkin(options.language).id,
    level: clampLevel(options.level),
    count: clampCount(options.count),
    items: generateItems(options),
  };
}
