/**
 * Self-verification: run generated text through the engine's own token map.
 *
 * WHY THE GENERATORS IMPORT THE ENGINE. The token classes are a scoring decision that
 * lives in one place by rule (AGENTS.md rule 3), so a generator that grew its own
 * private idea of "what is a number token" would be a second source of truth for the
 * same concept - and the drift would only show up as a wrong ANA-05 dashboard. Instead
 * of re-lexing anything, this module calls `tokenize` and `tokenClassCounts` and
 * reports what the *authoritative* lexer made of the output.
 *
 * WHAT IT IS GOOD FOR, AND WHAT IT IS NOT:
 *
 *  - It proves generated text is classifiable: `diagnostics` empty means no
 *    unterminated string, no unterminated template, no character no profile
 *    recognises. A "hasError"-equivalent for a lexical map, and the invariant the
 *    tests assert for every item in every family.
 *  - It reports the class mix, which is the difficulty parameter the skill asks to be
 *    recorded (a hex item should be one `number-system` token, a `0x` -free decimal
 *    should be one `number` token).
 *  - It is NOT a correctness oracle for IDs. §7.1's class 6 note (in the engine's
 *    token-map.ts) is explicit that UUID/SHA/IP/ISO/semver detection is multi-token
 *    pattern work belonging to PRG-13 / CNT-05 and is deliberately absent from the
 *    lexer, so `ids/uuid` legitimately tokenizes as several number and identifier
 *    spans. Closing that gap means a change to packages/engine/src, which this task
 *    does not own; it is recorded as deferred rather than worked around here.
 */

import type { TokenClassCounts, TokenMapDiagnosticCode } from "@realtype/engine";
import { tokenClassCounts, tokenize } from "@realtype/engine";

import type { GeneratedItem, GeneratedSet } from "./types.js";

export interface ItemClassification {
  readonly language: string;
  /** True when the lexer reported no diagnostics at all. */
  readonly clean: boolean;
  readonly diagnostics: readonly TokenMapDiagnosticCode[];
  readonly counts: TokenClassCounts;
}

/** Classify one generated item with the language profile recorded on the item. */
export function classifyItem(item: GeneratedItem): ItemClassification {
  const map = tokenize(item.text, item.language);
  const diagnostics = map.diagnostics.map((diagnostic) => diagnostic.code);
  return {
    language: map.language,
    clean: diagnostics.length === 0,
    diagnostics,
    counts: tokenClassCounts(map),
  };
}

/** Classify a whole set, preserving order so a failure names the item that failed. */
export function classifySet(set: GeneratedSet): readonly ItemClassification[] {
  return set.items.map(classifyItem);
}

/**
 * Items in the set whose text the authoritative lexer could not classify cleanly.
 * Shaped as a report rather than a throw: the content pipeline (CNT-01) wants a list
 * to reject, and a test wants a list to assert is empty.
 */
export function uncleanItems(set: GeneratedSet): readonly GeneratedItem[] {
  return set.items.filter((item) => !classifyItem(item).clean);
}
