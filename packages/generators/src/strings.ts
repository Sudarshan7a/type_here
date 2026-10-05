/**
 * The `strings` family (CNT-05; master-spec §7 tier 4 "Quotes, strings, escapes",
 * skill tier 3, implementation guide levels 11-15).
 *
 * BOUNDARY WITH PRG-12. PRG-12 owns the escapes *drill*: which escape the learner is
 * asked for, backslash accuracy scoring, and the level 14 regex-basics material. This
 * module owns the literals. Regex literals are deliberately absent: §7.1 classes them
 * as `data` (class 12), not `string`, and levels 14-15 belong to PRG-12 - emitting one
 * here would put a fourth interpretation of "string" into the content set.
 *
 * THE TWO RULES THAT MATTER FOR SAFETY
 *
 *  1. Escapes are drawn from a fixed, *valid* set. A random code unit after `\u` could
 *     be an unpaired surrogate (U+D800-U+DFFF), which would produce a literal the
 *     engine's grapheme model cannot count - the typing surface would disagree with the
 *     metrics. The escape table is closed and every entry is checked by a test.
 *  2. A credential-shaped string is marked, not disguised. It exists so the secret-scan
 *     path (M3-09, CNT-08) has *shaped* input to be tested against, and it always
 *     begins `EXAMPLE-KEY`, which no provider issues and which
 *     `isSyntheticCredential` requires. `synthetic: true` is in the item parameters so
 *     a downstream filter can act on it without parsing text.
 */

import type { LanguageProfile } from "@realtype/engine";

import type { SeededRng } from "./prng.js";
import { SeededRng as Rng, deriveSeed } from "./prng.js";
import { CREDENTIAL_MARKER } from "./safety.js";
import {
  UnsupportedFormError,
  asArray,
  clampCount,
  clampInt,
  clampLevel,
  makeItem,
  pickForm,
  resolveSkin,
  singleLineStrings,
  templateString,
} from "./shared.js";
import type { GeneratedItem, StringForm, StringSetOptions } from "./types.js";
import { STRING_WORDS, TECH_WORDS } from "./words.js";

export const STRING_FORMS: readonly StringForm[] = Object.freeze([
  "quoted",
  "escapes",
  "template",
  "credential",
]);

/**
 * Form pools per level, following levels 11-15: quote pairs, escapes, interpolation,
 * and the credential-shaped material at the boss. `[proposal]` (§10.5).
 */
const FORMS_BY_LEVEL: Readonly<Record<number, readonly StringForm[]>> = Object.freeze({
  1: ["quoted"],
  2: ["quoted", "escapes"],
  3: ["quoted", "escapes", "template"],
  4: ["quoted", "escapes", "template"],
  5: ["quoted", "escapes", "template", "credential"],
});

/**
 * The escape sequences a generated literal may contain, split by whether they are
 * legal inside the chosen delimiter. `\"` inside a single-quoted JavaScript literal is
 * just a quote character, so emitting it would teach an escape that does not exist.
 */
const PLAIN_ESCAPES: readonly string[] = Object.freeze(["\\n", "\\t", "\\r", "\\\\"]);
/** `\uXXXX` over the BMP, excluding the surrogate block (see the module header). */
const UNICODE_ESCAPES: readonly string[] = Object.freeze([
  "\\u0020",
  "\\u0041",
  "\\u007a",
  "\\u00a9",
  "\\u00e9",
  "\\u2014",
  "\\u2192",
  "\\u2713",
]);

/** One or two lowercase words, so a body stays short and retypable. */
function body(rng: SeededRng): string {
  const first = rng.pick(STRING_WORDS);
  return rng.chance(0.5) ? first : `${first} ${rng.pick(STRING_WORDS)}`;
}

interface Built {
  readonly text: string;
  readonly params: Readonly<Record<string, string | number | boolean>>;
}

function buildQuoted(rng: SeededRng, profile: LanguageProfile): Built {
  const spec = rng.pick(singleLineStrings(profile));
  return {
    text: `${spec.open}${body(rng)}${spec.close}`,
    params: { form: "quoted", delimiter: spec.open },
  };
}

function buildEscaped(rng: SeededRng, profile: LanguageProfile, escapeCount: number): Built {
  const spec = rng.pick(singleLineStrings(profile));
  // The delimiter's own quote character is the only quote escaped here: `\"` inside a
  // single-quoted literal is a no-op, so emitting it would teach an escape that has no
  // meaning in the language the learner is being shown.
  const escapes = [...PLAIN_ESCAPES, spec.open === '"' ? '\\"' : "\\'"];
  const parts: string[] = [];
  let unicodeEscapes = 0;
  for (let index = 0; index < escapeCount; index += 1) {
    if (rng.chance(0.2)) {
      parts.push(rng.pick(UNICODE_ESCAPES));
      unicodeEscapes += 1;
      continue;
    }
    parts.push(rng.pick(STRING_WORDS), rng.pick(escapes));
  }
  parts.push(rng.pick(STRING_WORDS));
  return {
    text: `${spec.open}${parts.join("")}${spec.close}`,
    params: { form: "escapes", delimiter: spec.open, escapes: escapeCount, unicodeEscapes },
  };
}

function buildTemplate(rng: SeededRng, profile: LanguageProfile): Built {
  // Reached only for a skin that passed `formAvailable`, which is the check that owns
  // this decision and reports it to the caller by name.
  const spec = templateString(profile)!;
  const identifier = rng.pick(TECH_WORDS);
  return {
    text: `${spec.open}${body(rng)} \${${identifier}}${spec.close}`,
    params: { form: "template", delimiter: spec.open, interpolation: 1 },
  };
}

/**
 * A credential-shaped string that cannot be mistaken for one: the marker is part of
 * the value, so it is visible in a screenshot, a log line or a bug report.
 */
function buildCredential(rng: SeededRng, profile: LanguageProfile): Built {
  const spec = rng.pick(singleLineStrings(profile));
  const groups = Array.from({ length: 4 }, () =>
    rng.fromAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 4),
  );
  return {
    text: `${spec.open}${CREDENTIAL_MARKER}-${groups.join("-")}${spec.close}`,
    params: { form: "credential", delimiter: spec.open, synthetic: true },
  };
}

/**
 * Whether a form can be rendered in this skin at all. `template` needs a profile with an
 * interpolating delimiter; Python has none, so offering `` `${x}` `` there would be
 * teaching JavaScript syntax under a Python label. Unsupported forms are dropped from
 * the level pool and rejected loudly when asked for by name.
 */
function formAvailable(form: StringForm, profile: LanguageProfile): boolean {
  if (form !== "template") return true;
  return templateString(profile) !== null;
}

export function generateStrings(options: StringSetOptions): readonly GeneratedItem[] {
  const level = clampLevel(options.level);
  const count = clampCount(options.count);
  const escapeCount = clampInt(options.escapeCount, 1, 4, 2);
  const profile = resolveSkin(options.language);
  const allowed = FORMS_BY_LEVEL[level]!.filter((form) => formAvailable(form, profile));
  if (options.form !== undefined) {
    for (const form of asArray(options.form)) {
      if (!formAvailable(form, profile)) {
        throw new UnsupportedFormError(
          form,
          profile.id,
          "the profile declares no interpolation, so the language has no template literal",
        );
      }
    }
  }
  return Array.from({ length: count }, (_, index) => {
    const rng = new Rng(deriveSeed(options.seed, "strings", index));
    const form = pickForm(options.form, allowed, rng);
    let built: Built;
    switch (form) {
      case "quoted":
        built = buildQuoted(rng, profile);
        break;
      case "escapes":
        built = buildEscaped(rng, profile, escapeCount);
        break;
      case "template":
        built = buildTemplate(rng, profile);
        break;
      case "credential":
        built = buildCredential(rng, profile);
        break;
    }
    return makeItem("strings", `strings/${form}`, profile, built.text, built.params);
  });
}
