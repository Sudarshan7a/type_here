/**
 * RealType typing engine (open-core, MIT) — the language-pack layer (PRG-02).
 *
 * Six packs, one resolution rule, three model extensions. Start at
 * docs/profiles/prg02-language-packs.md for the reasoning; this barrel is only the
 * surface, kept separate from PRG-01's `../language-profiles.ts` so the two can be
 * merged in either order.
 */
export {
  PACK_EXTENSIONS,
  extensionFor,
  packFingerprint,
  unconsumedExtensions,
  validatePack,
  type LanguagePack,
  type MarkupScanProfile,
  type PackExtension,
  type PackExtensionField,
  type StringPrefixProfile,
} from "./model.js";

export {
  CSS_PACK,
  GENERIC_PACK,
  HTML_PACK,
  JAVA_PACK,
  JAVASCRIPT_PACK,
  LANGUAGE_PACKS,
  PYTHON_PACK,
  SQL_PACK,
} from "./catalog.js";

export {
  FALLBACK_PACK,
  PACK_ALIASES,
  PACK_IDS,
  describeResolution,
  knownPackIds,
  resolveLanguageProfile,
  resolvePack,
  tokenizePacked,
  type PackId,
  type PackResolution,
  type PackResolutionReason,
} from "./resolve.js";
