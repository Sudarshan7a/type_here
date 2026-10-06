/**
 * RealType typing engine (open-core, MIT) — the language-pack model (PRG-02).
 *
 * PRG-01 (`../language-profiles.ts`) made language support DATA: a profile carries
 * its keywords, comment syntax, string descriptors and number rules, and the lexer
 * in `../token-map.ts` is one function that consumes a profile. This module is the
 * layer on top of that: it declares the six packs ADR-007 settled on, adds the
 * three fields the PRG-01 model could not express, and gives the pack layer its own
 * resolution rule so an unknown language id degrades predictably.
 *
 * WHAT WAS ADDED TO THE MODEL, AND WHY (the full argument with the diffs the
 * lexer still needs is in docs/profiles/prg02-language-packs.md):
 *
 *  1. `stringPrefixes` — Python writes `r"…"` and `b"…"`; the prefix is part of the
 *     literal. PRG-01's `StringProfile.open` could encode `r"` by hand but not the
 *     whole family (`rb`, `br`, `fr`), and a profile that hand-listed every
 *     combination would be a combinatorial mess that no reviewer could check. One
 *     field, N letters: the class it names is still Class 4 (quote-context work).
 *  2. `identifierGlue` — CSS writes `font-size` and HTML writes `data-id`; the
 *     hyphen CONTINUES an identifier. PRG-01's `identifierExtra` answers a
 *     different question (which characters may START one, as `$` does in JS), and
 *     reusing it for `-` would turn every spaced `-` into a Class 7 identifier.
 *     Separating "may start" from "may continue" is what makes the field honest.
 *  3. `markupScan` — HTML is not a token stream, it is a tree: a tag, its
 *     attributes and its text node are different kinds of character, and a
 *     `<style>`/`<script>` body is a different language entirely. No set of
 *     keyword lists and delimiters can express that, so the pack declares the
 *     region boundaries and the lexer scans region by region.
 *
 * NOT ADDED, deliberately: nothing language-specific. `#` stays `hashMeaning`
 * (PRG-01), interpolation stays a flag on the string descriptor, and no field
 * names a language. A pack is data; the lexer never learns a name.
 *
 * Purity: this module has no imports outside the engine's own types, no clock, no
 * randomness and no I/O. `packages/engine/tests/profiles/` asserts that by scanning
 * this directory's source, not by trusting it.
 */
import type { LanguageProfile, StringProfile } from "../language-profiles.js";

/**
 * Letters that may precede a string delimiter and stay part of the literal.
 * `r` covers Python's `r"…"`, `u` its `u"…"`, `b` its byte literals, `f` its
 * formatted literals; `fR` covers `fR"…"` without listing the permutation.
 */
export interface StringPrefixProfile {
  /** The letters, in the order the language spells them (`"r"`, `"fR"`). */
  readonly letters: string;
  /**
   * What the body does with its own braces/dollar signs. `false` for every Python
   * prefix today: an f-string's `{name}` is evaluated by the language, and a lexer
   * that claimed otherwise would split one Class 4 literal into spans it cannot
   * justify. §9.3.1's rule — everything inside a string literal is Class 4 —
   * holds either way.
   */
  readonly interpolation: boolean;
}

/**
 * The regions a markup language has. Class 4 (quoted attribute values) and Class 9
 * (whitespace) keep their classes inside a tag; tag punctuation and text nodes
 * become Class 12 (Data & markup, per §7.1's "HTML tags"), and an embedded
 * element's body switches to another pack's rules entirely.
 */
export interface MarkupScanProfile {
  readonly tagOpen: string;
  readonly tagClose: string;
  /**
   * Attribute or content language per element name, lower-cased
   * (`{ style: "css", script: "javascript" }`). A body in a language with no pack
   * falls back to this pack's rules, which is why the map is keyed by pack id.
   */
  readonly embedded: Readonly<Record<string, string>>;
}

/**
 * A language pack: PRG-01's `LanguageProfile` plus the three optional fields above.
 *
 * Every optional field is also a promise — "when this pack is loaded, this is how
 * the lexer treats it" — so {@link unconsumedExtensions} reports the fields the
 * current lexer does not read. A pack that declared a field nobody honours would
 * be a silent lie, and the gate in tests/profiles asserts the lie is declared
 * rather than hidden.
 */
export interface LanguagePack extends LanguageProfile {
  readonly stringPrefixes?: readonly StringPrefixProfile[];
  readonly markupScan?: MarkupScanProfile;
  readonly identifierGlue?: string;
}

/** The three fields PRG-02 adds. Named as a union so the gate can enumerate them. */
export type PackExtensionField = "stringPrefixes" | "markupScan" | "identifierGlue";

export interface PackExtension {
  readonly field: PackExtensionField;
  /** One line: the language construct that forced the field into existence. */
  readonly why: string;
  /** Exactly what the lexer must do for the field to change any class. */
  readonly lexerRequirement: string;
  /**
   * Whether `packages/engine/src/token-map.ts` honours the field today. `false`
   * means the pack ships with the construct classified by the fallback path, which
   * is reported in the doc and pinned by a test — never left implicit.
   */
  readonly honouredByLexer: boolean;
  /** Every pack that declares the field, for the doc and the gate to cross-check. */
  readonly declaredBy: readonly string[];
}

export const PACK_EXTENSIONS: readonly PackExtension[] = [
  {
    field: "stringPrefixes",
    why: "Python spells raw (r), byte (b), unicode (u) and formatted (f) literals as a prefix.",
    lexerRequirement:
      "In tryString, before matching a delimiter, accept a prefix whose letters are all " +
      "listed in the matched spec; emit the prefix characters as Class 4 with the literal.",
    honouredByLexer: false,
    declaredBy: ["python"],
  },
  {
    field: "identifierGlue",
    why: "CSS writes margin-top and HTML writes data-id: the hyphen continues a name.",
    lexerRequirement:
      "In isIdentPart, accept any character in identifierGlue. Deliberately NOT in " +
      "isIdentStart, so a spaced `a - b` keeps Class 2 rather than becoming Class 7.",
    honouredByLexer: false,
    declaredBy: ["css", "html"],
  },
  {
    field: "markupScan",
    why: "HTML is a tree: a tag, an attribute value and a text node are different kinds of character, and <style>/<script> bodies are another language.",
    lexerRequirement:
      "In scanCodeToken, when the current position is a tagOpen and markupScan is set, scan the " +
      "tag to tagClose as Class 12 (attribute values keep Class 4) and switch to the pack named " +
      "by markupScan.embedded for an embedded element's body.",
    honouredByLexer: false,
    declaredBy: ["html"],
  },
];

/** The extension a pack declares but the lexer does not read, in field order. */
export function unconsumedExtensions(pack: LanguagePack): readonly PackExtensionField[] {
  return PACK_EXTENSIONS.filter(
    (ext) => ext.honouredByLexer === false && pack[ext.field] !== undefined,
  ).map((ext) => ext.field);
}

/** The extension record for a field; throws on an unknown name so a typo cannot hide. */
export function extensionFor(field: PackExtensionField): PackExtension {
  const ext = PACK_EXTENSIONS.find((candidate) => candidate.field === field);
  if (ext === undefined) throw new Error(`unknown pack extension: ${field}`);
  return ext;
}

/**
 * A stable string of everything that can change a classification, for "is this pack
 * a copy of that one?". Sorted and joined so two structurally identical packs
 * produce the same fingerprint whatever order their sets were built in.
 */
export function packFingerprint(pack: LanguagePack): string {
  const sorted = (values: ReadonlySet<string>): string => [...values].sort().join(",");
  const strings = pack.strings
    .map(
      (spec: StringProfile) =>
        `${spec.open}~${spec.close}~${spec.escapes ? 1 : 0}~${spec.interpolation ? 1 : 0}~` +
        `${spec.multiline ? 1 : 0}`,
    )
    .sort()
    .join(" ");
  const prefixes = (pack.stringPrefixes ?? [])
    .map((prefix) => `${prefix.letters}:${prefix.interpolation ? 1 : 0}`)
    .sort()
    .join(" ");
  return [
    `line=${[...pack.lineComments].sort().join(",")}`,
    `block=${pack.blockComments
      .map((b) => `${b.open}~${b.close}`)
      .sort()
      .join(",")}`,
    `strings=${strings}`,
    `prefixes=${prefixes}`,
    `keywords=${sorted(pack.keywords)}`,
    `literals=${sorted(pack.literals)}`,
    `chords=${[...pack.chords].sort().join(",")}`,
    `operators=${[...pack.operators].sort().join(",")}`,
    `brackets=${[...pack.brackets].sort().join(",")}`,
    `regex=${pack.regexLiteral ? 1 : 0}`,
    `radix=${[...pack.numberPrefixes].sort().join(",")}`,
    `separator=${pack.digitSeparator}`,
    `hash=${pack.hashMeaning}`,
    `identExtra=${pack.identifierExtra}`,
    `identGlue=${pack.identifierGlue ?? ""}`,
    `markup=${pack.markupScan ? `${pack.markupScan.tagOpen}~${pack.markupScan.tagClose}` : ""}`,
    `embed=${pack.markupScan ? Object.keys(pack.markupScan.embedded).sort().join(",") : ""}`,
  ].join("|");
}

const MULTI_CHAR = /^\S{2,}$/u;
const SINGLE_CHAR = /^\S$/u;
const PACK_ID = /^[a-z][a-z0-9-]*$/u;
const RADIX_SHAPE = /^[0-9a-z]+$/u;
const LOWER_LETTERS = /^[a-z]+$/u;
const IDENT_START = /[\p{L}_]/u;

/**
 * Structural problems with a pack. The gate asserts this list is empty for all six,
 * because a pack that fails here misclassifies in a way nobody notices until a
 * drill's per-class numbers disagree with the snippet. Returns human-readable
 * strings rather than throwing, so a gate that fails reports every fault at once.
 *
 * What is deliberately NOT checked, and why:
 *  - A token appearing in two of the profile's lists (`<` is both a bracket and an
 *    operator in JavaScript, `===` both a chord and an operator in the generic
 *    profile). Those are redundant entries, never wrong classes: the lexer tries
 *    comments, then strings, then numbers, then chords, then multi-character
 *    operators, then brackets, then single-character operators, and each tier wins
 *    outright. PRG-01 shipped two of them and PRG-02 does not rewrite PRG-01's
 *    profiles. See docs/profiles/prg02-language-packs.md §8.
 *  - `operators` entry length. Multi-character operators ARE honoured (the lexer
 *    matches them before brackets), which is how PRG-01's Python `//` and `**`
 *    work.
 *  - A word in both `keywords` and `literals`. `tryWord` ORs the two sets and both
 *    paths yield Class 8, so the duplicate is redundant rather than wrong — and
 *    PRG-01's generic profile ships exactly that for `true`/`false`/`null`.
 */
export function validatePack(pack: LanguagePack): readonly string[] {
  const issues: string[] = [];

  if (!PACK_ID.test(pack.id)) issues.push(`${pack.id}: id must be one lower-case token`);
  if (pack.label.trim().length === 0) issues.push(`${pack.id}: label must not be empty`);

  // Every language has a comment form, and `hashMeaning: "comment"` is one of them
  // (Python's `#`), so a pack with no comment list must still say so via the hash.
  const hasCommentForm =
    pack.lineComments.length > 0 ||
    pack.blockComments.length > 0 ||
    pack.hashMeaning === "comment" ||
    pack.markupScan !== undefined;
  if (!hasCommentForm) issues.push(`${pack.id}: no comment form at all`);

  for (const opener of pack.lineComments) {
    if (!MULTI_CHAR.test(opener))
      issues.push(`${pack.id}: line comment ${opener} must be 2+ chars`);
  }
  for (const block of pack.blockComments) {
    if (!MULTI_CHAR.test(block.open)) {
      issues.push(`${pack.id}: block comment open ${block.open} must be 2+ chars`);
    }
    if (block.close.length === 0) {
      issues.push(`${pack.id}: block comment ${block.open} has no close`);
    }
  }

  if (pack.strings.length === 0) issues.push(`${pack.id}: no string descriptor`);
  for (const spec of pack.strings) {
    if (spec.open.length === 0 || spec.close.length === 0) {
      issues.push(`${pack.id}: a string delimiter must be non-empty`);
    }
    if (spec.interpolation && !spec.multiline) {
      issues.push(`${pack.id}: ${spec.open} claims interpolation without multiline`);
    }
  }

  if (pack.digitSeparator.length > 1) {
    issues.push(`${pack.id}: digitSeparator must be empty or one character`);
  }
  for (const radix of pack.numberPrefixes) {
    if (!RADIX_SHAPE.test(radix))
      issues.push(`${pack.id}: radix prefix ${radix} must be lower-case a-z or a digit`);
    if (radix.length !== 2) issues.push(`${pack.id}: radix prefix ${radix} must be 2 characters`);
  }

  // `chords` are matched before any operator and `brackets` are matched one
  // character at a time, so a single-character chord and a multi-character bracket
  // are both unreachable. Catching them at authoring time stops the mistake here
  // rather than in a per-class analytics discrepancy months later.
  for (const chord of pack.chords) {
    if (!MULTI_CHAR.test(chord)) issues.push(`${pack.id}: chord ${chord} must be 2+ characters`);
  }
  for (const bracket of pack.brackets) {
    if (!SINGLE_CHAR.test(bracket))
      issues.push(`${pack.id}: bracket ${bracket} must be one character`);
  }

  // Every declared word must be spellable by the profile's own identifier rules,
  // otherwise the lexer can never classify it and the keyword set is decoration.
  // `identifierGlue` is excluded on purpose: glue CONTINUES a name, it cannot
  // start one.
  const startable = (word: string): boolean =>
    IDENT_START.test(word[0] ?? "") || pack.identifierExtra.includes(word[0] ?? "");
  for (const word of [...pack.keywords, ...pack.literals]) {
    if (!startable(word)) issues.push(`${pack.id}: ${word} cannot be lexed as an identifier`);
  }

  const seenPrefixes = new Set<string>();
  for (const prefix of pack.stringPrefixes ?? []) {
    if (!LOWER_LETTERS.test(prefix.letters)) {
      issues.push(`${pack.id}: string prefix ${prefix.letters} must be lower-case a-z only`);
    }
    if (seenPrefixes.has(prefix.letters))
      issues.push(`${pack.id}: prefix ${prefix.letters} declared twice`);
    seenPrefixes.add(prefix.letters);
    // The lexer tries comments before strings, so a prefix that can also open a
    // comment would be unreachable — `r/*` would be a comment in every profile.
    if (pack.lineComments.includes(prefix.letters)) {
      issues.push(`${pack.id}: prefix ${prefix.letters} is also a line comment opener`);
    }
  }
  if (pack.identifierGlue !== undefined && pack.identifierGlue.length > 2) {
    issues.push(`${pack.id}: identifierGlue must be at most two characters`);
  }
  if (pack.markupScan && (pack.markupScan.tagOpen === "" || pack.markupScan.tagClose === "")) {
    issues.push(`${pack.id}: markupScan needs both a tagOpen and a tagClose`);
  }
  return issues;
}
