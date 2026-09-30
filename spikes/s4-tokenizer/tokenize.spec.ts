import { expect, test } from "@playwright/test";

/**
 * S4 — tokenizer feasibility (LAB PROXY: headless Chromium, synthetic).
 *
 * The chapter's §9.2.1 table is compared against what a real Tree-sitter
 * JavaScript grammar actually produces for `if (count >= max) {`. Where the
 * real output differs from the table, the difference is asserted explicitly
 * so it cannot regress unnoticed — see the spike README for why each
 * difference occurs.
 */

interface Token {
  text: string;
  start: number;
  end: number;
  nodeType: string;
  cls: string;
}
interface S4Result {
  source: string;
  runtimeReadyMs: number;
  grammarReadyMs: number;
  tokens: Token[];
  nodeTypeCount: number;
  errorCount: number;
  error?: string;
}

// docs/chapter-9-deep-dive-token-engine-part1.md §9.2.1 (worked table)
const CHAPTER_TOKENS: { text: string; cls: string }[] = [
  { text: "if", cls: "keyword" },
  { text: "(", cls: "bracket" },
  { text: "count", cls: "identifier" },
  { text: ">=", cls: "operator" },
  { text: "max", cls: "identifier" },
  { text: ")", cls: "bracket" },
  { text: "{", cls: "bracket" },
];

test("real Tree-sitter grammar produces the chapter's token map (with 2 documented divergences)", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.waitForFunction(() => (window as unknown as { __s4?: unknown }).__s4 !== undefined);
  const result = (await page.evaluate(
    () => (window as unknown as { __s4: S4Result }).__s4,
  )) as S4Result;

  testInfo.annotations.push({
    type: "load-times",
    description:
      `runtime ${result.runtimeReadyMs?.toFixed(0)}ms, javascript grammar ` +
      `${result.grammarReadyMs?.toFixed(0)}ms`,
  });

  expect(result.error, `spike page error: ${result.error ?? ""}`).toBeUndefined();
  expect(result.source).toBe("if (count >= max) {");

  // Every non-empty leaf token, in order.
  const leaves = result.tokens.filter((t) => t.text !== "");

  // 1. Structure: same tokens, same order, same positions as the chapter.
  expect(leaves.map((t) => t.text)).toEqual(CHAPTER_TOKENS.map((t) => t.text));
  expect(leaves.map((t) => [t.start, t.end])).toEqual([
    [0, 2],
    [3, 4],
    [4, 9],
    [10, 12],
    [13, 16],
    [16, 17],
    [18, 19],
  ]);

  // 2. Classes: the chapter's table says `count`/`max` are Class 7
  //    (Identifiers). A real grammar emits node type `identifier`, so our
  //    classifier must map it to Class 7 — the table is right about the
  //    intended class, and the mapping is proven here.
  const byText = new Map(leaves.map((t) => [t.text, t]));
  expect(byText.get("count")?.nodeType).toBe("identifier");
  expect(byText.get("max")?.nodeType).toBe("identifier");
  expect(byText.get("count")?.cls).toBe("identifier");
  expect(byText.get("max")?.cls).toBe("identifier");
  expect(byText.get("if")?.cls).toBe("keyword");
  expect(byText.get(">=")?.cls).toBe("operator");
  expect(byText.get("(")?.cls).toBe("bracket");
  expect(byText.get("{")?.cls).toBe("bracket");

  // 3. The source string is syntactically incomplete (unterminated block), so
  //    a real parser reports an error node. The token map is still correct,
  //    which is the property the token engine depends on. Pinned so the
  //    behaviour is visible rather than surprising.
  expect(result.errorCount).toBe(1);
});

test("grammar parse of the same source with the block closed is error-free", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => (window as unknown as { __s4?: unknown }).__s4 !== undefined);
  // Re-parse a syntactically complete version in the same page to show the
  // error came from the source text, not from the setup.
  const reparse = await page.evaluate(async () => {
    const mod = await import("/node_modules/web-tree-sitter/tree-sitter.js");
    const Parser = mod.Parser ?? mod.default?.Parser;
    const Language = mod.Language ?? mod.default?.Language;
    const js = await Language.load(
      "/node_modules/tree-sitter-wasms/out/tree-sitter-javascript.wasm",
    );
    const p = new Parser();
    p.setLanguage(js);
    const t = p.parse("if (count >= max) { doThing(); }");
    return { hasError: t.rootNode.hasError, sexp: t.rootNode.toString() };
  });
  expect(reparse.hasError).toBe(false);
});
