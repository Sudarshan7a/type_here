/**
 * Bundle-size gate (M0-05 item 6, activated with the M0-10 scaffold):
 * the test page's JavaScript must stay within budget — starting budget
 * 200 KB gzip per the implementation guide (M0-05), to be tightened as real
 * features land.
 */
import { gzipSync } from "node:zlib";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST = join("apps", "web", "dist", "assets");
const BUDGET_BYTES = 200 * 1024; // 200 KB gzip

if (!existsSync(DIST)) {
  console.error("FAIL: apps/web/dist/assets not found — run `pnpm build` first.");
  process.exit(1);
}

const files = readdirSync(DIST).filter((f) => f.endsWith(".js"));
if (files.length === 0) {
  console.error("FAIL: no JS assets found in apps/web/dist/assets.");
  process.exit(1);
}

let totalGzip = 0;
for (const f of files) {
  const raw = readFileSync(join(DIST, f));
  const gz = gzipSync(raw).length;
  totalGzip += gz;
  console.log(
    `  ${f}: ${(statSync(join(DIST, f)).size / 1024).toFixed(1)} KB raw, ${(gz / 1024).toFixed(1)} KB gzip`,
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
