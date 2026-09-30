/**
 * RealType typing engine (open-core, MIT) — alignment and error
 * classification (D2), implementing §4.11 of
 * docs/chapter-4-deep-dive-typing-engine-part2.md.
 *
 * Given the target text and the final buffer the user produced, classify each
 * difference as a substitution, omission, insertion, or transposition. The
 * weakness model (Chapter 8) is built entirely on this output, so the
 * substitution-vs-transposition rule is stated explicitly rather than left to
 * implementation taste:
 *
 *   Two adjacent positions are BOTH wrong, and the typed characters at those
 *   positions are exactly the intended characters swapped -> ONE transposition
 *   event, not two substitutions. It is analytically more useful (the problem
 *   is finger sequencing, not two unknown letters) and transpositions have a
 *   distinct, well-documented cause in typing research.
 */

export type ErrorKind = "correct" | "substitution" | "transposition" | "omission" | "insertion";

export interface Substitution {
  position: number;
  intended: string;
  typed: string;
}
export interface Transposition {
  position: number;
  intended: string;
  typed: string;
  /** The two intended characters, in target order. */
  pair: string;
}
export interface Omission {
  position: number;
  expected: string;
}
export interface Insertion {
  /** Index in the typed text. */
  index: number;
  typed: string;
}

export interface AlignmentResult {
  correctChars: number;
  finalAccuracy: number;
  substitutions: Substitution[];
  transpositions: Transposition[];
  omissions: Omission[];
  insertions: Insertion[];
  /** Per-target-position classification, for the confusion matrix. */
  ops: { position: number; kind: ErrorKind; intended: string; typed: string }[];
}

/**
 * Levenshtein-style alignment with a transposition pair rule, specialised for
 * typing: substitutions cost 1, insertions/omissions cost 1, and a swap of two
 * adjacent characters costs 1 (a single transposition event).
 */
export function alignText(target: string, typed: string): AlignmentResult {
  const m = target.length;
  const n = typed.length;
  // dp[i][j] = cost of aligning target[0..i) with typed[0..j)
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  // trace[i][j] = how we got here: 0 sub, 1 insert, 2 omit, 3 transpose
  const trace: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 1; i <= m; i++) trace[i]![0] = 2;
  for (let j = 1; j <= n; j++) trace[0]![j] = 1;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const options: { cost: number; op: number }[] = [
        { cost: dp[i - 1]![j - 1]! + (target[i - 1] === typed[j - 1] ? 0 : 1), op: 0 },
        { cost: dp[i]![j - 1]! + 1, op: 1 },
        { cost: dp[i - 1]![j]! + 1, op: 2 },
      ];
      if (
        i >= 2 &&
        j >= 2 &&
        target[i - 1] === typed[j - 2] &&
        target[i - 2] === typed[j - 1] &&
        dp[i - 2]![j - 2]! + 1 < options[0]!.cost
      ) {
        options.push({ cost: dp[i - 2]![j - 2]! + 1, op: 3 });
      }
      let best = options[0]!;
      for (const option of options) {
        if (option.cost < best.cost) best = option;
      }
      dp[i]![j] = best.cost;
      trace[i]![j] = best.op;
    }
  }

  const ops: AlignmentResult["ops"] = [];
  const substitutions: Substitution[] = [];
  const transpositions: Transposition[] = [];
  const omissions: Omission[] = [];
  const insertions: Insertion[] = [];
  let correctChars = 0;

  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    const op = i === 0 ? 1 : j === 0 ? 2 : trace[i]![j]!;
    if (op === 0) {
      const intended = target[i - 1]!;
      const got = typed[j - 1]!;
      if (intended === got) {
        correctChars += 1;
        ops.push({ position: i - 1, kind: "correct", intended, typed: got });
      } else {
        substitutions.push({ position: i - 1, intended, typed: got });
        ops.push({ position: i - 1, kind: "substitution", intended, typed: got });
      }
      i -= 1;
      j -= 1;
    } else if (op === 1) {
      insertions.push({ index: j - 1, typed: typed[j - 1]! });
      ops.push({ position: i, kind: "insertion", intended: "", typed: typed[j - 1]! });
      j -= 1;
    } else if (op === 2) {
      omissions.push({ position: i - 1, expected: target[i - 1]! });
      ops.push({ position: i - 1, kind: "omission", intended: target[i - 1]!, typed: "" });
      i -= 1;
    } else {
      // Transposition: target[i-2],target[i-1] typed as typed[j-2],typed[j-1] swapped.
      const firstIntended = target[i - 2]!;
      const secondIntended = target[i - 1]!;
      transpositions.push({
        position: i - 2,
        intended: `${firstIntended}${secondIntended}`,
        typed: `${typed[j - 2]!}${typed[j - 1]!}`,
        pair: `${firstIntended}${secondIntended}`,
      });
      ops.push({
        position: i - 2,
        kind: "transposition",
        intended: `${firstIntended}${secondIntended}`,
        typed: `${typed[j - 2]!}${typed[j - 1]!}`,
      });
      i -= 2;
      j -= 2;
    }
  }

  ops.reverse();
  // The backtrack walks the alignment right-to-left, so every collection is
  // in reverse document order. Report them left-to-right, which is what the
  // fixtures (and the confusion matrix) expect.
  const byPosition = (a: { position: number }, b: { position: number }): number =>
    a.position - b.position;
  substitutions.sort(byPosition);
  transpositions.sort(byPosition);
  omissions.sort(byPosition);
  insertions.sort((a, b) => a.index - b.index);
  return {
    correctChars,
    finalAccuracy: m === 0 ? 0 : (correctChars / m) * 100,
    substitutions,
    transpositions,
    omissions,
    insertions,
    ops,
  };
}
