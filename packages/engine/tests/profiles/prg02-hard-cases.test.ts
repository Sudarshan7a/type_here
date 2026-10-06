import { describe, expect, it } from "vitest";

import { PACK_FIXTURES } from "../../fixtures/tok02.js";
import {
  CSS_PACK,
  GENERIC_PACK,
  HTML_PACK,
  JAVA_PACK,
  PYTHON_PACK,
  SQL_PACK,
  JAVASCRIPT_PACK,
  tokenizePacked,
  type LanguagePack,
} from "../../src/profiles";
import { tokenizeWithProfile } from "../../src/token-map";

/** `text:class` per span, so a failing expectation reads like the rule it breaks. */
function shapeOf(source: string, pack: LanguagePack | string): string[] {
  const map =
    typeof pack === "string" ? tokenizePacked(source, pack) : tokenizeWithProfile(source, pack);
  return map.spans.map(
    (span) => `${source.slice(span.index, span.index + span.length)}:${span.class}`,
  );
}

describe("PRG-02 failing direction — `#` is a language fact, not a character property", () => {
  it("a JavaScript private field is an identifier, NEVER a CSS colour", () => {
    // The direction that would quietly corrupt Class 6 and Class 7 analytics: if
    // `#` were resolved by shape alone, every private field would be counted as a
    // hex literal and a `#fff` colour in JSX-style code would vanish.
    expect(shapeOf("this.#count = 1", JAVASCRIPT_PACK)).toEqual([
      "this:keyword",
      ".:operator",
      "#count:identifier",
      " :whitespace",
      "=:operator",
      " :whitespace",
      "1:number",
    ]);
    expect(shapeOf("this.#count = 1", JAVASCRIPT_PACK)).not.toContain("#count:number-system");
  });

  it("a six-hex private field name is still a name, not a colour", () => {
    expect(shapeOf("class Box { #fff = 1; }", JAVASCRIPT_PACK)).toContain("#fff:identifier");
  });

  it("`#fff` lexes as a colour in CSS — CNT-05's deferred form, now classified", () => {
    expect(shapeOf("a { color: #fff; }", CSS_PACK)).toEqual([
      "a:identifier",
      " :whitespace",
      "{:bracket",
      " :whitespace",
      "color:identifier",
      "::operator",
      " :whitespace",
      "#fff:number-system",
      ";:operator",
      " :whitespace",
      "}:bracket",
    ]);
  });

  it("the SAME text disagrees between the two packs, in both directions", () => {
    const source = "x = #fff";
    expect(shapeOf(source, CSS_PACK)).toContain("#fff:number-system");
    expect(shapeOf(source, JAVASCRIPT_PACK)).toContain("#fff:identifier");
    expect(shapeOf(source, PYTHON_PACK)).toContain("#fff:comment");
    expect(shapeOf(source, SQL_PACK)).toContain("#fff:identifier");
    expect(shapeOf(source, GENERIC_PACK)).toContain("#fff:comment");
  });

  it("neither pack raises an unrecognised-character on its OWN code", () => {
    // CNT-04's gate fails a snippet that produces diagnostics, so a colour literal
    // must classify CLEANLY for the generator to be allowed to emit one — and a
    // private field must classify cleanly too.
    expect(tokenizePacked("a { color: #ff00aa; }", CSS_PACK.id).diagnostics).toEqual([]);
    expect(tokenizePacked("this.#count = 1;", JAVASCRIPT_PACK.id).diagnostics).toEqual([]);
  });

  it("an id selector in CSS is reported rather than guessed as a colour", () => {
    // `#abc` IS a colour; `#main` is not. Guessing either way would put a real
    // selector into Class 6, so the pack fails loudly and the snippet is refused.
    const map = tokenizePacked("#main { color: #abc; }", CSS_PACK.id);
    expect(map.diagnostics.map((d) => d.code)).toEqual(["unrecognized-character"]);
    expect(shapeOf("#main { color: #abc; }", CSS_PACK)).toContain("#abc:number-system");
    expect(shapeOf("#main { color: #abc; }", CSS_PACK)).not.toContain("#main:number-system");
  });
});

describe("PRG-02 failing direction — Python string forms", () => {
  it("`//` is floor division in Python and a comment in JavaScript, unchanged", () => {
    // PRG-01's rule, re-asserted per pack so a new pack cannot quietly change it.
    expect(shapeOf("ratio = a // b", PYTHON_PACK)).toContain("//:operator");
    expect(shapeOf("ratio = a // b", JAVASCRIPT_PACK)).toContain("// b:comment");
    expect(shapeOf("ratio = a // b", SQL_PACK)).toContain("/:operator");
  });

  it("a raw-string body is one opaque Class 4 token, digits and escapes included", () => {
    // §9.3.1: the `404` inside a string is quote-context work, never Class 5.
    expect(shapeOf('p = "Error 404"', PYTHON_PACK)).toEqual([
      "p:identifier",
      " :whitespace",
      "=:operator",
      " :whitespace",
      '"Error 404":string',
    ]);
  });

  it("an f-string body keeps its braces inside the literal", () => {
    // Python has no `${`, so the template rule must not fire: `{name}` is not a
    // bracket and `!` is not an operator.
    expect(shapeOf('msg = f"{name}!"', PYTHON_PACK)).toEqual([
      "msg:identifier",
      " :whitespace",
      "=:operator",
      " :whitespace",
      "f:identifier",
      '"{name}!":string',
    ]);
  });

  it.fails(
    "BLOCKED-02: the `r`/`b`/`f` prefix belongs to the literal (needs stringPrefixes)",
    () => {
      // The intended answer once packages/engine/src/token-map.ts honours
      // stringPrefixes: the prefix characters join the literal as Class 4.
      expect(shapeOf('p = r"\\d+"', PYTHON_PACK)).toEqual([
        "p:identifier",
        " :whitespace",
        "=:operator",
        " :whitespace",
        'r"\\d+":string',
      ]);
    },
  );

  it("BLOCKED-02 today: the prefix is a name and the body is still Class 4", () => {
    // Characterisation of the gap, so the current behaviour is on the record and
    // the fix cannot land unnoticed. Severity is LOW: no character is unclassified.
    const map = tokenizePacked('p = r"\\d+"', PYTHON_PACK.id);
    expect(map.diagnostics).toEqual([]);
    expect(map.spans.map((s) => map.text.slice(s.index, s.index + s.length))).toEqual([
      "p",
      " ",
      "=",
      " ",
      "r",
      '"\\d+"',
    ]);
    expect(PYTHON_PACK.stringPrefixes?.map((prefix) => prefix.letters).sort()).toEqual([
      "b",
      "f",
      "r",
      "u",
    ]);
  });
});

describe("PRG-02 failing direction — Java text blocks and shifts", () => {
  it("`--` is a decrement chord in Java and a comment in SQL — one pack, two answers", () => {
    expect(shapeOf("for (int i = n; i > 0; i--) {}", JAVA_PACK)).toContain("--:chord");
    expect(shapeOf("SELECT 1 -- d", SQL_PACK)).toContain("-- d:comment");
  });

  it("a character literal is one Class 4 token, backslash and all", () => {
    expect(shapeOf("char q = '\\'';", JAVA_PACK)).toContain("'\\'':string");
  });

  it("BLOCKED-01 fixed: a Java text block is ONE Class 4 span", () => {
    // packages/engine/src/token-map.ts compares `ch === spec.close`, one character
    // against a string, so a 3-character `close` can never match and the literal
    // runs to end of text. See docs/profiles/prg02-language-packs.md §6.
    expect(shapeOf('String q = """\n  hello\n  """;', JAVA_PACK)).toEqual([
      "String:identifier",
      " :whitespace",
      "q:identifier",
      " :whitespace",
      "=:operator",
      " :whitespace",
      '"""\n  hello\n  """:string',
      ";:operator",
    ]);
  });

  it("BLOCKED-01 fixed: a Java text block closes, so it reports no diagnostic", () => {
    const source = 'String q = """\n  hello\n  """;';
    const map = tokenizePacked(source, JAVA_PACK.id);
    // The literal used to run to end of text and be reported unterminated,
    // which also corrupted every per-class statistic after it. The closer is
    // now matched as a whole.
    expect(map.diagnostics.map((d) => d.code)).not.toContain("unterminated-string");
    expect(JAVA_PACK.strings.some((spec) => spec.open === '"""' && spec.close === '"""')).toBe(
      true,
    );
  });

  it("BLOCKED-01 fixed: a Python triple-quoted docstring closes at the closing delimiter", () => {
    expect(shapeOf('"""doc"""\nx = 1', PYTHON_PACK)).toEqual([
      '"""doc""":string',
      "\n:whitespace",
      "x:identifier",
      " :whitespace",
      "=:operator",
      " :whitespace",
      "1:number",
    ]);
  });

  it("BLOCKED-01 fixed: a Python docstring closes and the code after it is classified", () => {
    // The worst failure mode PRG-01 named: an unterminated literal corrupted
    // every per-class statistic after it. It now closes where it should.
    const map = tokenizePacked('"""doc"""\nx = 1', PYTHON_PACK.id);
    expect(map.diagnostics.map((d) => d.code)).toEqual([]);
  });
});

describe("PRG-02 failing direction — SQL comment versus operator versus division", () => {
  it("keeps three `--`/`-` forms apart in one statement", () => {
    const shape = shapeOf("SELECT a - b, c -- d\nFROM t", SQL_PACK);
    expect(shape).toContain("-:operator");
    expect(shape).toContain("-- d:comment");
    expect(shape).not.toContain("-:comment");
  });

  it("`/` is only ever division, because the pack declares no regex literal", () => {
    expect(shapeOf("SELECT total / 2 FROM t", SQL_PACK)).toContain("/:operator");
    expect(shapeOf("SELECT total / 2 FROM t", JAVASCRIPT_PACK)).toContain("/:operator");
  });

  it("a signed literal after a comma is Class 5, and after a value it is two spans", () => {
    expect(shapeOf("SELECT -1 FROM t", SQL_PACK)).toContain("-1:number");
    expect(shapeOf("SELECT a - 1 FROM t", SQL_PACK)).toEqual([
      "SELECT:keyword",
      " :whitespace",
      "a:identifier",
      " :whitespace",
      "-:operator",
      " :whitespace",
      "1:number",
      " :whitespace",
      "FROM:keyword",
      " :whitespace",
      "t:identifier",
    ]);
  });

  it("`/* */` is the second comment form, in the same statement as `--`", () => {
    expect(shapeOf("SELECT 1 /* a */ , 2 -- b", SQL_PACK)).toEqual([
      "SELECT:keyword",
      " :whitespace",
      "1:number",
      " :whitespace",
      "/* a */:comment",
      " :whitespace",
      ",:operator",
      " :whitespace",
      "2:number",
      " :whitespace",
      "-- b:comment",
    ]);
  });

  it("`::` and `||` are Class 3 in SQL, and `<>` is not-equal", () => {
    const shape = shapeOf("SELECT a::text, b || c WHERE d <> 1", SQL_PACK);
    expect(shape).toContain("::" + ":chord");
    expect(shape).toContain("||:chord");
    expect(shape).toContain("<>:chord");
  });
});

describe("PRG-02 failing direction — HTML attribute value versus text node", () => {
  it("an attribute value is Class 4 and the text node around it is not", () => {
    const shape = shapeOf('<a href="x">y</a>', HTML_PACK);
    expect(shape).toContain('"x":string');
    expect(shape).toContain("y:identifier");
    expect(shape.filter((span) => span.endsWith(":string"))).toEqual(['"x":string']);
  });

  it("an apostrophe inside a double-quoted value does not end the token", () => {
    // The case a naive "both quote styles are strings" implementation gets wrong.
    expect(shapeOf('<a title="it\'s here">z</a>', HTML_PACK)).toContain('"it\'s here":string');
  });

  it("an HTML comment is one Class 10 span, `--` inside it notwithstanding", () => {
    expect(shapeOf("<p>x</p><!-- a -- b -->", HTML_PACK)).toContain("<!-- a -- b -->:comment");
  });

  it.fails("BLOCKED-04: a text node is Class 12 (needs markupScan)", () => {
    expect(shapeOf('<a href="x">y</a>', HTML_PACK)).toContain("y:data");
  });

  it("BLOCKED-04 today: the pack declares the region it would need, and the fixture says so", () => {
    expect(HTML_PACK.markupScan).toEqual({
      tagOpen: "<",
      tagClose: ">",
      embedded: { script: "javascript", style: "css" },
    });
  });

  it.fails(
    "BLOCKED-03: a hyphenated attribute name is ONE identifier (needs identifierGlue)",
    () => {
      expect(shapeOf('<div data-id="x">', HTML_PACK)).toContain('data-id="x":identifier');
    },
  );
});

describe("PRG-02 failing direction — CSS is more than a colour literal", () => {
  it.fails("BLOCKED-03: `margin-top` is one identifier", () => {
    expect(shapeOf("a { margin-top: 0; }", CSS_PACK)).toContain("margin-top:identifier");
  });

  it("BLOCKED-03 today: the hyphen is a Class 2 operator between two names", () => {
    const shape = shapeOf("a { margin-top: 0; }", CSS_PACK);
    expect(shape).toContain("margin:identifier");
    expect(shape).toContain("-:operator");
    expect(shape).toContain("top:identifier");
    expect(CSS_PACK.identifierGlue).toBe("-");
  });

  it("a CSS property VALUE is never a keyword, because CSS has no keywords", () => {
    // `red` is an identifier whose meaning comes from the property it sits in;
    // listing it as a keyword would put every colour name into Class 8.
    expect(CSS_PACK.keywords.size).toBe(0);
    expect(shapeOf("a { color: red; display: flex; }", CSS_PACK)).toContain("red:identifier");
  });

  it("colour literals of every legal CSS length are Class 6", () => {
    // #RGB, #RGBA, #RRGGBB, #RRGGBBAA — the four forms CSS actually has.
    const shape = shapeOf("a { a: #abc; b: #abcd; c: #aabbcc; d: #aabbccdd; }", CSS_PACK);
    for (const literal of ["#abc", "#abcd", "#aabbcc", "#aabbccdd"]) {
      expect(shape, literal).toContain(`${literal}:number-system`);
    }
  });

  it("an impossible colour length is reported rather than treated as one", () => {
    // CSS shorthand is 3 or 4 digits after the `#`; `#f` is not a colour in any
    // language, so the profile must say so instead of inventing a Class 6 literal.
    const map = tokenizePacked("a { a: #f; }", CSS_PACK.id);
    expect(map.diagnostics.map((d) => d.code)).toEqual(["unrecognized-character"]);
    expect(map.spans.some((span) => span.class === "number-system")).toBe(false);
  });
});

describe("PRG-02 failing direction — an unknown language degrades predictably", () => {
  it("falls back to generic rather than throwing", () => {
    for (const id of ["klingon", "", "  ", "javascripts", "ts!", "rust", "c++"]) {
      expect(() => tokenizePacked("x = 1", id)).not.toThrow();
      expect(tokenizePacked("x = 1", id).language).toBe("generic");
    }
  });

  it("does NOT silently use the javascript pack, which is the failure that matters", () => {
    // `#fff` is a comment under the fallback and an identifier under javascript, so
    // the two are distinguishable — and a mistyped id must land on the honest one.
    expect(shapeOf("#fff x", "klingon")).toEqual(["#fff x:comment"]);
    expect(shapeOf("#fff x", "javascript")).toEqual([
      "#fff:identifier",
      " :whitespace",
      "x:identifier",
    ]);
  });

  it("stamps the map with the profile that was used, so a stored map says so", () => {
    expect(tokenizePacked("x = 1", "klingon").language).toBe("generic");
    expect(tokenizePacked("x = 1", "typescript").language).toBe("javascript");
  });

  it("CONTROL: the fixture comparison fails when one class is wrong", () => {
    // The no-mutation control for every assertion above: if a fixture comparison
    // could not fail, none of the pinned expectations would mean anything.
    const fixture = PACK_FIXTURES.find(
      (f) => f.id === "TOK-PACK-js-private-field-is-never-a-colour",
    );
    expect(fixture).toBeDefined();
    const tampered = fixture!.expected.map((span, at) =>
      at === 6 ? { ...span, class: "number-system" as const } : span,
    );
    const map = tokenizePacked(fixture!.source, fixture!.language);
    expect(map.spans.map((span) => span.class)).not.toEqual(tampered.map((span) => span.class));
  });
});
