import { generate, type NumberForm } from "@realtype/generators";

/**
 * MOD-04 — Numbers & Symbols: digit rows, mixed alphanumerics, symbol rows.
 *
 * Every drill here is SYNTHETIC and SEEDED. The generator's contract is that
 * `(seed, family, options)` produces byte-identical items forever, so a run is
 * reproducible from the seed alone — which is what makes "one more like that"
 * a fact rather than a hope. Nothing real is generated: every number comes from
 * the package's own safety predicates (no phone numbers, no coordinates, no
 * account-shaped ids).
 *
 * The symbol rows are hand-authored for this project (license: original work —
 * ours). They are ordered by reach: the home row first, then the shifts, then
 * the far corners, because a symbol row that starts at `~` is a row nobody can
 * practise.
 */

/** MOD-04's drills, in the order a learner meets them. */
export const NUMBER_DRILLS = ["digits", "decimals", "symbols", "mixed"] as const;
export type NumberDrill = (typeof NUMBER_DRILLS)[number];

/** How many items a drill carries. Small: a drill is a warm-up, not a test. */
const DRILL_COUNT = 12;

/**
 * Symbol rows, home-row first. Written for this project — no source library,
 * no licence question. The order is the point: left-to-right across the home
 * row, then the shifted layer, then what is left.
 */
const SYMBOL_ROWS = ["!@#$%^&*()", "-=_+[]{}", "|;:'\",.<>/?`~"] as const;

/**
 * Alphanumerics to interleave in the mixed drill: digits and letters that
 * share a hand, which is the actual difficulty (a digit typed with the left
 * hand next to a letter typed with the left hand).
 */
const ALPHANUM_SEED = "1q2w3e4r5t6y7u8i9o0p a1s2d3f4g5h6j7k8l z1x2c2v3b4n5m6";

/** Pick one number form for a drill, or a spread of them. */
function formsFor(drill: NumberDrill): NumberForm[] {
  switch (drill) {
    case "digits":
      return ["integer"];
    case "decimals":
      return ["negative", "decimal", "grouped"];
    case "symbols":
      return [];
    case "mixed":
    default:
      return ["integer", "decimal"];
  }
}

function symbolRows(seed: number, rows: number): string[] {
  // Deterministic, unseeded-spread: row 0 first, and rotate through as the
  // count grows, so a longer drill adds rows rather than repeating one.
  const out: string[] = [];
  for (let i = 0; i < rows; i++) {
    out.push(SYMBOL_ROWS[i % SYMBOL_ROWS.length]!);
  }
  return out;
}

/**
 * Build the characters to type for one drill.
 *
 * Pure and deterministic: the same seed and drill always produce the same
 * text, so a recorded run can be replayed against it. A bad drill kind falls
 * back to digits rather than throwing — a drill generator that can crash on a
 * bad name is a drill generator that will crash in production.
 */
export function buildNumberDrill(seed: number, drill: NumberDrill): string {
  const forms = formsFor(drill);

  if (drill === "symbols") {
    return symbolRows(seed, 4).join(" ");
  }

  if (drill === "mixed") {
    const numbers = generate({
      seed,
      family: "numbers",
      count: DRILL_COUNT,
      form: forms,
      level: 3,
    });
    const alphanums = ALPHANUM_SEED.split(" ");
    const parts: string[] = [];
    for (let i = 0; i < numbers.items.length; i++) {
      parts.push(numbers.items[i]!.text);
      if (alphanums[i % alphanums.length] !== undefined) {
        parts.push(alphanums[i % alphanums.length]!);
      }
    }
    return parts.join(" ");
  }

  const generated = generate({
    seed,
    family: "numbers",
    count: DRILL_COUNT,
    form: forms,
    level: drill === "digits" ? 1 : 3,
  });
  return generated.items.map((item) => item.text).join(" ");
}

/** The default drill, and the one a first visitor sees. */
export const DEFAULT_NUMBER_DRILL: NumberDrill = "digits";
