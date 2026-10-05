/**
 * The `numbers` family (CNT-05; master-spec §7 tiers 4 and 6, implementation guide
 * M6-01 "Numbers", M6-02 "Hex/binary/octal").
 *
 * BOUNDARY WITH PRG-13. PRG-13 owns the *drill*: which formats it shows at which
 * level, the per-digit and transposition metrics, and the boss. This module owns the
 * *material*: given a seed, produce syntactically valid literals with a controlled
 * magnitude, precision and symbol density. Nothing here knows what a level is beyond
 * which forms it may draw from, and nothing here computes a score.
 *
 * Every literal is built from the *skin's* rules rather than from a hard-coded `_`:
 * `1_048_576` is one number token under JavaScript and Python, but under the generic
 * profile - which declares no digit separator - it is a number followed by an
 * identifier, and drilling it would silently poison the number-class analytics ANA-05
 * is built on.
 */

import type { LanguageProfile } from "@realtype/engine";

import type { SeededRng } from "./prng.js";
import { SeededRng as Rng, deriveSeed } from "./prng.js";
import {
  clampCount,
  clampInt,
  clampLevel,
  digitSeparator,
  makeItem,
  pickForm,
  resolveSkin,
} from "./shared.js";
import type { GeneratedItem, NumberForm, NumberSetOptions } from "./types.js";

export const NUMBER_FORMS: readonly NumberForm[] = Object.freeze([
  "integer",
  "negative",
  "decimal",
  "grouped",
  "scientific",
  "hex",
  "binary",
  "octal",
]);

/**
 * Which forms a level may draw from. A `[proposal]` in the sense of §10.5: the ramp
 * is ordered by symbol density (a decimal point costs a Shift-free right-hand reach;
 * `0b1010_0101` costs a reach, an underscore and a mental base conversion), and it
 * matches the published level ladder: L16 digits, L17 signs/decimals/separators,
 * L18 scientific and underscored, L21-22 hex/binary/octal.
 *
 * COLOUR LITERALS ARE NOT HERE, deliberately. Master-spec §7 tier 6 and M6-02 both list
 * `#FF00AA`, and the engine is ready for it (`hashMeaning: "colour"`), but no shipped
 * language profile declares that mode: JavaScript reads `#` as a private-field prefix,
 * Python and generic as a comment. Under those profiles `#ff00aa` tokenizes as an
 * unknown character or as a comment, so emitting one would put content into the drill
 * that the authoritative token map cannot classify - the one thing this package
 * promises never to do. The form returns when PRG-02 lands the CSS profile that says
 * `hashMeaning: "colour"`; nothing else needs to change.
 */
const NUMBER_FORMS_BY_LEVEL: Readonly<Record<number, readonly NumberForm[]>> = Object.freeze({
  1: ["integer"],
  2: ["integer", "negative"],
  3: ["integer", "negative", "decimal"],
  4: ["integer", "negative", "decimal", "grouped", "scientific"],
  5: ["integer", "negative", "decimal", "grouped", "scientific", "hex", "binary", "octal"],
});

const LOWER_HEX_DIGITS = "0123456789abcdef";

/** A digit string with no leading zero, which is what a hand-typed integer looks like. */
function digits(rng: SeededRng, count: number, alphabet = "0123456789"): string {
  const first = rng.fromAlphabet(alphabet.slice(1), 1);
  return count <= 1 ? first : first + rng.fromAlphabet(alphabet, count - 1);
}

/** Thousands separators, grouped from the right, in the skin's own separator. */
function groupDigits(rng: SeededRng, count: number, separator: string): string {
  const plain = digits(rng, Math.max(count, 4));
  let out = "";
  for (let index = 0; index < plain.length; index += 1) {
    if (index > 0 && (plain.length - index) % 3 === 0) out += separator;
    out += plain[index];
  }
  return out;
}

interface Built {
  readonly text: string;
  readonly params: Readonly<Record<string, string | number | boolean>>;
}

function buildInteger(rng: SeededRng, magnitude: number, prefix: string, form: NumberForm): Built {
  return { text: prefix + digits(rng, magnitude), params: { form, magnitude } };
}

function buildDecimal(rng: SeededRng, magnitude: number, precision: number): Built {
  return {
    text: `${digits(rng, magnitude)}.${digits(rng, precision)}`,
    params: { form: "decimal", magnitude, precision },
  };
}

function buildScientific(rng: SeededRng, magnitude: number, precision: number): Built {
  // A mantissa of six digits with an exponent is not a shape anyone types: the
  // exponent exists precisely so the mantissa stays short.
  const mantissa = `${digits(rng, clampInt(magnitude, 1, 3, 2))}.${digits(rng, precision)}`;
  // No zero exponent: `1.5e0` is legal and pointless, and typing it would drill a form
  // nobody writes.
  const exponent = (rng.chance(0.5) ? -1 : 1) * rng.int(1, 9);
  const sign = exponent < 0 ? "-" : "";
  return {
    text: `${mantissa}e${sign}${Math.abs(exponent)}`,
    params: { form: "scientific", magnitude: clampInt(magnitude, 1, 3, 2), precision, exponent },
  };
}

function buildRadix(
  rng: SeededRng,
  form: "hex" | "binary" | "octal",
  magnitude: number,
  separator: string,
): Built {
  if (form === "octal") {
    // `0o` is a prefix, not a grouping character: an underscore may not follow it.
    return {
      text: `0o${digits(rng, clampInt(magnitude, 2, 4, 3), "01234567")}`,
      params: { form, magnitude },
    };
  }
  if (form === "hex") {
    const plain = digits(rng, magnitude, LOWER_HEX_DIGITS);
    const grouped = separator === "" ? plain : plain.replace(/(.{4})(?=.)/g, `$1${separator}`);
    return { text: `0x${grouped}`, params: { form, magnitude, separator } };
  }
  // Binary: whole nibbles only, because a partial nibble is a number nobody writes,
  // and the top bit set, because `0b0000_1100` is machine output rather than typing
  // practice.
  const nibbles = clampInt(magnitude, 1, 4, 2);
  const plain = "1" + rng.fromAlphabet("10", nibbles * 4 - 1);
  const grouped = separator === "" ? plain : plain.replace(/(.{4})(?=.)/g, `$1${separator}`);
  return { text: `0b${grouped}`, params: { form: "binary", magnitude: nibbles * 4, separator } };
}

function buildNumber(
  rng: SeededRng,
  profile: LanguageProfile,
  form: NumberForm,
  magnitude: number,
  precision: number,
): Built {
  const separator = digitSeparator(profile);
  switch (form) {
    case "integer":
      return buildInteger(rng, magnitude, "", form);
    case "negative":
      return buildInteger(rng, magnitude, "-", form);
    case "decimal":
      return buildDecimal(rng, magnitude, precision);
    case "grouped":
      // No separator character to work with: `,` is the human-facing thousands
      // marker the M6-01 "thousands separators" drill actually asks for, and it
      // tokenizes as an operator, which is honest about what it is.
      return {
        text: groupDigits(rng, magnitude, separator === "" ? "," : separator),
        params: { form, magnitude, separator: separator === "" ? "," : separator },
      };
    case "scientific":
      return buildScientific(rng, magnitude, precision);
    case "hex":
    case "binary":
    case "octal":
      return buildRadix(rng, form, magnitude, separator);
  }
}

export function generateNumbers(options: NumberSetOptions): readonly GeneratedItem[] {
  const level = clampLevel(options.level);
  const count = clampCount(options.count);
  const magnitude = clampInt(options.magnitude, 1, 9, level >= 4 ? 6 : 3);
  const precision = clampInt(options.precision, 1, 6, 2);
  const allowed = NUMBER_FORMS_BY_LEVEL[level]!;
  const profile = resolveSkin(options.language);
  return Array.from({ length: count }, (_, index) => {
    const rng = new Rng(deriveSeed(options.seed, "numbers", index));
    const form = pickForm(options.form, allowed, rng);
    const built = buildNumber(rng, profile, form, magnitude, precision);
    return makeItem("numbers", `numbers/${form}`, profile, built.text, built.params);
  });
}
