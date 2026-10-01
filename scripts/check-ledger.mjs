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
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LEDGER = join(root, "docs", "FEATURE-LEDGER.md");
const MANIFEST = join(root, "scripts", "ledger-manifest.json");

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

// --- Reported progress lines (exported: see check-ledger.test.mjs) -------
//
// The counts tables below recompute docs/FEATURE-LEDGER.md's own figures. Those
// tables were correct while the *reports* drawn from them were not: the progress
// line every session report, halt file and handoff must print had no UNTAGGED
// slot, so the reported denominators summed to 196 while the ledger held 216
// rows. A gate that only inspects the tracker cannot catch a wrong report.

/** The tag families a report may name, in reporting order. */
const REPORT_TAGS = ["MVP", "V1", "V2", "LATER", "UNTAGGED"];

/**
 * Counts of the buckets that actually hold rows. Reported counts are only
 * required for buckets that exist, so a future ledger that tags all 216 rows
 * does not have to print an empty UNTAGGED slot forever.
 */
export function activeFamilies(byTag) {
  return REPORT_TAGS.filter((t) => (byTag?.[t] ?? 0) > 0);
}

/** Does this look like a reported progress line at all? */
export function isProgressLine(line) {
  return /\bMVP\s+\d+\s*\/\s*\d+/.test(line) && /\boverall\s+\d+\s*\/\s*\d+/i.test(line);
}

/** Parse `MVP 5/97 ... overall 5/216` into its tag pairs and its overall pair. */
function parseProgressLine(line) {
  const tags = [];
  for (const family of REPORT_TAGS) {
    const re = new RegExp(`\\b${family}\\s+(\\d+)\\s*\\/\\s*(\\d+)`, "g");
    for (const m of line.matchAll(re)) {
      tags.push({ family, numerator: Number(m[1]), denominator: Number(m[2]) });
    }
  }
  const overall = line.match(/\boverall\s+(\d+)\s*\/\s*(\d+)/i);
  return {
    tags,
    overall: overall ? { numerator: Number(overall[1]), denominator: Number(overall[2]) } : null,
  };
}

/**
 * Check one reported progress line against the ledger it claims to summarise.
 *
 * @param {string} line a reported progress line
 * @param {{rows: number, doneVerified?: number, byTag: Record<string, number>}} ledger
 * @returns {string[]} problems; empty means the line is arithmetically honest
 */
export function findProgressProblems(line, ledger) {
  const out = [];
  const families = activeFamilies(ledger?.byTag);
  if (families.length === 0) return out;

  if (!isProgressLine(line)) {
    out.push(
      `progress line is not readable: no "TAG n/d ... overall n/d" figures in "${line.slice(0, 120)}"`,
    );
    return out;
  }

  const { tags, overall } = parseProgressLine(line);
  if (overall === null) {
    out.push("progress line has tag counts but no overall figure");
    return out;
  }

  const named = new Set(tags.map((t) => t.family));
  for (const family of families) {
    if (!named.has(family)) {
      out.push(
        `${family}: ${ledger.byTag[family]} rows exist but the reported progress line does not count them, so the reported denominators under-count the ledger`,
      );
    }
  }

  for (const t of tags) {
    const expected = ledger.byTag[t.family];
    if (expected !== undefined && t.denominator !== expected) {
      out.push(
        `${t.family}: reported denominator ${t.denominator} but the ledger has ${expected} rows`,
      );
    }
  }

  const denomSum = tags.reduce((n, t) => n + t.denominator, 0);
  if (denomSum !== overall.denominator) {
    out.push(
      `reported tag denominators sum to ${denomSum}, but the line claims overall ${overall.denominator}`,
    );
  }

  const numerSum = tags.reduce((n, t) => n + t.numerator, 0);
  if (numerSum !== overall.numerator) {
    out.push(
      `reported tag numerators sum to ${numerSum}, but the line claims overall ${overall.numerator}`,
    );
  }

  if (overall.denominator !== ledger.rows) {
    out.push(
      `overall denominator ${overall.denominator} does not match the ledger row count ${ledger.rows}`,
    );
  }

  return out;
}

/**
 * Check the format statement the ledger tells reporters to use. A format with a
 * hole in it is the root cause: every report copied it and lost the same rows.
 */
export function findFormatProblems(formatLine, ledger) {
  const families = activeFamilies(ledger?.byTag);
  if (families.length === 0) return [];

  if (formatLine.trim() === "") {
    return ["no progress-format statement found to check"];
  }

  return families
    .filter((f) => !new RegExp(`\\b${f}\\b`).test(formatLine))
    .map(
      (f) =>
        `the documented progress format has no ${f} slot, but ${ledger.byTag[f]} rows are counted as ${f}; every report copied this format and under-counted`,
    );
}

/** The lines in a document that claim to be a reported progress line. */
function progressLinesIn(docText) {
  return docText.split("\n").filter((l) => isProgressLine(l));
}

/** The Current Position section of BUILD-LOG.md, which is current by definition. */
function currentPositionOf(buildLogText) {
  const start = buildLogText.indexOf("## Current Position");
  if (start === -1) return null;
  const rest = buildLogText.slice(start);
  const end = rest.indexOf("\n## ", 1);
  return end === -1 ? rest : rest.slice(0, end);
}

async function main() {
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

  // --- 2. The row SET must match the manifest -----------------------------
  //
  // Self-consistency is not integrity. The first version of this gate recomputed
  // counts from the rows and compared them to the file's own header, so deleting a
  // row (or an entire prefix) and updating the header honestly passed. The
  // manifest is generated from the spec sources by
  // scripts/build-ledger-manifest.mjs, so the expected row set comes from outside
  // the ledger. Removing a row now requires editing the manifest on purpose, which
  // is a reviewable diff.
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  const expectedIds = new Set(manifest.ids);

  if (manifest.count !== manifest.ids.length) {
    problems.push(
      `manifest: count field says ${manifest.count} but the ids array has ${manifest.ids.length}`,
    );
  }

  const ledgerIds = new Set(rows.map((r) => r.id));

  for (const id of expectedIds) {
    if (!ledgerIds.has(id)) {
      problems.push(
        `${id}: in the manifest (found in the spec sources) but has NO row in the ledger`,
      );
    }
  }
  for (const id of ledgerIds) {
    if (!expectedIds.has(id)) {
      problems.push(
        `${id}: has a ledger row but appears in NO spec source — invented, or the spec ID was renumbered`,
      );
    }
  }

  // --- 2b. depends-on must point at rows that exist -----------------------
  // Ranges are allowed and are expanded ("INT-05..08" -> INT-05..INT-08),
  // because the ledger uses them for the INT-10 gate.
  function expandDeps(raw) {
    const out = [];
    for (const part of raw.split(",")) {
      const token = part.trim();
      if (token === "" || token === "—" || token === "none") continue;
      const range = token.match(/^([A-Z0-9]+)-(\d{2})\.\.(\d{2})$/);
      if (range) {
        const [, prefix, from, to] = range;
        for (let n = Number(from); n <= Number(to); n++) {
          out.push(`${prefix}-${String(n).padStart(2, "0")}`);
        }
        continue;
      }
      const single = token.match(/^([A-Z0-9]+)-(\d{1,3})$/);
      if (single) {
        out.push(`${single[1]}-${String(Number(single[2])).padStart(2, "0")}`);
        continue;
      }
      // Free-text reference (e.g. "V1 part", "OPS-08 (V1 part)"). Only the leading
      // ID, if any, is checkable; anything else is a note, not a dependency.
      const lead = token.match(/^([A-Z0-9]+-\d{1,3})\b/);
      if (lead)
        out.push(
          `${lead[1].split("-")[0]}-${String(Number(lead[1].split("-")[1])).padStart(2, "0")}`,
        );
    }
    return out;
  }

  for (const r of rows) {
    const deps = expandDeps(r.cells[3] ?? "");
    for (const dep of deps) {
      if (!ledgerIds.has(dep)) {
        problems.push(`${r.id}: depends-on references ${dep}, which has no row in the ledger`);
      }
    }
  }
  // --- 2c. Status vocabulary ---------------------------------------------
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

  /** The tag families as a plain object, for the report checks below. */
  const tagCounts = Object.fromEntries([...byTag].map(([k, v]) => [k, v]));

  // --- 5. Compare against what the file claims ----------------------------
  /**
   * Every number the counts tables claim for a given row label.
   *
   * This returns ALL matches, not the first. The file has two "**Total**" rows
   * (one per counts table) and the first version of this gate only ever read the
   * tag table's, which left the status table's total completely unchecked.
   */
  function claimedAll(label) {
    // The label is anchored to the start of a cell and must be followed by a
    // space, an open bracket, or the cell's closing pipe. That accepts
    // "MVP |", "**Total** |" and "UNTAGGED (17 NFR + 3 policies) |" while
    // rejecting a longer ID that merely starts with the label (e.g. "MVP-FOO").
    // The count itself may be bold ("| **Total** | **216** |"), so allow **.
    // The label may contain regex metacharacters, so escape it.
    const safe = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^\\|\\s*${safe}(?=[\\s(|])[^|]*\\|\\s*\\**(\\d+)\\**\\s*\\|`, "gm");
    return [...text.matchAll(re)].map((m) => Number(m[1]));
  }

  function claimed(label) {
    const all = claimedAll(label);
    return all.length === 0 ? null : all[0];
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

  const statusSum = [...STATUSES].reduce((n, s) => n + (byStatus.get(s) ?? 0), 0);
  if (statusSum !== expectedTotal) {
    problems.push(`status sum ${statusSum} != tag sum ${expectedTotal}`);
  }

  // Both "**Total**" rows — the tag table's and the status table's — must equal
  // the number of rows. The first version of this gate read only the first match,
  // so the status table's total was dead prose.
  const claimedTotals = claimedAll("**Total**");
  if (claimedTotals.length === 0) {
    problems.push("no '**Total**' row found in the counts tables");
  }
  for (const [i, value] of claimedTotals.entries()) {
    if (value !== expectedTotal) {
      problems.push(
        `counts table ${i === 0 ? "(by tag)" : i === 1 ? "(by status)" : `#${i + 1}`} claims total ${value}, rows sum to ${expectedTotal}`,
      );
    }
  }

  // The launch-flag count must be a checkable table row, not prose. It used to be
  // a sentence, which meant this check could never fire.
  const claimedFlagged = claimed("rows carrying a launch flag");
  if (claimedFlagged === null) {
    problems.push(
      'no "| rows carrying a launch flag | n |" row found — the flag count must be a table row so it can be checked',
    );
  } else if (claimedFlagged !== flagged) {
    problems.push(`flag count: file claims ${claimedFlagged}, rows say ${flagged}`);
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

  // --- 7. The reported progress line must add up --------------------------
  //
  // The counts tables above were correct while every report drawn from them was
  // not. BUILD-LOG.md's Current Position is the live figure; the ledger's own
  // format statement is what reporters copy. Both are checked here so the
  // under-count cannot be reintroduced by editing a document.
  const reportLedger = {
    rows: rows.length,
    doneVerified: byStatus.get("DONE-VERIFIED") ?? 0,
    byTag: tagCounts,
  };

  const BUILD_LOG = join(root, "BUILD-LOG.md");
  if (existsSync(BUILD_LOG)) {
    const buildLog = readFileSync(BUILD_LOG, "utf8");
    const current = currentPositionOf(buildLog);

    if (current === null) {
      problems.push(
        'BUILD-LOG.md has no "## Current Position" section, so its progress line cannot be checked',
      );
    } else {
      const lines = progressLinesIn(current);
      if (lines.length === 0) {
        problems.push(
          "BUILD-LOG.md Current Position carries no progress line, so reported progress is unverifiable",
        );
      }
      for (const line of lines) {
        for (const p of findProgressProblems(line, reportLedger)) {
          problems.push(`BUILD-LOG.md Current Position: ${p}`);
        }
      }
    }
  } else {
    problems.push(
      "BUILD-LOG.md is missing, so reported progress cannot be checked against the ledger",
    );
  }

  // The format statement is the indented block under "Progress is reported as:".
  const formatStart = text.indexOf("Progress is reported as:");
  if (formatStart === -1) {
    problems.push(
      'the ledger has no "Progress is reported as:" line, so reporters have no checked format to follow',
    );
  } else {
    const block = text
      .slice(formatStart)
      .split("\n")
      .slice(1)
      .find((l) => l.trim() !== "");
    for (const p of findFormatProblems(block ?? "", reportLedger)) {
      problems.push(`docs/FEATURE-LEDGER.md progress format: ${p}`);
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
}

// Only run as CLI when invoked directly, not when imported by the test.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  await main();
}
