/**
 * RealType typing engine (open-core, MIT) — the six language packs (PRG-02).
 *
 * ADR-007 settled the set: JavaScript/TypeScript/JSX, Python, Java, SQL, HTML and
 * CSS — six, not the "3–5" the same spec paragraph says one sentence earlier. The
 * priority order below is decision D6's: JS/TS first, then Python, Java, SQL, and
 * HTML/CSS last.
 *
 * Six packs, five independent profile shapes. They are not six keyword lists over
 * one grammar, and the differences are the whole point:
 *
 *  | pack | what makes it more than a keyword list |
 *  |------|----------------------------------------|
 *  | javascript | one lexical grammar for JS, TS and JSX (see below); `#` is a private-name prefix; backtick templates interpolate |
 *  | python | `#` is a comment, `//` is floor division, `<` is a comparison; three delimiter families; raw/byte/unicode/format prefixes |
 *  | java | `--` is the decrement chord, NOT a comment; `"""` text blocks; no octal prefix; `>>` is one operator span (§7.1's price) |
 *  | sql | `--` AND block comments over an operator set with no decrement; `''`-doubled quotes; `::` casts; `#` means nothing |
 *  | html | `<!-- -->` is a block comment; tag delimiters are pairs; an embedded language per element |
 *  | css | `#` starts a colour literal — the only pack that may declare `hashMeaning: "colour"` |
 *
 * JavaScript, TypeScript and JSX are ONE pack, and that is the interesting call.
 * TypeScript adds no delimiter, no comment form and no number syntax; every
 * difference is type-level (`type`, `interface`, `as`, `implements`). JSX adds
 * `<` and `>` — which the pack already declares as Class 1 brackets, because §7.1
 * puts `() [] {} <>` in Class 1 and a JSX tag pair *is* a bracket pair, the same
 * motor skill Bracket Balance (PRG-11) drills. Splitting them would create three
 * packs, three identical dashboards and three places for a keyword set to rot, in
 * exchange for no difference in any character's class. Aliases carry the
 * distinction instead: `languageProfile("typescript")` and `("jsx")` both resolve
 * here, and `resolvePack` reports which alias was used so the content pipeline can
 * still record what the author declared.
 */
import { GENERIC_PROFILE, JAVASCRIPT_PROFILE, PYTHON_PROFILE } from "../language-profiles.js";
import type { LanguagePack } from "./model.js";

export { GENERIC_PROFILE };

/**
 * PRG-01's JavaScript profile, shipped as a pack. Spread rather than moved so the
 * PRG-01 export (and the identity assertions in its tests) keep working, and
 * annotated in one place per added field. JavaScript declares NO PRG-02 extension:
 * its construct set is already complete, which is the control for the field list.
 */
export const JAVASCRIPT_PACK: LanguagePack = {
  ...JAVASCRIPT_PROFILE,
  // Control row: JavaScript needs none of the three new fields. No
  // `stringPrefixes` because JS has no string prefixes (a template literal's `${`
  // is interpolation, not a prefix); no `identifierGlue` because `-` is always an
  // operator here; no `markupScan` because JSX's `<Tag>` is a bracket pair the
  // generic path already reads correctly.
};

/** The 51 reserved words of JLS §3.9. */
const JAVA_KEYWORDS: ReadonlySet<string> = new Set([
  "abstract",
  "assert",
  "boolean",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "class",
  "const",
  "continue",
  "default",
  "do",
  "double",
  "else",
  "enum",
  "extends",
  "final",
  "finally",
  "float",
  "for",
  "goto",
  "if",
  "implements",
  "import",
  "instanceof",
  "int",
  "interface",
  "long",
  "native",
  "new",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "short",
  "static",
  "strictfp",
  "super",
  "switch",
  "synchronized",
  "this",
  "throw",
  "throws",
  "transient",
  "try",
  "void",
  "volatile",
  "while",
]);

/**
 * `true`/`false`/`null` are the value literals. Java's CONTEXTUAL keywords
 * (`var`, `record`, `sealed`, `permits`, `yield`, `non-sealed`) are deliberately
 * absent: §9.3.2's rule is that a keyword is a property of position, and outside a
 * type or record declaration those spellings are ordinary variable names, so
 * listing them would misclassify real identifiers — the exact error
 * `obj.class` was fixed to avoid.
 */
const JAVA_LITERALS: ReadonlySet<string> = new Set(["true", "false", "null"]);

/**
 * The Class 3 assignment family from PRG-01, shared because the shape of the
 * family — not the language — is what makes those one chord. Java adds no
 * assignment operator of its own; `@=` rides along and is inert here (Java has no
 * such operator), and a chord only ever matches characters that actually occur.
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

export const JAVA_PACK: LanguagePack = {
  id: "java",
  label: "Java",
  // `--` is NOT a line comment here, and that is the whole reason this pack is not
  // a copy of the C-like shape: `--i` is the decrement, one of the two forms §7.1
  // names in Class 3 (`++`). A profile that put `--` in lineComments — which the
  // SQL pack does, for the opposite reason — would swallow the rest of the line.
  lineComments: ["//"],
  blockComments: [{ open: "/*", close: "*/" }],
  strings: [
    // JLS §3.10.6 text block. Declared with the closing delimiter the language
    // uses; whether the lexer honours a MULTI-character `close` is recorded as
    // BLOCKED-01 in docs/profiles/prg02-language-packs.md §6 and pinned by a
    // failing-direction test, so the gap cannot be forgotten.
    { open: '"""', close: '"""', escapes: true, interpolation: false, multiline: true },
    // `'` is a character literal, not a string, but §7.1 has one Class 4 for both
    // and typing `'\''` is quote-context work either way. Escapes are on so the
    // backslash in `'\''` does not end the token early.
    { open: "'", close: "'", escapes: true, interpolation: false, multiline: false },
    { open: '"', close: '"', escapes: true, interpolation: false, multiline: false },
  ],
  keywords: JAVA_KEYWORDS,
  literals: JAVA_LITERALS,
  // `->` (lambda) and `::` (method reference) are the two Class 3 forms Java adds
  // beyond PRG-01's shared family. `>>>` and `>>=` stay Class 2 on purpose — §7.1
  // lists `<< >>` under Class 2 — which is why `List<List<String>>` closes with
  // ONE `>>` operator span instead of two bracket spans. That price is spec-chosen
  // and documented (docs/profiles/prg02-language-packs.md §4.3), not an oversight.
  chords: ["->", "::", "++", "--", ...ASSIGNMENT_CHORDS],
  operators: [
    ">>>",
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
    // `@` opens an annotation (`@Override`), which is Java-only among the six.
    "@",
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
  // Java regexes are `Pattern.compile("…")` — the pattern is a STRING argument, so
  // there is no `/…/` literal for the lexer to find. Enabling it would turn `/`
  // into a regex opener in every Java snippet.
  regexLiteral: false,
  // Java has `0x` and `0b`; it has NO `0o` prefix (legacy octal is a bare leading
  // zero), so a Java `0o7` is genuinely `0` followed by the identifier `o7`.
  numberPrefixes: ["0x", "0b"],
  // `_` is legal INSIDE a Java identifier (`MAX_VALUE`, `snake_case_name`) but not
  // as a digit separator, so `digitSeparator` stays empty: `1_000` in Java is the
  // number `1` and then an identifier. The field means "allowed BETWEEN DIGITS",
  // which Java forbids; JS and Python are the packs that allow it.
  digitSeparator: "",
  // Java has no `#` construct. `private-field` is the least destructive of the
  // three meanings: `#name` becomes Class 7 and a bare `#` is still reported as an
  // unrecognised character, whereas `comment` would silently swallow the rest of
  // the line and `colour` would invent a literal Java cannot write.
  hashMeaning: "private-field",
  identifierExtra: "$",
};

const SQL_KEYWORDS_LOWER: ReadonlySet<string> = new Set([
  "all",
  "alter",
  "and",
  "as",
  "asc",
  "begin",
  "between",
  "by",
  "case",
  "cascade",
  "check",
  "column",
  "commit",
  "constraint",
  "create",
  "cross",
  "default",
  "delete",
  "distinct",
  "drop",
  "else",
  "end",
  "exists",
  "foreign",
  "from",
  "full",
  "group",
  "having",
  "in",
  "index",
  "inner",
  "insert",
  "into",
  "is",
  "join",
  "key",
  "left",
  "like",
  "limit",
  "not",
  "null",
  "offset",
  "on",
  "or",
  "order",
  "outer",
  "primary",
  "references",
  "recursive",
  "returning",
  "right",
  "rollback",
  "select",
  "set",
  "table",
  "then",
  "transaction",
  "union",
  "unique",
  "update",
  "using",
  "values",
  "view",
  "when",
  "where",
  "with",
]);

// SQL's reserved words are case-INSENSITIVE in the language and are written in UPPER
// CASE by convention, while every other shipped language's keywords are lower-case
// and case-sensitive. The lexer compares a word to the set exactly, so this pack
// lists BOTH spellings: that is the data expression of "this language accepts any
// case", and it is why `SELECT` is Class 8 here while `Select` in JavaScript is a
// perfectly ordinary Class 7 name. (The expressive alternative is a
// `keywordCaseInsensitive` profile flag; data won because it is correct TODAY,
// without a lexer change, and because the set is derived rather than retyped.)
const SQL_KEYWORDS: ReadonlySet<string> = new Set([
  ...SQL_KEYWORDS_LOWER,
  ...[...SQL_KEYWORDS_LOWER].map((word) => word.toUpperCase()),
]);

/** `null` is in `SQL_KEYWORDS` rather than here: it is both reserved and a value
 * literal, and a word in both sets would be a pack that classifies one spelling by
 * two rules. It lands in Class 8 either way. */
const SQL_LITERALS: ReadonlySet<string> = new Set(["true", "false"]);

export const SQL_PACK: LanguagePack = {
  id: "sql",
  label: "SQL",
  // `--` IS a line comment here (SQL standard §4.1) and `--` is NOT an operator,
  // because SQL has no decrement. That is the entire difference from Java, and the
  // lexer's comment-first ordering is what lets the two packs disagree: comment
  // markers are matched before any operator, so `a - b` and `a--b` come out
  // differently in each pack without a single language check in the lexer.
  lineComments: ["--"],
  // The other SQL comment form. Both at once is normal SQL, and the profile is the
  // place that says so; a lexer with one hard-coded comment style would have to
  // choose between them.
  blockComments: [{ open: "/*", close: "*/" }],
  strings: [
    // Standard SQL: a character string is single-quoted, and `''` inside it is an
    // escaped quote. `multiline: true` because a standard string literal may be
    // split across lines. `'O''Brien'` therefore lands as adjacent Class 4 spans —
    // every character is still Class 4 (§9.3.1); only the span boundary is where
    // the language's escape rule would put it.
    { open: "'", close: "'", escapes: true, interpolation: false, multiline: true },
    // PostgreSQL dollar-quoting: `$$ … $$`. Declared with the plainest form so a
    // function body is never read as a run of identifiers.
    { open: "$$", close: "$$", escapes: false, interpolation: false, multiline: true },
  ],
  keywords: SQL_KEYWORDS,
  literals: SQL_LITERALS,
  // `||` is CONCATENATE rather than logical-or, and `<>` is the standard spelling
  // of `!=`; both are one Class 3 unit either way, and `::` is the cast operator.
  chords: ["||", "!=", "<>", "<=", ">=", "::"],
  // No `&`, no `^`, no `~`: those are bitwise and SQL has no bitwise operators. `/`
  // IS present — it is the arithmetic division every dialect inherits, and it is
  // the third form the `--` fixture keeps apart from the comment and the minus.
  operators: ["=", "<", ">", "+", "-", "*", "/", "%", "@", ".", ",", ";"],
  // No square or curly bracket: SQL groups with parentheses only.
  brackets: ["(", ")"],
  regexLiteral: false,
  // Postgres hex and bit-string prefixes. Declared because PRG-13 drills them and
  // the flag then behaves the same way it does for the other packs; a dialect that
  // lacks them simply never writes them.
  numberPrefixes: ["0x", "0b"],
  digitSeparator: "",
  // See the Java note: SQL has no `#` construct, so it must not take the `comment`
  // meaning (that would silently swallow the rest of a statement) nor the `colour`
  // one (SQL writes `0xFF`, not `#FF00AA`). `private-field` keeps `#name` as
  // Class 7 and still reports a bare `#`.
  hashMeaning: "private-field",
  identifierExtra: "",
};

export const HTML_PACK: LanguagePack = {
  id: "html",
  label: "HTML",
  // No `//` and no `/* … */`: neither is an HTML comment, and declaring them would
  // be a false statement about the language. What IS an HTML comment is
  // `<!-- … -->`, and the block-comment descriptor expresses it exactly — a
  // delimiter pair matched before any operator, so `<!-- note -->` is one Class 10
  // span and the `--` inside it can never be read as a decrement. This is the one
  // genuinely HTML-shaped thing the PRG-01 model already carried.
  lineComments: [],
  blockComments: [{ open: "<!--", close: "-->" }],
  strings: [
    // Both quote styles are attribute values, and BOTH delimiters are legal on any
    // element — so `title="it's here"` must not end the token at the apostrophe.
    // Declaring both forms and letting the longest match win is the same rule the
    // comment and chord paths already use, and it is why no lexer branch is needed.
    { open: '"', close: '"', escapes: true, interpolation: false, multiline: false },
    { open: "'", close: "'", escapes: true, interpolation: false, multiline: false },
  ],
  // HTML has no reserved words. `div`, `class` and `data` are element, attribute
  // and attribute names, and §9.3.2 says a word's class comes from its position,
  // not its spelling; a keyword list here would be a guess.
  keywords: new Set(),
  literals: new Set(),
  // §7.1's Class 3 has no HTML member: there is no multi-character operator in
  // markup. (An HTML comment's `<!--` is a delimiter, not a chord.)
  chords: [],
  // `=` is an attribute value; `/` is the self-closing marker and the end tag's
  // first character; `!` opens `<!DOCTYPE …>`; `?` opens `<?xml …?>`.
  operators: ["=", "/", "!", "?"],
  // `<` and `>` are listed as brackets, not operators: a tag is a PAIR (`<a>` /
  // `</a>`) and §7.1's Class 1 is "brackets & pairs … track pairing depth", which
  // is exactly what Bracket Balance (PRG-11) drills. The conflict with §7.1's
  // Class 12 row ("HTML tags") is real and is recorded as OPEN-CONFLICT-1 in
  // docs/profiles/prg02-language-packs.md §9 for ANA-05 to settle with data; the
  // pack already declares `markupScan`, so choosing Class 12 later is a data change.
  brackets: ["(", ")", "[", "]", "<", ">"],
  regexLiteral: false,
  numberPrefixes: [],
  digitSeparator: "",
  // `#` in markup is a fragment reference (`href="#top"`) or a CSS id selector, and
  // never a colour — HTML spells colours inside a `style` attribute, where the
  // whole value is a string. `private-field` keeps `#top` out of Class 10 so a
  // bare `#` cannot swallow the line.
  hashMeaning: "private-field",
  identifierExtra: "",
  // See `markupScan` in ./model.ts: the one structural field an HTML pack needs.
  // `data-id`, `aria-label` and `x-on:click` are single names, and a `style` or
  // `script` body is a different language.
  identifierGlue: "-",
  markupScan: {
    tagOpen: "<",
    tagClose: ">",
    embedded: { script: "javascript", style: "css" },
  },
};

export const CSS_PACK: LanguagePack = {
  id: "css",
  label: "CSS",
  // CSS has no line comment. The block form is the whole story.
  lineComments: [],
  blockComments: [{ open: "/*", close: "*/" }],
  strings: [
    { open: '"', close: '"', escapes: true, interpolation: false, multiline: false },
    { open: "'", close: "'", escapes: true, interpolation: false, multiline: false },
  ],
  // No keywords and no literals, and that is a decision rather than an omission:
  // `red`, `flex` and `absolute` are ordinary identifiers whose meaning comes from
  // the property they sit in, and CSS has no `true`/`null` at all. §9.3.2's rule is
  // that a wrong class is worse than a missing one, and a keyword list here would
  // classify every property VALUE as Class 8.
  keywords: new Set(),
  literals: new Set(),
  // `::` is the pseudo-element form (`::before`, `::after`) and §7.1 names `::` in
  // Class 3. The combinators (`>`, `+`, `~`, `||`) are one character each and stay
  // Class 2, where §7.1 puts single-character symbols.
  chords: ["::"],
  // `=` is a declaration, `:` a pseudo-class, `.` the decimal point and the class
  // selector, `%` a unit, `!` the `!important` flag, `&` the nesting parent, `*`
  // the universal selector, `/` the font shorthand, `|` the `||` combinator, and
  // `>`/`+`/`~` the remaining combinators. `-` is here for `nth-child(-n+3)` and
  // `calc(100% - 20px)`; until `identifierGlue` is honoured it is ALSO the hyphen
  // in `margin-top`, which is the documented price of that one field (BLOCKED-03).
  operators: ["=", ">", "+", "~", "*", "/", "|", "!", "%", "&", ".", ",", ":", ";", "-"],
  // `()` for functions and pseudo-classes, `[]` for attribute selectors, and `{}`
  // for the rule block. The braces are a pair in the sense §7.1's Class 1 means —
  // "track pairing depth" — which is what Bracket Balance (PRG-11) drills, so a CSS
  // block scores as a bracket pair rather than as opaque markup. Excluding them
  // would report an `unrecognized-character` on every CSS snippet, and CNT-04's
  // gate would then refuse to publish any CSS content at all, which is a worse
  // outcome than the class question.
  brackets: ["(", ")", "[", "]", "{", "}"],
  regexLiteral: false,
  // No radix prefixes: a declaration value never carries `0x`.
  numberPrefixes: [],
  // `_` IS a legal digit separator in CSS, and CNT-05's number generator emits the
  // grouped form for every skin. This trainer TYPES literals; it does not evaluate
  // them, so the drill is about the form a person writes. Recorded as a known
  // divergence in docs/profiles/prg02-language-packs.md §4.6.
  digitSeparator: "_",
  // THE POINT OF THIS PACK. `#ff00aa`, `#fff` and `#fff0` are the colour literals
  // §7.1 puts in Class 6, and CNT-05 recorded that `hashMeaning: "colour"` existed
  // in the engine with no shipped profile declaring it, so a colour literal could
  // not be classified anywhere and the generator refused to emit one. This line is
  // what unblocks it: `#` is a colour ONLY here, and JavaScript's `#count` must
  // keep reading as an identifier (TOK-FIXTURE-004 pins both directions).
  hashMeaning: "colour",
  identifierExtra: "",
  // `font-size`, `margin-top`, `-webkit-box-shadow`: the hyphen continues a name.
  // Without this field the pack gets `#fff` right and `font-size` wrong, which is
  // why it is declared rather than left implicit.
  identifierGlue: "-",
};

export const PYTHON_PACK: LanguagePack = {
  ...PYTHON_PROFILE,
  // The one field Python needs. Raw (`r`), byte (`b`), unicode (`u`) and format
  // (`f`) prefixes are part of the literal in the language's own spelling, so they
  // are part of the token; listing `rb` and `br` and `fr` and `fR` as separate
  // string descriptors would be a combinatorial mess no reviewer could check, so
  // the pack declares the LETTERS and lets the lexer assemble them.
  stringPrefixes: [
    { letters: "r", interpolation: false },
    { letters: "u", interpolation: false },
    { letters: "b", interpolation: false },
    { letters: "f", interpolation: false },
  ],
  // `interpolation: false` on every prefix, including `f`, is deliberate and is the
  // honest answer today: an f-string's `{name}` is evaluated by Python, and the
  // lexer's template machinery splits on `${`, which does not exist in Python.
  // Classing the body as one opaque Class 4 literal is what §9.3.1 requires.
};

/** The generic fallback, shipped as a pack so resolution has one shape. */
export const GENERIC_PACK: LanguagePack = { ...GENERIC_PROFILE };

/**
 * The six packs ADR-007 settled on, in D6's priority order. The generic fallback is
 * deliberately NOT in this list: it is what an unknown id resolves TO, and keeping
 * it out of the catalogue is what stops a later contributor from adding it as a
 * seventh language.
 */
export const LANGUAGE_PACKS: readonly LanguagePack[] = [
  JAVASCRIPT_PACK,
  PYTHON_PACK,
  JAVA_PACK,
  SQL_PACK,
  HTML_PACK,
  CSS_PACK,
];
