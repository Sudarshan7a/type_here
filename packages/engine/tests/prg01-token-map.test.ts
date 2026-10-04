import { describe, expect, it } from "vitest";

import {
  FALLBACK_LANGUAGE,
  assertTokenMap,
  GENERIC_PROFILE,
  JAVASCRIPT_PROFILE,
  PYTHON_PROFILE,
  TOKEN_CLASSES,
  TOKEN_CLASS_BY_NUMBER,
  TOKEN_CLASS_INFO,
  TOKENIZER_VERSION,
  knownLanguages,
  languageProfile,
  isTokenClass,
  tokenAt,
  tokenClassAt,
  tokenClassCounts,
  tokenize,
  tokenizeWithProfile,
  validateTokenMap,
  type LanguageProfile,
  type TokenMap,
} from "../src/index";

/** Compact `text:class` view, so a failing expectation reads like the rules. */
function shape(source: string, language: string): string[] {
  const map = tokenize(source, language);
  return map.spans.map((s) => `${source.slice(s.index, s.index + s.length)}:${s.class}`);
}

/** Same view, for a profile supplied directly rather than by language id. */
function shapeOf(source: string, profile: LanguageProfile): string[] {
  const map = tokenizeWithProfile(source, profile);
  return map.spans.map((s) => `${source.slice(s.index, s.index + s.length)}:${s.class}`);
}

describe("PRG-01 token map — taxonomy (master spec §7.1)", () => {
  it("has exactly the twelve §7.1 classes, in table order", () => {
    expect(TOKEN_CLASSES).toEqual([
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
    ]);
  });

  it("numbers each class as §7.1 does, and round-trips through the number map", () => {
    expect(TOKEN_CLASSES.map((cls) => TOKEN_CLASS_INFO[cls].number)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    for (const cls of TOKEN_CLASSES) {
      expect(TOKEN_CLASS_INFO[cls].key).toBe(cls);
      expect(TOKEN_CLASS_BY_NUMBER[TOKEN_CLASS_INFO[cls].number]).toBe(cls);
      expect(TOKEN_CLASS_INFO[cls].label.length).toBeGreaterThan(0);
      expect(TOKEN_CLASS_INFO[cls].description.length).toBeGreaterThan(0);
    }
  });

  it("accepts only real class names from stored content", () => {
    expect(isTokenClass("keyword")).toBe(true);
    expect(isTokenClass("Keywords")).toBe(false);
    expect(isTokenClass(8)).toBe(false);
    expect(isTokenClass(undefined)).toBe(false);
  });

  it("stamps the tokenizer version so a stored map can be re-tokenized (D-M5-2)", () => {
    expect(tokenize("x = 1", "javascript").tokenizerVersion).toBe(TOKENIZER_VERSION);
    expect(tokenize("x = 1", "javascript").source).toBe("lexical");
    expect(tokenize("x = 1", "javascript").grammarVersion).toBeNull();
    expect(tokenize("x = 1", "javascript").hasGrammarError).toBe(false);
  });
});

describe("PRG-01 token map — language profiles", () => {
  it("resolves the MVP language ids, including the TypeScript/JSX aliases", () => {
    expect(languageProfile("javascript")).toBe(JAVASCRIPT_PROFILE);
    expect(languageProfile("typescript")).toBe(JAVASCRIPT_PROFILE);
    expect(languageProfile("jsx")).toBe(JAVASCRIPT_PROFILE);
    expect(languageProfile("python")).toBe(PYTHON_PROFILE);
    expect(knownLanguages()).toContain("generic");
  });

  it("normalises case and surrounding space", () => {
    expect(languageProfile("  JavaScript ").id).toBe("javascript");
    expect(languageProfile("PYTHON").id).toBe("python");
  });

  it("falls back to generic for an unknown language instead of throwing", () => {
    expect(languageProfile("klingon")).toBe(GENERIC_PROFILE);
    expect(FALLBACK_LANGUAGE).toBe("generic");
    expect(tokenize("if (x)", "klingon").language).toBe("generic");
  });

  it("takes a new language as configuration, not code", () => {
    // A profile assembled here — with its own keyword and `#` meaning —
    // classifies correctly without any change to the lexer. This is the claim
    // PRG-02 (language packs) rests on.
    const invented: LanguageProfile = {
      ...GENERIC_PROFILE,
      id: "invented",
      keywords: new Set(["banana"]),
    };
    expect(shapeOf("banana # note\nbanana", GENERIC_PROFILE)).toEqual([
      "banana:identifier",
      " :whitespace",
      "# note:comment",
      "\n:whitespace",
      "banana:identifier",
    ]);
    expect(shapeOf("banana # note\nbanana", invented)).toEqual([
      "banana:keyword",
      " :whitespace",
      "# note:comment",
      "\n:whitespace",
      "banana:keyword",
    ]);
    // A profile that does not inherit the generic `#` behaviour must say so.
    const noHashComment: LanguageProfile = { ...GENERIC_PROFILE, hashMeaning: "colour" };
    expect(shapeOf("# note", noHashComment)).toEqual(["#:data", " :whitespace", "note:identifier"]);
  });

  it("resolves `#` by profile: colour, private field or comment", () => {
    const cssLike: LanguageProfile = { ...GENERIC_PROFILE, id: "css", hashMeaning: "colour" };
    expect(tokenizeWithProfile("#FF00AA", cssLike).spans).toEqual([
      { index: 0, length: 7, class: "number-system" },
    ]);
    expect(shape("#count = 1", "javascript")).toEqual([
      "#count:identifier",
      " :whitespace",
      "=:operator",
      " :whitespace",
      "1:number",
    ]);
    // In Python `#` opens a comment, so the rest of the line is comment text.
    expect(shape("# count = 1", "python")).toEqual(["# count = 1:comment"]);
  });

  it("keeps identifier alphabets per language", () => {
    expect(shape("$el", "javascript")).toEqual(["$el:identifier"]);
    // `$` is not a Python identifier character; it must not be silently absorbed.
    expect(tokenize("$el", "python").diagnostics.map((d) => d.code)).toEqual([
      "unrecognized-character",
    ]);
  });
});

describe("PRG-01 token map — precedence rules", () => {
  it("rule 1: comment markers beat operators", () => {
    expect(shape("a / b", "javascript")).toEqual([
      "a:identifier",
      " :whitespace",
      "/:operator",
      " :whitespace",
      "b:identifier",
    ]);
    // Same characters, different language, different class: in Python `//` is
    // floor division, so `b` is a name and not part of a comment.
    expect(shape("a // b", "python").slice(-3)).toEqual([
      "//:operator",
      " :whitespace",
      "b:identifier",
    ]);
  });

  it("rule 2: a string is opaque to numbers, comments and template openers", () => {
    expect(shape("'// /* ${ 42 }'", "javascript")).toEqual(["'// /* ${ 42 }':string"]);
  });

  it("rule 2: an escaped quote does not close the string", () => {
    // Without escape handling the string would end at the `\"`, and `b"` would
    // fall out of it.
    expect(shape('"a\\"b"', "javascript")).toEqual(['"a\\"b":string']);
    // …and here the escaped quote is the last character, so the literal is left
    // unterminated rather than quietly closed.
    const map = tokenize('"a\\"', "javascript");
    expect(map.spans).toEqual([{ index: 0, length: 4, class: "string" }]);
    expect(map.diagnostics.map((d) => d.code)).toEqual(["unterminated-string"]);
  });

  it("rule 3: only an interpolating profile splits `${…}`", () => {
    expect(shape("`a${b}c`", "javascript")).toEqual([
      "`:string",
      "a:string",
      "${:string",
      "b:identifier",
      "}:string",
      "c:string",
      "`:string",
    ]);
    expect(shape("`a${b}c`", "generic")).toEqual(["`a${b}c`:string"]);
    expect(shape("`a`", "python")).toEqual(["`:data", "a:identifier", "`:data"]);
  });

  it("rule 4: numbers are scanned before identifiers, so 0xff stays one token", () => {
    expect(shape("0xff", "javascript")).toEqual(["0xff:number-system"]);
    // A prefix with no digit of that radix is a plain zero plus a name.
    expect(shape("0x", "javascript")).toEqual(["0:number", "x:identifier"]);
  });

  it("rule 5: a reserved word after a dot is an identifier", () => {
    expect(shape("class", "javascript")).toEqual(["class:keyword"]);
    expect(shape("a.class", "javascript")).toEqual([
      "a:identifier",
      ".:operator",
      "class:identifier",
    ]);
    expect(shape("a?.class", "javascript")).toEqual([
      "a:identifier",
      "?.:chord",
      "class:identifier",
    ]);
    // …but a keyword in a real keyword position is still a keyword.
    expect(shape("class A {}", "javascript")[0]).toBe("class:keyword");
  });

  it("rule 6: multi-character operators split into two classes, one span each", () => {
    expect(shape("a >>>= b", "javascript")).toEqual([
      "a:identifier",
      " :whitespace",
      ">>>=:chord",
      " :whitespace",
      "b:identifier",
    ]);
    expect(shape("a >> b", "javascript")[2]).toBe(">>:operator");
    expect(shape("a >= b", "javascript")[2]).toBe(">=:operator");
    expect(shape("a == b", "javascript")[2]).toBe("==:operator");
    // A two-character operator must beat the bracket of its first character.
    expect(shape("a <= b", "javascript")[2]).toBe("<=:operator");
  });

  it("rule 7: angle brackets follow the language, not a guess", () => {
    expect(shape("a<b", "javascript")[1]).toBe("<:bracket");
    expect(shape("a<b", "python")[1]).toBe("<:operator");
  });

  it("rule 8: separator punctuation rides with operators", () => {
    // Full map, because a `:` separator and its class read identically in the
    // compact `text:class` view (`::operator`).
    expect(shape("a, b; c: d.e", "javascript")).toEqual([
      "a:identifier",
      ",:operator",
      " :whitespace",
      "b:identifier",
      ";:operator",
      " :whitespace",
      "c:identifier",
      "::operator",
      " :whitespace",
      "d:identifier",
      ".:operator",
      "e:identifier",
    ]);
  });

  it("keeps consecutive brackets as separate tokens for pairing depth", () => {
    expect(shape("f(x))", "javascript").slice(-2)).toEqual(["):bracket", "):bracket"]);
  });

  it("collapses a whitespace run into one Class 9 token (D-M5-4)", () => {
    expect(shape("a \n\t b", "javascript")[1]).toBe(" \n\t :whitespace");
  });

  it("nests braces inside an interpolation without ending it early", () => {
    expect(shape("`${ {a: 1} }`", "javascript")).toEqual([
      "`:string",
      "${:string",
      " :whitespace",
      "{:bracket",
      "a:identifier",
      "::operator",
      " :whitespace",
      "1:number",
      "}:bracket",
      " :whitespace",
      "}:string",
      "`:string",
    ]);
  });

  it("keeps an escaped backtick inside a template body", () => {
    expect(shape("`a\\`b${c}`", "javascript")).toEqual([
      "`:string",
      "a\\`b:string",
      "${:string",
      "c:identifier",
      "}:string",
      "`:string",
    ]);
  });
});

describe("PRG-01 token map — number and path literals", () => {
  it("reads a fraction and a signed exponent as one literal", () => {
    expect(shape("1.25", "javascript")).toEqual(["1.25:number"]);
    expect(shape("1e+5", "javascript")).toEqual(["1e+5:number"]);
    expect(shape(".5", "javascript")).toEqual([".5:number"]);
  });

  it("does not group a separator that has no digit after it", () => {
    expect(shape("1_", "javascript")).toEqual(["1:number", "_:identifier"]);
  });

  it("treats a bare `#` in JavaScript as unknown rather than a comment", () => {
    const map = tokenize("# 1", "javascript");
    expect(map.spans.map((s) => s.class)).toEqual(["data", "whitespace", "number"]);
    expect(map.diagnostics.map((d) => d.code)).toEqual(["unrecognized-character"]);
  });

  it("reads a drive-lettered path as Class 11", () => {
    expect(shape("open C:\\dir\\f.txt", "generic")).toEqual([
      "open:identifier",
      " :whitespace",
      "C:\\dir\\f.txt:path",
    ]);
  });

  it("does not read `--` as a flag when no name follows", () => {
    expect(shape("a-->b", "generic")).toEqual([
      "a:identifier",
      "--:chord",
      ">:bracket",
      "b:identifier",
    ]);
  });

  it("does not read a single dash as a flag", () => {
    expect(shape("a -b", "generic").slice(2)).toEqual(["-:operator", "b:identifier"]);
  });
});

describe("PRG-01 token map — regex vs division", () => {
  it("starts a regex where a value cannot end", () => {
    expect(shape("x = /ab/", "javascript")[4]).toBe("/ab/:data");
    expect(shape("f(/ab/)", "javascript")[2]).toBe("/ab/:data");
    expect(shape("return /ab/;", "javascript")[2]).toBe("/ab/:data");
  });

  it("treats / as division after anything that can end a value", () => {
    // Two divisions on one line: the naive "always try a regex first" reading
    // would swallow `/ b /` as a regex literal, because it does find a closing
    // slash. The previous-token rule is what makes this division.
    expect(shape("a / b / c", "javascript")).toEqual([
      "a:identifier",
      " :whitespace",
      "/:operator",
      " :whitespace",
      "b:identifier",
      " :whitespace",
      "/:operator",
      " :whitespace",
      "c:identifier",
    ]);
    expect(shape("(a)/2", "javascript")[3]).toBe("/:operator");
    expect(shape("[a]/2", "javascript")[3]).toBe("/:operator");
    expect(shape("a/2", "javascript")[1]).toBe("/:operator");
    expect(shape("/ab/ / 2", "javascript")[2]).toBe("/:operator");
    expect(shape("++/2", "javascript")[1]).toBe("/:operator");
    expect(shape("--/2", "javascript")[1]).toBe("/:operator");
    // `true` is a value; `typeof` is not.
    expect(shape("true/2", "javascript")[1]).toBe("/:operator");
    expect(shape("typeof /ab/", "javascript")[2]).toBe("/ab/:data");
  });

  it("never lets a regex run past its closing slash", () => {
    // Character class containing a slash.
    expect(shape("x = /[/]/", "javascript")[4]).toBe("/[/]/:data");
    // Escaped slash inside the body.
    expect(shape("x = /a\\/b/", "javascript")[4]).toBe("/a\\/b/:data");
    // A `]` right after `[` is a literal, not the end of the class.
    expect(shape("x = /[]]/", "javascript")[4]).toBe("/[]]/:data");
  });

  it("absorbs only real flag letters after a regex", () => {
    expect(shape("x = /ab/gim", "javascript")[4]).toBe("/ab/gim:data");
    // `b` is not a flag letter, so it stays a name instead of being swallowed —
    // and the following `/` is then division, because a name can end a value.
    expect(shape("x = /a\\//b/", "javascript").slice(4)).toEqual([
      "/a\\//:data",
      "b:identifier",
      "/:operator",
    ]);
  });

  it("falls back to division when the regex would cross a newline", () => {
    expect(shape("x = /a\nb/", "javascript")[4]).toBe("/:operator");
  });

  it("is disabled entirely for profiles without regex literals", () => {
    expect(shape("x = /ab/", "python").slice(4, 7)).toEqual([
      "/:operator",
      "ab:identifier",
      "/:operator",
    ]);
  });
});

describe("PRG-01 token map — damaged input", () => {
  it("stops an unterminated string at the newline and keeps going", () => {
    expect(shape("'a\nb'", "javascript")).toEqual([
      "'a:string",
      "\n:whitespace",
      "b:identifier",
      "':string",
    ]);
    // Two unterminated literals, both reported: the first at its newline and the
    // trailing quote at end of text.
    expect(tokenize("'a\nb'", "javascript").diagnostics).toEqual([
      { code: "unterminated-string", index: 0, text: "'a" },
      { code: "unterminated-string", index: 4, text: "'" },
    ]);
  });

  it("closes an escape at end of text without inventing a delimiter", () => {
    const map = tokenize('"abc\\', "javascript");
    expect(map.spans).toEqual([{ index: 0, length: 5, class: "string" }]);
    expect(map.diagnostics.map((d) => d.code)).toEqual(["unterminated-string"]);
  });

  it("reports an unterminated template at the backtick that opened it", () => {
    expect(tokenize("`abc", "javascript").diagnostics.map((d) => d.code)).toEqual([
      "unterminated-template",
    ]);
    expect(tokenize("`abc", "javascript").diagnostics[0]?.index).toBe(0);
    // Also when the text ends inside the interpolation.
    const nested = tokenize("x = `a${b", "javascript");
    expect(nested.diagnostics.map((d) => d.code)).toEqual(["unterminated-template"]);
    expect(nested.diagnostics[0]?.index).toBe(4);
    expect(validateTokenMap(nested)).toEqual([]);
  });

  it("truncates diagnostic text so a huge comment cannot bloat storage", () => {
    const map = tokenize(`/* ${"x".repeat(500)}`, "javascript");
    expect(map.diagnostics[0]?.text.length).toBeLessThanOrEqual(24);
    expect(map.diagnostics[0]?.code).toBe("unterminated-block-comment");
  });

  it("handles empty and whitespace-only text", () => {
    expect(tokenize("", "javascript").spans).toEqual([]);
    expect(validateTokenMap(tokenize("", "javascript"))).toEqual([]);
    expect(shape("   ", "javascript")).toEqual(["   :whitespace"]);
  });

  it("still tiles when a character belongs to no class", () => {
    const map = tokenize("a🎉b", "generic");
    expect(map.spans.map((s) => s.class)).toEqual(["identifier", "data", "data", "identifier"]);
    expect(validateTokenMap(map)).toEqual([]);
  });
});

describe("PRG-01 token map — queries", () => {
  const map = tokenize("if (x)", "javascript");

  it("finds the span covering a character offset", () => {
    expect(tokenAt(map, 0)).toEqual({ index: 0, length: 2, class: "keyword" });
    expect(tokenAt(map, 2)).toEqual({ index: 2, length: 1, class: "whitespace" });
    expect(tokenAt(map, 4)).toEqual({ index: 4, length: 1, class: "identifier" });
  });

  it("returns null outside the text rather than guessing", () => {
    expect(tokenAt(map, 6)).toBeNull();
    expect(tokenAt(map, -1)).toBeNull();
    expect(tokenAt(map, 1.5)).toBeNull();
    expect(tokenClassAt(map, 99)).toBeNull();
    expect(tokenClassAt(map, 3)).toBe("bracket");
  });

  it("counts characters and tokens per class, zero-filling absent classes", () => {
    const counts = tokenClassCounts(map);
    expect(counts.chars.keyword).toBe(2);
    expect(counts.chars.whitespace).toBe(1);
    expect(counts.chars.bracket).toBe(2);
    expect(counts.chars.identifier).toBe(1);
    expect(counts.tokens.bracket).toBe(2);
    expect(counts.chars.number).toBe(0);
    expect(counts.tokens.data).toBe(0);
    const totalChars = TOKEN_CLASSES.reduce((sum, cls) => sum + counts.chars[cls], 0);
    expect(totalChars).toBe(map.length);
  });
});

describe("PRG-01 token map — tiling validation (D-M5-2)", () => {
  const base = tokenize("abc", "generic");

  function withSpans(spans: TokenMap["spans"]): TokenMap {
    return { ...base, spans };
  }

  it("finds a gap", () => {
    expect(validateTokenMap(withSpans([{ index: 0, length: 1, class: "identifier" }]))).toEqual([
      { kind: "gap", index: 1 },
    ]);
  });

  it("finds a gap at the very start and at the very end", () => {
    expect(validateTokenMap(withSpans([]))).toEqual([{ kind: "gap", index: 0 }]);
    expect(validateTokenMap(withSpans([{ index: 1, length: 2, class: "identifier" }]))).toEqual([
      { kind: "gap", index: 0 },
    ]);
  });

  it("finds an overlap", () => {
    expect(
      validateTokenMap(
        withSpans([
          { index: 0, length: 3, class: "identifier" },
          { index: 2, length: 1, class: "identifier" },
        ]),
      ),
    ).toEqual([{ kind: "overlap", index: 2 }]);
  });

  it("finds a zero-length span", () => {
    expect(
      validateTokenMap(
        withSpans([
          { index: 0, length: 0, class: "identifier" },
          { index: 1, length: 2, class: "identifier" },
        ]),
      ),
    ).toEqual([
      { kind: "zero-length", index: 0 },
      { kind: "gap", index: 0 },
    ]);
  });

  it("finds a span running past the end of the text", () => {
    expect(validateTokenMap(withSpans([{ index: 0, length: 5, class: "identifier" }]))).toEqual([
      { kind: "out-of-range", index: 0 },
    ]);
  });

  it("finds spans that are out of order", () => {
    expect(
      validateTokenMap(
        withSpans([
          { index: 2, length: 1, class: "identifier" },
          { index: 0, length: 2, class: "identifier" },
        ]),
      ),
    ).toEqual([
      { kind: "gap", index: 0 },
      { kind: "unordered", index: 0 },
      { kind: "overlap", index: 0 },
    ]);
  });

  it("names the language and the first problem when it throws", () => {
    expect(() =>
      assertTokenMap(
        withSpans([
          { index: 0, length: 3, class: "identifier" },
          { index: 1, length: 3, class: "identifier" },
        ]),
      ),
    ).toThrow(/generic does not tile its text: overlap at 1 \(2 issue\(s\)\)/);
  });
});
