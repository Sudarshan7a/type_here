/**
 * Shared plumbing for the five CNT-05 families: version pinning, skin
 * resolution, option clamping and the item constructor.
 *
 * The clamping rules live here rather than in each family because they are the
 * difference between "a generator" and "a generator that can be pointed at by a
 * level engine with a user-supplied level": the level engine (PRG-18) will pass
 * whatever the level table says, and a level table typo must not produce an item
 * with six bracket levels or a negative count.
 */

import type { LanguageProfile, StringProfile } from "@realtype/engine";
import { languageProfile } from "@realtype/engine";

import type { SeededRng } from "./prng.js";
import type { DifficultyLevel, GeneratedItem, GeneratorFamily, GeneratorParams } from "./types.js";

/**
 * Bumped whenever an item's *shape* changes, the way the engine bumps
 * `TOKENIZER_VERSION`: stored drills are re-generated from their seed, so a shape
 * change is only safe if the version says which rules produced it.
 */
export const GENERATORS_VERSION = "0.0.1";

/**
 * The default skin. `javascript` rather than `generic` because `generic` is the
 * engine's *fallback* for an unknown language: it declares no digit separator and
 * no interpolation, so a `1_048_576` or a `` `${x}` `` item would tokenize into
 * misleading spans under it. Defaulting to the most opinionated MVP profile makes
 * the wrong classification impossible to reach by accident.
 */
export const DEFAULT_LANGUAGE = "javascript";

/** Raised when a skin cannot express a requested form, e.g. `` `${x}` `` in Python. */
export class UnsupportedFormError extends Error {
  readonly form: string;
  readonly language: string;

  constructor(form: string, language: string, reason: string) {
    super(`form "${form}" is not available for language "${language}": ${reason}`);
    this.name = "UnsupportedFormError";
    this.form = form;
    this.language = language;
  }
}

export function resolveSkin(language: string | undefined): LanguageProfile {
  return languageProfile(language ?? DEFAULT_LANGUAGE);
}

/** Clamp to 1-5 rather than throwing: a bad level should ease off, not crash a drill. */
export function clampLevel(level: number | undefined): DifficultyLevel {
  if (level === undefined) return 1;
  if (!Number.isFinite(level)) return 1;
  return Math.min(5, Math.max(1, Math.trunc(level))) as DifficultyLevel;
}

export function clampCount(count: number | undefined): number {
  if (count === undefined) return 10;
  if (!Number.isFinite(count)) return 10;
  return Math.min(500, Math.max(1, Math.trunc(count)));
}

export function clampInt(value: number | undefined, min: number, max: number, fallback: number) {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

/**
 * Pick one form per item.
 *
 * An explicitly requested form is always honoured, whatever the level says: a
 * caller that asks for `hex` has asked for hex, and silently substituting a
 * decimal would make the level engine's content unpredictable. The level only
 * decides the pool when the caller did not choose.
 */
export function pickForm<T>(
  requested: T | readonly T[] | undefined,
  allowedByLevel: readonly T[],
  rng: SeededRng,
): T {
  if (requested !== undefined) {
    return Array.isArray(requested) ? rng.pick(requested as readonly T[]) : (requested as T);
  }
  return rng.pick(allowedByLevel);
}

/** A single value or a readonly array of them, always as a readonly array. */
export function asArray<T>(value: T | readonly T[]): readonly T[] {
  return Array.isArray(value) ? (value as readonly T[]) : [value as T];
}

export function makeItem(
  family: GeneratorFamily,
  kind: string,
  profile: LanguageProfile,
  text: string,
  params: GeneratorParams,
  fullText?: string,
): GeneratedItem {
  return fullText === undefined
    ? { text, family, kind, language: profile.id, params }
    : { text, family, kind, language: profile.id, params, fullText };
}

/** Non-interpolating, single-line delimiters a skin can close on one line. */
export function singleLineStrings(profile: LanguageProfile): readonly StringProfile[] {
  return profile.strings.filter((spec) => !spec.interpolation && !spec.multiline);
}

/** A template delimiter, or null when the skin has no interpolation. */
export function templateString(profile: LanguageProfile): StringProfile | null {
  return profile.strings.find((spec) => spec.interpolation) ?? null;
}

/**
 * The digit-grouping character for literal-style content, or "" when the skin
 * declares none. `1_048_576` under a profile with no digit separator tokenizes as
 * a number followed by an identifier, which would silently corrupt number-class
 * analytics - so the generator asks the profile rather than assuming `_`.
 */
export function digitSeparator(profile: LanguageProfile): string {
  return profile.digitSeparator;
}
