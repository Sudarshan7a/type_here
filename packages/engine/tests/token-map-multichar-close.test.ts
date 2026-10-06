import { describe, expect, it } from "vitest";

import { TOKENIZER_VERSION, tokenizeWithProfile } from "../src/token-map.js";
import { JAVASCRIPT_PROFILE, PYTHON_PROFILE } from "../src/language-profiles.js";

/**
 * A closer may be more than one character. Java text blocks and Python
 * docstrings both close on three characters; before 1.1.0 the lexer compared a
 * single character against the whole closer, so those literals never terminated
 * and swallowed everything after them.
 */
describe("multi-character string closers (TOKENIZER_VERSION 1.1.0)", () => {
  it("a Python docstring terminates and the code after it is still classified", () => {
    const src = 'def f():\n    """Docs."""\n    return 1\n';
    const { spans } = tokenizeWithProfile(src, PYTHON_PROFILE);
    const texts = spans.map((s) => src.slice(s.index, s.index + s.length));
    expect(texts).toContain('"""Docs."""');
    // The whole tail is one docstring only if the closer was missed; `return`
    // and the number must be their own spans.
    expect(texts.some((t) => t.includes("return"))).toBe(true);
    expect(texts.some((t) => t.trim() === "1")).toBe(true);
    expect(texts.filter((t) => t.includes("Docs"))).toHaveLength(1);
  });

  it("a Python triple-quoted string terminates and the code after it survives", () => {
    // Python is the profile that already declares a three-character closer;
    // Java's text block shares the same mechanism and is covered by PRG-02.
    const src = 'x = """\nhello\n"""\ny = 1\n';
    const { spans } = tokenizeWithProfile(src, PYTHON_PROFILE);
    const texts = spans.map((s) => src.slice(s.index, s.index + s.length));
    expect(texts.some((t) => t.includes("hello"))).toBe(true);
    // If the closer were missed, `y` and `1` would be swallowed by the string.
    expect(texts.some((t) => t.trim() === "y")).toBe(true);
    expect(texts.some((t) => t.trim() === "1")).toBe(true);
  });

  it("an empty triple-quoted string is one span, not a run to end of text", () => {
    const { spans } = tokenizeWithProfile('""""""\n', PYTHON_PROFILE);
    expect(spans).toHaveLength(2); // the string, then the newline
    expect(spans[0]?.length).toBe(6);
  });

  it("an unterminated docstring is reported, not silently accepted", () => {
    const { diagnostics } = tokenizeWithProfile('x = """never closed\n', PYTHON_PROFILE);
    expect(diagnostics.map((d) => d.code)).toContain("unterminated-string");
  });

  it("a single quote inside a docstring does not close it early", () => {
    const src = '"""a "quoted" word"""\n';
    const { spans, diagnostics } = tokenizeWithProfile(src, PYTHON_PROFILE);
    expect(diagnostics).toHaveLength(0);
    expect(spans).toHaveLength(2); // the whole literal, then the newline
    expect(spans[0]?.length).toBe('"""a "quoted" word"""'.length);
  });

  it("single-character closers are unaffected", () => {
    // Regression guard: the fix must not change the overwhelmingly common case.
    const src = 'const a = "x"; const b = 1;';
    const { spans } = tokenizeWithProfile(src, JAVASCRIPT_PROFILE);
    const texts = spans.map((s) => src.slice(s.index, s.index + s.length));
    expect(texts).toContain('"x"');
    expect(texts.some((t) => t.trim() === "1")).toBe(true);
  });

  it("the version records the change", () => {
    expect(TOKENIZER_VERSION).toBe("1.1.0");
  });
});
