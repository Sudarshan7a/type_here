import { gzipSync } from "node:zlib";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const base = "node_modules";
const rows = [];

const runtimeDir = join(base, "web-tree-sitter");
for (const f of readdirSync(runtimeDir)) {
  if (f.endsWith(".wasm") || f.endsWith(".js") || f.endsWith(".cjs")) {
    const p = join(runtimeDir, f);
    const raw = readFileSync(p);
    rows.push({ item: `web-tree-sitter/${f}`, raw: raw.length, gz: gzipSync(raw).length });
  }
}
const wasmOut = join(base, "tree-sitter-wasms", "out");
for (const lang of ["javascript", "python", "java"]) {
  const p = join(wasmOut, `tree-sitter-${lang}.wasm`);
  const raw = readFileSync(p);
  rows.push({ item: `tree-sitter-wasms/${lang}.wasm`, raw: raw.length, gz: gzipSync(raw).length });
}

const kb = (n) => (n / 1024).toFixed(1);
let totalGz = 0;
for (const r of rows) {
  totalGz += r.gz;
  console.log(
    `${r.item.padEnd(42)} raw ${kb(r.raw).padStart(8)} KB   gzip ${kb(r.gz).padStart(8)} KB`,
  );
}
console.log(
  `${"TOTAL (runtime + 3 grammars)".padEnd(42)} ${" ".repeat(20)}gzip ${kb(totalGz).padStart(8)} KB`,
);
console.log(
  `Budget for the whole test page: 200 KB gzip (S5). Typing-surface-only budget today: 200 - 66.3 = 133.7 KB gzip`,
);
