/**
 * Bundle-size gate: measures EVERYTHING the browser downloads for the test
 * page, gzipped, against one budget — not just the JS in dist/assets.
 *
 * History of blind spots found by deliberately hunting for them (Session 4,
 * Block B) rather than by accident:
 *   1. WASM in dist/assets was invisible (found Session 3).
 *   2. A 533 KB CSS file with an inlined base64 data: URI shipped unnoticed.
 *   3. A 200 KB static asset copied from public/ shipped unnoticed.
 * Dynamic-import chunks and web-worker chunks were verified as CAUGHT.
 *
 * The rule is therefore "measure the whole dist/, excluding source maps",
 * which cannot go blind for a new file type later. WASM additionally fails
 * outright: Tree-sitter grammars and other large WASM must stay behind lazy
 * imports, never in the typing surface's build.
 */
import { gzipSync } from "node:zlib";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const DIST = join("apps", "web", "dist");
const BUDGET_BYTES = 200 * 1024; // 200 KB gzip

if (!existsSync(DIST)) {
  console.error("FAIL: apps/web/dist not found — run `pnpm build` first.");
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

const files = walk(DIST)
  .map((p) => ({ path: p, rel: relative(DIST, p).replaceAll("\\", "/") }))
  // Source maps are not downloaded by the browser unless devtools is open.
  .filter((f) => !f.rel.endsWith(".map"))
  .sort((a, b) => a.rel.localeCompare(b.rel));

if (files.length === 0) {
  console.error("FAIL: no build output found in apps/web/dist.");
  process.exit(1);
}

const wasm = files.filter((f) => f.rel.endsWith(".wasm"));
if (wasm.length > 0) {
  console.error(
    `FAIL: WASM payload(s) present in the test-page build: ${wasm.map((f) => f.rel).join(", ")}`,
  );
  console.error("      Tree-sitter grammars and any other WASM must be lazy-loaded on demand,");
  console.error("      never imported from the typing surface's module graph.");
  process.exit(1);
}

let totalGzip = 0;
const byType = new Map();
for (const file of files) {
  const raw = readFileSync(file.path);
  const gz = gzipSync(raw).length;
  totalGzip += gz;
  const ext = file.rel.slice(file.rel.lastIndexOf("."));
  byType.set(ext, (byType.get(ext) ?? 0) + gz);
  console.log(
    `  ${file.rel}: ${(raw.length / 1024).toFixed(1)} KB raw, ${(gz / 1024).toFixed(1)} KB gzip`,
  );
}

const breakdown = [...byType.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([ext, bytes]) => `${ext} ${(bytes / 1024).toFixed(1)} KB`)
  .join(", ");
console.log(`By type (gzip): ${breakdown}`);
console.log(
  `Total shipped: ${(totalGzip / 1024).toFixed(1)} KB gzip (budget ${BUDGET_BYTES / 1024} KB)`,
);
if (totalGzip > BUDGET_BYTES) {
  console.error("FAIL: the test page exceeds the gzip budget.");
  process.exit(1);
}
console.log("Bundle-size check passed.");
