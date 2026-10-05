import { describe, expect, it } from "vitest";

import {
  grammarNodeClass,
  mappedGrammarNodeTypes,
  refineTokenMap,
  refineWithGrammar,
  tokenize,
  validateTokenMap,
  type GrammarNode,
  type GrammarParse,
  type TokenMap,
} from "../src/index";

/**
 * The refinement seam is tested with a FAKE grammar, not a real one, on purpose:
 * the engine has no grammar dependency by design (see the module header), so a
 * test that loaded web-tree-sitter would test a different package than the one
 * that ships. What must be proven here is the contract — node-type mapping,
 * whitespace filling, and the fallback — which is grammar-independent.
 *
 * The node types used below are the ones real Tree-sitter grammars emit, taken
 * from spike S4's observed output (spikes/s4-tokenizer/README.md).
 */
function parse(nodes: readonly GrammarNode[], hasError = false): GrammarParse {
  return { language: "javascript", grammarVersion: "test-grammar-1", nodes, hasError };
}

function shapeOf(map: TokenMap): string[] {
  return map.spans.map(
    (s) => `${JSON.stringify(map.text.slice(s.index, s.index + s.length))}:${s.class}`,
  );
}

describe("PRG-01 grammar seam — node-type mapping", () => {
  it("matches node types EXACTLY, never by substring (spike S4 finding 2)", () => {
    // "identifier" contains "if" (id-IF-ier). A substring classifier called every
    // identifier in the language a keyword.
    expect(grammarNodeClass("identifier")).toBe("identifier");
    expect(grammarNodeClass("property_identifier")).toBe("identifier");
    // A type that merely CONTAINS a mapped type must not inherit its class.
    expect(grammarNodeClass("my_identifier")).toBeNull();
    expect(grammarNodeClass("if")).toBeNull();
    expect(grammarNodeClass("")).toBeNull();
  });

  it("maps the node types the shipped grammars emit", () => {
    expect(grammarNodeClass("comment")).toBe("comment");
    expect(grammarNodeClass("string_fragment")).toBe("string");
    expect(grammarNodeClass("${")).toBe("string");
    expect(grammarNodeClass("integer")).toBe("number");
    expect(grammarNodeClass(")")).toBe("bracket");
    expect(grammarNodeClass("=>")).toBe("chord");
    expect(grammarNodeClass("===")).toBe("chord");
    expect(grammarNodeClass(">=")).toBe("operator");
    expect(grammarNodeClass("regex")).toBe("data");
    expect(grammarNodeClass("undefined")).toBe("identifier");
  });

  it("exposes its table in a stable, sorted order for reporting", () => {
    const types = mappedGrammarNodeTypes();
    expect(types).toEqual([...types].sort());
    expect(types.length).toBeGreaterThan(50);
    expect(new Set(types).size).toBe(types.length);
  });
});

describe("PRG-01 grammar seam — refinement", () => {
  it("lets the grammar override the lexical class where it knows more", () => {
    // The documented case the lexical map cannot win: `class` as an object key.
    // Lexically that is the reserved word; the grammar says it is a name.
    const lexical = tokenize("{ class: 1 }", "javascript");
    expect(shapeOf(lexical)).toContain('"class":keyword');

    const refined = refineTokenMap(
      lexical,
      parse([
        { startIndex: 2, endIndex: 7, type: "property_identifier" },
        { startIndex: 9, endIndex: 10, type: "number" },
      ]),
    );
    expect(shapeOf(refined)).toContain('"class":identifier');
    expect(refined.source).toBe("grammar");
    expect(refined.grammarVersion).toBe("test-grammar-1");
    expect(refined.hasGrammarError).toBe(false);
    expect(validateTokenMap(refined)).toEqual([]);
  });

  it("fills the whitespace a grammar never reports (Tree-sitter extras)", () => {
    const lexical = tokenize("if (x)", "javascript");
    const refined = refineTokenMap(lexical, parse([{ startIndex: 0, endIndex: 2, type: "if" }]));
    // `if` is not in the table (a language keyword node), so it inherits the
    // lexical class, and everything else is filled from the lexical map.
    expect(shapeOf(refined)).toEqual([
      '"if":keyword',
      '" ":whitespace',
      '"(":bracket',
      '"x":identifier',
      '")":bracket',
    ]);
    expect(validateTokenMap(refined)).toEqual([]);
  });

  it("preserves the lexical class for node types the table does not know", () => {
    const lexical = tokenize("x = 0xFF", "javascript");
    const refined = refineTokenMap(lexical, parse([{ startIndex: 4, endIndex: 8, type: "???" }]));
    expect(shapeOf(refined)).toContain('"0xFF":number-system');
  });

  it("classifies unknown nodes with no lexical source as data", () => {
    const lexical = tokenize("abcd", "generic");
    // Replace the spans with a gap: neither the node nor the tail the grammar left
    // uncovered has a lexical class to inherit.
    const gappy: TokenMap = { ...lexical, spans: [] };
    const refined = refineTokenMap(gappy, parse([{ startIndex: 0, endIndex: 2, type: "???" }]));
    expect(shapeOf(refined)).toEqual(['"ab":data', '"cd":data']);
    expect(validateTokenMap(refined)).toEqual([]);
  });

  it("drops zero-length nodes and nodes past the end of the text", () => {
    const lexical = tokenize("ab", "generic");
    const refined = refineTokenMap(
      lexical,
      parse([
        { startIndex: 1, endIndex: 1, type: "identifier" },
        { startIndex: 0, endIndex: 99, type: "identifier" },
      ]),
    );
    expect(shapeOf(refined)).toEqual(['"ab":identifier']);
    expect(validateTokenMap(refined)).toEqual([]);
  });

  it("fills an overlapping node's uncovered tail lexically and drops what adds nothing", () => {
    const lexical = tokenize("abcd", "generic");
    const refined = refineTokenMap(
      lexical,
      parse([
        { startIndex: 0, endIndex: 2, type: "comment" },
        // Overlaps the previous node: only `cd` is new, and it is not a class the
        // table knows, so it keeps the lexical class rather than being invented.
        { startIndex: 1, endIndex: 4, type: "identifier" },
        // Fully covered by the cursor: contributes nothing.
        { startIndex: 2, endIndex: 3, type: "keyword" },
      ]),
    );
    expect(shapeOf(refined)).toEqual(['"ab":comment', '"cd":identifier']);
    expect(validateTokenMap(refined)).toEqual([]);
  });

  it("does not require nodes to arrive in order", () => {
    const lexical = tokenize("a b", "generic");
    const refined = refineTokenMap(
      lexical,
      parse([
        { startIndex: 2, endIndex: 3, type: "comment" },
        { startIndex: 0, endIndex: 1, type: "comment" },
      ]),
    );
    expect(shapeOf(refined)).toEqual(['"a":comment', '" ":whitespace', '"b":comment']);
  });

  it("records a grammar that reported error nodes without discarding the map", () => {
    const lexical = tokenize("if (x", "javascript");
    const refined = refineTokenMap(
      lexical,
      parse([{ startIndex: 0, endIndex: 2, type: "if" }], true),
    );
    expect(refined.hasGrammarError).toBe(true);
    expect(refined.source).toBe("grammar");
  });
});

describe("PRG-01 grammar seam — M5-02 fallback", () => {
  it("refines through an async loader without the engine importing a grammar", async () => {
    const lexical = tokenize("obj.class = 1", "javascript");
    let loaded: string | null = null;
    const outcome = await refineWithGrammar(lexical, async (text) => {
      loaded = text;
      return parse([{ startIndex: 4, endIndex: 9, type: "property_identifier" }]);
    });
    expect(loaded).toBe("obj.class = 1");
    expect(outcome.refined).toBe(true);
    expect(outcome.grammarVersion).toBe("test-grammar-1");
    expect(outcome.note).toBeNull();
    expect(shapeOf(outcome.map)).toContain('"class":identifier');
  });

  it("keeps the lexical map and says why when the grammar cannot load", async () => {
    const lexical = tokenize("obj.class = 1", "javascript");
    const outcome = await refineWithGrammar(lexical, () =>
      Promise.reject(new Error("wasm blocked")),
    );
    expect(outcome.refined).toBe(false);
    expect(outcome.map).toBe(lexical);
    expect(outcome.map.source).toBe("lexical");
    expect(outcome.note).toBe("grammar load failed: wasm blocked");
  });

  it("reports a non-Error rejection without losing the message", async () => {
    const outcome = await refineWithGrammar(tokenize("x", "generic"), () =>
      Promise.reject("offline"),
    );
    expect(outcome.note).toBe("grammar load failed: offline");
  });

  it("notes an error-tolerant parse instead of calling it a failure", async () => {
    const outcome = await refineWithGrammar(tokenize("if (x", "javascript"), async () =>
      parse([{ startIndex: 0, endIndex: 2, type: "if" }], true),
    );
    expect(outcome.refined).toBe(true);
    expect(outcome.note).toBe(
      "grammar reported error nodes; the token map is error-tolerant and was still used",
    );
  });
});
