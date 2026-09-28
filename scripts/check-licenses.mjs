/**
 * Copyleft license gate (D12): fails if any production dependency anywhere in
 * the pnpm workspace carries a copyleft license. Scans each workspace package
 * with license-checker (production deps only) and aggregates the results.
 *
 * The scanning core (findCopyleftOffenders) is exported for unit testing
 * against fixture package lists (Block A2: prove the gate fails on bad input
 * without installing anything unsafe).
 */
import { createRequire } from "node:module";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const checker = require("license-checker");

const FORBIDDEN = ["GPL", "AGPL", "LGPL", "EPL", "EUPL", "CPL", "OSL", "SSPL", "SLEEPYCAT"];

/**
 * Given license-checker JSON for one package dir ({ name -> { licenses } }),
 * return the offender strings (or an empty array when everything is clean).
 */
export function findCopyleftOffenders(dir, json) {
  const offenders = [];
  for (const [pkg, info] of Object.entries(json ?? {})) {
    const license = String(info.licenses ?? "UNKNOWN");
    const isCopyleft = FORBIDDEN.some((f) => license.toUpperCase().includes(f));
    // Fail-closed: an undetectable license is treated as a violation
    // (MASTER-BUILD-CONTRACT standing rule: unverified by default). A human
    // can allowlist a benign custom license explicitly if one ever appears.
    if (isCopyleft || license.toUpperCase() === "UNKNOWN") {
      offenders.push(`${dir} :: ${pkg} :: ${license}`);
    }
  }
  return offenders;
}

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

async function main() {
  const offenders = [];
  for (const dir of workspacePackageDirs()) {
    if (!existsSync(join(dir, "node_modules"))) continue;
    const json = await scan(dir);
    offenders.push(...findCopyleftOffenders(dir, json));
  }

  if (offenders.length > 0) {
    console.error("FAIL: copyleft licenses found in production dependencies:");
    for (const o of offenders) {
      console.error(`  - ${o}`);
    }
    process.exit(1);
  }

  console.log("License check passed: no copyleft licenses in production dependencies.");
}

// Only run as CLI when invoked directly (not when imported by the test).
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  await main();
}
