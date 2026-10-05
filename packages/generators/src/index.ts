/**
 * RealType seeded content generators (CNT-05, open-core MIT).
 *
 * Five families - numbers, IDs, naming, brackets, strings - producing **synthetic**
 * typing material. No real data of any kind: every address is from a documentation
 * range, every hash carries a marker, every date is from a fixed window, and the
 * predicates that prove it are exported so the content pipeline can gate on the same
 * rules the tests use (see ./safety.ts).
 *
 * THE CONTRACT, in one place:
 *
 *   generate({ seed, family, count?, language?, level? }) -> GeneratedSet
 *
 * `seed` is a number or a string; `family` names one of the five; `count` defaults to
 * 10; `language` is a skin id resolved through the engine's language profiles and
 * defaults to `javascript`; `level` is the 1-5 difficulty ramp and defaults to 1.
 * Every family also has a direct generator (`generateNumbers`, `generateIds`,
 * `generateIdentifiers`, `generateBrackets`, `generateStrings`) for callers that want
 * items without the set wrapper.
 *
 * Three properties this package promises and its tests prove:
 *   1. Deterministic. `(seed, family, options)` -> byte-identical items, forever, on
 *      any Node version and any JS engine (see ./prng.ts for why that holds).
 *   2. Synthetic. See ./safety.ts. `findSafetyViolations` is the one-call version.
 *   3. Classifiable. Every item tokenizes through the engine's authoritative lexer with
 *      no diagnostics (see ./classify.ts).
 *
 * Boundaries with the drills that consume this material - PRG-11 brackets, PRG-12
 * strings and escapes, PRG-13 numbers/IDs, PRG-14 naming - are stated at the top of
 * each family module.
 */

export {
  DEFAULT_LANGUAGE,
  GENERATORS_VERSION,
  UnsupportedFormError,
  resolveSkin,
} from "./shared.js";

export { SeededRng, deriveSeed, fnv1a32, type SeedInput } from "./prng.js";

export {
  DIFFICULTY_LEVELS,
  GENERATOR_FAMILIES,
  TIER_BY_FAMILY,
  type BracketSetOptions,
  type BracketShape,
  type DifficultyLevel,
  type GenerateOptions,
  type GeneratedItem,
  type GeneratedSet,
  type GeneratorFamily,
  type GeneratorParams,
  type IdForm,
  type IdSetOptions,
  type IdentifierStyle,
  type NamingSetOptions,
  type NumberForm,
  type NumberSetOptions,
  type StringForm,
  type StringSetOptions,
} from "./types.js";

export { NUMBER_FORMS, generateNumbers } from "./numbers.js";
export { ID_FORMS, generateIds } from "./ids.js";
export { IDENTIFIER_STYLES, generateIdentifiers, renderIdentifier } from "./naming.js";
export { BRACKET_SHAPES, generateBrackets } from "./brackets.js";
export { STRING_FORMS, generateStrings } from "./strings.js";
export { STRING_WORDS, TECH_WORDS } from "./words.js";

/**
 * The synthetic-data predicates. Exported so the content pipeline (CNT-01) can gate an
 * item with exactly the rules this package's tests use, instead of a second list that
 * drifts.
 */
export {
  BASE64ISH_RE,
  BASE64_PLAINTEXT_PREFIX,
  CREDENTIAL_MARKER,
  CREDENTIAL_RE,
  DOC_IPV4_BLOCKS,
  DOC_IPV4_PREFIXES,
  DOC_IPV6_PREFIX,
  HASH_SHA1_RE,
  HASH_SHA256_RE,
  IPV4_RE,
  ISO_DATE_RE,
  ISO_TIMESTAMP_RE,
  LOCALLY_ADMINISTERED_MAC_OCTETS,
  MAC_RE,
  PORT_MAX,
  PORT_MIN,
  PORT_RE,
  REAL_CREDENTIAL_PREFIXES,
  SEMVER_RE,
  SYNTHETIC_CIDRS,
  SYNTHETIC_DATE_MAX,
  SYNTHETIC_DATE_MIN,
  SYNTHETIC_HASH_MARKER,
  ULID_RE,
  ULID_SYNTHETIC_PREFIX,
  UUID_RE,
  UUID_SYNTHETIC_VERSION,
  UUID_VARIANT_NIBBLES,
  base64urlDecode,
  base64urlEncode,
  bracketBalance,
  expandIpv6,
  findSafetyViolations,
  isDocumentationIPv4,
  isDocumentationIPv6,
  isIdentifierInStyle,
  isLocallyAdministeredMac,
  isSyntheticBase64ish,
  isSyntheticCredential,
  type BracketBalance,
  type SafetyViolation,
} from "./safety.js";

export { classifyItem, classifySet, uncleanItems, type ItemClassification } from "./classify.js";

export { generate } from "./generate.js";
