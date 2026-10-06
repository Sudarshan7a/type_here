/**
 * RealType typing engine (open-core, MIT) — the token map (PRG-01, M5-02).
 *
 * Contract: {@link tokenize} turns a snippet into an ordered list of spans that
 * **tile the text exactly** — every character in exactly one span, no gaps, no
 * overlaps (D-M5-2). The invariant is asserted on construction and re-checkable
 * with {@link validateTokenMap}, because a map that skips whitespace or
 * double-counts an unterminated string would silently corrupt every per-class
 * statistic built on top of it (ANA-05).
 *
 * Why a hand-written lexer and not Tree-sitter here: this package must stay
 * DOM-free and Node-runnable (the server recompute is authoritative), and a
 * grammar runtime is ~112 KB gzip plus 55–80 KB per grammar — impossible to put
 * in this module's import graph. So the split is:
 *   - this file: the always-available lexical map, pure TS, no dependencies.
 *   - ./grammar-refine.ts: an optional refinement seam that takes an
 *     asynchronously-loaded grammar and upgrades the map where the grammar knows
 *     more. The engine never imports a grammar; the caller supplies the loader.
 * This is also M5-02's documented fallback path ("if a grammar can't load at
 * runtime, use the stored token map"), which means the lexical map is not a
 * degraded mode — it is the mode every other consumer already depends on.
 *
 * PRECEDENCE RULES (master spec §7.2 / impl guide §10.2 require these to be
 * stated and tested; each is a named test below):
 *
 *  1. Comments before everything. `//` and `/*` are matched before any operator,
 *     so `a // b` is a comment in JavaScript and `a // b` is floor division in
 *     Python purely by profile. A `>=` inside a comment is never an operator
 *     (§9.3.3).
 *  2. Strings are opaque. Every character between the delimiters is Class 4,
 *     including digits (§9.3.1) and characters that would otherwise be comment
 *     or template openers. A string ends at its closing delimiter or, for a
 *     single-line delimiter, at the newline — an unterminated string never eats
 *     the rest of the file.
 *  3. Template interpolation: `${` and its matching `}` are Class 4 (the
 *     interpolation markers §7.1 lists under Class 4); the expression between
 *     them gets its own real classes, because `x` in `${x}` is an identifier
 *     and drills on identifier fluency should count it.
 *  4. Numbers before identifiers, so `0xff` is one Class 6 token rather than
 *     `0` + identifier `xff`. Radix-prefixed literals are Class 6; plain
 *     decimals (including sign and separators) are Class 5.
 *  5. Keywords are a property of position, not spelling (§9.3.2). A word after
 *     `.` or `?.` is an identifier even when it is also a reserved word, so
 *     `obj.class` is Class 7 + Class 7 + Class 2, never Class 8.
 *  6. Multi-character operators are matched longest-first and split into two
 *     classes: the D-M5-3 family (`=>` `?.` `??` `...` `+=` `===` …) is Class 3,
 *     everything else (`>=` `==` `&&` `<<`) is Class 2. Both are a SINGLE span,
 *     which is the property chord-internal timing (§9.3.4) actually needs.
 *  7. Angle brackets are Class 1 in C-like languages (per §7.1's `() [] {} <>`)
 *     and Class 2 in Python, because `a<b>c` is two comparisons there.
 *  8. Class 2 also carries separator punctuation (`,` `;` `:` `.`): §7.1 has no
 *     punctuation class, and inventing a thirteenth class would silently break
 *     the dashboard's grouping.
 *
 * REGEX vs DIVISION (the classic `/` ambiguity, resolved by one rule):
 *
 *   `/` begins a regex literal IFF the previous significant token cannot end an
 *   expression value. Expression-ending tokens are: identifier, number,
 *   number-system, string, regex literal, a closing bracket `)` `]` `}`, the
 *   value-like keywords (`this` `true` `null` `super` …), and the postfix
 *   chords `++` `--`. In every other position — start of input, after `(`, after
 *   an operator, after `=`/`,`/`return`/`=>` — `/` is division.
 *
 *   Two guards keep the rule from misfiring on damaged or partial content:
 *   - A regex must terminate before the newline. `/ 3` and an unfinished `/` fall
 *     back to division, because a snippet being typed is often mid-expression
 *     and an unterminated regex would otherwise swallow the rest of the line.
 *   - `[...]` character classes and backslash escapes are consumed whole, so
 *     `/[/]/ ` and `/a\//b/` terminate at the right slash.
 *
 *   Known limitation, accepted deliberately: after `}` a regex is read as
 *   division (`if (a) {}/x/.test(s)`). Block ends are far more often followed by
 *   arithmetic in training content than by a regex, and no lexer-only rule can
 *   tell a block from an object literal. A grammar refinement fixes it, which
 *   is what the seam in ./grammar-refine.ts is for.
 *
 * Pure, deterministic, no DOM, no I/O, no regex on the input beyond character
 * classes. Safe to run in Node (server recompute) and in the browser.
 */
import type { LanguageProfile, StringProfile } from "./language-profiles.js";
import { EXPRESSION_KEYWORDS, languageProfile } from "./language-profiles.js";
import type { TokenClass } from "./token-class.js";
import { TOKEN_CLASSES } from "./token-class.js";

/**
 * Version of the classification rules above. Stored with every token map
 * (D-M5-2: "store the language and grammar version used") so a stored map can be
 * re-tokenized when the rules change.
 *
 * 1.1.0 — a closer longer than one character is now matched as a whole. Before
 * this, `tryString` compared a single character against the entire closer, so
 * Java text blocks (`"""`) and Python docstrings (`'''`) never terminated and
 * swallowed the remainder of the snippet. Only languages declaring a
 * multi-character closer are affected; every single-character closer
 * classifies identically, so no existing stored map changes.
 */
export const TOKENIZER_VERSION = "1.1.0";

export type TokenMapDiagnosticCode =
  /** A string literal hit end of line or end of text without its delimiter. */
  | "unterminated-string"
  /** A block comment reached end of text without its close delimiter. */
  | "unterminated-block-comment"
  /** A template literal reached end of text without its closing backtick. */
  | "unterminated-template"
  /**
   * A character the profile recognises in no category (an emoji, a currency
   * symbol). Classed as `data` so the map still tiles, and reported so the
   * content pipeline can see that the snippet contains characters no drill
   * covers — never silently absorbed.
   */
  | "unrecognized-character";

export interface TokenMapDiagnostic {
  readonly code: TokenMapDiagnosticCode;
  /** Index of the first character of the offending token. */
  readonly index: number;
  /** The offending text, truncated to keep a diagnostic cheap to store. */
  readonly text: string;
}

/**
 * One classified run of characters.
 *
 * `index` and `length` are UTF-16 code-unit offsets, i.e. plain JavaScript
 * string indexing — NOT grapheme indices. The engine's typing model counts
 * user-perceived characters (`segmentGraphemes`), so a consumer mapping a
 * keystroke to a token must convert: grapheme index → code-unit offset. The
 * distinction only bites for astral characters (emoji), where one grapheme is two
 * code units and therefore two adjacent spans; for the ASCII that code snippets
 * are made of the two coincide.
 */
export interface TokenSpan {
  readonly index: number;
  readonly length: number;
  readonly class: TokenClass;
}

export interface TokenMap {
  readonly text: string;
  readonly length: number;
  readonly language: string;
  readonly tokenizerVersion: string;
  /** `grammar` once a real parser has refined this map (see grammar-refine.ts). */
  readonly source: "lexical" | "grammar";
  readonly grammarVersion: string | null;
  /** The parser reported error nodes. The map is still usable (Tree-sitter is error-tolerant). */
  readonly hasGrammarError: boolean;
  readonly spans: readonly TokenSpan[];
  readonly diagnostics: readonly TokenMapDiagnostic[];
}

const WHITESPACE_RE = /\s/u;
const IDENT_START_RE = /[\p{L}_]/u;
const IDENT_PART_RE = /[\p{L}\p{Nd}_]/u;
const DIGIT_RE = /\p{Nd}/u;
const HEX_RE = /[0-9a-fA-F]/;
const RADIX_DIGITS: Readonly<Record<string, RegExp>> = {
  "0x": /[0-9a-fA-F]/,
  "0b": /[01]/,
  "0o": /[0-7]/,
};
/** Total colour-literal lengths INCLUDING the `#`; longest first so #RRGGBBAA wins. */
const COLOUR_LENGTHS: readonly number[] = [9, 7, 5, 4];
/** The flag letters a regex literal may carry, per the ECMAScript grammar. */
const REGEX_FLAG_RE = /[dgimsuvy]/;
/** Characters a path token may contain, once its opener has been recognised. */
const PATH_CHAR_RE = /[A-Za-z0-9._~\-\\/]/;

interface PreviousToken {
  readonly cls: TokenClass;
  readonly text: string;
}

/**
 * Template-literal nesting. `template` is literal text (a backtick body);
 * `interp` is the code inside `${…}`, where `{`/`}` nest. `start` is kept so an
 * unterminated literal at end of text can be reported at the character that
 * opened it.
 */
type Frame =
  { readonly kind: "template"; readonly start: number } | { kind: "interp"; depth: number };

const MAX_DIAGNOSTIC_TEXT = 24;

/** Longest-first copy, so `>>=` is tried before `>>` and `>`. */
function byLengthDesc(values: readonly string[]): string[] {
  return [...values].sort((a, b) => b.length - a.length);
}

class Lexer {
  private readonly src: string;
  private readonly profile: LanguageProfile;
  private readonly n: number;
  private readonly spans: TokenSpan[] = [];
  private readonly diagnostics: TokenMapDiagnostic[] = [];
  private readonly frames: Frame[] = [];
  private readonly chordsSorted: string[];
  private readonly operatorsLong: string[];
  private readonly operatorsShort: string[];
  private readonly brackets: ReadonlySet<string>;
  private readonly lineCommentsSorted: string[];
  private readonly blockOpensSorted: string[];
  private readonly stringsSorted: readonly StringProfile[];
  private prev: PreviousToken | null = null;
  private i = 0;

  constructor(src: string, profile: LanguageProfile) {
    this.src = src;
    this.profile = profile;
    this.n = src.length;
    this.chordsSorted = byLengthDesc(profile.chords);
    // Brackets win over single-character operators (rule 7), so the two operator
    // groups are matched in separate passes rather than one longest-first list.
    this.operatorsLong = byLengthDesc(profile.operators.filter((op) => op.length > 1));
    this.operatorsShort = byLengthDesc(profile.operators.filter((op) => op.length === 1));
    this.brackets = new Set(profile.brackets);
    this.lineCommentsSorted = byLengthDesc(profile.lineComments);
    this.blockOpensSorted = byLengthDesc(profile.blockComments.map((b) => b.open));
    this.stringsSorted = [...profile.strings].sort((a, b) => b.open.length - a.open.length);
  }

  run(): { spans: TokenSpan[]; diagnostics: TokenMapDiagnostic[] } {
    while (this.i < this.n) {
      const frame = this.frames[this.frames.length - 1];
      if (frame?.kind === "template") {
        this.scanTemplateBody();
      } else if (frame?.kind === "interp" && this.isInterpolationBrace()) {
        this.scanInterpolationBrace();
      } else {
        this.scanCodeToken();
      }
    }
    // End of text inside an open literal: the spans already tile, but the snippet
    // is incomplete and the content pipeline should hear about it.
    for (const frame of this.frames) {
      if (frame.kind === "template") this.diagnose("unterminated-template", frame.start, this.n);
    }
    return { spans: this.spans, diagnostics: this.diagnostics };
  }

  // ---------------------------------------------------------------- emission

  private emit(index: number, length: number, cls: TokenClass, updatesPrevious = true): void {
    if (length <= 0) return;
    this.spans.push({ index, length, class: cls });
    if (updatesPrevious) {
      this.prev = { cls, text: this.src.slice(index, index + length) };
    }
  }

  private diagnose(code: TokenMapDiagnosticCode, index: number, end: number): void {
    this.diagnostics.push({
      code,
      index,
      text: this.src.slice(index, Math.min(end, index + MAX_DIAGNOSTIC_TEXT)),
    });
  }

  // ------------------------------------------------------------- templates

  private scanTemplateBody(): void {
    const start = this.i;
    while (this.i < this.n) {
      const ch = this.src[this.i];
      if (ch === "`") {
        this.emit(start, this.i - start, "string");
        this.emit(this.i, 1, "string");
        this.i += 1;
        this.frames.pop();
        return;
      }
      if (ch === "\\") {
        this.i += Math.min(2, this.n - this.i);
        continue;
      }
      if (ch === "$" && this.src[this.i + 1] === "{") {
        this.emit(start, this.i - start, "string");
        this.emit(this.i, 2, "string");
        this.i += 2;
        this.frames.push({ kind: "interp", depth: 0 });
        return;
      }
      this.i += 1;
    }
    const frame = this.frames[this.frames.length - 1];
    const opener = frame?.kind === "template" ? frame.start : start;
    this.emit(start, this.i - start, "string");
    // Pop before reporting: `run()` re-reports any template still open at end of
    // text, and this one has already been reported here.
    this.frames.pop();
    this.diagnose("unterminated-template", opener, this.n);
  }

  private isInterpolationBrace(): boolean {
    const ch = this.src[this.i];
    return ch === "{" || ch === "}";
  }

  private scanInterpolationBrace(): void {
    const frame = this.frames[this.frames.length - 1];
    if (frame?.kind !== "interp") return;
    if (this.src[this.i] === "{") {
      frame.depth += 1;
      this.emit(this.i, 1, "bracket");
      this.i += 1;
      return;
    }
    if (frame.depth > 0) {
      frame.depth -= 1;
      this.emit(this.i, 1, "bracket");
      this.i += 1;
      return;
    }
    // The `}` that closes `${…}` belongs to the template, not to the code.
    this.emit(this.i, 1, "string");
    this.i += 1;
    this.frames.pop();
  }

  // ------------------------------------------------------------------ code

  private scanCodeToken(): void {
    const src = this.src;
    const ch = src[this.i]!;

    if (WHITESPACE_RE.test(ch)) {
      const start = this.i;
      while (this.i < this.n && WHITESPACE_RE.test(src[this.i]!)) this.i += 1;
      this.emit(start, this.i - start, "whitespace", false);
      return;
    }

    // `#` is resolved BEFORE line comments, because `hashMeaning` is the single
    // source of truth for what `#` means; a profile that says `colour` must not
    // also need `#` removed from `lineComments` to get a colour literal.
    if (this.tryHash()) return;
    if (this.tryLineComment()) return;
    if (this.tryBlockComment()) return;
    if (this.tryString()) return;
    if (this.tryNumber()) return;
    // Paths before words: a drive-lettered path starts with a letter, so a
    // word-first order would classify `C` as a name and never see the path.
    if (this.tryPath()) return;
    if (this.tryWord()) return;
    if (this.tryRegex()) return;

    const chord = this.match(this.chordsSorted);
    if (chord !== null) {
      this.emit(this.i, chord.length, "chord");
      this.i += chord.length;
      return;
    }
    const operator = this.match(this.operatorsLong);
    if (operator !== null) {
      this.emit(this.i, operator.length, "operator");
      this.i += operator.length;
      return;
    }
    if (this.brackets.has(ch)) {
      this.emit(this.i, 1, "bracket");
      this.i += 1;
      return;
    }
    const shortOperator = this.match(this.operatorsShort);
    if (shortOperator !== null) {
      this.emit(this.i, 1, "operator");
      this.i += 1;
      return;
    }

    this.emit(this.i, 1, "data");
    this.diagnose("unrecognized-character", this.i, this.i + 1);
    this.i += 1;
  }

  /** Longest literal from `candidates` that the source has at `index`. */
  private match(candidates: readonly string[]): string | null {
    for (const candidate of candidates) {
      if (this.src.startsWith(candidate, this.i)) return candidate;
    }
    return null;
  }

  private tryLineComment(): boolean {
    const opener = this.match(this.lineCommentsSorted);
    if (opener === null) return false;
    this.scanLineComment();
    return true;
  }

  /** A line comment runs to the newline or to end of text, whichever comes first. */
  private scanLineComment(): void {
    const start = this.i;
    while (this.i < this.n && this.src[this.i] !== "\n") this.i += 1;
    this.emit(start, this.i - start, "comment", false);
  }

  private tryBlockComment(): boolean {
    const opener = this.match(this.blockOpensSorted);
    if (opener === null) return false;
    const spec = this.profile.blockComments.find((b) => b.open === opener)!;
    const start = this.i;
    const closeAt = this.src.indexOf(spec.close, this.i + opener.length);
    if (closeAt < 0) {
      this.i = this.n;
      this.emit(start, this.n - start, "comment", false);
      this.diagnose("unterminated-block-comment", start, this.n);
      return true;
    }
    this.i = closeAt + spec.close.length;
    this.emit(start, this.i - start, "comment", false);
    return true;
  }

  /**
   * `#` is three different things depending on the language (see HashMeaning),
   * so it is resolved from the profile and never guessed.
   */
  private tryHash(): boolean {
    if (this.src[this.i] !== "#") return false;
    if (this.profile.hashMeaning === "comment") {
      this.scanLineComment();
      return true;
    }
    if (this.profile.hashMeaning === "private-field") {
      const next = this.src[this.i + 1];
      if (next === undefined || !this.isIdentStart(next)) return this.fallbackUnknown();
      const start = this.i;
      this.i += 1;
      while (this.i < this.n && this.isIdentPart(this.src[this.i]!)) this.i += 1;
      this.emit(start, this.i - start, "identifier");
      return true;
    }
    const colour = this.matchColour();
    if (colour !== null) {
      this.emit(this.i, colour, "number-system");
      this.i += colour;
      return true;
    }
    return this.fallbackUnknown();
  }

  private matchColour(): number | null {
    const src = this.src;
    for (const len of COLOUR_LENGTHS) {
      if (src[this.i] !== "#" || len > this.n - this.i) continue;
      let ok = true;
      for (let k = 1; k < len; k += 1) {
        if (!HEX_RE.test(src[this.i + k]!)) {
          ok = false;
          break;
        }
      }
      if (ok) return len;
    }
    return null;
  }

  private tryString(): boolean {
    for (const spec of this.stringsSorted) {
      if (!this.src.startsWith(spec.open, this.i)) continue;
      const start = this.i;
      // An interpolating literal is not scanned as one span: `${…}` splits it, and
      // what sits between the markers is code with its own classes (rule 3).
      if (spec.interpolation) {
        this.emit(start, spec.open.length, "string");
        this.i = start + spec.open.length;
        this.frames.push({ kind: "template", start });
        return true;
      }
      let i = start + spec.open.length;
      let closed = false;
      while (i < this.n) {
        const ch = this.src[i];
        if (ch === "\n" && !spec.multiline) break;
        if (spec.escapes && ch === "\\") {
          i += 2;
          continue;
        }
        // The closer may be more than one character (Java text blocks and
        // Python docstrings both close on `"""` / `'''`). Comparing a single
        // character against the whole closer never matched, so those literals
        // ran to end of text and swallowed the rest of the snippet.
        if (this.src.startsWith(spec.close, i)) {
          i += spec.close.length;
          closed = true;
          break;
        }
        i += 1;
      }
      const end = Math.min(i, this.n);
      this.i = end;
      this.emit(start, end - start, "string");
      if (!closed) this.diagnose("unterminated-string", start, end);
      return true;
    }
    return false;
  }

  private tryNumber(): boolean {
    const src = this.src;
    const origin = this.i;
    // A sign is part of the literal only where a value may begin, so `1-1` stays
    // `1` `-` `1` while `f(-1)` and `x = -1` are single literals.
    let digitsStart = origin;
    if ((src[origin] === "-" || src[origin] === "+") && !this.endsExpression()) {
      const next = src[origin + 1];
      const afterNext = src[origin + 2];
      if (
        next !== undefined &&
        (DIGIT_RE.test(next) || (next === "." && DIGIT_RE.test(afterNext ?? "")))
      ) {
        digitsStart = origin + 1;
      }
    }
    if (!this.startsNumber(digitsStart)) return false;
    const end = this.scanNumberEnd(digitsStart);
    const cls: TokenClass = this.radixPrefixAt(digitsStart) === null ? "number" : "number-system";
    this.emit(origin, end - origin, cls);
    this.i = end;
    return true;
  }

  private startsNumber(at: number): boolean {
    const ch = this.src[at];
    if (ch === undefined) return false;
    if (DIGIT_RE.test(ch)) return true;
    // `.5` is a literal, but `obj.` and `a.b` are not.
    return ch === "." && DIGIT_RE.test(this.src[at + 1] ?? "");
  }

  private radixPrefixAt(at: number): string | null {
    const two = this.src.slice(at, at + 2).toLowerCase();
    const prefix = this.profile.numberPrefixes.find((p) => p === two);
    if (prefix === undefined) return null;
    const radix = RADIX_DIGITS[prefix];
    // Require at least one digit of that radix, so `0x` alone is `0` + `x`.
    if (radix === undefined || !radix.test(this.src[at + 2] ?? "")) return null;
    return prefix;
  }

  private scanNumberEnd(from: number): number {
    const src = this.src;
    const sep = this.profile.digitSeparator;
    const prefix = this.radixPrefixAt(from);
    let i = from;
    if (prefix !== null) {
      const radix = RADIX_DIGITS[prefix]!;
      i += 2;
      while (i < this.n && this.consumesDigit(radix, sep, i)) i += 1;
      return i;
    }
    while (i < this.n && this.consumesDigit(DIGIT_RE, sep, i)) i += 1;
    if (src[i] === "." && DIGIT_RE.test(src[i + 1] ?? "")) {
      i += 2;
      while (i < this.n && this.consumesDigit(DIGIT_RE, sep, i)) i += 1;
    }
    if (src[i] === "e" || src[i] === "E") {
      const sign = src[i + 1];
      const exponentDigits = sign === "+" || sign === "-" ? src[i + 2] : src[i + 1];
      if (exponentDigits !== undefined && DIGIT_RE.test(exponentDigits)) {
        i += exponentDigits === sign ? 2 : 3;
        while (i < this.n && DIGIT_RE.test(src[i]!)) i += 1;
      }
    }
    return i;
  }

  /** A separator only counts when a digit follows, so `1_` is not grouped. */
  private consumesDigit(digit: RegExp, sep: string, at: number): boolean {
    const ch = this.src[at];
    if (ch === undefined) return false;
    if (digit.test(ch)) return true;
    return sep !== "" && ch === sep && DIGIT_RE.test(this.src[at + 1] ?? "");
  }

  private isIdentStart(ch: string): boolean {
    return IDENT_START_RE.test(ch) || this.profile.identifierExtra.includes(ch);
  }

  private isIdentPart(ch: string): boolean {
    return IDENT_PART_RE.test(ch) || this.profile.identifierExtra.includes(ch);
  }

  private tryWord(): boolean {
    const ch = this.src[this.i]!;
    if (!this.isIdentStart(ch)) return false;
    const start = this.i;
    while (this.i < this.n && this.isIdentPart(this.src[this.i]!)) this.i += 1;
    const word = this.src.slice(start, this.i);
    // Rule 5: position beats spelling. After a member-access dot, even a reserved
    // word names something (`obj.class`, `obj?.class`), so it is Class 7 (§9.3.2).
    const afterMemberAccess =
      (this.prev?.cls === "operator" || this.prev?.cls === "chord") &&
      (this.prev.text === "." || this.prev.text === "?.");
    const reserved = this.profile.keywords.has(word) || this.profile.literals.has(word);
    this.emit(start, this.i - start, !afterMemberAccess && reserved ? "keyword" : "identifier");
    return true;
  }

  private tryPath(): boolean {
    const src = this.src;
    const start = this.i;
    // An UPPER-case letter only: Windows drive letters are conventionally upper
    // case, and requiring it keeps a ternary like `x ? C : /d/` from reading as a
    // path. `C:\dir` inside prose is inside a string anyway, and a string is
    // Class 4 either way.
    const drive = /^[A-Z]:[\\/]/.exec(src.slice(start, start + 3));
    const relative =
      src.startsWith("./", start) || src.startsWith("../", start) || src.startsWith("~/", start);
    if (drive !== null || relative) {
      this.i = start + (drive !== null ? 3 : 2);
      // Backslash is in the set for Windows paths, where a `\` cannot occur
      // outside a string in any language the profile would claim.
      while (this.i < this.n && PATH_CHAR_RE.test(src[this.i]!)) this.i += 1;
      this.emit(start, this.i - start, "path");
      return true;
    }
    // Only `--long` flags: a single dash is genuinely ambiguous with subtraction
    // (`a - b` vs `a -b`) and guessing would corrupt operator analytics.
    if (
      src.startsWith("--", start) &&
      src[start + 2] !== ">" &&
      IDENT_START_RE.test(src[start + 2] ?? "")
    ) {
      this.i = start + 2;
      while (this.i < this.n && this.isIdentPart(src[this.i]!)) this.i += 1;
      this.emit(start, this.i - start, "path");
      return true;
    }
    return false;
  }

  private tryRegex(): boolean {
    if (!this.profile.regexLiteral || this.src[this.i] !== "/" || this.endsExpression()) {
      return false;
    }
    const end = this.scanRegexEnd(this.i + 1);
    if (end < 0) return false;
    // Only the language's real flag letters are absorbed. Anything else after the
    // closing slash is a new token: swallowing it would silently merge an
    // identifier into a regex literal, which is exactly the kind of quiet
    // misclassification this class taxonomy cannot afford.
    let stop = end;
    while (stop < this.n && REGEX_FLAG_RE.test(this.src[stop]!)) stop += 1;
    this.emit(this.i, stop - this.i, "data");
    this.i = stop;
    return true;
  }

  /** Index just past the closing `/`, or -1 when the literal is not terminated. */
  private scanRegexEnd(from: number): number {
    let i = from;
    let inClass = false;
    let classStart = -1;
    while (i < this.n) {
      const ch = this.src[i];
      if (ch === "\n") return -1;
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === "[") {
        inClass = true;
        classStart = i;
        i += 1;
        continue;
      }
      if (ch === "]") {
        // A `]` immediately after `[` or `[^` is a literal `]`, not a close.
        if (inClass && i > classStart + 1) inClass = false;
        i += 1;
        continue;
      }
      if (ch === "/" && !inClass) return i + 1;
      i += 1;
    }
    return -1;
  }

  private fallbackUnknown(): boolean {
    this.emit(this.i, 1, "data");
    this.diagnose("unrecognized-character", this.i, this.i + 1);
    this.i += 1;
    return true;
  }

  /** See the regex-vs-division rule in the module header. */
  private endsExpression(): boolean {
    const prev = this.prev;
    if (prev === null) return false;
    if (prev.cls === "keyword") return EXPRESSION_KEYWORDS.has(prev.text);
    if (prev.cls === "bracket") return prev.text === ")" || prev.text === "]" || prev.text === "}";
    if (prev.cls === "chord") return prev.text === "++" || prev.text === "--";
    return (
      prev.cls === "identifier" ||
      prev.cls === "number" ||
      prev.cls === "number-system" ||
      prev.cls === "string" ||
      prev.cls === "data"
    );
  }
}

/**
 * Classify `text` into a token map. `language` is a content-pipeline language
 * id; unknown ids resolve to the generic profile rather than throwing.
 */
export function tokenize(text: string, language: string): TokenMap {
  return tokenizeWithProfile(text, languageProfile(language));
}

/**
 * Classify `text` with an explicitly supplied profile. This is the seam that
 * makes "new language = config, not code" testable: a caller can hand in a
 * profile it built at runtime without registering a language id, which is how a
 * future language pack (PRG-02) ships before it is folded into this file.
 */
export function tokenizeWithProfile(text: string, profile: LanguageProfile): TokenMap {
  const { spans, diagnostics } = new Lexer(text, profile).run();
  const map: TokenMap = {
    text,
    length: text.length,
    language: profile.id,
    tokenizerVersion: TOKENIZER_VERSION,
    source: "lexical",
    grammarVersion: null,
    hasGrammarError: false,
    spans,
    diagnostics,
  };
  assertTokenMap(map);
  return map;
}

// ------------------------------------------------------------------ queries

/** The span covering `index`, or null when the index is out of range. */
export function tokenAt(map: TokenMap, index: number): TokenSpan | null {
  if (!Number.isInteger(index) || index < 0 || index >= map.length) return null;
  let lo = 0;
  let hi = map.spans.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const span = map.spans[mid]!;
    if (index < span.index) hi = mid - 1;
    else if (index >= span.index + span.length) lo = mid + 1;
    else return span;
  }
  return null;
}

/** The class covering `index`, or null when the index is out of range. */
export function tokenClassAt(map: TokenMap, index: number): TokenClass | null {
  return tokenAt(map, index)?.class ?? null;
}

export interface TokenClassCounts {
  /** Characters per class — what per-class speed and error rates are weighted by. */
  readonly chars: Readonly<Record<TokenClass, number>>;
  /** Tokens per class — what per-class *fluency* is counted in. */
  readonly tokens: Readonly<Record<TokenClass, number>>;
}

/**
 * Per-class totals, with every class present (zero-filled) so a caller can render
 * a legend without special-casing the classes a snippet happened to omit.
 */
export function tokenClassCounts(map: TokenMap): TokenClassCounts {
  const chars = Object.fromEntries(TOKEN_CLASSES.map((cls) => [cls, 0])) as Record<
    TokenClass,
    number
  >;
  const tokens = Object.fromEntries(TOKEN_CLASSES.map((cls) => [cls, 0])) as Record<
    TokenClass,
    number
  >;
  for (const span of map.spans) {
    chars[span.class] += span.length;
    tokens[span.class] += 1;
  }
  return { chars, tokens };
}

// --------------------------------------------------------------- validation

export type TokenMapIssueKind = "gap" | "overlap" | "out-of-range" | "zero-length" | "unordered";

export interface TokenMapIssue {
  readonly kind: TokenMapIssueKind;
  readonly index: number;
}

/**
 * Re-check the tiling invariant (D-M5-2). `tokenize` already asserts it; this is
 * for maps that arrived from storage or from a grammar, where a silent gap would
 * be invisible until the dashboard disagreed with the text.
 */
export function validateTokenMap(map: TokenMap): TokenMapIssue[] {
  const issues: TokenMapIssue[] = [];
  let cursor = 0;
  let previousIndex = -1;
  for (const span of map.spans) {
    if (span.length <= 0) {
      issues.push({ kind: "zero-length", index: span.index });
      continue;
    }
    if (span.index < previousIndex) {
      issues.push({ kind: "unordered", index: span.index });
    }
    if (span.index < cursor) {
      issues.push({ kind: "overlap", index: span.index });
    } else if (span.index > cursor) {
      issues.push({ kind: "gap", index: cursor });
    }
    if (span.index + span.length > map.length) {
      issues.push({ kind: "out-of-range", index: span.index });
    }
    cursor = Math.max(cursor, span.index + span.length);
    previousIndex = span.index;
  }
  if (cursor < map.length) issues.push({ kind: "gap", index: cursor });
  return issues;
}

/** Throwing form, used at construction and at content-publish time (M5-02). */
export function assertTokenMap(map: TokenMap): void {
  const issues = validateTokenMap(map);
  if (issues.length > 0) {
    const first = issues[0]!;
    throw new Error(
      `token map for ${map.language} does not tile its text: ${first.kind} at ${first.index} ` +
        `(${issues.length} issue(s))`,
    );
  }
}
