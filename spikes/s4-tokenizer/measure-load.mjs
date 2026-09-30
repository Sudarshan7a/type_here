import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://127.0.0.1:5175/");
const timings = await page.evaluate(async () => {
  const out = {};
  const mod = await import("/node_modules/web-tree-sitter/tree-sitter.js");
  const Parser = mod.Parser ?? mod.default?.Parser;
  const Language = mod.Language ?? mod.default?.Language;
  await Parser.init();
  for (const lang of [
    "javascript",
    "python",
    "java",
    "typescript",
    "rust",
    "go",
    "c",
    "cpp",
    "json",
  ]) {
    try {
      const t = performance.now();
      const L = await Language.load(`/node_modules/tree-sitter-wasms/out/tree-sitter-${lang}.wasm`);
      const p = new Parser();
      p.setLanguage(L);
      const tree = p.parse("x = 1;");
      out[lang] = {
        ok: true,
        loadMs: Math.round(performance.now() - t),
        hasError: tree.rootNode.hasError,
      };
    } catch (err) {
      out[lang] = { ok: false, error: String(err.message ?? err).slice(0, 90) };
    }
  }
  return out;
});
for (const [lang, v] of Object.entries(timings)) {
  console.log(
    lang.padEnd(12),
    v.ok
      ? `OK  load ${String(v.loadMs).padStart(4)}ms  parseErr=${v.hasError}`
      : `FAIL  ${v.error}`,
  );
}
await browser.close();
