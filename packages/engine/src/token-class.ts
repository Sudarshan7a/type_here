/**
 * RealType typing engine (open-core, MIT) — the token-class taxonomy (PRG-01,
 * M5-01 step 1).
 *
 * These twelve classes are copied verbatim from master-spec-v1.md §7.1
 * ("Universal token classes") and are the numbers the rest of the programmer
 * track quotes — chapter 9's worked tables label tokens "Class 8: Keywords",
 * "Class 2: Operators" and so on, and ANA-05's dashboard groups by them. The
 * class names below are the ones the S4 Tree-sitter spike already used
 * (spikes/s4-tokenizer), so a grammar-derived map and a lexically-derived map
 * speak the same vocabulary and can be compared span-for-span.
 *
 * Deliberately NOT in this list:
 *  - A "punctuation" class. §7.1 has none, so `,` `;` `:` `.` join Class 2
 *    (Operators) — see TOKEN_CLASS_INFO.operator.note. The punctuation §7.1 does
 *    enumerate, `() [] {} <>`, is exactly Class 1.
 *  - A "regex" class. §7.1 puts regex under Class 12 (Data & markup) next to
 *    JSON/YAML/SQL, so a regex literal is `data`, not `string`. Typing a regex
 *    *is* string-shaped work, which is a real tension in the taxonomy; the spec
 *    wins, and the tension is recorded here so ANA-05 can decide otherwise
 *    later with a real reason rather than a re-derivation.
 *
 * The class identity is a scoring decision, so it lives here in the engine and
 * not in a view or a grammar adapter (AGENTS.md rule 3): the server recompute and
 * the client must agree on what class a keystroke counted towards.
 */

/** The twelve universal token classes, in §7.1 order. */
export const TOKEN_CLASSES = [
  "bracket",
  "operator",
  "chord",
  "string",
  "number",
  "number-system",
  "identifier",
  "keyword",
  "whitespace",
  "comment",
  "path",
  "data",
] as const;

export type TokenClass = (typeof TOKEN_CLASSES)[number];

export interface TokenClassInfo {
  /** §7.1 table number. Quoted by chapter 9 and by the fixture names. */
  readonly number: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  /** Stable machine key — the value itself, kept for map-based grouping. */
  readonly key: TokenClass;
  /** Short human label for the ANA-05 dashboard and legends. */
  readonly label: string;
  /** One line stating what belongs in the class. */
  readonly description: string;
  /** Anything a reader would otherwise have to reverse-engineer from the code. */
  readonly note?: string;
}

/**
 * Metadata per class. Kept next to the union rather than in a view so the
 * legend, the class filter and the aggregator cannot disagree about what a
 * class means.
 */
export const TOKEN_CLASS_INFO: Readonly<Record<TokenClass, TokenClassInfo>> = {
  bracket: {
    number: 1,
    key: "bracket",
    label: "Brackets & pairs",
    description:
      "Opening/closing round, square, curly and angle brackets, and their pairing depth.",
  },
  operator: {
    number: 2,
    key: "operator",
    label: "Operators",
    description: "Arithmetic, comparison, logical, bitwise, assignment and separator punctuation.",
    note: "§7.1 has no punctuation class, so separators (`,` `;` `:` `.`) are operators here. The punctuation §7.1 does enumerate — () [] {} <> — is Class 1.",
  },
  chord: {
    number: 3,
    key: "chord",
    label: "Multi-char chords",
    description:
      "Multi-character operators and access forms typed as one unit, e.g. => -> :: ?. ?? ... += ===",
    note: "D-M5-3. A chord is always ONE token span, so chord-internal timing works whether a member of the chord is classed here or as an operator — see the note on `operator` about `>=` vs `===`.",
  },
  string: {
    number: 4,
    key: "string",
    label: "Quotes, strings, escapes",
    description: "Quote characters, string bodies, escape sequences and interpolation markers.",
    note: "§9.3.1: content inside a string literal is entirely Class 4, including digits, because typing them is quote-context work, not numeric-literal work.",
  },
  number: {
    number: 5,
    key: "number",
    label: "Numbers",
    description: "Decimal integers, decimals, negatives, digit separators and scientific notation.",
  },
  "number-system": {
    number: 6,
    key: "number-system",
    label: "Number systems & IDs",
    description: "Hex/binary/octal literals and colour literals.",
    note: "UUID/SHA/IPv4/IPv6/CIDR/MAC/ISO-date/semver detection is deliberately absent: it is multi-token pattern work owned by PRG-13 / CNT-05, and guessing at it here would silently move characters between classes.",
  },
  identifier: {
    number: 7,
    key: "identifier",
    label: "Identifiers",
    description: "Names, including dotted and member-accessed ones.",
    note: "§9.3.2: a word after `.` is an identifier by syntactic position even when it is also a keyword (`obj.class`).",
  },
  keyword: {
    number: 8,
    key: "keyword",
    label: "Keywords",
    description:
      "The language's reserved words, including its `true`/`false`/`null`-style literals.",
  },
  whitespace: {
    number: 9,
    key: "whitespace",
    label: "Whitespace & structure",
    description: "Spaces, tabs and newlines, including indentation runs.",
    note: "D-M5-4: indentation is its own class so auto-indent can exclude it from typed counts.",
  },
  comment: {
    number: 10,
    key: "comment",
    label: "Comments & docs",
    description: "Comment markers, comment bodies and doc strings.",
    note: "§9.3.3: the whole comment is one class, so operator-looking characters inside it never reach operator analytics.",
  },
  path: {
    number: 11,
    key: "path",
    label: "Paths, URLs & flags",
    description: "Relative and drive-lettered paths and `--long` flags.",
    note: "Absolute POSIX paths and single-dash flags are deliberately not distinguished: `/` is far more often an operator or a regex in code snippets, and the `a - b` / `a -b` ambiguity cannot be resolved without a parser.",
  },
  data: {
    number: 12,
    key: "data",
    label: "Data & markup",
    description:
      "Regex literals and the JSON/YAML/HTML/SQL punctuation a language profile marks as data.",
  },
};

/** §7.1 number → class, so a stored content item keyed by class number validates. */
export const TOKEN_CLASS_BY_NUMBER: Readonly<Record<number, TokenClass>> = Object.freeze(
  Object.fromEntries(TOKEN_CLASSES.map((cls) => [TOKEN_CLASS_INFO[cls].number, cls])),
);

/** Narrowing guard for values crossing a schema boundary (stored content items). */
export function isTokenClass(value: unknown): value is TokenClass {
  return typeof value === "string" && (TOKEN_CLASSES as readonly string[]).includes(value);
}
