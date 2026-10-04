/**
 * RealType typing engine (open-core, MIT) — the optional grammar-refinement seam
 * (PRG-01, M5-02 steps 1–3).
 *
 * This module is the ONLY place the token engine talks about Tree-sitter, and it
 * does so purely as DATA: a loader callback the caller supplies. The engine
 * imports no grammar runtime, has no dependency on `web-tree-sitter`, and never
 * touches a `.wasm` URL. That is deliberate on three counts:
 *
 *  - The engine must run unchanged in Node, because the server recompute is the
 *    authoritative score (INT-01). A WASM grammar runtime cannot run there
 *    without a second, divergent implementation — which is exactly the
 *    "the replay disagrees with the live run" class of bug.
 *  - The bundle gate (`scripts/check-bundle-size.mjs`) fails the test page's
 *    build outright if ANY `.wasm` lands in `dist/assets`, and code mode already
 *    carries ~192 KB gzip for one grammar (spikes/s4-tokenizer). The grammar must
 *    therefore stay behind a runtime dynamic `import()` in the web app, fetched
 *    on demand for one language at a time.
 *  - D-M5-1 wants grammar-based token boundaries because they are *accurate*, and
 *    M5-02 wants a fallback when the grammar cannot load. Making the grammar an
 *    optional refinement of an always-correct lexical map gives both, instead of
 *    making the whole programmer track unavailable when WASM fails to load.
 *
 * WHY REFINE RATHER THAN REPLACE: Tree-sitter treats whitespace as an "extra" and
 * does not emit nodes for it, so a grammar-derived map has holes. Refinement
 * keeps the lexical map as the substrate — it covers every character, always —
 * and lets the grammar override the class where it actually knows more (a
 * property name, a keyword in a real keyword position, a JSX tag).
 *
 * WHY AN EXACT-MATCH NODE-TYPE TABLE: spike S4 finding 2. A classifier written as
 * `nodeType.includes("if")` classifies Tree-sitter's `identifier` node as a
 * keyword, because "id-IF-ier" contains "if" — every identifier in the language
 * became a keyword. So `grammarNodeClass` is a `Map` lookup, never `includes`,
 * and both outcomes are pinned by tests.
 */
import type { TokenMap, TokenSpan } from "./token-map.js";
import { assertTokenMap, tokenAt } from "./token-map.js";
import type { TokenClass } from "./token-class.js";

/**
 * The minimum a parser must provide. Deliberately structural rather than
 * Tree-sitter's own node type, so a caller can satisfy it with any parser — or
 * with a fixture in a unit test — and the engine never learns a grammar API.
 */
export interface GrammarNode {
  readonly startIndex: number;
  readonly endIndex: number;
  /** The grammar's node type, matched EXACTLY (see the module header). */
  readonly type: string;
}

export interface GrammarParse {
  readonly language: string;
  /** Grammar/runtime version, stored with the map per D-M5-2. */
  readonly grammarVersion: string;
  /** Leaf nodes covering the text. Whitespace need not be present. */
  readonly nodes: readonly GrammarNode[];
  /** The parser found error nodes. The map is still usable: parsers are error-tolerant. */
  readonly hasError: boolean;
}

/**
 * Async so the caller can `await import("web-tree-sitter")` and fetch the
 * grammar inside the callback. The engine's own module graph stays clean, which
 * is what keeps the grammar off the typing page's critical path.
 */
export type GrammarLoader = (text: string) => Promise<GrammarParse>;

/**
 * Node types whose class the grammar alone determines. Anything absent falls
 * back to the lexical class at the same offset, which is how language-specific
 * keyword nodes (`if`, `def`, `class`) stay correct without a per-language table.
 */
const NODE_CLASSES: ReadonlyMap<string, TokenClass> = new Map<string, TokenClass>([
  // Names. `undefined` is a real node type in tree-sitter-javascript.
  ...[
    "identifier",
    "property_identifier",
    "shorthand_property_identifier",
    "shorthand_property_identifier_pattern",
    "field_identifier",
    "type_identifier",
    "statement_identifier",
    "nested_identifier",
    "undefined",
  ].map((type) => [type, "identifier"] as const),
  // Comments and doc strings (§9.3.3: one node, one class, whatever it contains).
  ...["comment", "line_comment", "block_comment", "docstring"].map(
    (type) => [type, "comment"] as const,
  ),
  // Strings, escapes and interpolation markers (§9.3.1: digits inside stay here).
  ...[
    "string",
    "string_literal",
    "string_fragment",
    "raw_string_literal",
    "interpreted_string_literal",
    "concatenated_string",
    "char_literal",
    "character_literal",
    "escape_sequence",
    "template_string",
    "template_substitution",
    '"',
    "'",
    "`",
    "${",
  ].map((type) => [type, "string"] as const),
  // Numbers (Class 5) — a radix-prefixed literal is still Class 5 here because
  // the lexical map already decided Class 6 and no grammar node overrides it.
  ...[
    "number",
    "integer",
    "float",
    "number_literal",
    "int_literal",
    "integer_literal",
    "float_literal",
    "decimal_literal",
    "decimal_integer_literal",
    "decimal_floating_point_literal",
    "hex_integer_literal",
    "binary_integer_literal",
    "octal_integer_literal",
    "int",
    "float_literal_suffix",
  ].map((type) => [type, "number"] as const),
  // Brackets (§9.2.1 calls these "punctuation" and maps them to Class 1).
  ...["(", ")", "[", "]", "{", "}", "<", ">"].map((type) => [type, "bracket"] as const),
  // §7.1 Class 3: the D-M5-3 arrow/assignment/access family.
  ...[
    "=>",
    "->",
    "::",
    "?.",
    "??",
    "...",
    "++",
    "--",
    "+=",
    "-=",
    "*=",
    "/=",
    "%=",
    "**=",
    "<<=",
    ">>=",
    "&&=",
    "||=",
    "??=",
    "===",
    "!==",
  ].map((type) => [type, "chord"] as const),
  // Class 2: single- and multi-character operators and separator punctuation.
  ...[
    "+",
    "-",
    "*",
    "/",
    "%",
    "**",
    "=",
    "==",
    "!=",
    "<",
    ">",
    "<=",
    ">=",
    "&&",
    "||",
    "!",
    "&",
    "|",
    "^",
    "~",
    "<<",
    ">>",
    ">>>",
    ":=",
    "?",
    ":",
    ".",
    ",",
    ";",
    "@",
  ].map((type) => [type, "operator"] as const),
  // Class 12: §7.1 puts regex with JSON/YAML/SQL markup, not with strings.
  ...["regex", "regex_pattern", "regex_flags", "regex_literal"].map(
    (type) => [type, "data"] as const,
  ),
]);

/** Exact-match lookup. Never substring matching — see the module header. */
export function grammarNodeClass(type: string): TokenClass | null {
  return NODE_CLASSES.get(type) ?? null;
}

/** Exposed for tests and for content-pipeline reporting of unmapped node types. */
export function mappedGrammarNodeTypes(): readonly string[] {
  return [...NODE_CLASSES.keys()].sort();
}

/** Slice the lexical spans covering `[from, to)` — the gap filler. */
function lexicalSlice(map: TokenMap, from: number, to: number, out: TokenSpan[]): void {
  let index = from;
  while (index < to) {
    const span = tokenAt(map, index);
    if (span === null) {
      // Only reachable for a map that does not tile, which assertTokenMap
      // rejects; emitting a single `data` span keeps the output well-formed
      // instead of throwing in the middle of a refinement.
      out.push({ index, length: to - index, class: "data" });
      return;
    }
    const start = Math.max(index, span.index);
    const end = Math.min(to, span.index + span.length);
    out.push({ index: start, length: end - start, class: span.class });
    index = end;
  }
}

/**
 * Apply a grammar parse to a lexical map.
 *
 * The grammar wins on class wherever it has a node; the lexical map fills every
 * character the grammar left out (whitespace, most importantly). The result is
 * asserted to tile, so a grammar that reports nonsense fails loudly here at
 * publish time rather than silently in the dashboard.
 */
export function refineTokenMap(map: TokenMap, parse: GrammarParse): TokenMap {
  const nodes = [...parse.nodes].sort((a, b) => a.startIndex - b.startIndex);
  const spans: TokenSpan[] = [];
  let cursor = 0;
  for (const node of nodes) {
    const start = Math.max(node.startIndex, 0);
    const end = Math.min(node.endIndex, map.length);
    // Zero-length and out-of-range nodes are dropped: they carry no character
    // and would otherwise produce a span the invariant forbids.
    if (end <= start) continue;
    // A node overlapping the previous one is truncated to the uncovered part,
    // which keeps the output tiling without trusting the parser's nesting.
    if (start < cursor) {
      if (end <= cursor) continue;
      lexicalSlice(map, cursor, end, spans);
      cursor = end;
      continue;
    }
    lexicalSlice(map, cursor, start, spans);
    const lexical = tokenAt(map, start);
    const cls = grammarNodeClass(node.type) ?? lexical?.class ?? "data";
    spans.push({ index: start, length: end - start, class: cls });
    cursor = end;
  }
  lexicalSlice(map, cursor, map.length, spans);

  const refined: TokenMap = {
    ...map,
    spans,
    source: "grammar",
    grammarVersion: parse.grammarVersion,
    hasGrammarError: parse.hasError,
  };
  assertTokenMap(refined);
  return refined;
}

export interface GrammarRefinementOutcome {
  readonly map: TokenMap;
  /** False when the lexical map was kept as-is (the documented M5-02 fallback). */
  readonly refined: boolean;
  readonly grammarVersion: string | null;
  /**
   * Why the caller should know something happened: either the grammar never
   * loaded, or it loaded and reported error nodes. Null on a clean refinement.
   * Never swallowed silently — a caller that shows "token analytics
   * unavailable" needs the reason, and a user silently given worse analytics is
   * worse than one told the truth.
   */
  readonly note: string | null;
}

/**
 * Load a grammar and refine, degrading to the lexical map if the grammar cannot
 * be loaded — WASM blocked, offline, or the grammar/runtime version mismatch
 * that spike S4 measured as a runtime-only failure. This is M5-02's fallback
 * made explicit rather than implicit.
 *
 * Only the LOADER can fail. Parser output cannot: `refineTokenMap` clamps,
 * drops and fills whatever it is given and then asserts the result tiles, so
 * there is no parser output to fall back from.
 */
export async function refineWithGrammar(
  map: TokenMap,
  load: GrammarLoader,
): Promise<GrammarRefinementOutcome> {
  let parse: GrammarParse;
  try {
    parse = await load(map.text);
  } catch (error) {
    return {
      map,
      refined: false,
      grammarVersion: null,
      note: `grammar load failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  const refined = refineTokenMap(map, parse);
  return {
    map: refined,
    refined: true,
    grammarVersion: refined.grammarVersion,
    note: parse.hasError
      ? "grammar reported error nodes; the token map is error-tolerant and was still used"
      : null,
  };
}
