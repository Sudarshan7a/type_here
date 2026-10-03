import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Imported from the package index on purpose: the export itself is part of
// the PRG-04 contract (WAVE 3 must be able to consume it from here).
import { sanitizeSnippet } from "../src/index";

describe("sanitizeSnippet (PRG-04 display-only contract)", () => {
  it("escapes HTML metacharacters", () => {
    expect(sanitizeSnippet('<b>bold</b> & "quoted"')).toBe(
      "&lt;b&gt;bold&lt;/b&gt; &amp; &quot;quoted&quot;",
    );
  });

  it("neutralises script tags as inert text", () => {
    expect(sanitizeSnippet('<script>alert("xss")</script>')).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
    );
  });

  it("strips an unquoted img onerror handler", () => {
    expect(sanitizeSnippet("<img src=x onerror=alert(1)>")).toBe("&lt;img src=x&gt;");
  });

  it("strips svg onload", () => {
    expect(sanitizeSnippet("<svg onload=alert(1)>")).toBe("&lt;svg&gt;");
  });

  it("strips an uppercase handler without touching the tag case", () => {
    expect(sanitizeSnippet("<IMG SRC=x ONERROR=alert(1)>")).toBe("&lt;IMG SRC=x&gt;");
  });

  it("strips a quoted handler value containing the other quote kind", () => {
    expect(sanitizeSnippet(`<div onclick="alert('x')">hi</div>`)).toBe("&lt;div&gt;hi&lt;/div&gt;");
  });

  it("strips a slash-separated handler", () => {
    expect(sanitizeSnippet("<svg/onload=alert(1)>")).toBe("&lt;svg&gt;");
  });

  it("neutralises a javascript: href to #", () => {
    expect(sanitizeSnippet('<a href="javascript:alert(1)">click</a>')).toBe(
      "&lt;a href=&quot;#&quot;&gt;click&lt;/a&gt;",
    );
  });

  it("neutralises a mixed-case javascript: href", () => {
    expect(sanitizeSnippet('<A HREF="JaVaScRiPt:alert(1)">x</A>')).toBe(
      "&lt;A HREF=&quot;#&quot;&gt;x&lt;/A&gt;",
    );
  });

  it("neutralises a whitespace-obfuscated javascript: href", () => {
    expect(sanitizeSnippet('<a href="java\tscript:alert(1)">x</a>')).toBe(
      "&lt;a href=&quot;#&quot;&gt;x&lt;/a&gt;",
    );
  });

  it("neutralises a data: URL in src", () => {
    expect(sanitizeSnippet('<img src="data:text/html,<script>alert(1)</script>">')).toBe(
      "&lt;img src=&quot;#&quot;&gt;",
    );
  });

  it("leaves safe URLs alone", () => {
    expect(sanitizeSnippet('<a href="https://example.com/x?a=1&b=2">x</a>')).toBe(
      "&lt;a href=&quot;https://example.com/x?a=1&amp;b=2&quot;&gt;x&lt;/a&gt;",
    );
  });

  it("defuses a quote-breakout followed by a tag with a handler", () => {
    expect(sanitizeSnippet('"><img src=x onerror=alert(1)>')).toBe("&quot;&gt;&lt;img src=x&gt;");
  });

  it("drops null bytes and control characters but keeps newline and tab", () => {
    expect(sanitizeSnippet("a\x00b\x00c")).toBe("abc");
    expect(sanitizeSnippet("a\x01\x02\x7Fb")).toBe("ab");
    expect(sanitizeSnippet("a\nb\tc")).toBe("a\nb\tc");
    expect(sanitizeSnippet("a\rb")).toBe("ab");
  });

  it("does not double-encode already-encoded entities", () => {
    expect(sanitizeSnippet("&lt;script&gt;")).toBe("&lt;script&gt;");
    expect(sanitizeSnippet("&amp;")).toBe("&amp;");
    expect(sanitizeSnippet("fish & chips")).toBe("fish &amp; chips");
    expect(sanitizeSnippet("&copy; 2026")).toBe("&copy; 2026");
  });

  it("escapes quotes and backticks", () => {
    expect(sanitizeSnippet("it's")).toBe("it&#x27;s");
    expect(sanitizeSnippet("`code`")).toBe("&#x60;code&#x60;");
  });

  it("preserves unicode including emoji, ZWJ sequences and astral planes", () => {
    expect(sanitizeSnippet("café 🎉 👩‍💻 <b>λ</b>")).toBe("café 🎉 👩‍💻 &lt;b&gt;λ&lt;/b&gt;");
  });

  it("returns empty string for empty string", () => {
    expect(sanitizeSnippet("")).toBe("");
  });

  it("rejects non-string input", () => {
    expect(() => sanitizeSnippet(null as unknown as string)).toThrow(TypeError);
  });

  it("is idempotent across the battery", () => {
    const cases = [
      '<script>alert("xss")</script>',
      "<img src=x onerror=alert(1)>",
      '<a href="javascript:alert(1)">click</a>',
      '<img src="data:text/html,<script>alert(1)</script>">',
      "&lt;script&gt; &amp; fish & chips",
      "café 🎉 👩‍💻 <b>λ</b>",
      "",
      "plain code: const x = a < b && c > d;",
    ];
    for (const input of cases) {
      const once = sanitizeSnippet(input);
      expect(sanitizeSnippet(once)).toBe(once);
    }
  });

  it("handles huge input quickly (linear-time sanity)", () => {
    const big = "<img src=x onerror=alert(1)>".repeat(20_000);
    const start = performance.now();
    const out = sanitizeSnippet(big);
    const elapsed = performance.now() - start;
    expect(out).toBe("&lt;img src=x&gt;".repeat(20_000));
    expect(elapsed).toBeLessThan(1000);
  });
});

describe("renderer ban (PRG-04 contract: no raw-HTML sink in apps/web/src)", () => {
  function listSourceFiles(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        listSourceFiles(full, out);
      } else if (/\.(ts|tsx)$/.test(entry)) {
        out.push(full);
      }
    }
    return out;
  }

  it("fails if dangerouslySetInnerHTML appears in apps/web/src", () => {
    const testsDir = dirname(fileURLToPath(import.meta.url));
    const webSrc = join(testsDir, "..", "..", "..", "apps", "web", "src");
    const offenders: string[] = [];
    for (const file of listSourceFiles(webSrc)) {
      const text = readFileSync(file, "utf8");
      const code = text
        .split("\n")
        .map((line) => line.replace(/\/\/.*$/, ""))
        .join("\n");
      if (code.includes("dangerouslySetInnerHTML")) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
