#!/usr/bin/env node
/**
 * Product-policy gate for the three `[Policy]` rows in the feature ledger.
 *
 * The ledger tags `INT-10`, `BIZ-06` and `RET-21` as UNTAGGED because the source
 * documents write `[Policy]` after the ID and offer no MVP/V1 label. They are not
 * features — they are rules about what may never ship, so they need a different
 * kind of enforcement from a feature's tests.
 *
 * STEER-3 asks for exactly this: enforce each with a test or lint rule where
 * possible, and where that is impossible, record it as review-enforced with the
 * document that states it. So:
 *
 *  - INT-10 (no public leaderboards before INT-05..08) is machine-enforceable.
 *    Competitive rows must carry an OFF launch flag, and any leaderboard/race
 *    source file must say in its own header that it is gated.
 *  - BIZ-06 (no dark patterns) is machine-enforceable for the parts that are
 *    copy and paywall surfaces, which is where dark patterns actually live.
 *  - RET-21 (the ethics checklist in review for every engagement feature) is NOT
 *    a property of the code. It is enforced by requiring a written checklist
 *    record before an engagement row may leave NOT STARTED — a gate on process,
 *    which is as close to enforcement as the rule allows.
 *
 * Every check is exported and unit-tested in check-policies.test.mjs, including
 * the failing direction, because a policy gate that has only ever passed is
 * indistinguishable from no gate at all.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Source roots the policy scan covers. Anything not under these is not shipped. */
const SOURCE_ROOTS = ["apps", "packages", "tools"];

/** Directories that are not application source. */
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "coverage",
  ".git",
  "test-results",
  "playwright-report",
  "ethics",
  "spec",
]);

/**
 * Files whose presence would mean a competitive or monetisation surface exists.
 *
 * Matched on the path, not the contents, because a dark pattern or a public
 * board is a feature decision: it does not matter whether the file is empty.
 */
const COMPETITIVE_SURFACE = /(^|\/)(leaderboard|leaders|rankings?|racing?|race-queue)\b/i;
const PAYWALL_SURFACE = /(^|\/)(checkout|billing|paywall|upgrade-wall|subscribe|subscription)\b/i;

/**
 * The phrases BIZ-06 forbids. Guilt-based loss framing, fake urgency, and
 * hidden trials or renewals.
 *
 * Deliberately phrase-level rather than word-level. A word ban would have fired
 * on "streak" the day the streak feature landed, and a check that cries wolf on
 * legitimate product vocabulary gets switched off.
 */
const BANNED_PHRASES = [
  /we miss you/i,
  /come back before .{0,20}(too late|it'?s too late)/i,
  /don'?t lose your (progress|streak|streaks)/i,
  /your (progress|streak) (will be|is going to be) (lost|reset|deleted)/i,
  /you will lose/i,
  /last (chance|warning)/i,
  /only \d+ (hours?|days?) left/i,
  /expires? silently/i,
  /trial ends? silently/i,
  /auto[- ]?renews? (silently|automatically)/i,
  /cancel any time/i,
  /free forever.{0,40}auto[- ]?renew/i,
  /limited time only/i,
  /act now/i,
];

/**
 * RET rows the checklist does not apply to.
 *
 * `RET-21` is the rule itself, so requiring it to produce a record of its own
 * would be circular: the checklist would have to be applied in order to permit
 * the row that defines the checklist. Caught by running the gate against the
 * real ledger, where RET-21's own note says "absolute gate on all RET rows" —
 * all the *others*.
 */
const RET_EXEMPT = new Set(["RET-21"]);

/**
 * CUS-01 — AGENTS.md rule 1, the project's first non-negotiable: nothing may
 * interrupt the typing surface. No popups, no modals, no ads.
 *
 * Why this is a gate and not a test. `e2e/typing-surface.spec.ts` AC6 asserted
 * the rule for two sessions by querying nine hardcoded selectors — `dialog`,
 * `[role=dialog]`, `[role=alert]`, `[role=alertdialog]`, `[popover]`, `.modal`,
 * `.popup`, `.toast`, `.tooltip`. Owner-proxy review 1 (REVIEW-1.md, H1) added
 *
 *     <div className="promo-banner" aria-modal="true">Congrats! Sign up…</div>
 *
 * to the typing surface and **AC6 passed**. An upsell banner marked aria-modal
 * is precisely what rule 1 forbids. A blocklist of names is not a rule; it is a
 * list of the names someone happened to think of, and the next name is not on
 * it.
 *
 * So the rule is enforced where it can be enforced structurally: a source file
 * reachable from the typing surface may not CONTAIN an overlay construct. That
 * is positive-form — it names what is forbidden rather than what is allowed, so
 * it does not fall off when someone invents a new class name.
 *
 * The component-name pattern deliberately has no leading word boundary of its
 * own: `\bModal\b` does not match `SignupModal`, because there is no boundary
 * between "p" and "M" in camelCase. The `[A-Za-z]*` prefix is what makes the
 * pattern see a compound name. It stays case-sensitive so it does not fire on
 * ordinary prose or on a lowercase token like `dialogue`.
 *
 * The live behavioural check stays in AC6 too, rewritten positive-form with
 * computed styles. Three layers, each catching what the others cannot:
 * this gate stops the construct being written; AC6 stops it appearing at
 * runtime; the SSR test stops it arriving from a portal.
 */
const TYPING_SURFACE_CONSTRUCT = [
  { re: /<dialog\b/i, what: "a <dialog> element" },
  { re: /showModal\s*\(/, what: "a showModal() call" },
  { re: /\bpopover\b/i, what: "the popover attribute or API" },
  { re: /aria-modal/i, what: "aria-modal" },
  { re: /role\s*=\s*["'{]?\s*(dialog|alertdialog)\b/i, what: "role=dialog/alertdialog" },
  { re: /\b[A-Za-z]*(Modal|Overlay|Dialog|Popup|Toast|Scrim)\b/, what: "an overlay component" },
];

/**
 * The source tree the typing surface is built from.
 *
 * `TypingSurface.tsx` is the entry point. This is its whole DIRECTORY rather
 * than a transitive walk of its import graph — see the CUS-01 section below for
 * why, and for the day that has to change.
 */
const TYPING_SURFACE_DIR = "apps/web/src/";

/** Ledger statuses that mean a row has actually been worked on. */
const STARTED_STATUSES = new Set([
  "IN PROGRESS",
  "DONE-VERIFIED",
  "LAUNCH-GATED",
  "BLOCKED-EXTERNAL",
]);

/** Rows that build a public competitive surface, gated by INT-10. */
const COMPETITIVE_ROWS = ["CMP-01", "CMP-02"];
/** The integrity rows INT-10 names as the precondition. */
const INTEGRITY_ROWS = ["INT-05", "INT-06", "INT-07", "INT-08"];

/** The six questions the RET-21 checklist asks (playbook §12). */
export const ETHICS_CHECKLIST_SECTION = "retention-and-mastery-playbook.md §12";

/**
 * Recursively list the source files a policy scan should read.
 *
 * @param {string} dir absolute path to scan
 * @param {string[]} [out] accumulator
 * @returns {string[]} absolute file paths
 */
function listSourceFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const info = statSync(full);
    if (info.isDirectory()) {
      listSourceFiles(full, out);
      continue;
    }
    if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * The repository facts the policies are checked against.
 *
 * Exported as a builder rather than read inside the checks so the whole gate is a
 * pure function of its input, which is what makes the failing direction testable.
 *
 * @returns {{ledgerRows: Array<{id: string, flag: string, status: string}>, sourceFiles: Record<string, string>, ethicsRecords: string[]}}
 */
export function readRepo() {
  const ledger = readFileSync(join(root, "docs", "FEATURE-LEDGER.md"), "utf8");
  const ledgerRows = [];
  for (const line of ledger.split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (!/^[A-Z0-9]+-\d+$/.test(cells[0] ?? "")) continue;
    if (cells[1] === "name" || cells[1] === "name / target") continue;
    ledgerRows.push({ id: cells[0], flag: cells[5] ?? "", status: cells[4] ?? "" });
  }

  /** @type {Record<string, string>} */
  const sourceFiles = {};
  for (const dir of SOURCE_ROOTS) {
    for (const file of listSourceFiles(join(root, dir))) {
      sourceFiles[relative(root, file).replaceAll("\\", "/")] = readFileSync(file, "utf8");
    }
  }

  const ethicsDir = join(root, "docs", "ethics");
  const ethicsRecords = existsSync(ethicsDir)
    ? readdirSync(ethicsDir)
        .filter((f) => /^RET-\d+\.md$/.test(f))
        .map((f) => f.replace(/\.md$/, ""))
    : [];

  return { ledgerRows, sourceFiles, ethicsRecords };
}

/**
 * Run all three policies.
 *
 * @param {{ledgerRows: Array<{id: string, flag: string, status: string}>, sourceFiles: Record<string, string>, ethicsRecords: string[]}} repo
 * @returns {string[]} problems; empty means every policy holds
 */
export function checkPolicies(repo) {
  const problems = [];
  const rows = repo?.ledgerRows ?? [];
  const files = repo?.sourceFiles ?? {};
  const records = new Set(repo?.ethicsRecords ?? []);

  // --- INT-10 -------------------------------------------------------------
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const id of COMPETITIVE_ROWS) {
    const row = byId.get(id);
    // The rows do not exist yet. That is the compliant state, not a gap.
    if (row === undefined) continue;
    if (row.flag !== "OFF") {
      problems.push(
        `INT-10: ${id} builds a public competitive surface and must carry an OFF launch flag, but its flag is "${row.flag || "(empty)"}"`,
      );
    }
  }
  const integrityReady = INTEGRITY_ROWS.every((id) => {
    const row = byId.get(id);
    return row !== undefined && row.status === "DONE-VERIFIED";
  });
  if (!integrityReady) {
    const missing = INTEGRITY_ROWS.filter((id) => byId.get(id)?.status !== "DONE-VERIFIED");
    for (const id of COMPETITIVE_ROWS) {
      const row = byId.get(id);
      if (row === undefined) continue;
      // Everything OFF and NOT STARTED while the layer is incomplete is the
      // compliant state, not a violation — that is exactly how the program is
      // supposed to sit until INT-05..08 land. The violation is any of those rows
      // being worked on or enabled before then.
      if (row.status === "NOT STARTED" && row.flag === "OFF") continue;
      problems.push(
        `INT-10: ${id} is ${row.status} with flag "${row.flag || "(empty)"}" while the integrity layer is incomplete (${missing.join(", ")} not DONE-VERIFIED). No public leaderboard, race or ranking may be enabled until INT-05..INT-08 pass`,
      );
    }
  }
  for (const [path, text] of Object.entries(files)) {
    if (!COMPETITIVE_SURFACE.test(path)) continue;
    // A file that documents its own gate is the shape the roadmap wants, so the
    // check is not "never write the file" — it is "never let it run unannounced".
    if (/INT-10/.test(text) && /flag/i.test(text)) continue;
    problems.push(
      `INT-10: ${path} looks like a public competitive surface but does not state its INT-10 launch gate in its own source`,
    );
  }

  // --- BIZ-06 -------------------------------------------------------------
  for (const [path, text] of Object.entries(files)) {
    if (PAYWALL_SURFACE.test(path)) {
      problems.push(
        `BIZ-06: ${path} is a monetisation surface. The product has no billing yet, and a paywall cannot be reviewed for hidden trials or surprise renewals until there is something to review`,
      );
    }
    // The string table documents the banned examples with a strikethrough. A
    // copy file quoting one to mark it as forbidden is the one legitimate case,
    // so the check reads the value rather than the file name.
    for (const line of text.split("\n")) {
      for (const phrase of BANNED_PHRASES) {
        if (!phrase.test(line)) continue;
        if (/banned|bannedExample|doNotUse/i.test(line)) continue;
        problems.push(
          `BIZ-06: ${path} contains guilt-based or hidden-renewal copy matching ${String(phrase)}`,
        );
      }
    }
  }

  // --- RET-21 -------------------------------------------------------------
  for (const row of rows) {
    if (!row.id.startsWith("RET-")) continue;
    if (RET_EXEMPT.has(row.id)) continue;
    if (!STARTED_STATUSES.has(row.status)) continue;
    if (records.has(row.id)) continue;
    problems.push(
      `RET-21: ${row.id} is ${row.status} with no ethics-checklist record at docs/ethics/${row.id}.md. The checklist is ${ETHICS_CHECKLIST_SECTION}; it is a review gate, so the record is the artefact that proves it happened`,
    );
  }

  // --- CUS-01 -------------------------------------------------------------
  // No overlay construct anywhere in the typing surface's own source tree.
  //
  // SCOPE, stated honestly: this is the whole of `apps/web/src/`, not a
  // transitive walk of the surface's import graph. Today those are the same
  // thing — the MVP web app is the typing surface, and every module in `src/`
  // is reachable from it — so the coarse scope is the correct constraint now.
  //
  // It stops being correct the moment a screen appears that the typing field
  // does NOT reach: a settings dialog or a "New passage" confirmation is
  // legitimate UI, and this gate would forbid it. When that happens the scope
  // has to become a real graph walk from TYPING_SURFACE_ENTRY, and until it
  // does, a failure here naming a file outside the surface's reach is the gate
  // being too broad — not the code being wrong. That trade is deliberate and
  // one-directional: a false positive costs a reviewed exception, a false
  // negative puts an upsell dialog on the typing field.
  for (const [path, text] of Object.entries(files)) {
    if (!path.startsWith(TYPING_SURFACE_DIR)) continue;
    if (path.includes("/tests/")) continue;
    for (const [index, line] of text.split("\n").entries()) {
      // A comment explaining the rule is not a violation of it. Strip `//` and
      // the rest of a line before matching, but not block comments, so a
      // commented-out overlay still shows up rather than hiding behind the rule
      // it would break.
      const code = line.replace(/\/\/.*$/, "");
      // First match on a line wins, and the line stops there. One `<dialog
      // role="dialog">` element trips three constructs at once, and reporting
      // the same line three times reads as three defects — which trains people
      // to skim the output, which is how a real one gets missed.
      const rule = TYPING_SURFACE_CONSTRUCT.find((r) => r.re.test(code));
      if (rule === undefined) continue;
      problems.push(
        `CUS-01: ${path}:${index + 1} contains ${rule.what}. Nothing may interrupt the typing ` +
          `surface — no popups, modals or ads (AGENTS.md rule 1). If this is a comment, delete it; ` +
          `if it is real, it does not belong on the typing field.`,
      );
    }
  }

  return problems;
}

async function main() {
  const repo = readRepo();
  const problems = checkPolicies(repo);
  if (problems.length > 0) {
    console.error("Product-policy check FAILED:\n");
    for (const p of problems) console.error(`  - ${p}`);
    console.error(
      `\nINT-10 / BIZ-06 / RET-21 are [Policy] rows in docs/FEATURE-LEDGER.md. They are not features and cannot be waived by a status change.\nCUS-01 is AGENTS.md rule 1 — nothing may interrupt the typing surface. It gates source, so it cannot be waived at all.`,
    );
    process.exit(1);
  }
  console.log("Product-policy check passed: INT-10, BIZ-06, RET-21 and CUS-01 all hold.");
  console.log(
    `  ${Object.keys(repo.sourceFiles).length} source files scanned · ${repo.ledgerRows.length} ledger rows · ${repo.ethicsRecords.length} ethics records`,
  );
}

// Only run as CLI when invoked directly, not when imported by the test.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  await main();
}
