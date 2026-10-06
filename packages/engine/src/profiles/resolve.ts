/**
 * RealType typing engine (open-core, MIT) — profile resolution (PRG-02).
 *
 * THE RULE, in one paragraph: a snippet declares a language id; the id is trimmed
 * and lower-cased; a canonical pack id matches as `exact`, a declared alias matches
 * as `alias`, and anything else resolves to the generic pack as `unknown` with no
 * canonical id. Nothing throws, and nothing guesses. A mistyped or unsupported id
 * must not take down a live typing session — that is the engine's half of the
 * contract — while the reason it reports is what lets the publish-time pipeline
 * (M5-02 step 2) FAIL the item rather than ship it, which is its half.
 *
 * That split is why `resolvePack` returns a reason and `languageProfile` returns
 * only a profile: the first is for the content pipeline, which can refuse bad
 * content; the second is for the engine, which must keep typing.
 *
 * This module also owns the PRG-02 ENTRY POINT (`tokenizePacked`). PRG-01's
 * `tokenize(text, language)` resolves through the table inside
 * `../language-profiles.ts`, which predates these six packs, so for the five new
 * ids it still answers `generic`. Until that table is pointed here (one reported
 * change, docs/profiles/prg02-language-packs.md §7), `tokenizePacked` is the
 * correct entry point and it is what every fixture in this PRG's tests uses.
 */
import type { LanguageProfile } from "../language-profiles.js";
import { tokenizeWithProfile, type TokenMap } from "../token-map.js";
import { GENERIC_PACK, LANGUAGE_PACKS } from "./catalog.js";
import type { LanguagePack } from "./model.js";

/** The six canonical ids, in D6's priority order. ADR-007 fixed the count at six. */
export const PACK_IDS = ["javascript", "python", "java", "sql", "html", "css"] as const;
export type PackId = (typeof PACK_IDS)[number];

/** The profile an unrecognised id resolves to. Same object PRG-01 falls back to. */
export const FALLBACK_PACK: LanguagePack = GENERIC_PACK;

/**
 * Aliases, and nothing else. An alias exists only where the same characters mean
 * the same language under two spellings a human would type. Deliberately absent:
 * `c`, `c++`, `rust`, `go` — a request for a language with no pack must read as
 * `unknown` so the pipeline can report it, not as a near-miss that quietly trains
 * the wrong syntax.
 */
export const PACK_ALIASES: Readonly<Record<string, PackId>> = {
  js: "javascript",
  node: "javascript",
  // PRG-01's table already resolved these two to the JavaScript profile; carrying
  // them here keeps `languageProfile("typescript")` and `resolvePack("typescript")`
  // telling the same story, which is the difference between one rule and two.
  typescript: "javascript",
  jsx: "javascript",
  ts: "javascript",
  tsx: "javascript",
  py: "python",
  python3: "python",
  jvm: "java",
  postgres: "sql",
  postgresql: "sql",
  psql: "sql",
  htm: "html",
  xhtml: "html",
};

/** Canonical id → pack, in catalogue order. */
const PACK_BY_ID: ReadonlyMap<string, LanguagePack> = new Map(
  LANGUAGE_PACKS.map((pack) => [pack.id, pack]),
);

/** Alias → the ids it shares a pack with, for `PackResolution.aliases`. */
function aliasesOf(packId: string): readonly string[] {
  const aliases = Object.entries(PACK_ALIASES)
    .filter(([, target]) => target === packId)
    .map(([alias]) => alias);
  return [packId, ...aliases].sort();
}

export type PackResolutionReason =
  /** The id matched a canonical pack id. */
  | "exact"
  /** The id matched a declared alias of a pack. */
  | "alias"
  /** The id matched a canonical id only after trimming and lower-casing. */
  | "normalised"
  /** No pack claims this id; the generic fallback was used. */
  | "unknown";

export interface PackResolution {
  /** The pack to lex with. Never null: the generic pack is the last resort. */
  readonly profile: LanguagePack;
  /** The id exactly as the caller passed it, for the diagnostic message. */
  readonly requested: string;
  /** The pack's own id, or null when no pack claims the requested id. */
  readonly canonicalId: string | null;
  readonly reason: PackResolutionReason;
  /** Every id that resolves here, canonical first. Empty for an unknown id. */
  readonly aliases: readonly string[];
}

/**
 * Resolve a declared language id to a pack. Pure, total, and never throwing: the
 * `typeof` guard exists because the id arrives from hand-edited content JSON, where
 * a missing field is `undefined` rather than a type error.
 */
export function resolvePack(id: string): PackResolution {
  if (typeof id !== "string") {
    return {
      profile: FALLBACK_PACK,
      requested: String(id),
      canonicalId: null,
      reason: "unknown",
      aliases: [],
    };
  }
  const exact = PACK_BY_ID.get(id);
  if (exact !== undefined) {
    return {
      profile: exact,
      requested: id,
      canonicalId: exact.id,
      reason: "exact",
      aliases: aliasesOf(exact.id),
    };
  }
  const alias = PACK_ALIASES[id];
  if (alias !== undefined) {
    return {
      profile: PACK_BY_ID.get(alias)!,
      requested: id,
      canonicalId: alias,
      reason: "alias",
      aliases: aliasesOf(alias),
    };
  }
  const normalised = id.trim().toLowerCase();
  const byNormalisedId = PACK_BY_ID.get(normalised);
  if (byNormalisedId !== undefined) {
    return {
      profile: byNormalisedId,
      requested: id,
      canonicalId: byNormalisedId.id,
      reason: "normalised",
      aliases: aliasesOf(byNormalisedId.id),
    };
  }
  const byNormalisedAlias = PACK_ALIASES[normalised];
  if (byNormalisedAlias !== undefined) {
    return {
      profile: PACK_BY_ID.get(byNormalisedAlias)!,
      requested: id,
      canonicalId: byNormalisedAlias,
      reason: "alias",
      aliases: aliasesOf(byNormalisedAlias),
    };
  }
  return {
    profile: FALLBACK_PACK,
    requested: id,
    canonicalId: null,
    reason: "unknown",
    aliases: [],
  };
}

/**
 * The engine-facing half: resolve and return only the profile, exactly the shape
 * PRG-01's `languageProfile` has. Kept as a separate function so a caller that
 * only needs to lex never has to destructure a reason it will ignore.
 */
export function resolveLanguageProfile(id: string): LanguageProfile {
  return resolvePack(id).profile;
}

/** The six canonical ids, catalogue order. */
export function knownPackIds(): readonly string[] {
  return LANGUAGE_PACKS.map((pack) => pack.id);
}

/**
 * The PRG-02 entry point: resolve `languageId` and classify `text`. Returns the
 * same `TokenMap` PRG-01 returns, so every consumer of the map (publish-time
 * tiling validation, per-class counts, the drill selector) works unchanged.
 */
export function tokenizePacked(text: string, languageId: string): TokenMap {
  return tokenizeWithProfile(text, resolvePack(languageId).profile);
}

/**
 * A one-line, log-safe description of how an id resolved. It names the language and
 * the reason and nothing else — a content record's text is never part of it, so the
 * publish log can quote it verbatim under the privacy rules (AGENTS.md rule 4).
 */
export function describeResolution(resolution: PackResolution): string {
  if (resolution.reason === "unknown") {
    return `no language pack for ${JSON.stringify(resolution.requested)}; using ${FALLBACK_PACK.id}`;
  }
  return `${resolution.requested} -> ${resolution.canonicalId} (${resolution.reason})`;
}
