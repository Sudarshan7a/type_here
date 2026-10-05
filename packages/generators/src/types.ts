/**
 * CNT-05 public shapes. Kept in one file because they are the contract every
 * family module implements and the only thing `src/index.ts` re-exports besides
 * the generators themselves.
 *
 * The master spec's contract for a seeded generator is
 * `generate(tier, level, seed, skin) -> text` (implementation guide §6.3, and the
 * `token-drill-generators` skill). This package keeps that shape but names the
 * five families CNT-05 owns instead of numbering them, because two different tier
 * numberings are in circulation - see `TIER_BY_FAMILY` below and
 * `docs/generators-cnt05.md`.
 */

import type { SeedInput } from "./prng.js";

export type { SeedInput };

/** The five families CNT-05 owns: numbers, IDs, naming, brackets, strings. */
export const GENERATOR_FAMILIES = ["numbers", "ids", "naming", "brackets", "strings"] as const;

export type GeneratorFamily = (typeof GENERATOR_FAMILIES)[number];

/** Numeric tiers are the `levels-01`/`levels-05` 1-5 ramp; `[proposals]` per §10.5. */
export const DIFFICULTY_LEVELS = [1, 2, 3, 4, 5] as const;

export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

/**
 * Tier numbering, stated explicitly because the repo carries two schemes:
 *
 *  - master-spec-v1.md §7.4 lists SEVEN tiers (operators and multi-char chords are
 *    separate tiers, so naming is tier 7);
 *  - the `token-drill-generators` skill and the task brief use SIX (chords are part
 *    of the operator tier, so naming is tier 6).
 *
 * This package follows the six-tier scheme because that is what "levels 1-6 use
 * seeded generators" refers to, and because tier 7 in the seven-tier table is
 * whitespace/structure, which is [V1] and owned by PRG-15 rather than by a
 * generator in this package. The two schemes agree on the families that matter
 * here: brackets = tier 1, strings = tier 3, numbers = tier 4, systems and IDs =
 * tier 5.
 */
export const TIER_BY_FAMILY: Readonly<Record<GeneratorFamily, number>> = Object.freeze({
  brackets: 1,
  strings: 3,
  numbers: 4,
  ids: 5,
  naming: 6,
});

export type NumberForm =
  "integer" | "negative" | "decimal" | "grouped" | "scientific" | "hex" | "binary" | "octal";

export type IdForm =
  | "uuid"
  | "ulid"
  | "hash-sha1"
  | "hash-sha256"
  | "base64ish"
  | "ipv4"
  | "ipv6"
  | "cidr"
  | "mac"
  | "port"
  | "iso-date"
  | "iso-timestamp"
  | "semver";

export type IdentifierStyle =
  "camel" | "pascal" | "snake" | "screaming_snake" | "kebab" | "dot" | "namespace";

export type BracketShape =
  "pairs" | "content" | "nesting" | "mixed" | "ladder" | "overtype" | "unbalanced";

export type StringForm = "quoted" | "escapes" | "template" | "credential";

/** Free-form, recorded per item: the skill asks for difficulty parameters in the result. */
export type GeneratorParams = Readonly<Record<string, string | number | boolean>>;

export interface GeneratedItem {
  /** Exactly the characters to type. Never interpreted, only rendered (rule 5). */
  readonly text: string;
  readonly family: GeneratorFamily;
  /** `family/form`, e.g. `ids/uuid`. Machine-readable and stable. */
  readonly kind: string;
  /** Resolved skin id, so a stored item can be re-tokenized with its own profile. */
  readonly language: string;
  readonly params: GeneratorParams;
  /**
   * `brackets/overtype` only: the balanced expression the openers belong to.
   * PRG-11 owns the auto-pair drill and its latency metric; emitting both
   * projections is generation, deciding which one to show is not.
   */
  readonly fullText?: string;
}

export interface GeneratedSet {
  /** `GENERATORS_VERSION`: shapes are a stored-content contract, so they are pinned. */
  readonly version: string;
  readonly family: GeneratorFamily;
  readonly seed: SeedInput;
  /** Resolved skin id for every item in the set. */
  readonly language: string;
  readonly level: DifficultyLevel;
  readonly count: number;
  readonly items: readonly GeneratedItem[];
}

interface SetBase {
  readonly seed: SeedInput;
  /** Defaults to 10. Zero and negatives are rejected. */
  readonly count?: number;
  /** Skin id; resolved through the engine's language profiles. Defaults to javascript. */
  readonly language?: string;
  /** Difficulty ramp 1-5. Defaults to 1 (easiest). Clamped, never throws. */
  readonly level?: number;
}

export interface NumberSetOptions extends SetBase {
  readonly family: "numbers";
  readonly form?: NumberForm | readonly NumberForm[];
  /** Significant digits before any separator or decimal point. Clamped per form. */
  readonly magnitude?: number;
  /** Decimal places, for the decimal/scientific forms only. Clamped to 1-6. */
  readonly precision?: number;
}

export interface IdSetOptions extends SetBase {
  readonly family: "ids";
  readonly form?: IdForm | readonly IdForm[];
  /** Emit `2001:db8:1:2::3` rather than the uncompressed eight groups. */
  readonly compressIpv6?: boolean;
  /** Allow a `-rc.1` suffix on semver items. */
  readonly prerelease?: boolean;
}

export interface NamingSetOptions extends SetBase {
  readonly family: "naming";
  readonly style?: IdentifierStyle | readonly IdentifierStyle[];
  /** Words per identifier. Clamped to 1-4. */
  readonly wordCount?: number;
}

export interface BracketSetOptions extends SetBase {
  readonly family: "brackets";
  readonly shape?: BracketShape | readonly BracketShape[];
  /** Maximum nesting depth. Clamped to 1-4 (the skill's tier-1 range). */
  readonly depth?: number;
}

export interface StringSetOptions extends SetBase {
  readonly family: "strings";
  readonly form?: StringForm | readonly StringForm[];
  /** Escape sequences per `escapes` item. Clamped to 1-4. */
  readonly escapeCount?: number;
}

export type GenerateOptions =
  NumberSetOptions | IdSetOptions | NamingSetOptions | BracketSetOptions | StringSetOptions;
