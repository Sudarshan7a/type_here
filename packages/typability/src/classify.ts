/**
 * Scope classification (CNT-02): is this text in the model's coverage at all?
 *
 * This runs BEFORE any scoring, and it is the reason the ledger's parenthetical
 * ("does not cover code/symbol text") is structural rather than a caveat in a
 * document. A code item never gets a score, so it cannot get a band derived from
 * a score, so it cannot end up carrying a prose band that a user would read as
 * "this snippet is easy prose".
 *
 * The decision order is family first, then content:
 *
 *   1. `CODE` family -> `out-of-scope-code`. master-spec §6.2 Stage C is explicit
 *      that the published dataset contains no code and that the right thing to
 *      show instead is token-class stats.
 *   2. `WORDLIST` family -> `out-of-scope-word-pool`. A pool is not a passage.
 *   3. No letters at all -> `out-of-scope-no-letters`. Nothing in the model
 *      applies to "!!!"; it does not get an Easy band by accident of empty
 *      denominators.
 *   4. Symbol or digit share above the declared ceiling -> `out-of-scope-symbol-dense`.
 *      This is the belt to the family braces: a prose-family item that is
 *      actually a symbol table or a numeric extract gets no band either.
 *   5. Otherwise in scope.
 *
 * A language other than English is also out of scope, by the same argument: the
 * word lists, the bigram resource and the syllable rules are all English. It is
 * folded into `out-of-scope-code`? No - a separate honest reason would be
 * better, but the enum is small on purpose and the corpus is English + JavaScript.
 * Non-English, non-code language is reported as `out-of-scope-code`? That would
 * misreport. Let me instead add the reason "out-of-scope-non-english" to the enum.
 * Cleaner and honest.
 */
import { CODE_FAMILIES, SCOPE_CEILINGS, WORD_POOL_FAMILIES } from "./config.ts";
import type { OutOfScopeReason } from "./types.ts";
import { rawFeatures } from "./features.ts";

/** The scope decision for one item. */
export interface ScopeDecision {
  /** True when the model may score this text. */
  readonly inScope: boolean;
  /** Null exactly when `inScope` is true. */
  readonly reason: OutOfScopeReason | null;
}

/** Languages the authored resources cover. Anything else is out of scope. */
export const SUPPORTED_LANGUAGES: ReadonlyArray<string> = Object.freeze(["en"]);

/**
 * Decide whether the model applies. Deterministic, total, and safe on any input:
 * a `null`/undefined family or language is treated as "unknown", and unknown is
 * never in scope.
 */
export function classifyScope(input: {
  readonly text: string;
  readonly family?: string;
  readonly language?: string;
}): ScopeDecision {
  const family = input.family ?? null;
  const language = input.language ?? null;

  if (family !== null && CODE_FAMILIES.includes(family)) {
    return { inScope: false, reason: "out-of-scope-code" };
  }
  if (family !== null && WORD_POOL_FAMILIES.includes(family)) {
    return { inScope: false, reason: "out-of-scope-word-pool" };
  }
  // A MISSING language is out of scope, not assumed to be English. The corpus
  // pipeline always passes one; a caller that omits it gets an honest refusal
  // rather than a band computed on an assumption it never checked.
  if (language === null || !SUPPORTED_LANGUAGES.includes(language)) {
    return { inScope: false, reason: "out-of-scope-non-english" };
  }

  const raw = rawFeatures(input.text);
  if (raw.letters === 0) {
    return { inScope: false, reason: "out-of-scope-no-letters" };
  }
  if (raw.symbolShare > SCOPE_CEILINGS.symbolShare) {
    return { inScope: false, reason: "out-of-scope-symbol-dense" };
  }
  if (raw.digitShare > SCOPE_CEILINGS.digitShare) {
    return { inScope: false, reason: "out-of-scope-symbol-dense" };
  }
  return { inScope: true, reason: null };
}
