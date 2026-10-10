import { alignText, type AlignmentResult, type ErrorKind } from "@realtype/engine";
/**
 * Learn from errors (LRN-05): what the visitor actually typed, where they
 * typed it, and what it should have been.
 *
 * The engine already classifies every difference (`alignText`): a
 * substitution, an omission, an insertion, or a transposition of two adjacent
 * characters — the distinction that separates "I do not know this key" from
 * "I know both keys and get them out of order". This module is the READ side:
 * it folds a finished attempt into the confusions a person can look at.
 *
 * Nothing here re-implements a metric (AGENTS.md rule 3). The counts are the
 * engine's, and this module only groups and orders them.
 */

/**
 * The engine's error kinds, minus `correct` — a confusion is by definition a
 * mistake, so the union here is the four that can be one. Declared here rather
 * than inline so `Confusion.kind` can be indexed without a cast, and so a fifth
 * engine kind shows up as a type error rather than a silently blank label.
 */
export type MistakeKind = Exclude<ErrorKind, "correct">;

/** One confusion: what was intended, what was typed, and how often. */
export interface Confusion {
  /** The intended character, e.g. `e`. For a transposition, the intended pair. */
  readonly intended: string;
  /** What was typed instead, or null when the character was skipped. */
  readonly typed: string | null;
  /** How many times it happened in the attempt. */
  readonly count: number;
  /** Where it first happened, so the list can point at the passage. */
  readonly position: number;
  /**
   * The engine's classification. `transposition` is the one a visitor cares
   * about most, because its fix is a sequencing drill rather than a key drill.
   */
  readonly kind: MistakeKind;
}

export interface ConfusionReport {
  /** Ordered by count, then by position, so the worst offender is first. */
  readonly confusions: readonly Confusion[];
  /** The engine's total count of scoring errors, for context. */
  readonly totalErrors: number;
}

/**
 * Fold one attempt into confusions.
 *
 * An attempt with no errors returns an empty list rather than a placeholder —
 * a screen that says "you confused nothing" is a screen nobody needs to see,
 * and the results panel already reports a clean run.
 */
export function confusionsFromAttempt(target: string, typed: string): ConfusionReport {
  const alignment: AlignmentResult = alignText(target, typed);
  const merged = new Map<string, Confusion>();

  const add = (
    intended: string,
    typed: string | null,
    position: number,
    kind: MistakeKind,
  ): void => {
    // The typed value is part of the key: typing `d` for `e` and typing `r`
    // for `e` are different confusions with different fixes.
    const key = `${kind}:${intended}->${typed ?? ""}`;
    const existing = merged.get(key);
    if (existing === undefined) {
      merged.set(key, { intended, typed, count: 1, position, kind });
      return;
    }
    merged.set(key, {
      ...existing,
      count: existing.count + 1,
      // The FIRST position is the one kept: it is where the pattern started.
      position: Math.min(existing.position, position),
    });
  };
  for (const s of alignment.substitutions) add(s.intended, s.typed, s.position, "substitution");
  for (const t of alignment.transpositions)
    // The engine's own record for a swap is `intended`/`typed` as the two
    // characters in TARGET order (eng-alignment.test.ts pins "he->eh" for
    // target "the" typed "teh"). That is exactly the pair a sequencing drill
    // has to practise, so it is carried as-is.
    add(t.intended, t.typed, t.position, "transposition");
  for (const o of alignment.omissions) add(o.expected, null, o.position, "omission");
  for (const i of alignment.insertions) add("", i.typed, i.index, "insertion");
  const confusions = [...merged.values()].sort(
    (a, b) => b.count - a.count || a.position - b.position,
  );

  const totalErrors =
    alignment.substitutions.length +
    alignment.transpositions.length +
    alignment.omissions.length +
    alignment.insertions.length;

  return { confusions, totalErrors };
}

/**
 * The confusions worth showing: the ones that happened more than once, or that
 * were a transposition.
 *
 * A single mistyped character in a 300-character passage is noise. The rule is
 * deliberately simple and named here, rather than being a threshold a designer
 * has to reverse-engineer from a mock.
 */
export const REPEAT_THRESHOLD = 2;

export function notableConfusions(report: ConfusionReport): readonly Confusion[] {
  return report.confusions.filter((c) => c.count >= REPEAT_THRESHOLD || c.kind === "transposition");
}

/**
 * A drill that fixes one confusion.
 *
 * Text, not a generated exercise. It drills the character the visitor MEANT,
 * and for a substitution it pairs it with the one they typed instead — because
 * the discrimination between the two IS the skill, and practising only the
 * correct one teaches nothing about telling them apart.
 *
 * Pure and deterministic: the same confusion always drills the same text.
 */
export function drillTextFor(confusion: Confusion, rounds = 3): string {
  // An omission has nothing typed in its place, so the intended character is
  // the whole of the drill.
  const intended = confusion.intended !== "" ? confusion.intended : "x";
  const pair =
    confusion.kind === "substitution" && confusion.typed !== null && confusion.typed !== ""
      ? `${intended}${confusion.typed}`
      : intended;
  return Array.from({ length: rounds }, () => pair).join(" ");
}
