/**
 * Copyleft license gate (D12): fails if any production dependency anywhere in
 * the pnpm workspace carries a copyleft license. Scans each workspace package
 * with license-checker (production deps only) and aggregates the results.
 */
import { createRequire } from "node:module";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const checker = require("license-checker");

const FORBIDDEN = ["GPL", "AGPL", "LGPL", "EPL", "EUPL", "CPL", "OSL", "SSPL", "SLEEPYCAT"];

function workspacePackageDirs() {
  const dirs = [];
  for (const area of ["apps", "packages"]) {
    if (!existsSync(area)) continue;
    for (const entry of readdirSync(area)) {
      const dir = join(area, entry);
      if (statSync(dir).isDirectory() && existsSync(join(dir, "package.json"))) {
        dirs.push(dir);
      }
    }
  }
  return dirs;
}

function scan(dir) {
  return new Promise((resolve, reject) => {
    checker.init({ start: dir, production: true }, (err, json) => {
      if (err) reject(err);
      else resolve(json ?? {});
    });
  });
}

const offenders = [];
for (const dir of workspacePackageDirs()) {
  if (!existsSync(join(dir, "node_modules"))) continue;
  const json = await scan(dir);
  for (const [pkg, info] of Object.entries(json)) {
    const license = String(info.licenses ?? "UNKNOWN");
    if (FORBIDDEN.some((f) => license.toUpperCase().includes(f))) {
      offenders.push(`${dir} :: ${pkg} :: ${license}`);
    }
  }
}

if (offenders.length > 0) {
  console.error("FAIL: copyleft licenses found in production dependencies:");
  for (const o of offenders) {
    console.error(`  - ${o}`);
  }
  process.exit(1);
}

console.log("License check passed: no copyleft licenses in production dependencies.");
