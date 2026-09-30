/**
 * Bundle-size gate (M0-05 item 6, activated with the M0-10 scaffold):
 * the test page's JavaScript must stay within budget â€” starting budget
 * 200 KB gzip per the implementation guide (M0-05), to be tightened as real
 * features land.
 */
import { gzipSync } from "node:zlib";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIST = join("apps", "web", "dist", "assets");
const BUDGET_BYTES = 200 * 1024; // 200 KB gzip

if (!existsSync(DIST)) {
  console.error("FAIL: apps/web/dist/assets not found â€” run `pnpm build` first.");
  process.exit(1);
}

// WASM is counted too. Found by the S4 spike: a plain
// `import grammar from "â€¦/tree-sitter-javascript.wasm?url"` makes Vite copy a
// 647 KB (81 KB gzip) grammar into dist/assets while the JS-only total stayed
// at 66 KB and this gate passed. Anything wasm-sized in the test page is a
// budget violation by definition: the programmer-track grammars must stay
// behind lazy imports, not in the initial build.
const PAYLOAD = /\.(js|wasm)$/;
const files = readdirSync(DIST).filter((f) => PAYLOAD.test(f));
if (files.length === 0) {
  console.error("FAIL: no JS/WASM assets found in apps/web/dist/assets.");
  process.exit(1);
}

const wasm = files.filter((f) => f.endsWith(".wasm"));
if (wasm.length > 0) {
  console.error(`FAIL: WASM payload(s) present in the test-page build: ${wasm.join(", ")}`);
  console.error("      Tree-sitter grammars and any other WASM must be lazy-loaded on demand,");
  console.error("      never imported from the typing surface's module graph.");
  process.exit(1);
}

let totalGzip = 0;
for (const f of files) {
  const raw = readFileSync(join(DIST, f));
  const gz = gzipSync(raw).length;
  totalGzip += gz;
  console.log(
    `  ${f}: ${(raw.length / 1024).toFixed(1)} KB raw, ${(gz / 1024).toFixed(1)} KB gzip`,
  );
}

console.log(
  `Total JS: ${(totalGzip / 1024).toFixed(1)} KB gzip (budget ${BUDGET_BYTES / 1024} KB)`,
);
if (totalGzip > BUDGET_BYTES) {
  console.error("FAIL: bundle exceeds the gzip budget.");
  process.exit(1);
}
console.log("Bundle-size check passed.");
