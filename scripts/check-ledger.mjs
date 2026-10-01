#!/usr/bin/env node
/**
 * Ledger integrity gate.
 *
 * docs/FEATURE-LEDGER.md is the source of truth for "what remains" (Section
 * 18.2). A tracker whose own counts are wrong is worse than no tracker, because
 * progress is reported from it. This script recomputes every number from the
 * table rows and fails if the file disagrees with itself.
 *
 * It also rejects an ID that the table claims but does not define, and a row
 * whose status is not in the Section 18.2 vocabulary.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LEDGER = join(root, "docs", "FEATURE-LEDGER.md");

const PREFIXES = [
  "ENG",
  "MOD",
  "LRN",
  "PRG",
  "ANA",
  "CNT",
  "INT",
  "CMP",
  "MOT",
  "USR",
  "CUS",
  "A11Y",
  "LOC",
  "MOB",
  "WEL",
  "BIZ",
  "OPS",
  "ADM",
  "EXT",
  "MST",
  "RET",
  "NFR",
];

const STATUSES = new Set([
  "NOT STARTED",
  "IN PROGRESS",
  "DONE-VERIFIED",
  "LAUNCH-GATED",
  "BLOCKED-EXTERNAL",
  "DEFERRED-BY-HUMAN",
  "REJECTED-BY-ANTI-GOAL",
]);

// Tag families are folded for counting. Anything unlisted is a bug in the
// ledger, not a new tag to accommodate silently.
const TAG_FAMILY = new Map([
  ["MVP", "MVP"],
  ["MVP policy", "MVP"],
  ["MVP-lite", "MVP"],
  ["V1", "V1"],
  ["V1 test", "V1"],
  ["V2", "V2"],
  ["V2 pilot", "V2"],
  ["V2 validate", "V2"],
  ["LATER", "LATER"],
  ["UNTAGGED", "UNTAGGED"],
  ["Policy", "UNTAGGED"],
]);

const problems = [];
const text = readFileSync(LEDGER, "utf8");

/** Parse a markdown table row into trimmed cells. */
function cells(line) {
  return line
    .split("|")
    .slice(1, -1)
    .map((c) => c.trim());
}

const rows = [];
const lines = text.split("\n");
for (const [i, line] of lines.entries()) {
  if (!line.startsWith("| ")) continue;
  const c = cells(line);
  const id = c[0];
  if (id === undefined || !/^[A-Z0-9]+-\d+$/.test(id)) continue;
  if (!PREFIXES.some((p) => id.startsWith(`${p}-`))) continue;
  // Header rows repeat the literal word "ID"; data rows have a real status.
  if (c[1] === "name" || c[1] === "name / target") continue;
  // Keep the cells too, so the evidence check does not have to re-parse by index.
  rows.push({ id, tag: c[2], status: c[4], flag: c[5], cells: c, lineNo: i + 1 });
}

// --- 1. Every ID unique -------------------------------------------------
const seen = new Map();
for (const r of rows) {
  if (seen.has(r.id)) {
    problems.push(`duplicate row for ${r.id} (lines ${seen.get(r.id)} and ${r.lineNo})`);
  } else {
    seen.set(r.id, r.lineNo);
  }
}

// --- 2. Status vocabulary ----------------------------------------------
for (const r of rows) {
  if (!STATUSES.has(r.status)) {
    problems.push(`${r.id}: status "${r.status}" is not in the Section 18.2 vocabulary`);
  }
}

// --- 3. Tag vocabulary --------------------------------------------------
const byTag = new Map();
for (const r of rows) {
  const family = TAG_FAMILY.get(r.tag);
  if (family === undefined) {
    problems.push(
      `${r.id}: tag "${r.tag}" is not in the gate's tag family map — add it to scripts/check-ledger.mjs deliberately, do not let it pass unnoticed`,
    );
    continue;
  }
  byTag.set(family, (byTag.get(family) ?? 0) + 1);
}

// --- 4. Status counts ---------------------------------------------------
const byStatus = new Map();
for (const r of rows) {
  byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
}

const flagged = rows.filter((r) => r.flag === "OFF").length;

// --- 5. Compare against what the file claims ----------------------------
function claimed(label) {
  // "| MVP | 97 |" inside the counts table. Match on the cell's leading word
  // so a descriptive label like "UNTAGGED (17 NFR + 3 policies)" still counts.
  // The label may contain regex metacharacters (the bold "**Total**" row).
  const safe = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^\\|\\s*${safe}\\b[^|]*\\|\\s*(\\d+)\\s*\\|`, "m");
  const m = text.match(re);
  return m === null ? null : Number(m[1]);
}

const EXPECTED_TAGS = ["MVP", "V1", "V2", "LATER", "UNTAGGED"];
for (const tag of EXPECTED_TAGS) {
  const claimedCount = claimed(tag);
  const actual = byTag.get(tag) ?? 0;
  if (claimedCount === null) {
    problems.push(`counts table has no row for tag ${tag}`);
  } else if (claimedCount !== actual) {
    problems.push(`tag ${tag}: file claims ${claimedCount}, rows say ${actual}`);
  }
}

const expectedTotal =
  byTag.size === EXPECTED_TAGS.length
    ? EXPECTED_TAGS.reduce((n, t) => n + (byTag.get(t) ?? 0), 0)
    : rows.length;
const claimedTotal = claimed("**Total**");
if (claimedTotal !== null && claimedTotal !== expectedTotal) {
  problems.push(`tag total: file claims ${claimedTotal}, rows sum to ${expectedTotal}`);
}

for (const status of STATUSES) {
  const claimedCount = claimed(status);
  if (claimedCount === null) continue; // status absent from the counts table is fine
  const actual = byStatus.get(status) ?? 0;
  if (claimedCount !== actual) {
    problems.push(`status ${status}: file claims ${claimedCount}, rows say ${actual}`);
  }
}

const claimedStatusTotal = claimed("**Total**");
if (rows.length !== expectedTotal) {
  problems.push(`internal: row count ${rows.length} != tag sum ${expectedTotal}`);
}

const claimedFlagged = claimed("flagged");
if (claimedFlagged !== null && claimedFlagged !== flagged) {
  problems.push(`flag count: file claims ${claimedFlagged}, rows say ${flagged}`);
}

if (claimedStatusTotal !== null) {
  const statusSum = [...STATUSES].reduce((n, s) => n + (byStatus.get(s) ?? 0), 0);
  if (statusSum !== expectedTotal) {
    problems.push(`status sum ${statusSum} != tag sum ${expectedTotal}`);
  }
}

// --- 6. A DONE-VERIFIED row must cite evidence --------------------------
for (const r of rows) {
  if (r.status !== "DONE-VERIFIED") continue;
  const evidence = (r.cells[7] ?? "").trim();
  if (evidence === "" || evidence === "—") {
    problems.push(
      `${r.id}: DONE-VERIFIED but no evidence label (LAB PROXY / REAL-DEVICE CONFIRMED) at line ${r.lineNo}`,
    );
  }
}

// --- Report -------------------------------------------------------------
if (problems.length > 0) {
  console.error("Feature-ledger check FAILED:\n");
  for (const p of problems) console.error(`  - ${p}`);
  console.error(`\n${rows.length} rows parsed from docs/FEATURE-LEDGER.md`);
  process.exit(1);
}

const parts = EXPECTED_TAGS.map((t) => `${t} ${byTag.get(t) ?? 0}`).join(" | ");
console.log(`Feature-ledger check passed: ${rows.length} rows, all statuses and tags valid.`);
console.log(`  ${parts} | total ${expectedTotal}`);
console.log(
  `  DONE-VERIFIED ${byStatus.get("DONE-VERIFIED") ?? 0} | IN PROGRESS ${byStatus.get("IN PROGRESS") ?? 0} | NOT STARTED ${byStatus.get("NOT STARTED") ?? 0} | REJECTED ${byStatus.get("REJECTED-BY-ANTI-GOAL") ?? 0} | flagged OFF ${flagged}`,
);
