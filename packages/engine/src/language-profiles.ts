/**
 * RealType typing engine (open-core, MIT) — language profiles (PRG-01, M5-02).
 *
 * A profile is DATA, not code: keyword sets, comment syntax, string delimiters,
 * identifier alphabet, and the handful of decisions that genuinely differ
 * between C-like and indentation-based languages. Adding a language pack
 * (PRG-02) is a new entry in this file — never a new branch in the lexer —
 * which is what keeps one lexer honest across six languages instead of six
 * hand-tuned special cases.
 *
 * The three profiles here are the ones the MVP needs and that can be checked
 * without a grammar:
 *  - `javascript` covers JavaScript, TypeScript and JSX (one lexical grammar for
 *    all three; the differences are type-level, not lexical).
 *  - `python` covers Python.
 *  - `generic` is the fallback when the language is unknown, so a mistyped
 *    language id degrades to "rough but honest" instead of throwing. It is
 *    deliberately the *least* opinionated: no regex literals, no digit
 *    separators, no template interpolation.
 *
 * Where a profile choice is a judgement rather than a fact, the reason is in the
 * `note` on that field. Notably:
 *  - Angle brackets are brackets in C-like languages (per §7.1's `() [] {} <>`)
 *    but comparison operators in Python. A lexer cannot know which `a<b>c` meant,
 *    so it follows the language, not the guess.
 *  - `//` is a comment in JavaScript and floor-division in Python. Comment
 *    markers are matched BEFORE any operator, so this only needs one ordering.
 *  - `#` is a comment in Python, a private-name prefix in JavaScript and a
 *    colour literal in CSS. Hence `hashMeaning` as a profile field instead of a
 *    heuristic in the lexer.
 */

/** What `#` starts, which no single heuristic can infer from the character. */
export type HashMeaning = "comment" | "private-field" | "colour";

export interface StringProfile {
  /** Delimiter that opens the literal (compared longest-first). */
  readonly open: string;
  readonly close: string;
  /** A backslash escapes the next character. */
  readonly escapes: boolean;
  /** `${…}` interpolation, i.e. a template literal. */
  readonly interpolation: boolean;
  /** The literal may contain raw newlines. */
  readonly multiline: boolean;
}

export interface BlockCommentProfile {
  readonly open: string;
  readonly close: string;
}

export interface LanguageProfile {
  readonly id: string;
  readonly label: string;
  /** Openers that run to end of line. Matched before any operator. */
  readonly lineComments: readonly string[];
  readonly blockComments: readonly BlockCommentProfile[];
  readonly strings: readonly StringProfile[];
  /** Reserved words → Class 8. */
  readonly keywords: ReadonlySet<string>;
  /**
   * `true`/`false`/`null`-style literals. Classed as keywords rather than
   * numbers because they are reserved words in every language that has them,
   * and a keyword class is what a drill ("type the literals") wants to measure.
   */
  readonly literals: ReadonlySet<string>;
  /** Multi-character Class 3 forms (D-M5-3). Matched before operators. */
  readonly chords: readonly string[];
  /** Everything else symbolic. Matched longest-first, before brackets. */
  readonly operators: readonly string[];
  readonly brackets: readonly string[];
  /**
   * Enables `/…/` regex literals. Only consulted when the previous token cannot
   * end an expression — see the regex-vs-division rule in ./token-map.ts.
   */
  readonly regexLiteral: boolean;
  /** Radix prefixes (lower-case) whose literals are Class 6, not Class 5. */
  readonly numberPrefixes: readonly string[];
  /** Characters allowed between digits (`_` in JS/Python); "" disables them. */
  readonly digitSeparator: string;
  readonly hashMeaning: HashMeaning;
  /** Identifier characters beyond ASCII letters, digits and `_`. */
  readonly identifierExtra: string;
}

/**
 * The Class 3 assignment family from §7.1 (`+=`, `<<=`), completed for the
 * compound forms the shipped languages actually use. Shared because the shape of
 * the family — not the language — is what makes these one chord.
 */
const ASSIGNMENT_CHORDS: readonly string[] = [
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "**=",
  "<<=",
  ">>=",
  ">>>=",
  "&=",
  "|=",
  "^=",
  "@=",
  "&&=",
  "||=",
  "??=",
];

const JS_KEYWORDS: ReadonlySet<string> = new Set([
  "as",
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "finally",
  "for",
  "from",
  "function",
  "get",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "of",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "set",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "try",
  "type",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
]);

/**
 * `true`/`false`/`null`/`undefined` are literals, not keywords, but they are
 * reserved and drillable as words, so they are classed with keywords.
 */
const JS_LITERALS: ReadonlySet<string> = new Set(["true", "false", "null", "undefined"]);

const PYTHON_KEYWORDS: ReadonlySet<string> = new Set([
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "try",
  "while",
  "with",
  "yield",
]);

const PYTHON_LITERALS: ReadonlySet<string> = new Set(["True", "False", "None"]);

/**
 * Keywords that end an expression value, so a following `/` is division rather
 * than the start of a regex. `this` and `true` qualify; `return` and `typeof` do
 * not. Kept as data so the regex-vs-division rule has one list to point at.
 */
const EXPRESSION_KEYWORDS: ReadonlySet<string> = new Set([
  "this",
  "super",
  "true",
  "false",
  "null",
  "undefined",
  "True",
  "False",
  "None",
]);

export const JAVASCRIPT_PROFILE: LanguageProfile = {
  id: "javascript",
  label: "JavaScript / TypeScript / JSX",
  lineComments: ["//"],
  blockComments: [{ open: "/*", close: "*/" }],
  strings: [
    { open: "'", close: "'", escapes: true, interpolation: false, multiline: false },
    { open: '"', close: '"', escapes: true, interpolation: false, multiline: false },
    { open: "`", close: "`", escapes: true, interpolation: true, multiline: true },
  ],
  keywords: JS_KEYWORDS,
  literals: JS_LITERALS,
  // §7.1 lists `++` as Class 3; `--` is its exact counterpart and is classed
  // with it, because a class that depended on the sign would mean a drill and a
  // dashboard had two buckets for one motor skill.
  chords: ["===", "!==", "...", "=>", "?.", "??", "++", "--", ...ASSIGNMENT_CHORDS],
  operators: [
    ">>>",
    "**",
    "==",
    "!=",
    "<=",
    ">=",
    "&&",
    "||",
    "<<",
    ">>",
    "&",
    "|",
    "^",
    "~",
    "!",
    "+",
    "-",
    "*",
    "/",
    "%",
    "=",
    "<",
    ">",
    "?",
    ":",
    ".",
    ",",
    ";",
  ],
  brackets: ["(", ")", "[", "]", "{", "}", "<", ">"],
  regexLiteral: true,
  numberPrefixes: ["0x", "0b", "0o"],
  digitSeparator: "_",
  hashMeaning: "private-field",
  identifierExtra: "$",
};

export const PYTHON_PROFILE: LanguageProfile = {
  id: "python",
  label: "Python",
  // `#` is not listed here: `hashMeaning: "comment"` below is its single source
  // of truth, so a profile cannot end up with `#` meaning two things.
  lineComments: [],
  // Python has no block comments: a docstring is a string, not a comment, and
  // §7.1's Class 10 lists `"""` because that is how docs are written here.
  blockComments: [],
  strings: [
    { open: "'''", close: "'''", escapes: true, interpolation: false, multiline: true },
    { open: '"""', close: '"""', escapes: true, interpolation: false, multiline: true },
    { open: "'", close: "'", escapes: true, interpolation: false, multiline: false },
    { open: '"', close: '"', escapes: true, interpolation: false, multiline: false },
  ],
  keywords: PYTHON_KEYWORDS,
  literals: PYTHON_LITERALS,
  // `->` (annotation) and `:=` (walrus) are Python's Class 3 forms; §7.1 names
  // `->` and `::` for this class and Python has no `::`.
  chords: ["->", ":=", ...ASSIGNMENT_CHORDS],
  // `//` is floor division here, not a comment — the profile simply omits it
  // from lineComments, so the lexer's comment-first ordering cannot misfire.
  operators: [
    "**",
    "//",
    "==",
    "!=",
    "<=",
    ">=",
    "<<",
    ">>",
    "&",
    "|",
    "^",
    "~",
    "+",
    "-",
    "*",
    "/",
    "%",
    "=",
    "<",
    ">",
    "@",
    ".",
    ",",
    ":",
    ";",
  ],
  brackets: ["(", ")", "[", "]", "{", "}"],
  regexLiteral: false,
  numberPrefixes: ["0x", "0b", "0o"],
  digitSeparator: "_",
  hashMeaning: "comment",
  identifierExtra: "",
};

export const GENERIC_PROFILE: LanguageProfile = {
  id: "generic",
  label: "Generic (unknown language)",
  // `//` is the only line comment listed here; `#` comes from
  // `hashMeaning: "comment"` below, which is its single source of truth. A future
  // CSS/JSON profile is expected to say `hashMeaning: "colour"` instead.
  lineComments: ["//"],
  blockComments: [{ open: "/*", close: "*/" }],
  strings: [
    { open: "'''", close: "'''", escapes: true, interpolation: false, multiline: true },
    { open: '"""', close: '"""', escapes: true, interpolation: false, multiline: true },
    { open: "'", close: "'", escapes: true, interpolation: false, multiline: false },
    { open: '"', close: '"', escapes: true, interpolation: false, multiline: false },
    // A backtick is a multi-line string but NOT a template: claiming `${`
    // interpolation for an unknown language would split spans on a construct we
    // cannot confirm exists.
    { open: "`", close: "`", escapes: true, interpolation: false, multiline: true },
  ],
  // Small, C-like set only. A keyword list that guesses too much misclassifies
  // ordinary names, and a wrong class is worse than a missing one.
  keywords: new Set([
    "break",
    "case",
    "class",
    "const",
    "continue",
    "default",
    "do",
    "else",
    "false",
    "for",
    "function",
    "if",
    "let",
    "new",
    "null",
    "return",
    "switch",
    "this",
    "true",
    "var",
    "while",
  ]),
  literals: new Set(["true", "false", "null"]),
  chords: ["===", "!==", "...", "=>", "->", "::", "?.", "??", "++", "--", ...ASSIGNMENT_CHORDS],
  operators: [
    ">>>",
    "**",
    "==",
    "!=",
    "<=",
    ">=",
    "&&",
    "||",
    "<<",
    ">>",
    "&",
    "|",
    "^",
    "~",
    "!",
    "+",
    "-",
    "*",
    "/",
    "%",
    "=",
    "<",
    ">",
    ".",
    ",",
    ":",
    ";",
  ],
  brackets: ["(", ")", "[", "]", "{", "}", "<", ">"],
  regexLiteral: false,
  numberPrefixes: ["0x", "0b", "0o"],
  // No separators assumed: in an unknown language `1_000` is more likely `1`
  // followed by an identifier than one grouped literal.
  digitSeparator: "",
  hashMeaning: "comment",
  identifierExtra: "$",
};

const PROFILES: ReadonlyMap<string, LanguageProfile> = new Map([
  [JAVASCRIPT_PROFILE.id, JAVASCRIPT_PROFILE],
  ["typescript", JAVASCRIPT_PROFILE],
  ["jsx", JAVASCRIPT_PROFILE],
  [PYTHON_PROFILE.id, PYTHON_PROFILE],
  [GENERIC_PROFILE.id, GENERIC_PROFILE],
]);

/** The profile used when a language id is unknown (M5-02's "no map" fallback). */
export const FALLBACK_LANGUAGE = GENERIC_PROFILE.id;

/**
 * Resolve a language id to a profile. Ids are the content pipeline's language
 * ids; anything unrecognised resolves to the generic profile rather than
 * throwing, because a mistyped id must not take down a typing session.
 */
export function languageProfile(id: string): LanguageProfile {
  return PROFILES.get(id.trim().toLowerCase()) ?? GENERIC_PROFILE;
}

/** Exposed so a caller can report "no grammar for this language" honestly. */
export function knownLanguages(): readonly string[] {
  return [...PROFILES.keys()];
}

/** Shared with the lexer: does this keyword end a value (regex/division rule)? */
export { EXPRESSION_KEYWORDS };
